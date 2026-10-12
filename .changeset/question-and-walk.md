---
"@qadi/core": minor
---

**Breaking:** `DecisionCacheKey` is replaced by `Question` (`DecisionCacheShape.getOrCompute(question, compute)`). Adds `Question`, `QuestionOptions` and `questionOf`; `EvaluateOptions` now extends `QuestionOptions`. **Fix:** `createGuardHealthCheck` no longer reports healthy from a cached answer when a `DecisionCache` is wired; it now asks the ports every time, records nothing to a `DecisionSink`, counts no decision metrics, and requires only `CurrentSubject` and the ports. Its span carries `qadi.healthy` and `qadi.error_tag` in place of the `qadi.evaluate` child span (ADR-QD-100).
