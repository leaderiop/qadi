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

const compareOperator = (op: CompareOp): string =>
  Match.value(op).pipe(
    Match.when("Eq", () => "="),
    Match.when("Neq", () => "!="),
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

      Compare: (p) => {
        if (!isSafeValue(p.value)) {
          return Effect.fail(
            new PredicateNotRenderable({
              predicateTag: "Compare",
              reason: `value for column '${p.column}' is not a safe query parameter`,
            }),
          );
        }
        params.push(p.value);
        return Effect.succeed(
          `${syntax.quote(p.column)} ${compareOperator(p.op)} ${syntax.placeholder(params.length)}`,
        );
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
        const placeholders = p.values.map((value) => {
          params.push(value);
          return syntax.placeholder(params.length);
        });
        return Effect.succeed(`${syntax.quote(p.column)} IN (${placeholders.join(", ")})`);
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
