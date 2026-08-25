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
import { toPredicate } from "@qadi/core";
import { compilePrismaWhere } from "@qadi/predicate-prisma";

const where = toPredicate(visible).pipe(
  Effect.flatMap(compilePrismaWhere),
);
// { tenantId: "t-1" }

const rows = await prisma.invoice.findMany({ where });
```

`PrismaWhereInput` is `Record<string, unknown>` deliberately: this package
never sees a generated Prisma schema, so it cannot claim a narrower type.
Assign the result to your own model's `WhereInput` at the call site.

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
