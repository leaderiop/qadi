---
phase: 03-audit-archive-facts
verified: 2026-11-08T05:30:00Z
status: human_needed
score: 9/10 must-haves verified
covered_files:
  - ".planning/phases/03-audit-archive-facts/03-01-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-01-SUMMARY.md"
  - ".planning/phases/03-audit-archive-facts/03-02-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-02-SUMMARY.md"
  - ".planning/phases/03-audit-archive-facts/03-03-PLAN.md"
  - ".planning/phases/03-audit-archive-facts/03-03-SUMMARY.md"
  - "packages/audit/src/ArchiveFacts.ts"
  - "packages/audit/src/AuditArchive.ts"
  - "packages/audit/src/SequenceIntegrity.ts"
  - "packages/audit/test/ArchiveFacts.test.ts"
  - "packages/audit/test/ArchiveRoundTrip.test.ts"
covered_digest: "v4:sha256:3f44f1e29e6c7d909544d2e9416ed3f1bc962097c067467277fd993cc575e56d"
behavior_unverified: 0
overrides_applied: 0
human_verification:
  - test: "Decide WR-01: writer accepts sequence numbers the reader refuses (1.5/2.5, 2**53/2**53)"
    expected: "Either the writer refuses them (domain stated once in ArchiveFacts.ts) or BEH-QD-254's 'MUST accept every bundle archiveAuditTrail writes' is scoped to safe-integer sequence numbers. Disposition recorded in 03-REVIEW-DISPOSITION.md (currently `open`)"
    why_human: "Pre-existing behaviour, but the phase added an unscoped normative MUST that this input falsifies, and the new property tests only draw integers 0..1000. Whether to fix now (public-surface choice: a new writer error or a SequenceBreak payload) or narrow the spec is a maintainer call"
  - test: "Confirm ROADMAP success criterion 4 (`pnpm check:pr` green) given step 13 `pnpm example` cannot run here"
    expected: "`pnpm check:pr` exits 0 on a machine where `playwright install --with-deps chromium` can run (sudo/TTY), e.g. CI"
    why_human: "`pnpm example` needs sudo to install Chromium system deps. This verifier ran every other pnpm check step independently and they passed, but did not run `pnpm example`, `pnpm website`, `spec:website-examples` or `spec:publish`"
---

# Phase 3: Audit archive facts Verification Report

