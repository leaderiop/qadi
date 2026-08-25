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
allowlist (`string | number | boolean | null | Date`) fails
`PredicateNotRenderable` — it is never stringified into the fragment. A
`MemberOf` past `maxInValues` (default 1000) refuses the same way, rather than
rendering an unbounded `IN (...)`.

## Three dialects, one renderer

`SqlDialect` is `"postgres" | "mysql" | "sqlite"`, all three shipped at v1.
Dialect differences are a small syntax table — identifier quoting, placeholder
style, `IN` grammar — around one shared recursive walk, not three separate
implementations.

## Agreement with the evaluator

Every fragment this package renders is checked, by property, against
`@qadi/core`'s own `evaluatePredicate` — the same differential method that
proves `toPredicate` agrees with `evaluate`, one interpreter further from the
`Policy` tree. See
[31 — Predicate Compilation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/31-predicate-compilation.md).

## License

MIT
