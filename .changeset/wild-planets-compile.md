---
"@qadi/predicate-sql": minor
"@qadi/predicate-prisma": minor
---

New packages: `@qadi/predicate-sql` and `@qadi/predicate-prisma` compile a
`@qadi/core` `Predicate` into something a database can actually run.

`toPredicate` has always emitted an abstract, dialect-free AST and stopped
there (ADR-QD-024) — a caller with only `toPredicate` had to hand-roll their
own SQL or Prisma compiler with nothing but `evaluatePredicate` to check it
against. These two optional, separately versioned companion packages close
that gap. `@qadi/core` gains no dependency of any kind through either
existing (ADR-QD-054).

```ts
import { toPredicate } from "@qadi/core";
import { compileSql } from "@qadi/predicate-sql";

const fragment = toPredicate(visible).pipe(
  Effect.flatMap((predicate) => compileSql(predicate, { dialect: "postgres" })),
);
// { text: '"tenantId" = $1', params: ["t-1"] }
```

`@qadi/predicate-sql` ships all three dialects at v1 — PostgreSQL, MySQL,
SQLite — one shared renderer around a small per-dialect syntax table.
`@qadi/predicate-prisma` compiles to a Prisma `WhereInput`
(`Record<string, unknown>`, deliberately: the package never sees a generated
schema).

Both refuse rather than approximate: a `Compare`/`MemberOf` value outside the
safe allowlist (`string | number | boolean | null | Date`) fails
`PredicateNotRenderable` instead of being stringified or bound blind, and
`@qadi/predicate-sql` refuses a `MemberOf` past `maxInValues` (default 1000)
rather than rendering an unbounded `IN (...)`. Every compiled fragment is
checked, by property, against `@qadi/core`'s own `evaluatePredicate` —
INV-QD-047 and INV-QD-048, the same differential method that already proves
`toPredicate` agrees with `evaluate`, one interpreter further from the tree.

See BEH-QD-236–243.
