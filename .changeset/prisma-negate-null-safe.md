---
"@qadi/predicate-prisma": minor
---

Fix `compilePrismaWhere` dropping NULL rows under `Negate` (breaking: `options.nullable` is now required).

A plain `{NOT: {level: {gte: 3}}}` renders `WHERE (NOT level >= ?)`, and SQL's `NOT UNKNOWN` is `UNKNOWN`, which `WHERE` excludes. `evaluatePredicate` admits a NULL-valued row there, so any negated tenancy or soft-delete policy on a nullable column silently lost rows. Found with a real Prisma 7.10 client over SQLite: 127 of 3000 random predicates mismatched, every one under a `Negate`, none an over-admission.

Prisma also refuses any filter that mentions `null` on a required column, so `Neq "t-1"` on a NOT NULL column failed at query time. Both need one schema fact per column, so `compilePrismaWhere` now takes a declaration of which columns accept NULL. New exports: `CompilePrismaWhereOptions`, `PrismaModelLike`, `PrismaFieldLike` and `nullableFieldsOf`. A null comparison on a column declared NOT NULL fails `PredicateNotRenderable`; a `null` member of its `MemberOf` is dropped. A wrong declaration can only lose rows or fail loudly, never admit a row the predicate denies. Output for an un-negated predicate on a nullable column is unchanged.

Migration:

```ts
// before
compilePrismaWhere(predicate);
// after
compilePrismaWhere(predicate, {
  nullable: new Set(["deletedAt", "note"]), // or nullableFieldsOf(model) from a DMMF that keeps isRequired
});
```
