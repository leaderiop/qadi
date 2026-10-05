---
"@qadi/predicate-sql": minor
---

Exclude non-finite rows from compiled ranges on PostgreSQL and SQLite (breaking: the SQL text of every `Gte`/`Lt` changes).

A plain `"score" >= $1` admits a row holding `Infinity`, and on PostgreSQL one holding `NaN` (which PostgreSQL orders above every number); `"score" < $1` admits `-Infinity`. The evaluator admits none of them, so a compiled filter over a float column returned rows the policy denies. Found against real PostgreSQL (PGlite) and SQLite (`node:sqlite`) with a float column added to the engine tests.

On `postgres` and `sqlite` a range now renders with a guard that excludes all three values without overflowing on any numeric column type:

```sql
-- before
"score" >= $1
-- after
("score" >= $1 AND "score" - "score" = 0)
```

`mysql` output is unchanged: MySQL's floating types cannot store these values. There is no option to turn the guard off, because declaring a column finite when it is not would admit rows the predicate denies. Update any golden strings that pin the old range text.
