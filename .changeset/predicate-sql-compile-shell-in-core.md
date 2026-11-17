---
"@qadi/predicate-sql": patch
---

`compileSql` now runs through `@qadi/core`'s `compilePredicate`, keeping only its rules, its renderer and its own counter. No public type, export or output changes.
