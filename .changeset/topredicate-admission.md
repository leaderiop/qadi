---
"@qadi/core": patch
---

`toPredicate` and `evaluate` share one admission (the depth gate, what a matcher sees, and the `maxDepth` default), and `PredicateOptions` is now derived from `QuestionOptions` (`Omit<QuestionOptions, "resource">`, structurally unchanged), so an option that changes `evaluate`'s answer reaches translation by type instead of being silently ignored by it (INV-QD-037, ADR-QD-100 amendment).
