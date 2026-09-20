---
"@qadi/http": minor
---

Fixed a real disclosure bug: five resolver/history-outage responses were serializing the real `Error.message`/`cause` (connection strings, internal error text) straight into a client-visible 502 body, because the wire schema reused the full error class instead of a redacted projection.

`requiresPermission`'s return value is now a nominal `RequiredPermissionShape` brand — a raw `{ permission, policy }` literal passed directly to `.annotate(RequiredPermission, {...})` no longer type-checks, closing a silent-overwrite gap. `AccessDenied`'s HTTP body now carries `subjectId`/`policyTag`/`reason` (via the new `AccessDeniedPublic`/`toAccessDeniedPublic`) instead of being forced empty, and `UndischargedObligation`/`SubjectExtractionFailed` now encode their tag rather than answering a truly empty body a generated client could never actually decode.

New exports: `DENIAL_STATUS`, `EnforcementErrorClass`, `classifyEnforcementError`, `logDenial`, `AccessDeniedRefused` (corrected), `RequiredPermissionShape`.
