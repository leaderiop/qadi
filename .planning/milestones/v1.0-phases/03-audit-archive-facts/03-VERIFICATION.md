---
phase: 03-audit-archive-facts
verified: 2026-11-08T06:00:00Z
status: passed
score: 10/10 must-haves verified
covered_files:
  - ".planning/phases/03-audit-archive-facts/03-01-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-01-SUMMARY.md"
  - ".planning/phases/03-audit-archive-facts/03-02-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-02-SUMMARY.md"
  - ".planning/phases/03-audit-archive-facts/03-03-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-03-SUMMARY.md"
  - "packages/audit/src/ArchiveFacts.ts"
  - "packages/audit/src/AuditArchive.ts"
  - "packages/audit/src/AuditEntry.ts"
  - "packages/audit/src/SequenceIntegrity.ts"
  - "packages/audit/test/ArchiveFacts.test.ts"
  - "packages/audit/test/ArchiveRoundTrip.test.ts"
  - "packages/audit/test/AuditArchive.test.ts"
  - "packages/audit/test/SequenceIntegrity.test.ts"
covered_digest: "v4:sha256:9148b26f874ea5e738db32934f1a9824bc4483cb576e59843256f04ab2df55ef"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 9/10
  gaps_closed:
    - "WR-01: writer archived sequence numbers the reader refuses (fixed in the writer: SequenceNumberInvalid, ba6e377, ccafcb8)"
    - "Success criterion 4: check:pr sequence executed with every step exit 0 (UAT test 2, accepted)"
  gaps_remaining: []
  regressions: []
---

# Phase 3: Audit archive facts Verification Report

**Phase Goal:** The archive's ordering, claim and sequence rules are each stated once, and the writer and reader both use them.
**Verified:** 2026-11-08
**Status:** passed
**Re-verification:** Yes. The previous report was `human_needed` with two items, both now resolved. Source was re-read and the gates re-run for this report.

## Goal Achievement

