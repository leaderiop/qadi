---
title: "@qadi/predicate-prisma"
description: Compiles a @qadi/core Predicate into a Prisma WhereInput — the same query-side enforcement as @qadi/predicate-sql, for Prisma consumers.
---

`@qadi/predicate-prisma` compiles a [`@qadi/core`](/docs/packages/core/)
`Predicate` into a Prisma `WhereInput`.

```sh
pnpm add @qadi/predicate-prisma @qadi/core effect
```

`@qadi/core`'s `toPredicate` turns a policy into an abstract, dialect-free
filter over rows the caller hasn't loaded, and stops there on purpose — Qadi
gains no dependency on Prisma through this package existing. This is the
optional, separately versioned companion that compiles it, so a Prisma query
can be authorized at the database rather than by filtering rows after
fetching them.

```ts
import * as Effect from "effect/Effect";
import { toPredicate } from "@qadi/core";
import { compilePrismaWhere } from "@qadi/predicate-prisma";

const where = toPredicate(visible).pipe(Effect.flatMap(compilePrismaWhere));
// { tenantId: "t-1" }

const rows = await prisma.invoice.findMany({ where });
```

`PrismaWhereInput` is `Record<string, unknown>` deliberately: this package
never sees a generated Prisma schema, so it cannot claim a narrower type.
Assign the result to your own model's `WhereInput` at the call site.

## Refuses rather than approximates

A `Predicate`'s comparison values are `unknown`. A value outside the safe
allowlist (`string | number | boolean | null | Date`) fails with
`PredicateNotRenderable` rather than being handed to Prisma's query engine.

## Agreement with the evaluator

Every `WhereInput` this package renders is checked, by property, against
`@qadi/core`'s own `evaluatePredicate`. See
[31 — Predicate Compilation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/31-predicate-compilation.md).

## License

MIT
