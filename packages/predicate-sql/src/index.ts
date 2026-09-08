/**
 * Compiles a `Predicate` into SQL — PostgreSQL, MySQL, or SQLite.
 *
 * `@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and
 * deliberately stops there (ADR-QD-024). `@qadi/core` still gains no database
 * dependency of any kind through this package existing — this is the companion
 * ADR-QD-054 authorizes: optional, separately versioned, installed only by a
 * caller who wants it.
 *
 * The three dialects share one recursive renderer; what differs is a small
 * syntax table (identifier quoting, placeholder style). See
 * `spec/behaviors/31-predicate-compilation.md`.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import type { CompareOp, Predicate } from "@qadi/core";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SqlDialect = "postgres" | "mysql" | "sqlite";

/** A parameterized SQL fragment: `text` names placeholders, `params` binds them. */
export interface SqlFragment {
  readonly text: string;
  readonly params: ReadonlyArray<unknown>;
}

export interface CompileSqlOptions {
  readonly dialect: SqlDialect;
  /** Refuses a `MemberOf` whose member count exceeds this. Default 1000. */
  readonly maxInValues?: number;
}

/**
 * A `Predicate` this package refuses to render — an unsafe value, or a
 * `MemberOf` past `maxInValues`. Never thrown; a typed Effect failure, the
 * same shape `@qadi/core`'s `PolicyNotTranslatable` uses, declared here rather
 * than shared, since `@qadi/core` has no reason to know this error exists.
 *
 * `@qadi/predicate-prisma` declares its own `PredicateNotRenderable` with the
 * identical `_tag` (ticket 95) — deliberately, not an oversight ADR-QD-008's
 * "the `_tag` is the identity" would otherwise flag. The two are independent
 * declarations with identical shapes (`predicateTag`, `reason`), and neither
 * package imports the other's error type. The collision is benign because the
 * two packages are mutually exclusive in practice — a caller compiles to SQL
 * or to Prisma, not both from the same predicate — so no single
 * `Effect.catchTag`/`Match` site is expected to see both at once. If one ever
 * did, the two are structurally indistinguishable at that site by tag alone,
 * which is the cost of this choice, accepted rather than renaming either and
 * breaking a public API for a situation neither package's callers hit.
 */
export class PredicateNotRenderable extends Data.TaggedError("PredicateNotRenderable")<{
  readonly predicateTag: string;
  readonly reason: string;
}> {}

const DEFAULT_MAX_IN_VALUES = 1000;

// ---------------------------------------------------------------------------
// Dialect syntax table
// ---------------------------------------------------------------------------

interface DialectSyntax {
  readonly quote: (identifier: string) => string;
  /** `paramCount` is the 1-based position of the just-pushed parameter. */
  readonly placeholder: (paramCount: number) => string;
}

const SYNTAX: Record<SqlDialect, DialectSyntax> = {
  postgres: {
    quote: (id) => `"${id}"`,
    placeholder: (n) => `$${n}`,
  },
  mysql: {
    quote: (id) => `\`${id}\``,
    placeholder: () => "?",
  },
  sqlite: {
    quote: (id) => `"${id}"`,
    placeholder: () => "?",
  },
};

// `Neq` is deliberately excluded from this table's domain, not merely
// unused: it never renders as a simple "column op placeholder" shape — a
// NULL-valued column must still admit, which `renderNode`'s `Compare` case
// handles before this function is ever reached. Narrowing the parameter type
// (rather than leaving an exhaustive-but-dead "Neq" arm here) makes that
// unreachable by construction instead of by convention.
const compareOperator = (op: Exclude<CompareOp, "Neq">): string =>
  Match.value(op).pipe(
    Match.when("Eq", () => "="),
    Match.when("Gte", () => ">="),
    Match.when("Lt", () => "<"),
    Match.exhaustive,
  );

