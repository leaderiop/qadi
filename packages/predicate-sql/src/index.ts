/**
 * Compiles a `Predicate` into SQL — PostgreSQL, MySQL, or SQLite.
 *
 * `@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and
 * deliberately stops there (ADR-QD-024). `@qadi/core` still gains no database
 * dependency of any kind through this package existing — this is the companion
 * ADR-QD-054 authorizes: optional, separately versioned, installed only by a
 * caller who wants it.
 *
 * This package is a *renderer*. What a `Predicate` may hold and what it means —
 * which values are safe to bind, what `Compare` means against NULL and against
 * a non-number, that an empty `MemberOf` is false, which columns are refused,
 * how large an `IN` list may be — is `@qadi/core`'s `toRenderable`
 * (ADR-QD-079); it hands this module a closed `RenderableNode` tree with every
 * decision already made, and what is left here is syntax. The three dialects
 * share one recursive renderer; what differs is a small syntax table
 * (identifier quoting, placeholder style, how a literal is bound). See
 * `spec/behaviors/31-predicate-compilation.md`.
 */
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import { DEFAULT_MAX_IN_VALUES, toRenderable } from "@qadi/core";
import type {
  ColumnFiniteness,
  FiniteGuard,
  IdentifierRule,
  NullGuard,
  Predicate,
  RenderableNode,
  RenderRules,
  SafeLiteral,
} from "@qadi/core";

export { PredicateNotRenderable } from "@qadi/core";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export type SqlDialect = "postgres" | "mysql" | "sqlite";

/**
 * The only shapes a driver can bind as a parameter: `@qadi/core`'s `SafeLiteral`.
 *
 * Kept as this package's own name for compatibility; the rule itself
 * (`isSafeLiteral`) lives in core, beside `evaluatePredicate`, so the two
 * dialect packages cannot drift apart on it (CCR-QD-120 was that drift).
 */
export type SqlSafeValue = SafeLiteral;

/** A parameterized SQL fragment: `text` names placeholders, `params` binds them. */
export interface SqlFragment {
  readonly text: string;
  readonly params: ReadonlyArray<SqlSafeValue>;
}

export interface CompileSqlOptions {
  readonly dialect: SqlDialect;
  /** Refuses a `MemberOf` whose member count exceeds this. Default 1000. */
  readonly maxInValues?: number;
  /**
   * Which columns accept NULL. Absent declares nothing (every column may), and
   * the output is what it was before this option existed. Declared, a column
   * outside the set is NOT NULL: `Neq` renders a plain `!=` with no `OR col IS
   * NULL`, and a null comparison on it refuses (ADR-QD-079). A wrong declaration
   * can only under-admit or refuse, never admit a row the predicate denies.
   */
  readonly nullable?: ReadonlySet<string>;
  /** How strictly a column name is constrained. Default `"Ascii"`. */
  readonly identifiers?: IdentifierRule;
}

// ---------------------------------------------------------------------------
// Dialect syntax table
// ---------------------------------------------------------------------------

interface DialectSyntax {
  readonly quote: (identifier: string) => string;
  /** `paramCount` is the 1-based position of the just-pushed parameter. */
  readonly placeholder: (paramCount: number) => string;
  /**
   * The value a driver is handed for a safe literal (ADR-QD-079). Identity for
   * postgres and mysql; sqlite stores a boolean as 1/0 and neither Node driver
   * (`node:sqlite`, `better-sqlite3`) can take a JavaScript boolean as a
   * parameter, so it maps `true`/`false` to `1`/`0`.
   */
  readonly bind: (value: SqlSafeValue) => SqlSafeValue;
}

const bindIdentity = (value: SqlSafeValue): SqlSafeValue => value;
const bindSqlite = (value: SqlSafeValue): SqlSafeValue =>
  typeof value === "boolean" ? (value ? 1 : 0) : value;