### Observable Truths (ROADMAP success criteria, then plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `sequencedCount >= 2` and the ordering comparator each appear once in `packages/audit/src` | VERIFIED | `grep` over `packages/audit/src` for `sequencedCount >= 2`, `toSorted` and `POSITIVE_INFINITY` hits only `ArchiveFacts.ts`: the claim at line 125, `archiveOrder` at 74-75, and `entries.toSorted(archiveOrder)` at 123. The other `toSorted((a, b) => a - b)` (line 107) sorts bare numbers to find the break, not entries in archive order. `AuditArchive.ts`, `Retention.ts` and `AuditEntry.ts` hold no ordering or counting logic. `SequenceBreak.ts` is gone and `SequenceIntegrity.ts` is a one-line re-export |
| 2 | A property test shows the reader accepts every archive the writer produces | VERIFIED | `ArchiveRoundTrip.test.ts` has `FastCheck.property` blocks for round trip, tamper, reordering, break agreement, and a final one over the whole `number` domain (`double()`, `NaN`, `±Infinity`, `2**53`, `MAX_VALUE`). That one asserts the writer fails `SequenceNumberInvalid` at the first non-safe-integer (oracle: `Number.isSafeInteger`, independent of the source) and otherwise every written bundle reads back. I disabled `isSequenceNumber` (replaced with `() => true`), and the file failed with counterexample `[-5e-324]`; I restored the source (`git status` clean for `packages/`) and it passed again. `pnpm vitest run packages/audit`: 17 files, 307 tests pass. The previous caveat (WR-01) is closed |
| 3 | Each `ArchiveRefusal` kind still fires on a tampered bundle | VERIFIED | The tamper property exercises all seven kinds with payload asserts (`ArchiveRoundTrip.test.ts` lines 136-173). `AuditArchive.test.ts` still pins the `NotInSequenceOrder.index` cases. The reader's check order is unchanged in `AuditArchive.ts` |
| 4 | `pnpm check:pr` is green; ADR-QD-110, CCR-QD-387 and a changeset recorded | VERIFIED | Records present: `spec/decisions/110-an-archives-facts-are-computed-once.md`, the `CCR-QD-387` row (`spec/README.md:325`), `.changeset/archive-facts.md` (`@qadi/audit: minor`, with a **Breaking.** note). I re-ran independently at HEAD, all exit 0: `typecheck`, `lint`, `lint:style` (399 files, 3 declared switches), `circular`, `test:tstyche`, `spec:examples` (101 blocks), `spec:verify:strict` (21/0/0), `spec:gates`, `spec:claims`, `spec:api` (862 exports), `spec:package` (9 packages). The orchestrator and UAT report the remaining steps (`coverage` 153 files / 3928 tests, `test:bdd`, `example` with e2e 30/30, `spec:website-examples`, `website`, `spec:publish`) green, with one substitution: `playwright install chromium` instead of `--with-deps chromium` (apt step needs sudo). I did not re-run `example`, `website` or `spec:publish`. I accept the substitution: it changes only how the OS libraries are installed, which were already present, and the browser tests themselves ran 30/30. CI still runs the `--with-deps` form and stays the authority |
| 5 | Writer builds from the facts and reader recomputes them (ARC-02) | VERIFIED | `archiveAuditTrail` uses `verifiedArchiveFacts(entries)` and its `ordered` and `sequenceIntegrityVerified` (`AuditArchive.ts:114-121`). `readAuditArchive` calls `archiveFacts(entries)` and compares the claim (`:298-306`). It builds the `VerifiedArchive` from the decoded entries, not `facts.ordered`, so the reader never repairs a bundle |
| 6 | `SequenceIntegrity.ts` and `SequenceBreak.ts` folded in; public names survive (ARC-03) | VERIFIED | `SequenceIntegrity.ts` is `export { SequenceIntegrityError, SequenceNumberInvalid, verifySequenceIntegrity } from "./ArchiveFacts.ts"`. `ArchiveFacts.ts` stays out of the barrel. `spec:api` and `spec:package` pass |
| 7 | `NotInSequenceOrder.index` meaning unchanged | VERIFIED | `outOfOrderAt` is the first index where `archiveOrder(previous, entry) > 0`, the same comparator that orders `ordered`. Pinned by the reordering property and the existing `AuditArchive.test.ts` cases |
| 8 | Spec records: BEH-QD-254, INV-QD-054/130, overview Source cells | VERIFIED | Gates 11, 12 and 13 (`spec:gates`, `spec:claims`, `spec:api`) and `spec:verify:strict` pass; CCR-QD-387 names the `SequenceNumberInvalid` change |
| 9 | XC-04 no new budgeted constructs; XC-05 coverage | VERIFIED | `lint:style` clean, with no new switches. `pnpm vitest run packages/audit --coverage` over `packages/audit/src`: 99.27% statements, 99.37% branches, 98.63% functions, against a 90% threshold. The full-repo coverage run is reported green by UAT (153 files / 3928 tests) |
| 10 | Reader accepts every writer bundle across the writer's whole input domain (BEH-QD-254, ADR-QD-110) | VERIFIED | The writer now refuses what the reader would refuse. `isSequenceNumber = Schema.is(Schema.Int)` in `ArchiveFacts.ts:84` is the same schema `AuditEntry.ts:82` declares `sequenceNumber` with, so the domain is stated once and both sides use it. `verifiedArchiveFacts` fails `SequenceNumberInvalid` before the gap check. The whole-domain property and its mutation check (truth 2) back it. The spec text, ADR and changeset were updated to match (ccafcb8) |

