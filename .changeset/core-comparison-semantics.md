---
"@qadi/core": minor
---

Fix `toPredicate` admitting non-finite rows the evaluator denies, and give comparison semantics one owner (breaking for hand-built `RenderRules`).

`evaluatePredicate`'s `Gte`/`Lt` checked only the bound for finiteness, so `toPredicate(hasResourceAttribute("level", gte(3)))` admitted a row whose `level` is `Infinity`, and `lt(3)` a `-Infinity` row, while `evaluate` denied both: a filter wider than the policy. Both operands are now checked.

What `Eq`, `Neq`, `Gte`, `Lt`, membership and dominance mean now lives in one internal module (`@qadi/core/Compare`) that the evaluator, `evaluatePredicate`, the renderable classifier and the denial reason all read, so the two interpreters' leaves cannot drift apart again.

- New `judgeMatcher(matcher, value, context)` returns a `Verdict`: `"Held" | "NotHeld" | "ValueAbsent" | "ReferenceAbsent" | "Incomparable"`. `evaluateMatcher` is unchanged and equals `judgeMatcher(...) === "Held"`.
- Denial reasons: an `eq`/`dominates` against a reference that resolves to nothing now reads `has no reference value to compare against` (only `neq` did), and a value the matcher cannot compare (`Infinity` or `"5"` under `gte(3)`) reads `is not a value this matcher can compare` instead of `did not match`.
- `inArray([undefined])` no longer matches an absent value. An absent value now satisfies no matcher.
- `RenderRules` gains two required fields, `finiteness: ColumnFiniteness` and `finiteExclusion: FiniteExclusion`, and a `Range` node gains `finiteGuard: FiniteGuard`. `RenderRefusal` gains `"NonFiniteColumn"`. Code that builds `RenderRules` by hand, or matches `RenderRefusal` exhaustively, must add them.
