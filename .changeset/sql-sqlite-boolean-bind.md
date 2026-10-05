---
"@qadi/predicate-sql": minor
---

Bind booleans as `1`/`0` in the SQLite dialect.

`compileSql(predicate, { dialect: "sqlite" })` put a JavaScript boolean into `params`, which neither `node:sqlite` ("Provided value cannot be bound to SQLite parameter") nor `better-sqlite3` ("SQLite3 can only bind numbers, strings, bigints, buffers, and null") can bind. SQLite stores a boolean as 1/0, so `"sealed" = ?` now binds `1` or `0`. PostgreSQL and MySQL are unchanged: `params` still carries the boolean itself.

This changes the `params` of any SQLite fragment that compares a boolean column. `SqlFragment.params` keeps its type, since a number was already a member.
