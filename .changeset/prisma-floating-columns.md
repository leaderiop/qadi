---
"@qadi/predicate-prisma": minor
---

Refuse a range on a floating-point column rather than admit infinite rows (breaking: `options.floating` is now required).

A `Float` or `Decimal` field can hold `Infinity`/`-Infinity`. A plain `{score: {gte: 3}}` returns the `Infinity` rows and `{score: {lt: 3}}` the `-Infinity` ones, which the evaluator denies. Prisma offers no filter that excludes them: it has no column arithmetic, and `{gte: 3, lte: Number.MAX_VALUE}` still returns the `Infinity` row, because Prisma binds the bound as a decimal string that SQLite reads back as `Infinity`. Measured on Prisma 7.10 over SQLite.

`compilePrismaWhere` now takes a declaration of which columns are floating, and a `gte`/`lt` on one fails `PredicateNotRenderable` with `refusal: "NonFiniteColumn"`. Equality and `in` on those columns still compile. New exports: `floatingFieldsOf`, `PrismaTypedModelLike` and `PrismaTypedFieldLike`. `floatingFieldsOf` reads each field's `type`, which Prisma 7's runtime DMMF keeps.

Leaving a `Float` column out of the declaration renders a plain range that can admit an infinite row, so derive the set rather than writing it by hand:

```ts
// before
compilePrismaWhere(predicate, { nullable });
// after
compilePrismaWhere(predicate, {
  nullable,
  floating: new Set(["amount"]), // or floatingFieldsOf(model), model from Prisma.dmmf.datamodel.models
});
```