**Phase Goal:** The archive's ordering, claim and sequence rules are each stated once, and the writer and reader both use them.
**Verified:** 2026-11-08
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria, then plan must-haves)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | `sequencedCount >= 2` and the ordering comparator each appear once in `packages/audit/src` | VERIFIED | `grep -rn "sequencedCount >= 2" packages/audit/src` gives one code hit, `ArchiveFacts.ts:99`. The `archiveOrder` comparator (`POSITIVE_INFINITY` difference) is defined once, `ArchiveFacts.ts:52-53`; `toSorted(archiveOrder)` is the only entry sort. No `sequenceNumber` ordering or counting logic remains in `AuditArchive.ts`, `Retention.ts` or elsewhere in src (only schema fields in `AuditEntry.ts`). `SequenceBreak.ts` is deleted. The one other `toSorted((a, b) => a - b)` in `archiveFacts` sorts bare numbers to find the break, not entries by archive order. It is a second sort expression, but not a second statement of the entry-ordering rule |
| 2 | A property test shows the reader accepts every archive the writer produces | VERIFIED, with caveat (see WR-01) | `ArchiveRoundTrip.test.ts` has 4 `FastCheck.property` blocks. The round-trip property runs 200 cases through writer, JSON text and reader. `pnpm vitest run packages/audit`: 17 files, 299 tests pass. Caveat: sequence numbers are drawn only from integers 0..1000, and I reproduced that the writer accepts `[1.5, 2.5]` and `[2**53, 2**53]` while the reader refuses both as `EntryNotDecodable` |
| 3 | Each `ArchiveRefusal` kind still fires on a tampered bundle | VERIFIED | The tamper property covers all seven kinds (`Malformed`, `UnsupportedArchiveVersion`, `EntryNotDecodable`, `CountMismatch`, `SequenceBroken`, `NotInSequenceOrder`, `UnbackedClaim`) with payload asserts. The file was written in 03-01 before any `src` change and is unchanged by 03-02. The reader's check order (decode, count, break, order, claim) is intact in `readAuditArchive` |
| 4 | `pnpm check:pr` is green; ADR-QD-110, CCR-QD-387 and a changeset recorded | UNCERTAIN (human) | Records verified: ADR-QD-110 file, `index.yaml` entry, ADR-056 amendment, traceability §3/§4 rows, `CCR-QD-387` row in `spec/README.md`, `.changeset/archive-facts.md` (`"@qadi/audit": patch`). Gate steps I ran independently, all exit 0: `typecheck`, `lint`, `lint:style`, `circular`, `test:tstyche`, `test:bdd`, `spec:examples`, `spec:verify:strict` (21/0/0), `spec:gates`, `spec:claims`, `spec:api` (861 exports), `spec:package` (9 packages). Not run here: `pnpm example`, `spec:website-examples`, `website`, `spec:publish`. The orchestrator and 03-03 executor report these run by hand (e2e: one flaky timeout that passed on rerun). A single `pnpm check:pr` invocation has not been green in this environment |
| 5 | Writer builds from the facts and reader recomputes them (ARC-02) | VERIFIED | `archiveAuditTrail` calls `verifiedArchiveFacts(entries)` and uses `facts.ordered`, `facts.sequenceIntegrityVerified` (`AuditArchive.ts:113-123`). `readAuditArchive` calls `archiveFacts(entries)` and compares `sequenceBreak`, `outOfOrderAt` and the claim (`:297-306`). It builds `VerifiedArchiveImpl` from the decoded entries, not `facts.ordered`, so it never repairs |
| 6 | `SequenceIntegrity.ts` and `SequenceBreak.ts` folded in; public names survive (ARC-03) | VERIFIED | `SequenceIntegrity.ts` is `export { SequenceIntegrityError, verifySequenceIntegrity } from "./ArchiveFacts.ts"`. `SequenceBreak.ts` is absent. `ArchiveFacts.ts` is not in the barrel. `spec:api` and `spec:package` pass |
| 7 | `NotInSequenceOrder.index` meaning unchanged | VERIFIED | `outOfOrderAt` is the first index where `archiveOrder(previous, entry) > 0`. The review traced equivalence to the old loop (sequenced then unsequenced is `-Infinity`, in order; unsequenced then sequenced is `+Infinity`, out of order; two unsequenced give `NaN`, not out of order). The reordering property and the pinned `AuditArchive.test.ts` cases pass |
| 8 | Spec records: BEH-QD-254, INV-QD-054/130, overview Source cells (D-07) | VERIFIED | BEH-QD-254 carries the new REQUIREMENT, Rev 1.16. `spec/overview.md` names `ArchiveFacts.ts` as the source for both public names. Gates 11, 12 and 13 pass |
| 9 | XC-04 no new budgeted constructs; XC-05 coverage | VERIFIED | `lint:style`: 399 files clean, 3 declared switches (unchanged). `UNTRACED_BUDGET` untouched (`verifySequenceIntegrity` is an unnamed `Effect.fn` over a named one). `packages/audit/src` coverage is 99.26% lines. Full `pnpm coverage` failed here with 9 unrelated 5 s timeouts, all in `packages/core` tests under instrumentation load. No audit test failed, and the orchestrator's plain `pnpm test` run was green |
| 10 | Reader accepts every writer bundle across the writer's whole input domain (BEH-QD-254 REQUIREMENT, ADR-QD-110) | UNCERTAIN (human) | The spec says `readAuditArchive MUST accept every bundle archiveAuditTrail writes`, unscoped. Reproduced with a throwaway test (deleted afterwards): `[1.5, 2.5]` and `[2**53, 2**53]` are written (claim `true`) and then refused. See WR-01 |

