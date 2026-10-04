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
fetching them. For what a `Predicate` is and why some policy nodes fold away
while others refuse to translate at all, see
[Predicates](/docs/concepts/predicates/).

```ts
import * as Effect from "effect/Effect";
import { toPredicate } from "@qadi/core";
import { compilePrismaWhere } from "@qadi/predicate-prisma";

// Which columns accept NULL, declared once for the model.
const nullable = new Set(["deletedAt", "note"]);

const where = toPredicate(visible).pipe(
  Effect.flatMap((predicate) => compilePrismaWhere(predicate, { nullable })),
);
// { tenantId: "t-1" }

const rows = await prisma.invoice.findMany({ where });
```

`PrismaWhereInput` is `Record<string, unknown>` deliberately: this package
never sees a generated Prisma schema, so it cannot claim a narrower type.
Assign the result to your own model's `WhereInput` at the call site.

## Declare which columns accept NULL

`compilePrismaWhere`'s second argument is required: `{ nullable }`, the set of
columns that accept NULL. `nullableFieldsOf(model)` builds it from a DMMF model
that keeps `isRequired` (`getDMMF` from `@prisma/internals`; Prisma 7's runtime
`Prisma.dmmf` strips it, so write the set out by hand there).
Prisma refuses any filter that mentions `null` on a required field, and a plain
`NOT` over a nullable column's comparison silently drops the NULL rows the
evaluator admits, so the compiler needs this one schema fact. A wrong
declaration can only lose rows or fail loudly; it never admits a row the
predicate denies.

## Refuses rather than approximates

A `Predicate`'s comparison values are `unknown`. A value outside the safe
allowlist (`string | finite number | boolean | null`) fails with
`PredicateNotRenderable` rather than being handed to Prisma's query engine.
`Date` is refused too, as is a `MemberOf` past `maxInValues` (default 1000) and a
column outside the identifier rule or named like one of Prisma's operator keywords.

## Agreement with the evaluator

Every `WhereInput` this package renders is checked, by property, against
`@qadi/core`'s own `evaluatePredicate` — by running it through a real Prisma Client
over SQLite. See
[31 — Predicate Compilation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/31-predicate-compilation.md).

## License

MIT
