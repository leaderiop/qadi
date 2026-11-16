---
"@qadi/core": patch
---

`evaluate` and `toPredicate` now read one package-private statement of what each policy leaf needs from the request, with the check order unchanged: a leaf's own input first, then what its matcher references, the action before the resource. A `MissingAction` that `toPredicate` raises for a matcher comparing against `action()` now carries no `expected` key, instead of an own `expected: undefined`, as `evaluate`'s already did. The encoded form is unchanged, because `expected` is optional on the wire.
