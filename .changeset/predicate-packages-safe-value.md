---
"@qadi/predicate-sql": minor
"@qadi/predicate-prisma": patch
---

`@qadi/predicate-sql`: `isSafeValue` is now a proper type predicate (`value is SqlSafeValue`, newly exported), so `params`/`SqlFragment.params` are typed `Array<SqlSafeValue>` instead of `Array<unknown>`.

Both packages: hoisted a per-call `Match.value` rebuild to a module-scope dispatch table on the compilation hot path; `@qadi/predicate-prisma`'s README quickstart example (which assigned an un-run `Effect` straight to a Prisma `where` clause) is now correct and complete.
