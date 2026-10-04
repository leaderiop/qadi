/**
 * Compiles a `Predicate` into a Prisma `WhereInput`.
 *
 * `@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and
 * deliberately stops there (ADR-QD-024). `@qadi/core` still gains no
 * dependency on Prisma through this package existing — this is the companion
 * ADR-QD-054 authorizes: optional, separately versioned, installed only by a
 * caller who wants it.
 *
 * This package is a *renderer*. What a `Predicate` may hold and what it means —
 * which values are safe, what `Compare` means against NULL and against a
 * non-number, that an empty `MemberOf` is false, which columns are refused, how
 * large an `in` list may be — is `@qadi/core`'s `toRenderable` (ADR-QD-077); it
 * hands this module a closed `RenderableNode` tree with every decision already
 * made. What is left here is what only Prisma has: its filter grammar, and the
 * vacuous-identity folding its query engine needs (`isVacuousTrue`).
 *
 * See `spec/behaviors/31-predicate-compilation.md`.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as P from "effect/Predicate";
import { DEFAULT_MAX_IN_VALUES, toRenderable } from "@qadi/core";
import type {
  IdentifierRule,
  NullGuard,
  Predicate,
  RenderableNode,
  RenderRules,
} from "@qadi/core";

export { PredicateNotRenderable } from "@qadi/core";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

/**
 * The one schema fact `compilePrismaWhere` needs: which columns accept NULL,
 * plus the two optional knobs every renderer shares.
 *
 * `nullable` is a declaration, never an inspection — this package still never
 * opens a connection or reads a schema (ADR-QD-054). `nullableFieldsOf` derives
 * it from a Prisma DMMF model that keeps `isRequired` (`getDMMF` from
 * `@prisma/internals`); Prisma 7's runtime `Prisma.dmmf` strips that field, so a
 * caller without such a DMMF writes the set out.
 *
 * Required, not optional (CCR-QD-153): a schema-blind renderer cannot emit one
 * leaf valid on both kinds of column. Prisma refuses every filter that mentions
 * `null` on a required field, and a plain `NOT` over a nullable column's
 * comparison drops the NULL rows `evaluatePredicate` admits. A wrong declaration
 * can only under-admit (declared NOT NULL but nullable: no guards, and a
 * three-valued `NOT` can only lose rows) or fail loudly (declared nullable but
 * required: Prisma refuses the `null` mention) — never admit a row the predicate
 * denies.
 */
export interface CompilePrismaWhereOptions {
  readonly nullable: ReadonlySet<string>;
  /**
   * Refuses a `MemberOf` whose member count exceeds this. Default 1000
   * (ADR-QD-077): an unbounded `in` is the same resource-exhaustion vector
   * whichever grammar carries it.
   */
  readonly maxInValues?: number;
  /** How strictly a column name is constrained. Default `"Ascii"`. */
  readonly identifiers?: IdentifierRule;
}

/**
 * The structural slice of a Prisma DMMF field this package reads. No
 * dependency on `@prisma/client`: a DMMF model's `fields` satisfies it as is.
 */
export interface PrismaFieldLike {
  readonly name: string;
  readonly isRequired: boolean;
  readonly kind: string;
}

/** The structural slice of a Prisma DMMF model this package reads. */
export interface PrismaModelLike {
  readonly fields: ReadonlyArray<PrismaFieldLike>;
}

/**
 * The columns of a Prisma model that accept NULL.
 *
 * A field counts when it is a column (`kind !== "object"` — a relation field is
 * not one) and is not required.
 */
export const nullableFieldsOf = (model: PrismaModelLike): ReadonlySet<string> =>
  new Set(
    model.fields
      .filter((field) => field.kind !== "object" && !field.isRequired)
      .map((field) => field.name),
  );

/**
 * A Prisma `where` filter, generic in the model.
 *
 * Not narrowed to a generated model's own `WhereInput` type — this package
 * never sees a schema, so it cannot claim a narrower one without generating
 * one, which is exactly the "acquire a schema-shaped dependency" cost
 * ADR-QD-054 keeps this package from taking on. This is a deliberate boundary
 * type, not unmonomorphized internal widening: a caller assigns the result to
 * their generated model's `WhereInput` at the call site, where the real shape
 * is known.
 */
