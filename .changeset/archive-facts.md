---
"@qadi/audit": minor
---

The archive's rules are computed once. `archiveAuditTrail` and `readAuditArchive` now share one internal computation of an archive's order (sequenced entries by number, then unsequenced ones in the order given), its `sequenceIntegrityVerified` claim (at least two sequenced entries) and its first sequence gap or duplicate, so the reader cannot drift from the writer. Every bundle that was written and read back is still written and read back, and every `ArchiveRefusal` and its payload is unchanged (ARCH-48, ADR-QD-110).

**Breaking.** `verifySequenceIntegrity` and `archiveAuditTrail` now fail with the new `SequenceNumberInvalid` (`index`, `sequenceNumber`) when a `sequenceNumber` is not a safe integer, before looking for a gap or duplicate. Before, the writer archived `1.5` or `2 ** 53` with `sequenceIntegrityVerified: true`, and `readAuditArchive` refused that bundle as `EntryNotDecodable`; a duplicate past `2 ** 53` also passed the check. Code that reads `expectedSequence` from the failure should narrow on `_tag === "SequenceIntegrityError"` first.
