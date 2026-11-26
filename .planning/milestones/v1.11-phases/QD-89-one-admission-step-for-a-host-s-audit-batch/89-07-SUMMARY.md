---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 07
subsystem: audit
tags: [audit, archive, admission-step, spans, type-pin]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: 91cdb2c26daea3f4dd0e9b4e1abf29f05dc76b49
plan_head_after: 36881b468f21e66cf3bdf38ac234d73fc526d000
commits: 4
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: packages/audit/src/HostBatch.ts (admitRows, admitBatch, AdmittedRows, NowRefusalCases), plans 05 and 06
provides:
  - archiveAuditTrail admits { now, key material, entries } through the step as its first statement
  - verifySequenceIntegrity admits its entries first, so a refused verify opens no span
  - verifiedArchiveFacts(rows: AdmittedRows) fails only SequenceIntegrityError
  - ArchiveInputRefusal stated over the two shared fragments plus the two key-material members
  - HostBatch.tst.ts, the type pin for both refusal unions and the nominal AdmittedRows
affects: [QD-89 plans 08 to 11]

requirements-completed: []

actuals:
  tokens: 26000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "an entry point admits first and builds its result from what the step admitted"
    - "a type pin made only of positive toBe and not.toBeAssignableTo, so the negative-pin budget does not move"

key-files:
  created:
    - packages/audit/test/HostBatch.tst.ts
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-07-SUMMARY.md
  modified:
    - packages/audit/src/ArchiveFacts.ts
    - packages/audit/src/AuditArchive.ts
    - packages/audit/test/AdmissionOrder.characterisation.test.ts
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-pinned-check.mjs

key-decisions:
  - "The pinned check declares the rewritten direct rows as a block that keeps only its own describe line, and the helper that handed verifiedArchiveFacts a list as a declared removal: the plan fixes new F titles and a new parameter type, which the checker as written could not hold."
---

# Phase 89 Plan 07: The archive through the admission step Summary

**`archiveAuditTrail` and `verifySequenceIntegrity` each admit their batch through `HostBatch.ts` as their first statement, `verifiedArchiveFacts` takes `AdmittedRows` and fails only on a sequence break, `ArchiveInputRefusal` is stated over `RowsRefusalCases & NowRefusalCases & { KeyMaterialNotAList; KeyMaterialItemRefused }`, and `HostBatch.tst.ts` pins both refusal unions and the nominal brand with five tests seen failing on V1 to V4 and V6.**

## Performance

- **Completed:** 2026-11-26 (start time not captured); **Tasks:** 2 (one tracer, one auto); four plan commits plus the summary commit
- **Files:** 2 source files modified, 1 test file created, 1 test file edited in its declared regions, the phase evidence file and pinned check edited

## Accomplishments

- **Tracer (Task 1):** SF1 to SF4 were flipped in the span-flips region (the writer refused for rows opens only `qadi.audit.archiveAuditTrail`; a refused verify opens no span) and seen red on the base archive source (`08d25872`, source equal to `phase_base`). Then `ArchiveFacts.ts` and `AuditArchive.ts` were rewired (`05d6e9da`): the writer is `admitBatch({ now, terms: () => snapshotKeyMaterial(options?.keyMaterial), entries })` followed by `verifiedArchiveFacts(rows)` and a bundle built from the admitted `createdAt`, key material and facts; the public verify is `admitRows(entries)` followed by `verifiedArchiveFacts(rows.success)`. The direct rows F1 to F5 are rewritten over `admitRows`. The audit suite is green: 726 rows in 34 files, 0 failed (B6, B7, B10, B11 turned green).
- **Task 2 (`36881b46`):** `HostBatch.tst.ts` has five tests (spelled members, fragments plus own members, shared members as one type, nominal admitted rows with the `{ entries }` and `OtherAdmittedRows` look-alikes and the `admitRows` return type, `verifiedArchiveFacts` parameter). No `toBeCallableWith` or `toBeConstructableWith`, so `NOT_CALLABLE_PIN_BUDGET` and the AGENTS.md table did not move. It passes both tstyche passes and was seen failing on V1 (spelled members), V2 (spelled, fragments), V3 (spelled, fragments, shared), V4 (parameter) and V6 (nominal); V5 is inert by the research and not a claim of the pin.
- Gates: `admission-step` and `entry-points-first` pass in full; the pinned check passes with the characterisation regions applied (`1 of 3 declared edits applied`, the other two belong to plan 08); `pnpm typecheck`, `pnpm circular`, `pnpm lint`, `pnpm spec:api` (942 exports) and `node scripts/check-house-style.mjs` pass; `scan-ids` and `scan-forbidden` are clean.

