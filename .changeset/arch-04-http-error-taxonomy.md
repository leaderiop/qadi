---
"@qadi/core": minor
"@qadi/http": minor
---

The enforcement-error class table moves into `@qadi/core`, and `@qadi/http` derives every status, wire schema and middleware error list from one table (ADR-QD-081, INV-QD-060, BEH-QD-270). HTTP bodies and statuses are unchanged for callers.

**Breaking for `@qadi/http` importers.** Each name has one home, with no re-export shim:

- `ENFORCEMENT_ERROR_TAGS`, `EnforcementErrorClass` and `classifyEnforcementError` are no longer exported by `@qadi/http`. Import them from `@qadi/core`.
- `DENIAL_STATUS` is removed. Use `HTTP_STATUS_BY_CLASS.denied` (or `HTTP_STATUS_BY_CLASS[classifyEnforcementError(error)]`).

New in `@qadi/core`: `ENFORCEMENT_ERROR_CLASSES` (a total, tag-keyed class table beside `ERROR_CODES`), `classifyEnforcementError`, `ENFORCEMENT_ERROR_TAGS`, `ENFORCEMENT_DENIAL_TAGS`, `EnforcementErrorClass`, `EnforcementErrorClassTable`, `EnforcementErrorTagOf`, `EnforcementDenial`, and `StandingEvaluationServices` (`Exclude<EvaluationServices, CurrentSubject>`, the services a runtime holds while the subject travels per call). `EnforcementError` is now declared in `Errors.ts`; the package barrel is unchanged.

New in `@qadi/http`: `HTTP_STATUS_BY_CLASS`, `ENFORCEMENT_ERROR_WIRE` (one entry per tag: class, derived status, `httpApiStatus` schema, typed redacting projection), `projectHttpEnforcementFailure`, `HTTP_ENFORCEMENT_TAGS`, `HTTP_ENFORCEMENT_ERROR_SCHEMAS`, `HttpEnforcementFailure`, `HttpEnforcementTag`, `EnforcementErrorWire`, `EnforcementErrorWireTable` and `logSubjectExtractionFailed`. The `*Response` and `*Refused` schemas keep their names as views onto the table.

Adding an enforcement error is now one entry in each of two tables, and every omission is a compile error. The bare route and `RequirePermission` can no longer disagree about a tag's status. `RequirePermissionLive` projects all twelve tags in-channel instead of hand-catching three. The generated OpenAPI document declares its error responses in the same order as before.

The Next.js example's publish action no longer misreports an unmet obligation as an outage, and no longer lets `CustomPredicateError` or `SignatureHistoryUnavailable` escape as a rejected Promise.
