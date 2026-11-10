---
"@qadi/core": minor
---

The evaluation metrics are exported: `decisionsTotal` (`.Allow` and `.Deny`), `denialsByPolicyTagTotal`, `evaluationDurationMillis`, `evaluationErrorsTotal`, `decisionCacheLookupsTotal` and `predicatesTranslatedTotal`, so a test or a host reads them by value (`Metric.value(decisionsTotal.Deny)`) instead of matching an id string in a snapshot (ARCH-61, ADR-QD-123). Ids, types, descriptions and series are unchanged, so an exporter sees the same metrics. `decisionsTotal` is exported as its two series only; the untagged base counter reads zero and is deliberately not exported. `CacheOutcome` is now declared in `EvaluationMetrics.ts` and is still exported from `@qadi/core`.