export type PrismaWhereInput = Record<string, unknown>;

/**
 * The names Prisma gives meaning to inside a `WhereInput`: a column named one of
 * these is passed to `toRenderable` as `reservedColumns` and refused.
 *
 * `AND`/`OR`/`NOT` are Prisma's own combinator keys at every `WhereInput`
 * level: a column literally named one changes what the object means instead
 * of failing to render — `{NOT: "t-1"}` negates rather than comparing, and
 * `{AND: …}`/`{OR: …}` collide with the array forms this compiler emits for
 * `Predicate.And`/`Or`.
 *
 * The rest of the set (ticket 136) is Prisma's scalar-filter operator
 * vocabulary — `equals`/`not`/`in`/`notIn`/`lt`/`lte`/`gt`/`gte`/`is`/
 * `isNot` — the keys a nested filter object uses one level below a field
 * name. A column literally named one of these does not fail to render:
 * `renderNode` still emits a structurally valid `WhereInput` fragment, e.g.
 * `{gte: {gte: value}}` for a `Compare` on a column named `"gte"`. Prisma
 * then either rejects it at query time (no such model field, a failure this
 * package could have given a clearer reason for at compile time) or, if the
 * model happens to have a field by that name, resolves it as an ordinary
 * field rather than the operator the column name suggests — compiling
 * successfully to something the column name did not mean, the same failure
 * mode `AND`/`OR`/`NOT` already guard against. Refused here rather than
 * escaped, since there is no escaping a JS object key — only choosing not to
 * use it as one. Matching is case-sensitive, as it already was for
 * `AND`/`OR`/`NOT`: Prisma's own keys are exact-case, and so is this check.
 *
 * This is the one rule here that is about Prisma's *syntax* rather than about
 * what a predicate means, which is why it stays in this package: it is the
 * reserved set a `RenderRules` declares, not a leaf rule core owns (ADR-QD-077).
 */
const RESERVED_PRISMA_KEYS: ReadonlySet<string> = new Set([
  "AND",
  "OR",
  "NOT",
  "equals",
  "not",
  "in",
  "notIn",
  "lt",
  "lte",
  "gt",
  "gte",
  "is",
  "isNot",
]);

/**
 * `renderNode`'s own vacuous-identity shapes — `{AND: []}` (always matches,
 * `True`'s and an empty `And`'s rendering) and `{OR: []}` (never matches,
 * `False`'s and an empty `Or`'s rendering, and `MemberOf`'s own empty-values
 * case).
 *
 * `And`, `Or` and `Negate` all special-case these — not `Negate` alone —
 * because the real Prisma query-compiler does not treat a vacuous identity
 * *reached below the top level of the compiled query* as its designed
 * meaning. Verified against Prisma 7.10's engine source: `extract_filter`
 * (query-compiler/core/src/query_graph_builder/extractors/filters/mod.rs)
 * strips an empty `AND`/`OR` filter reached below the top level to
 * `Filter::Empty` ("no restriction"), regardless of which of the two it is
 * or which combinator contains it — confirmed black-box against a live
 * engine, not merely read from source: Prisma issue #17367's own repro is
 * `{AND: [{email: "…"}, {OR: []}]}` returning the `email` row (the `{OR:
 * []}` member is *dropped* from the `AND` list rather than forcing it
 * false), and a comment on that issue confirms an empty `AND` array
 * nested the same way is dropped identically, not merely `OR`'s. Issue
 * #21856 shows the `NOT` case: `{NOT: {AND: []}}}` — a `Filter::not([])`
 * once the inner empty `AND` strips to nothing — incorrectly returns every
 * row instead of none (`filter/visitor.rs` maps `Filter::not([])` to
 * `ConditionTree::NoCondition`, not a negation of the stripped filter), and
 * `{AND: {OR: []}}}` (an `AND` wrapping a single vacuous-false operand)
 * incorrectly returns every row too, the same "stripped to no restriction"
 * mechanism from the other combinator.
 *
 * `renderNode`'s answer is to never let a vacuous identity be *reached*
 * below the top level in the first place, rather than lean on the engine to
 * survive folding it does not perform correctly: `All`/`Any` constant-fold
 * every child immediately (see their arms below) so a `{AND: []}`/
 * `{OR: []}` produced anywhere in the tree either collapses the whole
 * combinator at that level or is dropped from it before the result is ever
 * handed to a caller — a vacuous identity in this compiler's output can
 * only ever be the very shape returned to the caller, never a member deeper
 * in it. `Not` still special-cases its own immediate child on top of
 * that, for the same reason: `All`/`Any` fold what they build themselves,
 * but `Not`'s child could independently already reduce to a bare `Constant`
 * or empty combinator, which nothing else folds.
 *
 * This folding is a workaround for Prisma's engine bugs, not a leaf rule, so it
 * stays in this renderer: core's classifier preserves structure exactly
 * (ADR-QD-077).
 */