/**
 * `unknown`, safely: the only shapes a driver can bind as a parameter.
 *
 * Deliberately excludes `Date`, unlike an earlier version of this function —
 * `evaluatePredicate`'s `compare` (`@qadi/core`'s `Predicate.ts`) requires
 * `typeof value === "number"` for `Gte`/`Lt`, so a `Date` there is always
 * `false` in the reference evaluator, while a real SQL engine's `>=`/`<`
 * performs a real date comparison against the row — INV-QD-047 disagreement,
 * in the direction that matters: the compiled SQL would admit rows the
 * reference evaluator denies. `Eq`'s `===` has the same problem from the
 * other side — two distinct `Date` instances holding the same instant are
 * never `===`, so a `Date` `Eq` is reference-evaluator-false for any row a
 * caller would actually construct, while SQL's `=` matches correctly.
 * Refusing to compile a `Date`-valued `Compare`/`MemberOf` is the ADR-QD-024
 * "refuse rather than approximate" answer to a comparison the reference
 * evaluator does not actually support.
 *
 * The `number` branch requires `Number.isFinite` for the same reason
 * (CCR-QD-120), catching this package up to `@qadi/predicate-prisma`'s
 * already-correct sibling. `NaN`/`Infinity`/`-Infinity` all satisfy bare
 * `typeof value === "number"`, and the `Gte`/`Lt` render guard below excluded
 * only `NaN`, and only for those two operators — so a `Compare` with op
 * `Eq`/`Neq` (or a `MemberOf`) against `NaN` reached `params.push` and bound
 * `NaN` as a real parameter. PostgreSQL documents `NaN = NaN` as **true**,
 * unlike IEEE 754 and unlike `evaluatePredicate`'s `===`, which is false for
 * every row: an INV-QD-047 disagreement in the admit-more direction.
 * `Infinity`/`-Infinity` are ordinary numbers to `>=`/`<` on both sides, so
 * whether they diverge needs a real engine to settle — refusing all three
 * here is the same "refuse rather than approximate" answer as the `Date` case
 * above, given before that question has to be answered empirically.
 *
 * This widening supersedes the `Gte`/`Lt` guard's own `NaN` arm: a `NaN`
 * bound now *refuses* rather than rendering `FALSE`. `FALSE` was correct and
 * more precise, but it was correct for two operators out of four, and a
 * compiler that refuses a value in `Eq` while quietly folding it in `Gte` is
 * a second definition of "safe value" in one file. `@qadi/predicate-prisma`
 * already refuses all four; the two dialect packages now agree on which
 * predicates compile at all.
 */
const isSafeValue = (value: unknown): boolean =>
  value === null ||
  typeof value === "string" ||
  (typeof value === "number" && Number.isFinite(value)) ||
  typeof value === "boolean";

/**
 * A column identifier this package will quote and render.
 *
 * `Predicate.column` is a plain `string` on an AST that crosses a trust
 * boundary (AGENTS.md §7: policies are persisted and re-parsed from untrusted
 * JSON). Every dialect's `quote` wraps the identifier in a delimiter but never
 * doubles an embedded one, so a column like `x" = $1 OR 1=1 --` would escape
 * the identifier and start emitting SQL text. Values are parameterized and
 * therefore safe by construction; identifiers are interpolated and are not —
 * this is the one place `renderNode` builds SQL text from caller data, so it
 * is refused rather than escaped, matching `isSafeValue`'s policy above.
 */
const SAFE_IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;
const isSafeIdentifier = (column: string): boolean => SAFE_IDENTIFIER.test(column);

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Renders one node, pushing bound values into `params` as it goes.
 *
 * `params` is mutated rather than threaded, matching `Predicate.ts`'s own
 * `and`/`or` (`const kept: Array<Predicate> = []`) — this is a single-pass,
 * single-owner accumulator local to one `compileSql` call, not shared state.
 */
