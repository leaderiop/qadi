---
"@qadi/audit": patch
---

The archive's rules are computed once. `archiveAuditTrail` and `readAuditArchive` now share one internal computation of an archive's order (sequenced entries by number, then unsequenced ones in the order given), its `sequenceIntegrityVerified` claim (at least two sequenced entries) and its first sequence gap or duplicate, so the reader cannot drift from the writer. There is no behavior change. The same bundles are written and read. Every `ArchiveRefusal` and its payload is unchanged. `verifySequenceIntegrity` and `SequenceIntegrityError` keep their names, signature and `_tag` (ARCH-48, ADR-QD-110).
