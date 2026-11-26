---
"@qadi/audit": patch
---

A host's batch is admitted by one step, in one order (`now`, then key material or `maxAgeMs`, then the rows); every refusal is unchanged.

A refused batch no longer opens the `qadi.audit.verifySequenceIntegrity` span (a refused `verifySequenceIntegrity` opens none; a refused `archiveAuditTrail` opens only its own).

`planRetention` and `planPurge` read `maxAgeMs` once, and refuse a policy that is not an object as `MaxAgeInvalid` instead of throwing on `null` and `undefined`.

A `maxAgeMs` that is not a number (`null`, a boolean, a string, a list, a boxed number, an object with its own `valueOf`, a Symbol) is refused as `MaxAgeInvalid` with the value given, instead of being read as `0` (which selected every archived row for purge), converted through its `valueOf`, or thrown on.

Rows are read once: `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge` judge the rows they checked, so a list that answers differently when read again can no longer make `archiveAuditTrail` return a bundle `readAuditArchive` refuses (INV-QD-399).

No export changes.
