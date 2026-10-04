/**
 * `toRenderable`: a `Predicate`, classified once into a closed, pre-validated
 * tree a dialect renderer can print without deciding anything.
 *
 * `evaluatePredicate` is the reference semantics of a `Predicate`. A dialect
 * package (`@qadi/predicate-sql`, `@qadi/predicate-prisma`) is a *renderer* of
 * that meaning into one grammar, and before this module each of them also
 * re-derived the meaning: what a safe literal is, what `Compare` means against
 * NULL and against a non-number, that an empty `MemberOf` is false, which column
 * names are refused, how large an `IN` list may be. Those are properties of
 * `evaluatePredicate`, not of SQL or Prisma, and the copies drifted (CCR-QD-120,
 * and the Prisma `Negate` defect of CCR-QD-153). Here they are stated once,
 * beside the thing they describe, and a renderer matches on `RenderableNode` and
 * emits syntax.
 *
 * Core still emits no dialect text and acquires no dependency (ADR-QD-024,
 * ADR-QD-054); `RenderableNode` is a new output type, not a new AST, and like
 * `Predicate` it is hand-written with no `Schema` (ADR-QD-002): it is produced
 * and consumed in one process.
 *
 * The one thing core accepts that it did not before is a *declaration* of which
 * columns may hold NULL (`ColumnNullability`). It never folds anything on the
 * strength of one, so a wrong declaration can only make a renderer under-admit
 * or fail loudly, never admit a row `evaluatePredicate` denies (ADR-QD-077).
 */
import * as Arr from "effect/Array";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import { PredicateNotRenderable } from "./Errors.ts";
import type { RenderRefusal } from "./Errors.ts";
import { evaluatePredicate } from "./Predicate.ts";
import type { Predicate } from "./Predicate.ts";
import { isRangeBound, isRenderableIdentifier, isSafeLiteral } from "./PredicateLiteral.ts";
import type { IdentifierRule, SafeLiteral } from "./PredicateLiteral.ts";

// ---------------------------------------------------------------------------
// Rules
// ---------------------------------------------------------------------------

/**
 * Which columns may hold NULL, as the caller declares it.
 *
 * - `Unknown`: nothing is declared, so every column may. This is what a
 *   schema-blind renderer assumes and what keeps `compileSql`'s output
 *   byte-identical to what it was before declarations existed.
 * - `Declared`: only the named columns may. A column outside the set is NOT NULL.
 *
 * A declaration, never an inspection: no package here opens a connection or reads
 * a schema.
 */
export type ColumnNullability =
  | { readonly _tag: "Unknown" }
  | { readonly _tag: "Declared"; readonly nullable: ReadonlySet<string> };

/**
 * How the target treats `NOT` over an UNKNOWN operand.
 *
 * - `TwoValued`: the renderer makes `NOT` two-valued itself (`@qadi/predicate-sql`
 *   renders `CASE WHEN (inner) THEN FALSE ELSE TRUE END`), so a leaf needs no
 *   help under a `Negate`.
 * - `ThreeValued`: `NOT` is the target's own (`@qadi/predicate-prisma`'s
 *   `{NOT: inner}`), so SQL's `NOT UNKNOWN` is `UNKNOWN` and a leaf on a nullable
 *   column under an odd number of `Negate`s must be made definite.
 */
export type Negation = "TwoValued" | "ThreeValued";

/**
 * What a leaf does about NULL, derived rather than restated.
 *
 * - `None`: render the plain filter.
 * - `AdmitNull`: also admit a NULL-valued row, for a leaf `evaluatePredicate`
 *   answers `true` on NULL (`Neq`, or a `MemberOf` holding a `null` member).
 * - `ExcludeNull`: make the leaf definitely FALSE rather than UNKNOWN on a
 *   NULL-valued row. Only for `ThreeValued` negation, and only under an odd number
 *   of `Negate`s.
 */
export type NullGuard = "None" | "AdmitNull" | "ExcludeNull";

/** The rules a renderer declares to `toRenderable`. */
export interface RenderRules {
  /** How strictly a column name is constrained. */
  readonly identifiers: IdentifierRule;
  /** Column names that are refused because the *target* gives them a meaning (Prisma's `AND`, `not`, …). */
  readonly reservedColumns: ReadonlySet<string>;
  /** A `MemberOf` with more members than this is refused. */
  readonly maxInValues: number;
  readonly nullability: ColumnNullability;
  readonly negation: Negation;
}