const isVacuousTrue = (where: PrismaWhereInput): boolean => {
  const keys = Object.keys(where);
  return keys.length === 1 && Array.isArray(where.AND) && where.AND.length === 0;
};
const isVacuousFalse = (where: PrismaWhereInput): boolean => {
  const keys = Object.keys(where);
  return keys.length === 1 && Array.isArray(where.OR) && where.OR.length === 0;
};

/**
 * The shape of a leaf: a field filter, and what its null guard adds (CCR-QD-153).
 *
 * `null` never reaches these tables as an operand: `toRenderable` turned a null
 * comparison into `IsNull` and carried a `null` `MemberOf` member as an
 * `AdmitNull` guard, because Prisma's `{not: null}`/`{equals: null}` already
 * mean `IS [NOT] NULL` correctly, but `{gte: null}`/`{lt: null}` and `{in:
 * [null, ...]}` are a validation error it refuses outright (found by running a
 * compiled `WhereInput` against a real, SQLite-backed Prisma client).
 *
 * `ExcludeNull` is what a `Negate` over a nullable column needs, because
 * Prisma's `{NOT: inner}` is a three-valued `NOT`: SQL's `NOT UNKNOWN` is
 * `UNKNOWN`, which `WHERE` excludes, where `evaluatePredicate`'s `!false` is
 * `true`. Making the leaf definite (`not: null`) is the only way a `WhereInput`
 * can say what `@qadi/predicate-sql`'s `CASE WHEN` says.
 *
 * Composed, not enumerated: one table of field filters by operator and one of
 * guards, rather than a cell per (operator, guard) pair. Several of those pairs
 * cannot occur (the reference admits NULL on a `Neq` and denies it on the rest, so
 * a `Neq` is never `ExcludeNull` and the others never `AdmitNull`), and a table
 * with a cell for each would carry code no input reaches.
 *
 * Module-scope `Record`s of shape-builders, not `Match.value` rebuilt per call
 * (RH-01): the dispatch itself has no per-call state, only the value each shape
 * closes over does, and `@qadi/predicate-sql`'s sibling tables make the
 * identical choice for the same reason (AGENTS.md §5a).
 */
const FILTER: Record<"Eq" | "Neq" | "Gte" | "Lt", (value: unknown) => unknown> = {
  Eq: (value) => value,
  Neq: (value) => ({ not: value }),
  Gte: (value) => ({ gte: value }),
  Lt: (value) => ({ lt: value }),
};

const orNull = (plain: PrismaWhereInput, column: string): PrismaWhereInput => ({
  OR: [plain, { [column]: null }],
});

/**
 * `filter` made definite on a NULL-valued row: `not: null` joined to it.
 *
 * A scalar filter (`Eq`) becomes `{equals, not}` and an operator object just gains
 * `not` (`{gte: 3}` becomes `{gte: 3, not: null}`). The one filter that already
 * holds `not` (a `Neq`) cannot take a second, so it is conjoined instead — a shape
 * `toRenderable` never asks for (a `Neq` admits NULL, so it is guarded with
 * `AdmitNull`), kept correct rather than silently overwritten.
 */