## Task Commits

1. Task 1, span flips red: `08d25872` `test(89-07): pin the sequence span opening only for admitted rows` (characterisation and evidence only; both archive modules equal `phase_base`)
2. Task 1, pinned-check declaration: `22f41722` `chore(89-07): declare the rewritten direct rows and the dropped helper in the pinned check` (see the plan defect below)
3. Task 1, the wiring: `05d6e9da` `refactor(89-07): admit the archive batch before the sequence span` (`ArchiveFacts.ts`, `AuditArchive.ts`, characterisation)
4. Task 2: `36881b46` `test(89-07): pin each refusal union as its fragments and the admitted rows as nominal` (`HostBatch.tst.ts`, evidence)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan defect: the pinned check could not hold the plan's own rewrite of the direct rows**
- **Found during:** Task 1
- **Issue:** `89-pinned-check.mjs` declared the `direct` region with `kept: [/^it(?:\.effect)?\("F[1-5] /]`, which requires each base F title line to survive, while the plan prescribes five new F titles; and the helper `factsFailure` (outside every declared region, held byte for byte) called `verifiedArchiveFacts(entries)` with a list, which no longer type-checks against `AdmittedRows`, so the file could not be both held and compiled.
- **Fix:** before: `{ name: "direct", ..., kept: [/^it(?:\.effect)?\("F[1-5] /] }` and no region for the helper; after: `kept: ['describe("verifiedArchiveFacts called directly", () => {']` (the block keeps its own line) plus a new region `{ name: "factsFailure", from: "const factsFailure = (entries: ReadonlyArray<AuditEntry>) =>", lines: 2, lead: 1, becomes: [] }` placed before `spanFlips`; the checker's self-test count of order regions moved from three to four. The helper is removed in the characterisation; the now-unused `SEQUENCE` const inside the span-flips block is removed with it (that region keeps its SF titles).
- **Files modified:** `.planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-pinned-check.mjs`, `packages/audit/test/AdmissionOrder.characterisation.test.ts`
- **Verification:** `node 89-pinned-check.mjs` reports the characterisation regions applied and the other 47 files held; `--self-test` passes (54); `tsc -p tsconfig.test.json` is clean.
- **Commit:** `22f41722`

### Plan notes (choices the plan left open)

- **The plan commit ledger** (protocol 0c) was written at the start of the plan: `plan_head_before` is `91cdb2c2`; `commits: 4` is the measured `rev-list --count` before the summary commit.
- **The `<verify>` texts were run from script files** (`bash <file>`), taken verbatim from the plan.
- **V1 fails only the spelled-members test**, not the fragments test: the fragments test names `NowRefusalCases` itself on both sides, so a change to the fragment moves both. That is the pin working as designed; the spelled pin carries the field-type claim.
- **Doc comments** of `ArchiveFacts.ts` (module doc, `ArchiveInputRefusal`, `verifiedArchiveFacts`, the public verify) and of `archiveAuditTrail` name `HostBatch.ts` and restate no order.

### Auth gates

None.

## Issues Encountered

None.

## Next Phase Readiness

- Plans 08 to 11: `hostBatchFaults.ts`, the edits to `ForeignRows.test.ts` and `Retention.test.ts` (the other two declared edits of the pinned check), the changeset, the spec records and the mutation close.

## Known Stubs

None.

## Threat Flags

None. T-89-19 is mitigated by the writer building its facts from `admitted.success.rows` (B6, B10 green); T-89-20 by `verifiedArchiveFacts(rows: AdmittedRows)` and the `HostBatch.tst.ts` pins (V4, V6 seen failing); T-89-21 by SF1 to SF4 committed red before the change and the success-span rows of `AuditArchive.test.ts` untouched; T-89-22 by `admission-step` and `pnpm spec:api` at 942 exports.

## Self-Check: PASSED

- `packages/audit/test/HostBatch.tst.ts` and this summary exist; `08d25872`, `22f41722`, `05d6e9da` and `36881b46` are ancestors of HEAD.
- Task 1 verify (`verify-89-07-t1.sh`): printed its marker, exit 0. Task 2 verify (`verify-89-07-t2.sh`): printed its marker, exit 0.
