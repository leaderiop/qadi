---
"@qadi/core": patch
---

`relationshipResolverRetrying` and `customPredicateRetrying` now annotate `qadi.attempts` on the caller's span, the way `attributeResolverRetrying` always has (KH-01). Before, a retried relationship check or custom predicate showed up in a trace as one slow call, with nothing saying how many store round trips it took. `customPredicateRetrying`'s documentation claimed it already did this. All three wrappers now share one implementation of the retry accounting. A test asserting an exact attribute set on a span that encloses one of these wrappers must now include `qadi.attempts`.