const excludeNull = (column: string, filter: unknown): PrismaWhereInput => {
  if (!P.isObject(filter)) return { [column]: { equals: filter, not: null } };
  if ("not" in filter) return { AND: [{ [column]: filter }, { [column]: { not: null } }] };
  return { [column]: { ...filter, not: null } };
};

const GUARDED: Record<NullGuard, (column: string, filter: unknown) => PrismaWhereInput> = {
  None: (column, filter) => ({ [column]: filter }),
  AdmitNull: (column, filter) => orNull({ [column]: filter }, column),
  ExcludeNull: excludeNull,
};

/**
 * Renders one node.
 *
 * `Constant` maps to Prisma's own vacuous identities — `{AND: []}` (all of zero
 * conditions: true) and `{OR: []}` (any of zero conditions: false) — matching
 * `evaluatePredicate`'s own `.every`/`.some` on an empty array, the same choice
 * `@qadi/predicate-sql` makes for its empty `All`/`Any` case. **This is only ever
 * the emitted shape at the top of the compiled query.** A vacuous identity is
 * never left nested inside `AND`/`OR`/`NOT` in this compiler's output — see
 * `isVacuousTrue` above for why a nested one is not safe to hand to Prisma's
 * real query engine (CCR-QD-111): `All`/`Any` constant-fold every rendered child
 * before returning, and `Not` folds its own child on top of that, so the only
 * place `{AND: []}`/`{OR: []}` can appear in a value this function returns is the
 * value itself, never inside one of its own `AND`/`OR`/`NOT` members. An earlier
 * version nested children verbatim — correct against `evaluatePredicate`'s own
 * semantics, wrong against Prisma's, which silently drops a nested vacuous
 * identity or fails to negate it (Prisma issues #17367, #21856) — so e.g.
 * `allOf([hasResourceAttribute("role", inArray([])), tenantEq])`, meant to deny
 * role-less users unconditionally, compiled to a query that admitted them.
 *
 * Total and pure: every refusal was made by `toRenderable` before this runs.
 */
// A module-scope `Match.type<RenderableNode>()`, built once (AGENTS.md §5a)
// rather than `Match.value(node)` rebuilt on every call — `renderNode` recurses
// once per node, the exact per-node-evaluation shape §5a calls out. There is no
// per-call state to close over here (the null guards were decided in core), so
// the recursive dispatcher annotation alone (`: (self: X) => Y`, breaking the
// inference cycle) is enough; the arms' own recursive calls to `renderNode` are
// fine since they only run later.
const renderNode: (node: RenderableNode) => PrismaWhereInput = Match.type<RenderableNode>().pipe(
  Match.tagsExhaustive({
    Constant: (n) => (n.value ? { AND: [] } : { OR: [] }),

    // Prisma's `{not: null}`/`{col: null}` mean `IS [NOT] NULL` correctly.
    IsNull: (n) => ({ [n.column]: n.negated ? { not: null } : null }),

    Equals: (n) => GUARDED[n.nullGuard](n.column, FILTER[n.negated ? "Neq" : "Eq"](n.value)),

    Range: (n) => GUARDED[n.nullGuard](n.column, FILTER[n.op](n.bound)),

    OneOf: (n) => GUARDED[n.nullGuard](n.column, { in: n.values }),

    // An empty `parts` array is unreachable through `toPredicate`, but
    // `Predicate` is directly constructible — `{AND: []}`/`{OR: []}` still
    // agree with `evaluatePredicate`'s `.every`/`.some` on that input, and is
    // exactly the case `nonVacuousTrue`/`nonVacuousFalse` below reduce an
    // all-vacuous or already-empty `parts` list to.
    //
    // Constant-folds every rendered child rather than nesting `parts`
    // verbatim (C1, CCR-QD-111) — see `isVacuousTrue`/`isVacuousFalse` above
    // for why a nested `{AND: []}`/`{OR: []}` is not safe to hand to Prisma's
    // real query engine. A genuinely-false child forces the whole `All` false
    // unconditionally, so it is reported at THIS level (`{OR: []}`) rather
    // than left nested where the engine silently drops it; a genuinely-true
    // child changes nothing about an `All`, so it is dropped from the array —
    // both are recursive by construction, since each child was itself already
    // fully folded by this same arm (or `Any`'s) before `renderNode` returns
    // it here.
    All: (n) => {
      const parts = n.parts.map(renderNode);
      if (parts.some(isVacuousFalse)) return { OR: [] };
      const nonVacuousTrue = parts.filter((part) => !isVacuousTrue(part));
      return nonVacuousTrue.length === 0 ? { AND: [] } : { AND: nonVacuousTrue };
    },

    // The `Any` mirror of `All` above: a genuinely-true child forces the whole
    // `Any` true unconditionally (reported at this level, `{AND: []}`), and a
    // genuinely-false child is dropped, since it changes nothing about an `Any`.
    Any: (n) => {
      const parts = n.parts.map(renderNode);
      if (parts.some(isVacuousTrue)) return { AND: [] };
      const nonVacuousFalse = parts.filter((part) => !isVacuousFalse(part));
      return nonVacuousFalse.length === 0 ? { OR: [] } : { OR: nonVacuousFalse };
    },

    // No double-negation elimination — `toRenderable` preserves structure and
    // this compiler renders exactly what the tree says. The one exception is the
    // vacuous-identity shapes themselves: see `isVacuousTrue`/`isVacuousFalse`
    // for why `{NOT: {AND: []}}`/`{NOT: {OR: []}}` cannot be left for the real
    // Prisma engine to fold. Folding here only ever sees `n.inner`'s own
    // top-level shape — `All`/`Any` above already guarantee nothing nested inside
    // it is vacuous, so this check is exactly as much as `Not` needs, not a
    // partial guard.
    Not: (n) => {
      const inner = renderNode(n.inner);
      if (isVacuousTrue(inner)) return { OR: [] };
      if (isVacuousFalse(inner)) return { AND: [] };
      return { NOT: inner };
    },
  }),
);

