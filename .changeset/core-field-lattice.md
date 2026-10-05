---
"@qadi/core": minor
---

Give each field strategy's meaning one owner, export `mergeFields`, and fix three ways a policy built in code failed open.

What `Intersection`, `Union` and `First` mean — the merge, and the facts the short-circuit rule and `simplify` lean on — now lives in one internal module (`@qadi/core/FieldLattice`), with a fail-closed answer for any value outside the union. `intersectFields`, `unionFields` and `VisibleFields` still resolve from `@qadi/core` and `@qadi/core/Decision`.

- New export `mergeFields(strategy, sets)`: the evaluator's own merge of allowing children's field sets. It never grants a field no input granted, returns `undefined` (every field) for no inputs under a known strategy, and `[]` for a strategy outside the union.
- Fix: an `anyOf` whose `fieldStrategy` was a key `Object.prototype` supplies (`"toString"`, `"constructor"`, `"__proto__"`, `"hasOwnProperty"`) stopped at its first allowing child and granted every field. It now walks every child and grants none. Decoded policies were never affected; only ones built in process.
- Fix: `simplify` no longer changes `visibleFields`. It flattened an empty same-strategy `allOf` under `Union` or `First` (whose empty merge is not a unit), and unwrapped a one-child composite under a strategy outside the union, widening it from no fields to the child's.
- Fix: a rule table whose `combining` is outside the union now decides as `DenyOverrides` in `evaluate` and `toPredicate`. It used to permit where `DenyOverrides` would deny, and `toPredicate` threw on it.
- Behaviour: when `Intersection` meets two specs that denote the same set (`"title"` and `"title.**"`), it keeps the lexicographically smaller text instead of the right-hand one, so `Allow.visibleFields` no longer depends on the order of the allowing children. What a subject can see is unchanged.