**Score:** 9/10 must-haves verified (truth 4 and truth 10 are the two routed to human; truth 2 is counted verified with the caveat above).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/audit/src/ArchiveFacts.ts` | One module for order, claim, break, out-of-order index | VERIFIED | 143 lines, pure `archiveFacts`, `verifiedArchiveFacts`, `SequenceIntegrityError`, `verifySequenceIntegrity` |
| `packages/audit/src/SequenceIntegrity.ts` | Public re-export only | VERIFIED | One `export {} from` line plus doc comment |
| `packages/audit/src/AuditArchive.ts` | Writer and reader on the facts | VERIFIED | Imports and uses both facts functions; no local ordering or claim logic |
| `packages/audit/test/ArchiveRoundTrip.test.ts` | 4 properties | VERIFIED | Imports only `AuditArchive.ts` and `AuditEntry.ts` from src |
| `packages/audit/test/ArchiveFacts.test.ts` | Unit and permutation tests | VERIFIED | Passes |
| `spec/decisions/110-an-archives-facts-are-computed-once.md` | ADR-QD-110 | VERIFIED | Present, indexed, traced, cited by ADR-056 amendment |
| `.changeset/archive-facts.md` | Patch for `@qadi/audit` | VERIFIED | Present |
| `spec/README.md` CCR-QD-387 row | Register row | VERIFIED | Present (line 325) and in the change history |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `AuditArchive.ts` | `ArchiveFacts.ts` | `verifiedArchiveFacts(entries)` and `archiveFacts(entries)` | WIRED |
| `index.ts` barrel | `ArchiveFacts.ts` | `SequenceIntegrity.ts` re-export | WIRED |
| `traceability.md` | ADR-110 and `ArchiveRoundTrip.test.ts` | §3 and §4 rows | WIRED (`spec:verify:strict` passes) |

### Data-Flow Trace (Level 4)

Not applicable. The phase is pure functions and a codec path, with no rendered dynamic data. The round-trip property exercises the writer, JSON, reader flow end to end.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Audit suite | `pnpm vitest run packages/audit` | 17 files, 299 tests pass | PASS |
| House style / budgets | `pnpm lint:style` | 399 files clean | PASS |
| Writer vs reader on non-integer / unsafe sequence numbers | throwaway test, deleted | writer ok, reader `EntryNotDecodable` for both | FAIL (this is WR-01) |

### Probe Execution

Step 7c: no probes declared by this phase. SKIPPED.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| ARC-01 | 03-02, 03-03 | SATISFIED | `ArchiveFacts.ts` computes ordered, `sequenceIntegrityVerified` and the first break |
| ARC-02 | 03-02, 03-03 | SATISFIED | Truth 5 |
| ARC-03 | 03-02, 03-03 | SATISFIED | Truth 6 |
| ARC-04 | 03-01, 03-03 | SATISFIED for integer sequence numbers | Round-trip and tamper properties pass; see WR-01 for the non-integer domain |
| XC-01 | 03-03 | NEEDS HUMAN | `check:pr` not run as one command here (`pnpm example` needs sudo) |
| XC-02 | 03-03 | SATISFIED | ADR-QD-110, CCR-QD-387, `spec/README.md` history line, traceability rows, changeset all present |
| XC-03 | 03-02, 03-03 | SATISFIED | `spec:api` passes. The two public names are retained and no export was added |
| XC-04 | 03-01, 03-02 | SATISFIED | `lint:style` clean |
| XC-05 | 03-02, 03-03 | SATISFIED for audit (99.26%) | Full `pnpm coverage` failed here on core timeouts (environment load, 9 tests, none in audit). The thresholds themselves were not evaluated by me |

No orphaned requirements. REQUIREMENTS.md maps ARC-01..04 and XC-01..05 to this phase, and every ID is claimed by at least one plan.

### Anti-Patterns Found

None in the phase's source files. There are no TBD, FIXME or XXX markers and no stubs. The only open items are review findings:

| Finding | Severity | Status |
|---------|----------|--------|
| WR-01 writer/reader domain drift (confirmed by reproduction) | Warning | open |
| IN-01 stale test commentary (`ArchiveRoundTrip.test.ts` header; `SequenceIntegrity.test.ts` mutant note) | Info | open |
| IN-02 ADR-QD-110's "97 killed / 1 survivor" has no re-runnable command cited | Info | open |

### Human Verification Required

#### 1. WR-01 decision

**Test:** Choose between (a) stating the sequence-number domain once in `ArchiveFacts.ts` so the writer refuses what the reader refuses, with a generator arm for non-integers and unsafe integers in `ArchiveRoundTrip.test.ts`, and an ADR-QD-110 note; or (b) scoping BEH-QD-254's REQUIREMENT and the ADR to safe-integer sequence numbers.
**Expected:** The normative text and the code agree. Set the disposition in `03-REVIEW-DISPOSITION.md`.
**Why human:** The behaviour pre-dates the phase and no refusal kind regressed. The phase added the unscoped "MUST accept every bundle the writer writes", so spec and code currently disagree on a reachable input. Option (a) may add public surface.

#### 2. `pnpm check:pr` as a single green command

**Test:** Run `pnpm check:pr` where Playwright's system deps can install (CI, or a machine with sudo).
**Expected:** Exit 0.
**Why human:** The only unreproducible step in this environment is `pnpm example` (sudo). Every other step I could run passed.

### Gaps Summary

The refactor goal is achieved in code. The order, the claim and the break are each stated once in `ArchiveFacts.ts`. The writer builds from them and the reader recomputes and compares. The refusal vocabulary, payloads and check order are unchanged, and the spec, ADR, CCR and changeset records are in place. Nothing is FAILED outright. Two items need a human decision.

1. WR-01 is a real, reproduced divergence between writer and reader. It is not a regression, but it makes the phase's own new normative sentence false for non-integer and unsafe-integer sequence numbers. A small fix or a one-line spec scoping closes it.
2. Success criterion 4 cannot be confirmed as one `pnpm check:pr` run from this environment.

---

_Verified: 2026-11-08_
_Verifier: Claude (gsd-verifier)_
