---
"@qadi/core": minor
---

**Breaking.** `DecisionCacheShape.getOrCompute` takes the question and, optionally, `{ concurrency }`, the `concurrency` option of `evaluate`. It no longer takes a `compute`, and passing one is a compile error. `decisionCacheLayer()` walks the question it is given, so no caller can store a trace under a question that trace does not answer.

A hand-written `DecisionCacheShape` must produce its own trace for the question it is handed, and core does not export the walk: wrap `decisionCacheLayer()` and delegate to it. Callers of `evaluate` and of the enforcing entry points see no change.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
