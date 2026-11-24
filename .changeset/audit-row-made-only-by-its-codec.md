---
"@qadi/audit": minor
---

**Breaking.** An audit row is a value only its codec makes, so the archive writer never receives a row its own reader refuses. Five changes:

- `AuditEntry` is a type that only `encodeAuditEntry` and `decodeAuditEntry` make, and the exported `AuditEntry` schema value is removed. An object literal or a spread of a row is not an `AuditEntry` and does not compile where one is wanted. A store's sequence number reaches a row when the store returns the row, through `decodeAuditEntry({ record, sequenceNumber })`.
- `SequenceNumberInvalid` is removed. A row's number is a safe integer by construction, because `decodeAuditEntry` refuses any other as `Malformed`, so `verifySequenceIntegrity` and `archiveAuditTrail` fail `SequenceIntegrityError` for the sequence alone.
- `undated` is removed from `planRetention`, `RetentionPlan` and `PurgePlan`. A row's `at` is finite, so `planRetention` returns `{ retained, expired }` and `planPurge` returns `{ purge, retain, unarchived }`.
- `archiveAuditTrail` fails the new `ArchiveInputInvalid`, naming the field `now` and its value, for a `now` that is `NaN` or an infinity, before it reads the sequence facts; it archived such a bundle with a `null` `createdAt` that `readAuditArchive` refused. It also writes each `keyMaterial` item as its three declared fields, `keyId`, `algorithm` and `publicKey`, and no other property of a wider value.
- `decodeAuditEntry` reads the row's envelope before its record. A row that is not an object, has no record or carries an undeclared top-level key is refused with the strict decoder's own message, and a row that is bad in both places is refused for the envelope. Every refusal tag, and every row it accepts, is unchanged.

See the 0.13 section of the upgrade guide, `/docs/reference/upgrading/`.
