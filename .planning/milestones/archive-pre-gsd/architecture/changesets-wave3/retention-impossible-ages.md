---
"@qadi/audit": minor
"@qadi/core": patch
---

Retention no longer deletes on an impossible age. `getPurgeableEntries` selected every row for `at = -Infinity` (a stored `-1e400`), `now = +Infinity` or a negative `maxAgeMs`; a row is now purgeable only with a finite `at` and `now`, `maxAgeMs >= 0` and `now - at > maxAgeMs`. New `planRetention(entries, policy, now)` returns `Result<RetentionPlan, RetentionInputInvalid>` (`{ retained, purged, undated }`; a non-finite `at` is retained and `undated`), and the two older functions project it (on a refusal they purge nothing). `decodeAuditEntry` and `decodeSinkRecord` now refuse, as `Malformed`, a non-finite `at` (a stored `1e400`) and a non-integer `sequenceNumber`: values no encoder ever emitted, so no wire version bump.