/** The default `RenderRules.maxInValues`: an unbounded `IN` is a resource-exhaustion vector. */
export const DEFAULT_MAX_IN_VALUES = 1000;

// ---------------------------------------------------------------------------
// The renderable tree
// ---------------------------------------------------------------------------

/** A literal that can be compared for equality: a `SafeLiteral` that is not `null`. */
export type EqualityLiteral = string | number | boolean;

/**
 * A `Predicate`, classified.
 *
 * Every `Compare`/`MemberOf` is already validated (safe column, safe values,
 * bounded list), every NULL decision is already made (`IsNull`, `nullGuard`), and
 * `Gte`/`Lt` on a non-number is already a `Constant`. A renderer has nothing left
 * to refuse and nothing left to decide.
 *
 * - `Equals` with `negated: false` is `Eq`, with `negated: true` is `Neq`.
 * - `Range`'s `bound` is always a finite number (`isRangeBound`).
 * - `OneOf`'s `values` are the non-`null` members of a `MemberOf`, non-empty by
 *   construction; a `null` member is carried by `nullGuard: "AdmitNull"`.
 * - No folding: `All`, `Any` and `Not` preserve the AST's structure, which is what
 *   "renders exactly what the AST says" means. Folding a constant is a workaround
 *   some target needs (Prisma's vacuous identities), so it lives in that renderer.
 */
export type RenderableNode =
  | { readonly _tag: "Constant"; readonly value: boolean }
  | { readonly _tag: "IsNull"; readonly column: string; readonly negated: boolean }
  | {
      readonly _tag: "Equals";
      readonly column: string;
      readonly negated: boolean;
      readonly value: EqualityLiteral;
      readonly nullGuard: NullGuard;
    }
  | {
      readonly _tag: "Range";
      readonly column: string;
      readonly op: "Gte" | "Lt";
      readonly bound: number;
      readonly nullGuard: NullGuard;
    }
  | {
      readonly _tag: "OneOf";
      readonly column: string;
      readonly values: readonly [EqualityLiteral, ...ReadonlyArray<EqualityLiteral>];
      readonly nullGuard: NullGuard;
    }
  | { readonly _tag: "All"; readonly parts: ReadonlyArray<RenderableNode> }
  | { readonly _tag: "Any"; readonly parts: ReadonlyArray<RenderableNode> }
  | { readonly _tag: "Not"; readonly inner: RenderableNode };

// ---------------------------------------------------------------------------
// Classification
// ---------------------------------------------------------------------------

type Polarity = "Positive" | "Negative";

/** Per-call state a module-scope matcher cannot close over. */
interface Classify {
  readonly rules: RenderRules;
  readonly polarity: Polarity;
}

type Classified = Result.Result<RenderableNode, PredicateNotRenderable>;

/** Annotates the success type, so an arm's `{ _tag: "Constant", … }` is not widened to `{ _tag: string }`. */
const ok = (node: RenderableNode): Classified => Result.succeed(node);

const refuse = (
  predicateTag: "Compare" | "MemberOf",
  refusal: RenderRefusal,
  reason: string,
): Result.Result<never, PredicateNotRenderable> =>
  Result.fail(new PredicateNotRenderable({ predicateTag, refusal, reason }));

/** The first column refusal, or `undefined` when the column is renderable. */
const columnRefusal = (
  predicateTag: "Compare" | "MemberOf",
  column: string,
  rules: RenderRules,
): Result.Result<never, PredicateNotRenderable> | undefined => {
  if (!isRenderableIdentifier(column, rules.identifiers)) {
    return refuse(predicateTag, "UnsafeColumn", `column '${column}' is not a safe identifier`);
  }
  // The same text as `UnsafeColumn`, deliberately: a reserved name is unsafe *for
  // this target*, and the reason strings are pinned by the packages' tests.
  if (rules.reservedColumns.has(column)) {
    return refuse(predicateTag, "ReservedColumn", `column '${column}' is not a safe identifier`);
  }
  return undefined;
};

const nullOnRequired = (predicateTag: "Compare" | "MemberOf", column: string) =>
  refuse(
    predicateTag,
    "NullOnNonNullableColumn",
    `column '${column}' is declared NOT NULL; a null comparison is not renderable`,
  );

