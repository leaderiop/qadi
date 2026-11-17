---
"@qadi/audit": minor
---

**Breaking.** `AuditEntryNotEncodable` is removed: `encodeAuditEntry` fails with, and `AuditDecisionSinkLive`'s `onRefused` receives, `@qadi/core`'s `SinkRecordNotEncodable`, the error `decisionSinkForwarding` and `DecisionLogHttp` already report. It has the same `evaluationId`, `recordTag` and `refusal` fields. Its `reason` field is gone, and `describeEncodeRefusal(e.refusal)` gives the same sentence; like `reason`, it may carry caller text (an `EncodeFailed` sentence includes a throwing getter's message), so it is for diagnosis in code holding the refusal, not for a log line. To log a refusal, annotate `encodeRefusalAnnotations(e)`, which is what the default warning carries: no value from the record, though `qadi.path` is made of the record's own keys, so a resource keyed by data puts that key in the line (INV-QD-104). `Effect.catchTag("AuditEntryNotEncodable", …)` becomes `Effect.catchTag("SinkRecordNotEncodable", …)`, and an `onRefused` annotated with the old class takes `SinkRecordNotEncodable` instead. `AuditWriteOutcome`'s `Refused.refusal` has the new type too.

The refusal warning, every other log line, every metric and every span attribute are unchanged. Whether an unwritten entry was lost is now decided in one place, with the same output.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
