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

/** `unknown`, safely: the only shapes a driver can bind as a parameter. */
const isSafeValue = (value: unknown): boolean =>
  value === null ||
  typeof value === "string" ||
  typeof value === "number" ||
  typeof value === "boolean" ||
  value instanceof Date;

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
        if (!isSafeValue(p.value)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        const column = syntax.quote(p.column);
        if (p.value === null) {
          if (p.op === "Eq") return Effect.succeed(`${column} IS NULL`);
          if (p.op === "Neq") return Effect.succeed(`${column} IS NOT NULL`);
          // Gte/Lt against a null literal: evaluatePredicate requires both
          // sides to be numbers, and null never is — always False, for any row.
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
      // what the AST says — "NOT (NOT (...))" is valid, if redundant, SQL.
      Negate: (p) =>
        Effect.map(
          renderNode(p.predicate, syntax, params, maxInValues),
          (inner) => `NOT (${inner})`,
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