**Score:** 10/10 truths verified (0 present-but-behavior-unverified).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit/src/ArchiveFacts.ts` | One module for order, claim, break, out-of-order index and sequence-number domain | VERIFIED | Pure `archiveFacts`, `verifiedArchiveFacts`, `SequenceIntegrityError`, `SequenceNumberInvalid`, `verifySequenceIntegrity` |
| `packages/audit/src/SequenceIntegrity.ts` | Public re-export only | VERIFIED | One `export {} from` line plus doc comment |
| `packages/audit/src/AuditArchive.ts` | Writer and reader on the facts | VERIFIED | Imports and uses both facts functions; no local ordering or claim logic |
| `packages/audit/test/ArchiveRoundTrip.test.ts` | Properties for round trip, tamper, order, break agreement, whole domain | VERIFIED | 5 tests, killed a deliberate mutation |
| `packages/audit/test/ArchiveFacts.test.ts` | Unit and permutation tests | VERIFIED | Passes |
| `spec/decisions/110-an-archives-facts-are-computed-once.md` | ADR-QD-110 | VERIFIED | Present and indexed |
| `.changeset/archive-facts.md` | Changeset | VERIFIED | `minor`, with a **Breaking.** note for `SequenceNumberInvalid` |
| `spec/README.md` CCR-QD-387 row | Register row | VERIFIED | Line 325 and the change history |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `AuditArchive.ts` | `ArchiveFacts.ts` | `verifiedArchiveFacts(entries)` and `archiveFacts(entries)` | WIRED |
| `index.ts` barrel | `ArchiveFacts.ts` | `SequenceIntegrity.ts` re-export | WIRED |
| `ArchiveFacts.ts` | `AuditEntry.ts` | Same `Schema.Int` domain on writer and codec | WIRED |
| `traceability.md` | ADR-110 and `ArchiveRoundTrip.test.ts` | Rows | WIRED (`spec:verify:strict` passes) |

### Data-Flow Trace (Level 4)

Not applicable: pure functions and a codec path, with nothing rendered. The round-trip property exercises writer, JSON text and reader end to end.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Audit suite | `pnpm vitest run packages/audit` | 17 files, 307 tests pass | PASS |
| Audit coverage | `pnpm vitest run packages/audit --coverage` (src only) | 99.27% statements | PASS |
| Writer/reader domain property detects drift | disable `isSequenceNumber`, run `ArchiveRoundTrip.test.ts` | fails, counterexample `[-5e-324]`; passes after restore | PASS |
| House style | `pnpm lint:style` | 399 files clean | PASS |
| Public surface | `pnpm spec:api` | 862 exports documented | PASS |

### Probe Execution

Step 7c: no probes declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| ARC-01 | 03-02, 03-03 | SATISFIED | `ArchiveFacts.ts` computes order, count, claim, first break and the out-of-order index once |
| ARC-02 | 03-02, 03-03 | SATISFIED | Truth 5 |
| ARC-03 | 03-02, 03-03 | SATISFIED | Truth 6 |
| ARC-04 | 03-01, 03-03 | SATISFIED | Truths 2, 3 and 10, over the whole number domain |
| XC-01 | 03-03 | SATISFIED | Truth 4 (the one stated substitution is judged acceptable) |
| XC-02 | 03-03 | SATISFIED | ADR-QD-110, CCR-QD-387, traceability rows and changeset present |
| XC-03 | 03-02, 03-03 | SATISFIED | `spec:api` passes; `SequenceNumberInvalid` is the one added public name and `spec/overview.md` names it |
| XC-04 | 03-01, 03-02 | SATISFIED | `lint:style` clean; typecheck clean |
| XC-05 | 03-02, 03-03 | SATISFIED | Audit at 99.27%; full run reported green by UAT |

All IDs from the phase (ARC-01..04, XC-01..05) are claimed by at least one plan. No orphaned requirements.

### Anti-Patterns Found

None. No `TBD`, `FIXME` or `XXX` markers and no stubs in the phase's source files. The code-review disposition lists 5 findings (WR-01, WR-02, IN-01, IN-02, IN-03), all `fixed`, 0 open.

### Human Verification Required

None. UAT (`03-UAT.md`) shows 2 passed, 0 issues.

### Gaps Summary

The goal is achieved. The archive's order, claim, first-break and out-of-order rules, and the sequence-number domain, are each stated once in `ArchiveFacts.ts`. The writer builds from them and the reader recomputes and compares. The earlier writer/reader disagreement on non-integer and unsafe-integer sequence numbers is fixed in the code and pinned by a property that fails when the fix is removed.

Bookkeeping, not a goal gap: `.planning/ROADMAP.md` still shows Phase 3 as unchecked (`- [ ] **Phase 3`) and `.planning/REQUIREMENTS.md`'s traceability table still says `Pending` for ARC-01..04 and XC-01..05, though the requirement checkboxes are ticked. The orchestrator should update both when closing the phase.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