const renderNode = (
  predicate: Predicate,
  syntax: DialectSyntax,
  params: Array<unknown>,
  maxInValues: number,
): Effect.Effect<string, PredicateNotRenderable> =>
  Match.value(predicate).pipe(
    Match.tagsExhaustive({
      True: () => Effect.succeed("TRUE"),
      False: () => Effect.succeed("FALSE"),

      // `null` is on the safe allowlist but is not a value SQL's `=`/`!=`
      // can bind: `col = NULL` and `col != NULL` are never true for any row,
      // not even one where `col` genuinely `IS NULL` — SQL's three-valued
      // logic treats a NULL-valued side of any `=`/`!=` as unknown, and
      // `WHERE` excludes unknown. `evaluatePredicate`'s `===`/`!==` has no
      // such third value. This was a real defect, caught by running the
      // compiled SQL against a real engine, not designed in from the start:
      // the differential property test's own interpreter re-implements
      // `===`/`!==` in JS and so agreed with the bug rather than catching it.
      Compare: (p) => {
        if (!isSafeIdentifier(p.column)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `column '${p.column}' is not a safe identifier`,
            }),
          );
        }
        if (!isSafeValue(p.value)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        // evaluatePredicate's compare requires typeof === "number" on BOTH
        // sides for Gte/Lt and is otherwise always False — a string or
        // boolean slips past isSafeValue's allowlist (built for Eq/Neq's
        // `===`, where any of those compare validly) straight into a real
        // range comparison: PostgreSQL coerces `int_col >= '10'` to a number,
        // and SQLite/MySQL coerce via type affinity, admitting rows the
        // reference evaluator refused. `NaN` used to be excluded here too, on
        // the same numeric side — PostgreSQL orders NaN above every other
        // value rather than refusing the comparison, while `NaN >= x`/
        // `NaN < x` is always false in evaluatePredicate. It is excluded
        // earlier now, by `isSafeValue` itself (CCR-QD-120), which covers
        // Eq/Neq/MemberOf as well and refuses rather than folding to FALSE;
        // anything reaching this line that is `typeof === "number"` is
        // therefore already finite, so a plain `typeof` guard is all that is
        // left to do. Mirrors `@qadi/predicate-prisma`'s identical guard, and
        // this file's own FALSE for a null-literal Gte/Lt just below.
        if ((p.op === "Gte" || p.op === "Lt") && typeof p.value !== "number") {
          return Effect.succeed("FALSE");
        }
        const column = syntax.quote(p.column);
        if (p.value === null) {
          if (p.op === "Eq") return Effect.succeed(`${column} IS NULL`);
          if (p.op === "Neq") return Effect.succeed(`${column} IS NOT NULL`);
          // Gte/Lt against a null literal is handled by the numeric guard
          // above (typeof null !== "number").
          return Effect.succeed("FALSE");
        }
        params.push(p.value);
        const placeholder = syntax.placeholder(params.length);
        // Neq admits a NULL-valued column too — `null !== against` is true
        // for any non-null `against` — which plain `!=` alone would exclude.
        if (p.op === "Neq") return Effect.succeed(`(${column} != ${placeholder} OR ${column} IS NULL)`);
        return Effect.succeed(`${column} ${compareOperator(p.op)} ${placeholder}`);
      },

      MemberOf: (p) => {
        if (!isSafeIdentifier(p.column)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "MemberOf",
              reason: `column '${p.column}' is not a safe identifier`,
            }),
          );
        }
        // [].includes(x) is always false — the correct, not degenerate,
        // translation, and never rendered as an invalid or ambiguous IN ().
        if (p.values.length === 0) return Effect.succeed("FALSE");
        if (p.values.length > maxInValues) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "MemberOf",
              reason: `${p.values.length} values exceeds maxInValues (${maxInValues})`,
            }),
          );
        }
        if (p.values.some((value) => !isSafeValue(value))) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "MemberOf",
              reason: `a value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        const column = syntax.quote(p.column);
        // A `null` member needs its own `IS NULL`, for the same reason a
        // `null` Compare value does: `col IN (NULL, ...)` never matches even
        // a row where `col IS NULL`, because `col = NULL` inside IN's
        // expansion is unknown, not true.
        const hasNull = p.values.includes(null);
        const nonNull = p.values.filter((value) => value !== null);
        if (nonNull.length === 0) return Effect.succeed(`${column} IS NULL`);
        const placeholders = nonNull.map((value) => {
          params.push(value);
          return syntax.placeholder(params.length);
        });
        const inClause = `${column} IN (${placeholders.join(", ")})`;
        return Effect.succeed(hasNull ? `(${inClause} OR ${column} IS NULL)` : inClause);
      },

      // An empty `predicates` array is unreachable through `toPredicate`
      // (`and`/`or` simplify to True/False before ever building a node), but
      // `Predicate` is a plain hand-constructible type, so a caller-built one
      // is real input. "TRUE"/"FALSE" match `evaluatePredicate`'s own
      // `.every`/`.some` on an empty array, so the compiled fragment and the
      // reference interpreter still agree on this shape.
      And: (p) =>
        Effect.map(
          Effect.forEach(p.predicates, (inner) => renderNode(inner, syntax, params, maxInValues)),
          (parts) => (parts.length === 0 ? "TRUE" : `(${parts.join(" AND ")})`),
        ),

      Or: (p) =>
        Effect.map(
          Effect.forEach(p.predicates, (inner) => renderNode(inner, syntax, params, maxInValues)),
          (parts) => (parts.length === 0 ? "FALSE" : `(${parts.join(" OR ")})`),
        ),

      // No double-negation elimination. `Simplify.ts` never runs on a
      // `Predicate`, only on a `Policy`, and this compiler renders exactly
      // what the AST says — nesting is preserved even though the rendered
      // shape below is no longer a bare "NOT (NOT (...))".
      //
      // A plain `NOT (<inner>)` is not NULL-safe: SQL's three-valued logic
      // makes `NOT` of an UNKNOWN inner condition (any leaf comparing a
      // NULL-valued column — `Compare`'s `Eq`/`Gte`/`Lt` against a non-null
      // literal render a plain `col op $n`, which is UNKNOWN, not FALSE, when
      // `col IS NULL`) still UNKNOWN, and `WHERE` excludes UNKNOWN exactly
      // like FALSE. But `evaluatePredicate`'s negation is
      // `!evaluatePredicate(p.predicate, row)`, which is `true` whenever the
      // inner comparison came back `false` — NULL-valued row included. Unlike
      // `Compare`/`MemberOf`, which correct at a known column with `OR <col>
      // IS NULL`, `Negate` wraps an arbitrary subtree spanning any number of
      // columns, so there is no single column to OR against.
      //
      // `CASE WHEN` sidesteps that: an UNKNOWN condition never satisfies
      // `WHEN`, so it falls to `ELSE` the same as a `FALSE` condition would —
      // collapsing SQL's three-valued result to the two-valued one
      // `evaluatePredicate` assumes, using `<inner>` exactly once so no
      // placeholder is bound twice (`?`-style dialects consume placeholders
      // positionally; duplicating rendered text would double the `?` count
      // without doubling `params`).
      Negate: (p) =>
        Effect.map(
          renderNode(p.predicate, syntax, params, maxInValues),
          (inner) => `CASE WHEN (${inner}) THEN FALSE ELSE TRUE END`,
        ),
    }),
  );

