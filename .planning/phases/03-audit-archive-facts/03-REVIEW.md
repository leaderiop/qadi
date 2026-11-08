---
phase: 03-audit-archive-facts
reviewed: 2026-11-08T00:00:00Z
depth: standard
files_reviewed: 15
files_reviewed_list:
  - packages/audit/src/ArchiveFacts.ts
  - packages/audit/src/AuditArchive.ts
  - packages/audit/src/SequenceIntegrity.ts
  - packages/audit/test/ArchiveRoundTrip.test.ts
  - packages/audit/test/ArchiveFacts.test.ts
  - packages/audit/test/SequenceIntegrity.test.ts
  - .changeset/archive-facts.md
  - spec/README.md
  - spec/behaviors/33-audit-pipeline.md
  - spec/decisions/056-audit-companion-package.md
  - spec/decisions/110-an-archives-facts-are-computed-once.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/overview.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 1
  info: 2
  total: 3
  necessity: 0
status: issues_found
---

# Phase 3: Code Review Report

**Reviewed:** 2026-11-08
**Depth:** standard
**Files Reviewed:** 15
**Status:** issues_found

## Summary

I diffed the refactor against the deleted `SequenceBreak.ts` and the old `firstOutOfOrder` and `AuditArchive.ts` logic, and traced the reader's trust boundary.

**No tampering path was opened.**
- The sequence-break scan in `firstBreakIn` is the same loop as the old `firstSequenceBreak`.
- The old `firstOutOfOrder` flagged an entry when it followed an unsequenced entry or sat below the previous sequenced number. The new adjacent-pair scan with `archiveOrder(previous, entry) > 0` flags the same index.
  - Sequenced then unsequenced gives `-Infinity`, which is in order.
  - Unsequenced then sequenced gives `+Infinity`, which is out of order.
  - Two unsequenced entries give `NaN > 0`, which is false.
  - The comparator is a total preorder over every value the reader can produce, so an adjacent scan is sufficient.
- The reader still runs its checks in the same order: decode, count, break, order, claim. It never sorts. It builds `VerifiedArchiveImpl` from the decoded entries, which are provably in archive order at that point.
- The claim comparison is `!==` against `sequencedCount >= 2`, so a forged `true` or `false` is refused.
- On the reader path, `Schema.Int` rejects non-safe integers, `Infinity` and `NaN` before `archiveFacts` runs. I confirmed this by running `Schema.decodeUnknownResult(Schema.Int)` on `2**53`, `Infinity`, `1e300` and `NaN`: all failed. That is why the break check cannot be defeated by `n + 1 === n` on the reader path.

The one real defect is writer/reader drift that remains despite the phase's stated goal. It is described below.

## Warnings

### WR-01: Writer accepts sequence numbers the reader refuses, so "reader accepts every bundle the writer writes" (BEH-QD-254, ADR-QD-110) is false

**File:** `packages/audit/src/ArchiveFacts.ts:61-70, 82-103` (writer entry via `verifiedArchiveFacts`, line 119); `packages/audit/src/AuditEntry.ts:80` (reader's domain, `Schema.optional(Schema.Int)`)
**Issue:** The writer path `archiveAuditTrail` -> `verifiedArchiveFacts` -> `archiveFacts` takes `AuditEntry` objects with a plain `number` and never checks that `sequenceNumber` is in the domain the reader enforces (a safe integer). The consequences are below.
- Entries numbered `1.5, 2.5` pass `firstBreakIn` (`2.5 === 1.5 + 1`). The writer emits a bundle with `sequenceIntegrityVerified: true`, and `readAuditArchive` then refuses it as `EntryNotDecodable` (`Malformed`). A purge is blocked, and the new spec REQUIREMENT ("`readAuditArchive` MUST accept every bundle `archiveAuditTrail` writes") is violated.
- `Infinity, Infinity` and `2**53, 2**53` (`x + 1 === x`) are a duplicate the check does not see. `archiveAuditTrail` and the public `verifySequenceIntegrity` both pass and claim verified, and `archiveFacts` reports `sequenceBreak: undefined`. The reader refuses these bundles only because `Schema.Int` happens to run first. The break rule itself is not sound on its own domain.
- This predates the phase, since the old code had the same gap. But the phase's purpose is that the writer and reader cannot diverge, and the new property tests hide the gap. `ArchiveRoundTrip.test.ts` draws sequence numbers only from `integer({min: 0, max: 8})` and `integer({min: 0, max: 1000})`, and `ArchiveFacts.test.ts` draws from `integer({min: 0, max: 8})`. Neither generates a non-integer or an unsafe integer, so the round-trip property cannot fail.

**Fix:** State the domain once, in `ArchiveFacts.ts`, and have the writer refuse it the way the reader does. For example, in `archiveFacts`, treat any defined `sequenceNumber` where `!Number.isSafeInteger(n)` as a break. Alternatively, have `verifiedArchiveFacts` fail with a typed error. Then add a generator arm to the round-trip property for `fc.double()` and `fc.constantFrom(Infinity, 2**53, -0.5)`, asserting that the writer refuses whatever the reader would refuse. A minimal guard in `firstBreakIn`:

```ts
for (const actual of sorted) {
  if (!Number.isSafeInteger(actual)) {
    return { expectedSequence: previous === undefined ? actual : previous + 1, actualSequence: actual };
  }
  if (previous !== undefined && actual !== previous + 1) { ... }
  previous = actual;
}
```

The `SequenceBreak` payload can't represent a "not an integer" refusal faithfully, so a distinct `SequenceNumberNotInteger` writer error may be cleaner. That would be a public-surface decision, so ADR-QD-110 should record the choice.

## Info

### IN-01: Stale test commentary left behind by the refactor

**File:** `packages/audit/test/ArchiveRoundTrip.test.ts:5-10`; `packages/audit/test/SequenceIntegrity.test.ts:66-69`
**Issue:** The `ArchiveRoundTrip.test.ts` header still says "Written before the archive's facts module exists ... the writer and the reader each restate the order ... today". The module now exists and the rules are stated once, so the comment is false. `SequenceIntegrity.test.ts` explains that removing `.filter` is an equivalent mutant because `toSorted` moves `undefined` to the end. The implementation no longer has a `.filter` (it is `flatMap` in `ArchiveFacts.ts`), so the justification points at code that is gone.
**Fix:** Reword the `ArchiveRoundTrip.test.ts` header in the past tense ("written before the refactor so it pinned behavior across it; it now pins writer/reader agreement"). Rewrite the `SequenceIntegrity.test.ts` comment to say why an unsequenced entry between two sequenced ones does not hide the gap, which is that `flatMap` drops it.

### IN-02: ADR-QD-110 mutation and "97 killed / 1 survivor" claim is not reproducible from the changed files

**File:** `spec/decisions/110-an-archives-facts-are-computed-once.md` (Consequences)
**Issue:** The ADR records a scoped mutation result as evidence. Nothing in the reviewed scope (no config, no report path) lets a reader re-run or verify it. A normative document citing an unverifiable number is the kind of claim AGENTS.md section 15 says should be gated rather than remembered. This also holds for the "`NotInSequenceOrder.index` keeps its meaning" claim, which this review verified by reading and which `ArchiveRoundTrip.test.ts` pins, so it is fine.
**Fix:** Cite the Stryker config or command used (for example the scoped `stryker.audit.mjs` invocation) next to the number, or drop the count and keep the qualitative statement.

---

_Reviewed: 2026-11-08_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
