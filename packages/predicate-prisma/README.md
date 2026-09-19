# @qadi/predicate-prisma

Compiles a [`@qadi/core`](https://www.npmjs.com/package/@qadi/core) `Predicate`
into a Prisma `WhereInput`.

```sh
pnpm add @qadi/predicate-prisma @qadi/core effect
```

`@qadi/core`'s `toPredicate` emits an abstract, dialect-free AST and stops
there on purpose (ADR-QD-024). This package is the optional, separately
versioned companion that compiles it — `@qadi/core` gains no dependency on
Prisma through this package existing.

```ts
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  allOf,
  currentSubjectLayer,
  eq,
  hasResourceAttribute,
  makeSubject,
  subject,
  toPredicate,
} from "@qadi/core";
import { compilePrismaWhere } from "@qadi/predicate-prisma";

// Tenancy, compiled once and pushed into the query — nothing here mentions
// a query until `compilePrismaWhere` is called.
const visible = allOf([hasResourceAttribute("tenantId", eq(subject("tenantId")))]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-1", attributes: { tenantId: "t-1" } })),
  AttributeResolverNone,
  DecisionHistoryUnknown,
);

const where = await Effect.runPromise(
  toPredicate(visible).pipe(
    Effect.provide(services),
    Effect.flatMap(compilePrismaWhere),
  ),
);
// { tenantId: "t-1" }

const rows = await prisma.invoice.findMany({
  // `PrismaWhereInput` is `Record<string, unknown>` deliberately (see below);
  // the assertion is the one cast every consumer writes, not something this
  // package can avoid on your behalf.
  where: where as Prisma.InvoiceWhereInput,
});
```

`PrismaWhereInput` is `Record<string, unknown>` deliberately: this package
never sees a generated Prisma schema, so it cannot claim a narrower type.
Assigning the result to your own model's generated `WhereInput` needs an
explicit assertion (or a thin typed wrapper around `compilePrismaWhere` in
your own code) — `Record<string, unknown>` is not structurally assignable to
a generated `WhereInput` on its own.

## Refuses rather than approximates

A `Predicate`'s comparison values are `unknown`. A value outside the safe
allowlist (`string | number | boolean | null | Date`) fails
`PredicateNotRenderable` rather than being handed to Prisma's query engine.

## Agreement with the evaluator

Every `WhereInput` this package renders is checked, by property, against
`@qadi/core`'s own `evaluatePredicate`. See
[31 — Predicate Compilation](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/31-predicate-compilation.md).

## License

MIT