/**
 * Compile volume and refusal rate, by outcome. Both declared once, module
 * scope — mirrors `Evaluate.ts`'s `decisionsAllowedTotal`/`decisionsDeniedTotal`
 * (`Metric.withAttributes` over one base counter, not a tag applied per call).
 * Effect's `Metric` registry keys on `type:id:description` and memoizes per
 * metric *object*; declaring either inside `compileSql`'s body would either
 * fail to register the way this does, or create an unscoped object per call
 * nothing can aggregate.
 */
const compiledTotal = Metric.counter("qadi_predicate_sql_compiled_total", {
  description: "Predicates compiled by @qadi/predicate-sql's compileSql, tagged by outcome.",
});
const compiledSucceededTotal = Metric.withAttributes(compiledTotal, { outcome: "compiled" });
const compiledRefusedTotal = Metric.withAttributes(compiledTotal, { outcome: "refused" });

/**
 * Compiles a `Predicate` into a parameterized SQL fragment.
 *
 * Refuses rather than approximates: an unsafe `Compare`/`MemberOf` value, or a
 * `MemberOf` past `maxInValues`, fails `PredicateNotRenderable` rather than
 * being stringified into the fragment. See `spec/behaviors/31-predicate-compilation.md`.
 */
export const compileSql = Effect.fn("qadi.predicateSql.compileSql")(function* (
  predicate: Predicate,
  options: CompileSqlOptions,
) {
  const params: Array<unknown> = [];
  const syntax = SYNTAX[options.dialect];
  const maxInValues = options.maxInValues ?? DEFAULT_MAX_IN_VALUES;

  const text = yield* renderNode(predicate, syntax, params, maxInValues).pipe(
    Effect.tapError(() => Metric.update(compiledRefusedTotal, 1)),
  );

  yield* Metric.update(compiledSucceededTotal, 1);

  return { text, params };
});
