# ADR-QD-110 — An archive's facts are computed once

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-110                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-08                                     |
> | Status         | Accepted — amends ADR-QD-056                   |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-08): Initial (ARCH-48, CCR-QD-387) |

---

## Context

The archive's three rules were each stated twice. The order was the writer's comparator and the
reader's own loop. The claim `sequencedCount >= 2` was in the writer and in the reader, each counting
sequenced entries itself. The gap-and-duplicate check was one shared helper, but the writer reached it
through `SequenceIntegrity.ts` and the reader reached it directly. ADR-QD-056, BEH-QD-254 and
INV-QD-054 named `verifySequenceIntegrity`/`SequenceIntegrity.ts` as where the rule lives.

A reader that drifted from the writer would refuse archives this package wrote, so the purge is
blocked, or accept ones it did not, so ARCH-38's evidence is weakened. Only examples tested that the
reader accepts what the writer writes.

## Decision

- `ArchiveFacts.ts` is internal and out of the barrel ([ADR-QD-099](099-entry-points-are-a-closed-list.md)).
  Its pure `archiveFacts(entries)` gives the ordered entries, `sequencedCount`,
  `sequenceIntegrityVerified`, `sequenceBreak` and `outOfOrderAt`.
- There is one module-private order. The writer sorts by it stably. The reader's `NotInSequenceOrder`
  index is the first entry that sorts before its predecessor in it, which is the index the reader
  always reported.
- The writer builds from the facts through `verifiedArchiveFacts`, which fails `SequenceIntegrityError`
  and keeps the span `qadi.audit.verifySequenceIntegrity`.
- The reader recomputes the facts on the decoded entries and compares them with the bundle's claims, in
  the unchanged check order, and never sorts.
- `SequenceBreak.ts` is removed. `SequenceIntegrity.ts` re-exports `verifySequenceIntegrity` and
  `SequenceIntegrityError`, with names, signature, `_tag` and span unchanged.
- `ArchiveRefusal` and every payload are unchanged (ARCH-38, CCR-QD-230).

### Decisions taken (ARCH-48)

| Id | Choice |
| -- | ------ |
| D-48-a | One module, with the Effect wrapper beside it |
| D-48-b | Fold, and keep the public names via re-export |
| D-48-c | One order |
| D-48-d | One claim |
| D-48-e | The refusal vocabulary is unchanged |
| D-48-f | The agreement is pinned by properties written before the refactor |

## Consequences

- No public API change (a patch).
- `NotInSequenceOrder.index` keeps its meaning.
- On a verified bundle the reader computes a sorted order it does not use, at O(n log n) like the writer.
- New tests: `ArchiveRoundTrip.test.ts` (round trip; each refusal on its tampering; reorderings refused
  at the first descent; writer and reader agree on the break) and `ArchiveFacts.test.ts`.
- INV-QD-054's Source moves to `ArchiveFacts.ts`.
- A scoped mutation run over `ArchiveFacts.ts`, `AuditArchive.ts` and `SequenceIntegrity.ts` ended with
  97 killed and 1 survivor, against 3 before the change. The survivor is the `Malformed` message
  literal in the reader, which this change does not touch. `ArchiveFacts.ts` itself has none.
- The "gap-and-duplicate, not tamper-evidence" disclaimer in INV-QD-054 and `SequenceIntegrity.ts` is
  unchanged: nothing here hashes an entry.

## Alternatives considered

**The reader compares positions against the writer's sorted order.** That is simpler, but it reports
the first displaced position, not the first descent ([1,3,2] would report 1, not 2), which changes a
payload D-05 keeps.

**Publish `archiveFacts`.** That widens the surface for a rule only this package applies
([ADR-QD-099](099-entry-points-are-a-closed-list.md)).

**Keep the definitions in `SequenceIntegrity.ts` and import the error into the facts module.** Then
each module imports the other, an import cycle `pnpm circular` refuses.

**A CCR-only record.** Rejected because three normative documents name where the rule lives.

## See also

- [ADR-QD-056](056-audit-companion-package.md)
- [BEH-QD-254](../behaviors/33-audit-pipeline.md#beh-qd-254-sequence-integrity-verification-detects-a-gap-or-a-duplicate-and-trusts-neither-write-order)
- [INV-QD-054](../invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number)
- [INV-QD-130](../invariants.md#inv-qd-130-a-purge-never-selects-a-row-its-archive-does-not-hold)