const SYNTAX: Record<SqlDialect, DialectSyntax> = {
  postgres: {
    quote: (id) => `"${id}"`,
    placeholder: (n) => `$${n}`,
    bind: bindIdentity,
  },
  mysql: {
    quote: (id) => `\`${id}\``,
    placeholder: () => "?",
    bind: bindIdentity,
  },
  sqlite: {
    quote: (id) => `"${id}"`,
    placeholder: () => "?",
    bind: bindSqlite,
  },
};

/**
 * Which columns each dialect can hold a non-finite number in.
 *
 * PostgreSQL's `double precision`/`real`/`numeric` hold `±Infinity` and `NaN`, and
 * SQLite's `REAL` holds `±Infinity`; this package never sees a schema, so on
 * either any column may (`Unknown`). MySQL's `DOUBLE`/`FLOAT` cannot store any of
 * the three, so a MySQL `Range` needs no guard and its text is unchanged. There
 * is deliberately no option to declare a PostgreSQL or SQLite column finite: a
 * wrong declaration would over-admit, which is the one direction a declaration
 * here must never be able to move (ADR-QD-079).
 */
const FINITENESS: Record<SqlDialect, ColumnFiniteness> = {
  postgres: { _tag: "Unknown" },
  mysql: { _tag: "Unrepresentable" },
  sqlite: { _tag: "Unknown" },
};

/**
 * What a `Range`'s `FiniteGuard` adds to its comparison (`expression`).
 *
 * `col - col = 0` is the one text that excludes all three non-finite values on
 * both engines (CCR-QD-172, measured on PGlite and `node:sqlite` across
 * `double precision`, `real`, `numeric`, `int`, `bigint`, `REAL` and `INTEGER`):
 * `Infinity - Infinity` is `NaN`, PostgreSQL's `NaN = 0` is false, and SQLite
 * reads a stored `NaN` as `NULL`. It never overflows, because the operands are
 * equal. A bound such as `col <= 1.7976931348623157e308` was rejected: PostgreSQL
 * refuses it against `int` ("invalid input") and `real` ("out of range"). Being a
 * conjunct inside the leaf, the guard only ever removes rows, and under `Not`'s
 * `CASE WHEN` it is still exactly the reference's answer.
 */
const FINITE_GUARDED: Record<FiniteGuard, (column: string, expression: string) => string> = {
  None: (_column, expression) => expression,
  ExcludeNonFinite: (column, expression) => `(${expression} AND ${column} - ${column} = 0)`,
};

// `Range`'s two operators, and `Equals`'s two. Plain literal→literal `Record`s,
// not `Match.value` rebuilt per call (RH-01): zero per-call state, and the
// renderer calls them once per rendered leaf, the per-node shape AGENTS.md §5a
// measures `Match.value` at 3.5–7.7× slower on.
const RANGE_OPERATOR: Record<"Gte" | "Lt", string> = {
  Gte: ">=",
  Lt: "<",
};
const EQUALS_OPERATOR: Record<"Eq" | "Neq", string> = {
  Eq: "=",
  Neq: "!=",
};

/**
 * What a leaf's `NullGuard` adds to its rendered comparison (`expression`).
 *
 * `AdmitNull` is what `Neq` and a `null` `MemberOf` member need: `col != $1`
 * alone is UNKNOWN on a NULL row, which `WHERE` excludes, where
 * `evaluatePredicate`'s `null !== value` is true. `ExcludeNull` is only produced
 * for a three-valued target (`Negation: "ThreeValued"`), which this package is
 * not — `Not` renders `CASE WHEN` below — but the table is total because
 * `NullGuard` is a closed union.
 */
const GUARDED: Record<NullGuard, (column: string, expression: string) => string> = {
  None: (_column, expression) => expression,
  AdmitNull: (column, expression) => `(${expression} OR ${column} IS NULL)`,
  ExcludeNull: (column, expression) => `(${expression} AND ${column} IS NOT NULL)`,
};

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

