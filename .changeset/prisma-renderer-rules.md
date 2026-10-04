---
"@qadi/predicate-prisma": minor
---

`compilePrismaWhere` becomes a renderer of `@qadi/core`'s `toRenderable`, and now applies the same rules `compileSql` does (breaking: new refusals).

What a predicate may hold is decided once, in `@qadi/core`, instead of in a copy per dialect package. The two packages used to disagree on which predicates compile at all (`first name`, `a.b` and a 1001-member `MemberOf` compiled here and refused by `@qadi/predicate-sql`, while `gte` and `NOT` did the reverse), against what the documentation claimed. They now refuse the same predicates, apart from Prisma's own reserved column names.

- **New refusal:** a `MemberOf` past `maxInValues` (default 1000, now an option here too) fails with `refusal: "TooManyValues"`.
- **New refusal:** a column outside the identifier rule fails with `refusal: "UnsafeColumn"`. The default rule is ASCII, `[A-Za-z_][A-Za-z0-9_]*`, so a Prisma field with a non-ASCII name such as `é` no longer compiles by default. Pass `identifiers: "UnicodeBmp"` to allow letters and digits of any script up to U+FFFF.
- `PredicateNotRenderable` is now `@qadi/core`'s class, re-exported. It gains a closed `refusal` field (`"UnsafeColumn" | "ReservedColumn" | "UnsafeValue" | "TooManyValues" | "NullOnNonNullableColumn"`) and its `predicateTag` narrows to `"Compare" | "MemberOf"`; `_tag` and `reason` are unchanged, and a Prisma operator keyword as a column is `"ReservedColumn"` with the same reason text as before.
- `CompilePrismaWhereOptions` gains optional `maxInValues` and `identifiers`.

Every `WhereInput` is now checked against a real Prisma Client over SQLite rather than only against JavaScript models of the engine.
