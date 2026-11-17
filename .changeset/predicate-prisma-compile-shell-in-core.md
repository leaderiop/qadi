---
"@qadi/predicate-prisma": patch
---

`compilePrismaWhere` now runs through `@qadi/core`'s `compilePredicate`, keeping only its rules, its renderer and its own counter. No public type, export or output changes. `compiled` is now counted after the where object is rendered, so a compile whose render fails is no longer counted `compiled`.