/** Whether the caller declared `column` NOT NULL. `Unknown` declares nothing. */
const isRequired = (nullability: ColumnNullability, column: string): boolean =>
  nullability._tag === "Declared" && !nullability.nullable.has(column);

/**
 * `(nullability, whenNull, negation, polarity) -> NullGuard`, a table, never a
 * `switch` (AGENTS.md §5a). A column declared NOT NULL is always `None`: it never
 * holds NULL, and a renderer may not mention `null` for it.
 */
const NULL_GUARD: Record<
  "Required" | "Nullable",
  Record<"Admits" | "Denies", Record<Negation, Record<Polarity, NullGuard>>>
> = {
  Required: {
    Admits: {
      TwoValued: { Positive: "None", Negative: "None" },
      ThreeValued: { Positive: "None", Negative: "None" },
    },
    Denies: {
      TwoValued: { Positive: "None", Negative: "None" },
      ThreeValued: { Positive: "None", Negative: "None" },
    },
  },
  Nullable: {
    Admits: {
      TwoValued: { Positive: "AdmitNull", Negative: "AdmitNull" },
      ThreeValued: { Positive: "AdmitNull", Negative: "AdmitNull" },
    },
    Denies: {
      TwoValued: { Positive: "None", Negative: "None" },
      ThreeValued: { Positive: "None", Negative: "ExcludeNull" },
    },
  },
};

/**
 * The null guard for a leaf. What the leaf means on NULL is
 * `evaluatePredicate(leaf, {[column]: null})` itself, so the reference's answer
 * decides it and there is no second belief kept beside it.
 */
const nullGuardFor = (leaf: Predicate, column: string, ctx: Classify): NullGuard =>
  NULL_GUARD[isRequired(ctx.rules.nullability, column) ? "Required" : "Nullable"][
    evaluatePredicate(leaf, { [column]: null }) ? "Admits" : "Denies"
  ][ctx.rules.negation][ctx.polarity];

const isEqualityLiteral = (value: SafeLiteral): value is EqualityLiteral => value !== null;

const FLIP: Record<Polarity, Polarity> = { Positive: "Negative", Negative: "Positive" };