/**
 * Renders one node, pushing bound values into `params` as it goes.
 *
 * `params` is mutated rather than threaded, matching `Predicate.ts`'s own
 * `and`/`or` (`const kept: Array<Predicate> = []`) — this is a single-pass,
 * single-owner accumulator local to one `compileSql` call, not shared state.
 *
 * Total and pure: every refusal (an unsafe value or column, a `MemberOf` past
 * `maxInValues`) was made by `toRenderable` before this runs, so a
 * `RenderableNode` always renders.
 */
// A module-scope `Match.type<RenderableNode>()`, built once (AGENTS.md §5a)
// rather than `Match.value(node)` rebuilt on every call — `renderNode` recurses
// once per node, the exact per-node shape §5a calls out. Each call also carries
// per-call state (`syntax`, `params`) that a matcher built once at module scope
// cannot close over, so `dispatchNode` matches on the node alone and every arm
// returns a function of that state instead. `renderNode` below is the curried,
// argument-taking entry point callers (and the arms' own recursion) use.
const dispatchNode: (
  node: RenderableNode,
) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) => string = Match.type<RenderableNode>().pipe(
  Match.tagsExhaustive({
    Constant: (n) => () => (n.value ? "TRUE" : "FALSE"),

    // `col = NULL` and `col != NULL` are never true for any row, not even one
    // where `col` genuinely `IS NULL`: SQL's three-valued logic treats a
    // NULL-valued side of any `=`/`!=` as unknown, and `WHERE` excludes unknown.
    // `toRenderable` already turned a null comparison into `IsNull`, so this is
    // the one place that emits `IS [NOT] NULL`.
    IsNull: (n) => (syntax: DialectSyntax) =>
      `${syntax.quote(n.column)} IS ${n.negated ? "NOT " : ""}NULL`,

    Equals: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) => {
      const column = syntax.quote(n.column);
      params.push(syntax.bind(n.value));
      const comparison = `${column} ${EQUALS_OPERATOR[n.negated ? "Neq" : "Eq"]} ${syntax.placeholder(params.length)}`;
      return GUARDED[n.nullGuard](column, comparison);
    },

    // The finite guard goes inside the null guard, so a nullable column reads
    // `((col >= $1 AND col - col = 0) OR …)`. `toRenderable` never gives a `Range`
    // `AdmitNull` (the reference denies a NULL row under `Gte`/`Lt`), but the
    // order is the one that would stay correct if it did.
    Range: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) => {
      const column = syntax.quote(n.column);
      params.push(syntax.bind(n.bound));
      const comparison = `${column} ${RANGE_OPERATOR[n.op]} ${syntax.placeholder(params.length)}`;
      return GUARDED[n.nullGuard](column, FINITE_GUARDED[n.finiteGuard](column, comparison));
    },

    // A `null` member is not in `values`: `col IN (NULL, ...)` never matches even
    // a NULL row, because `col = NULL` inside IN's expansion is unknown. It was
    // carried here by `nullGuard: "AdmitNull"`, which adds `OR col IS NULL`.
    OneOf: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) => {
      const column = syntax.quote(n.column);
      const placeholders = n.values.map((value) => {
        params.push(syntax.bind(value));
        return syntax.placeholder(params.length);
      });
      return GUARDED[n.nullGuard](column, `${column} IN (${placeholders.join(", ")})`);
    },

    // An empty `parts` array is unreachable through `toPredicate` (`and`/`or`
    // simplify to True/False before ever building a node), but `Predicate` is a
    // plain hand-constructible type, so a caller-built one is real input.
    // "TRUE"/"FALSE" match `evaluatePredicate`'s own `.every`/`.some` on an empty
    // array, so the compiled fragment and the reference interpreter still agree
    // on this shape.
    //
    // **In order**, which `Array.map` guarantees and is load-bearing here
    // (mirrors WhatIf.ts:221's note on the same default): `params` is mutated
    // rather than threaded, so each child's `params.push` must happen in the same
    // order its placeholder text is emitted below. Rendering children out of
    // order would silently bind parameter values to the wrong placeholders.
    All: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) =>
      n.parts.length === 0
        ? "TRUE"
        : `(${n.parts.map((part) => renderNode(part, syntax, params)).join(" AND ")})`,

    Any: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) =>
      n.parts.length === 0
        ? "FALSE"
        : `(${n.parts.map((part) => renderNode(part, syntax, params)).join(" OR ")})`,

    // No double-negation elimination: `toRenderable` preserves structure, and
    // this renders exactly what the tree says — nesting is preserved even though
    // the rendered shape below is no longer a bare "NOT (NOT (...))".
    //
    // A plain `NOT (<inner>)` is not NULL-safe: SQL's three-valued logic makes
    // `NOT` of an UNKNOWN inner condition (any leaf comparing a NULL-valued
    // column) still UNKNOWN, and `WHERE` excludes UNKNOWN exactly like FALSE. But
    // `evaluatePredicate`'s negation is `!evaluatePredicate(p.predicate, row)`,
    // which is `true` whenever the inner comparison came back `false` — NULL-valued
    // row included. `Not` wraps an arbitrary subtree spanning any number of
    // columns, so there is no single column to OR against.
    //
    // `CASE WHEN` sidesteps that: an UNKNOWN condition never satisfies `WHEN`, so
    // it falls to `ELSE` the same as a `FALSE` condition would — collapsing SQL's
    // three-valued result to the two-valued one `evaluatePredicate` assumes, using
    // `<inner>` exactly once so no placeholder is bound twice (`?`-style dialects
    // consume placeholders positionally; duplicating rendered text would double
    // the `?` count without doubling `params`). This is why this package declares
    // `negation: "TwoValued"` to `toRenderable`, and why no leaf needs a guard
    // under a `Negate`.
    Not: (n) => (syntax: DialectSyntax, params: Array<SqlSafeValue>) =>
      `CASE WHEN (${renderNode(n.inner, syntax, params)}) THEN FALSE ELSE TRUE END`,
  }),
);

