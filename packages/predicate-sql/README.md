# @qadi/predicate-sql

Compiles a [`@qadi/core`](https://www.npmjs.com/package/@qadi/core) `Predicate`
into a parameterized SQL fragment — PostgreSQL, MySQL, or SQLite.

```sh
pnpm add @qadi/predicate-sql @qadi/core effect
```

`@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and stops
there on purpose (ADR-QD-024). This package is the optional, separately
versioned companion that compiles it — `@qadi/core` gains no dependency of any
kind through this package existing.

```ts
import { toPredicate } from "@qadi/core";
import { compileSql } from "@qadi/predicate-sql";

const fragment = toPredicate(visible).pipe(
  Effect.flatMap((predicate) => compileSql(predicate, { dialect: "postgres" })),
);
// { text: '"tenantId" = $1', params: ["t-1"] }
```

## Refuses rather than approximates

A `Predicate`'s comparison values are `unknown`. A value outside the safe
allowlist (`string | finite number | boolean | null`; `Date` is refused) fails
`PredicateNotRenderable` — it is never stringified into the fragment. A
`MemberOf` past `maxInValues` (default 1000) refuses the same way, rather than
rendering an unbounded `IN (...)`, and so does a column name outside the
identifier rule. `PredicateNotRenderable` is `@qadi/core`'s, re-exported here: what
a predicate may hold is decided once, in core, and this package prints syntax.

## Ranges exclude non-finite rows

On PostgreSQL and SQLite a `Gte`/`Lt` renders with a guard,
`("score" >= $1 AND "score" - "score" = 0)`, because a float column can hold
`Infinity`, `-Infinity` and (on PostgreSQL) `NaN`, a plain `>=`/`<` admits some of
them, and the evaluator admits none. The guard only removes rows. MySQL cannot
store those values, so its ranges render without it. There is no option to turn
the guard off: declaring a column finite when it is not would admit rows the
predicate denies.

## Options

- `maxInValues?`: the `IN` bound.
- `identifiers?`: `"Ascii"` (default) or `"UnicodeBmp"` for column names in any
  script, up to U+FFFF.
- `nullable?`: which columns accept NULL. Absent declares nothing. Declared, `Neq`
  on a NOT NULL column renders a plain `!=` with no `OR col IS NULL`, and a null
  comparison on one refuses. A wrong declaration can only lose rows or refuse,
  never admit a row the predicate denies.

The SQLite dialect binds a boolean as `1`/`0` in `params`: neither Node SQLite
driver (`node:sqlite`, `better-sqlite3`) can bind a JavaScript boolean.

## Three dialects, one renderer

`SqlDialect` is `"postgres" | "mysql" | "sqlite"`, all three shipped at v1.
Dialect differences are a small syntax table — identifier quoting, placeholder
style, `IN` grammar — around one shared recursive walk, not three separate
implementations.

## Agreement with the evaluator

Every fragment this package renders is checked, by property, against
`@qadi/core`'s own `evaluatePredicate` — the same differential method that
proves `toPredicate` agrees with `evaluate`, one interpreter further from the
`Policy` tree — by running it on real engines: PostgreSQL (PGlite) and SQLite
(`node:sqlite`); MySQL is checked structurally against SQLite's text. See
[31 — Predicate Compilation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/31-predicate-compilation.md).

## License

MIT