// A module-scope `Match.type<Predicate>()`, built once (AGENTS.md §5a). Each arm
// returns a function of the per-call `Classify` state, the shape
// `@qadi/predicate-sql`'s own dispatcher uses, and the recursive annotation
// breaks the inference cycle. The classifier is a pure function returning a
// `Result`, so it needs no `Effect.fn` per node (§5): only `toRenderable`, the
// entry point, is traced.
//
// **Sequential, first refusal wins**, which `Result.all` does and which matches
// what an `Effect.forEach` over the children did in each renderer before: a
// refusal deep in a tree is the leftmost one.
const dispatch: (predicate: Predicate) => (ctx: Classify) => Classified = Match.type<Predicate>().pipe(
  Match.tagsExhaustive({
    True: () => () => ok({ _tag: "Constant", value: true }),
    False: () => () => ok({ _tag: "Constant", value: false }),

    Compare: (p) => (ctx: Classify) => {
      const refusedColumn = columnRefusal("Compare", p.column, ctx.rules);
      if (refusedColumn !== undefined) return refusedColumn;
      // Checked into a local first: a type predicate narrows a variable it is
      // called on, not a property read twice (`p.value`).
      const { value } = p;
      if (!isSafeLiteral(value)) {
        return refuse(
          "Compare",
          "UnsafeValue",
          `value for column '${p.column}' is not a safe query parameter`,
        );
      }
      // `evaluatePredicate`'s `Gte`/`Lt` are false unless *both* sides are numbers
      // and the bound is finite, so anything else is a constant `false`, not a
      // comparison the target would coerce: `int_col >= '10'` is admitted by
      // PostgreSQL, SQLite and MySQL alike, and `null >= x` is not a question a
      // renderer should ask.
      if (p.op === "Gte" || p.op === "Lt") {
        if (!isRangeBound(value)) return ok({ _tag: "Constant", value: false });
        return ok({
          _tag: "Range",
          column: p.column,
          op: p.op,
          bound: value,
          nullGuard: nullGuardFor(p, p.column, ctx),
        });
      }
      if (value === null) {
        // A null comparison on a column declared NOT NULL refuses rather than
        // folding to a constant: a constant could over-admit under a `Negate`
        // if the declaration were wrong.
        if (isRequired(ctx.rules.nullability, p.column)) return nullOnRequired("Compare", p.column);
        return ok({ _tag: "IsNull", column: p.column, negated: p.op === "Neq" });
      }
      return ok({
        _tag: "Equals",
        column: p.column,
        negated: p.op === "Neq",
        value,
        nullGuard: nullGuardFor(p, p.column, ctx),
      });
    },

    MemberOf: (p) => (ctx: Classify) => {
      const refusedColumn = columnRefusal("MemberOf", p.column, ctx.rules);
      if (refusedColumn !== undefined) return refusedColumn;
      // `[].includes(x)` is always false: the correct, not degenerate, rendering,
      // and never an invalid or ambiguous `IN ()`.
      if (p.values.length === 0) return ok({ _tag: "Constant", value: false });
      if (p.values.length > ctx.rules.maxInValues) {
        return refuse(
          "MemberOf",
          "TooManyValues",
          `${p.values.length} values exceeds maxInValues (${ctx.rules.maxInValues})`,
        );
      }
      // `.filter(isSafeLiteral)` narrows the array's type, and the length check
      // proves it dropped nothing: a type-level narrowing, not a behavior change.
      const safe = p.values.filter(isSafeLiteral);
      if (safe.length !== p.values.length) {
        return refuse(
          "MemberOf",
          "UnsafeValue",
          `a value for column '${p.column}' is not a safe query parameter`,
        );
      }
      // A `null` member is not an equality: `col IN (NULL, …)` never matches a
      // NULL row, and Prisma refuses `{in: [null]}` outright. It is carried by the
      // guard instead (`AdmitNull`). On a column declared NOT NULL it is dropped,
      // which can only under-admit.
      const nonNull = safe.filter(isEqualityLiteral);
      if (!Arr.isReadonlyArrayNonEmpty(nonNull)) {
        // Every member was `null`: `MemberOf [null]` is `Compare Eq null`.
        if (isRequired(ctx.rules.nullability, p.column)) return nullOnRequired("MemberOf", p.column);
        return ok({ _tag: "IsNull", column: p.column, negated: false });
      }
      return ok({
        _tag: "OneOf",
        column: p.column,
        values: nonNull,
        nullGuard: nullGuardFor(p, p.column, ctx),
      });
    },

    // An empty `predicates` array is unreachable through `toPredicate`, but
    // `Predicate` is directly constructible; `All []`/`Any []` stay what
    // `evaluatePredicate`'s `.every`/`.some` make them, and the renderer prints
    // them as its own `TRUE`/`FALSE`.
    And: (p) => (ctx: Classify) =>
      Result.map(
        Result.all(p.predicates.map((inner) => classify(inner, ctx))),
        (parts): RenderableNode => ({ _tag: "All", parts }),
      ),

    Or: (p) => (ctx: Classify) =>
      Result.map(
        Result.all(p.predicates.map((inner) => classify(inner, ctx))),
        (parts): RenderableNode => ({ _tag: "Any", parts }),
      ),

    // No double-negation elimination, and `Negate` flips polarity: a leaf under
    // an odd number of them is what a three-valued `NOT` would otherwise drop.
    Negate: (p) => (ctx: Classify) =>
      Result.map(
        classify(p.predicate, { rules: ctx.rules, polarity: FLIP[ctx.polarity] }),
        (inner): RenderableNode => ({ _tag: "Not", inner }),
      ),
  }),
);

const classify = (predicate: Predicate, ctx: Classify): Classified => dispatch(predicate)(ctx);

/**
 * Classifies a `Predicate` into a `RenderableNode` under a renderer's `RenderRules`,
 * or refuses with `PredicateNotRenderable`.
 *
 * Refuses rather than approximates (ADR-QD-024): an unsafe column or value, a
 * reserved column, a `MemberOf` past `maxInValues`, a null comparison on a column
 * declared NOT NULL. The first refusal in left-to-right order wins. Everything
 * else renders: `evaluatePredicate`'s meaning is preserved in two-valued logic,
 * and the `nullGuard`s say what a three-valued target needs on top.
 */
export const toRenderable = Effect.fn("qadi.predicate.toRenderable")(function* (
  predicate: Predicate,
  rules: RenderRules,
) {
  return yield* Effect.fromResult(classify(predicate, { rules, polarity: "Positive" }));
});
