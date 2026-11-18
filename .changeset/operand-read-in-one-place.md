---
"@qadi/core": patch
---

A record read now has one owner, and three behaviours that disagreed with `evaluate` are fixed. `evaluatePredicate` no longer admits a row through an inherited member: a prototype-named column such as `constructor` now reads as absent, as `evaluate` always did. `attributeResolverFromRecord` answers `undefined` for a name its table does not own, instead of an inherited member. `customPredicateFromRecord` fails with its documented `CustomPredicateError` "no predicate is registered under this name" for such a name instead of dying. A row passed to `evaluatePredicate` as a class instance with prototype getters now reads those getters as absent, matching `evaluate`.
