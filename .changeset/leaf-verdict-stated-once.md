---
"@qadi/core": patch
---

`evaluate` and `toPredicate` now read one package-private verdict row per policy leaf, and the acted leaf's polarity and its `Unknown` rule are stated once. Decisions, deny reasons and folded predicates are unchanged, and no export changed.
