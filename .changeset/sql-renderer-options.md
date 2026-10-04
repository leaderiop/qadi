---
"@qadi/predicate-sql": minor
---

`compileSql` becomes a renderer of `@qadi/core`'s `toRenderable`, and gains `nullable` and `identifiers` options.

What a predicate may hold (safe values, safe columns, bounded `IN` lists, what `Compare` means against NULL) is now decided once, in `@qadi/core`, instead of in a copy per dialect package. With default options the SQL text and `params` are unchanged, apart from the SQLite boolean binding (see the previous changeset).

- `CompileSqlOptions.nullable?: ReadonlySet<string>`: which columns accept NULL. Absent declares nothing. Declared, `Neq` on a NOT NULL column renders a plain `!=` with no `OR col IS NULL`, and a null comparison on it refuses with `NullOnNonNullableColumn`. The `OR col IS NULL` stays under an odd number of `Negate`s even on a NOT NULL column, because a real engine showed that dropping it there over-admits if the declaration is wrong. A wrong declaration can only under-admit or refuse.
- `CompileSqlOptions.identifiers?: "Ascii" | "UnicodeBmp"`: how strictly a column name is constrained. Default `"Ascii"`, which is today's rule.
- `PredicateNotRenderable` is now `@qadi/core`'s class, re-exported. It gains a closed `refusal` field and its `predicateTag` narrows to `"Compare" | "MemberOf"`; `_tag` and `reason` are unchanged. `SqlSafeValue` is now an alias of core's `SafeLiteral`.
