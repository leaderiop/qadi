---
"@qadi/core": minor
---

Add `toRenderable`: the dialect-free leaf rules a SQL or Prisma renderer used to re-derive, and the one `PredicateNotRenderable`.

`@qadi/predicate-sql` and `@qadi/predicate-prisma` each carried their own copy of what a safe literal is, what `Compare` means against NULL and against a non-number, that an empty `MemberOf` is false, which column names are refused, and how large an `IN` list may be. They are properties of `evaluatePredicate`, not of a dialect, and the copies drifted (the SQL one admitted `NaN` for a release). They now live beside `evaluatePredicate`:

- `toRenderable(predicate, rules)` classifies a `Predicate` once into a closed `RenderableNode` tree (`Constant`, `IsNull`, `Equals`, `Range`, `OneOf`, `All`, `Any`, `Not`) or refuses with `PredicateNotRenderable`. `RenderRules` declares the identifier rule, reserved columns, `maxInValues`, which columns may hold NULL (`ColumnNullability`) and whether the target's `NOT` is two- or three-valued (`Negation`). Core still emits no dialect text and gains no dependency.
- `PredicateLiteral`: `SafeLiteral`, `isSafeLiteral`, `isRangeBound`, `IdentifierRule` (`"Ascii"` or `"UnicodeBmp"`), `isRenderableIdentifier`. `evaluatePredicate`'s `Gte`/`Lt` and the classifier call the same `isRangeBound`.
- `PredicateNotRenderable` is declared once in core, with `predicateTag`, a closed `refusal: RenderRefusal` and `reason`, and joins `QadiError` with the stable code `ACL018`.

Breaking for exhaustive consumers: `QadiError` gains a member, so a `Match` or `switch` over it that has no default arm stops compiling until it handles `PredicateNotRenderable`. `ERROR_CODES` gains `"PredicateNotRenderable": "ACL018"`.