/**
 * Compile volume and refusal rate, by outcome. Declared once, module scope —
 * mirrors `@qadi/predicate-sql`'s own precedent, itself mirroring
 * `@qadi/core`'s `Predicate.ts`. Effect's `Metric` registry keys on
 * `type:id:description` and memoizes per metric *object*; declaring either
 * inside `compilePrismaWhere`'s body would either fail to register the way
 * this does, or create an unscoped object per call nothing can aggregate.
 */
const compiledTotal = Metric.counter("qadi_predicate_prisma_compiled_total", {
  description: "Predicates compiled by @qadi/predicate-prisma's compilePrismaWhere, tagged by outcome.",
});
const compiledSucceededTotal = Metric.withAttributes(compiledTotal, { outcome: "compiled" });
const compiledRefusedTotal = Metric.withAttributes(compiledTotal, { outcome: "refused" });

/**
 * Compiles a `Predicate` into a Prisma `WhereInput`.
 *
 * Refuses rather than approximates: an unsafe `Compare`/`MemberOf` value or
 * column, a column Prisma reserves, a `MemberOf` past `maxInValues`, or a null
 * comparison on a column declared NOT NULL fails `PredicateNotRenderable`
 * (`@qadi/core`'s, re-exported here) rather than being handed to Prisma's query
 * engine.
 *
 * `options.nullable` declares which columns accept NULL (CCR-QD-153); see
 * `CompilePrismaWhereOptions`. See `spec/behaviors/31-predicate-compilation.md`.
 */
export const compilePrismaWhere = Effect.fn("qadi.predicatePrisma.compilePrismaWhere")(
  function* (predicate: Predicate, options: CompilePrismaWhereOptions) {
    const rules: RenderRules = {
      identifiers: options.identifiers ?? "Ascii",
      reservedColumns: RESERVED_PRISMA_KEYS,
      maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
      nullability: { _tag: "Declared", nullable: options.nullable },
      // Prisma's `{NOT: inner}` is the target's own, three-valued `NOT`.
      negation: "ThreeValued",
    };
    const node = yield* toRenderable(predicate, rules).pipe(
      Effect.tapError(() => Metric.update(compiledRefusedTotal, 1)),
    );
    yield* Metric.update(compiledSucceededTotal, 1);
    return renderNode(node);
  },
);