/**
 * `dispatchNode`'s curried, argument-taking entry point — every call site
 * (`compileSql` below, and the arms' own recursive `All`/`Any`/`Not` calls
 * above) uses this, not `dispatchNode` directly, so the per-call `syntax`/
 * `params` thread exactly as they did before the matcher was hoisted to module
 * scope.
 */
const renderNode = (
  node: RenderableNode,
  syntax: DialectSyntax,
  params: Array<SqlSafeValue>,
): string => dispatchNode(node)(syntax, params);

/** No column is reserved for SQL: a quoted identifier cannot collide with syntax. */
const NO_RESERVED_COLUMNS: ReadonlySet<string> = new Set();

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
 * Refuses rather than approximates: an unsafe `Compare`/`MemberOf` value or
 * column, or a `MemberOf` past `maxInValues`, fails `PredicateNotRenderable`
 * (`@qadi/core`'s, re-exported here) rather than being stringified into the
 * fragment. See `spec/behaviors/31-predicate-compilation.md`.
 */
export const compileSql = Effect.fn("qadi.predicateSql.compileSql")(function* (
  predicate: Predicate,
  options: CompileSqlOptions,
) {
  const rules: RenderRules = {
    identifiers: options.identifiers ?? "Ascii",
    reservedColumns: NO_RESERVED_COLUMNS,
    maxInValues: options.maxInValues ?? DEFAULT_MAX_IN_VALUES,
    nullability:
      options.nullable === undefined
        ? { _tag: "Unknown" }
        : { _tag: "Declared", nullable: options.nullable },
    // `Not` renders `CASE WHEN`, which makes it two-valued itself.
    negation: "TwoValued",
    finiteness: FINITENESS[options.dialect],
    // `col - col = 0` (`FINITE_GUARDED`) expresses the guard on every dialect.
    finiteExclusion: "Expressible",
  };

  const node = yield* toRenderable(predicate, rules).pipe(
    Effect.tapError(() => Metric.update(compiledRefusedTotal, 1)),
  );

  const params: Array<SqlSafeValue> = [];
  const text = renderNode(node, SYNTAX[options.dialect], params);

  yield* Metric.update(compiledSucceededTotal, 1);

  return { text, params };
});
