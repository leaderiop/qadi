---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 08
subsystem: audit
tags: [audit, admission-step, tests, fault-table]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: 93f7081b09288b68b7247b8f31194defb7f7e75e
plan_head_after: 21899c74316c8b5b70396fbedbdf72eeb70c7c5c
commits: 2
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: HostBatch.ts (admitBatch, admitRows) and the four entry points admitting through it, plans 05 to 07
provides:
  - packages/audit/test/hostBatchFaults.ts, the shared fault table (writerBatches, planBatches, rowsLists)
  - one describe in ForeignRows.test.ts comparing each entry point's refusal with the step's, one row per entry point
  - the six order rows removed, each order held by the step's own table
affects: [QD-89 plans 09 to 11]

requirements-completed: []

actuals:
  tokens: 17000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a function is proven to call the step by running both over one fault table and asking that their refusals agree, so no test restates which refusal wins"

key-files:
  created:
    - packages/audit/test/hostBatchFaults.ts
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-08-SUMMARY.md
  modified:
    - packages/audit/test/ForeignRows.test.ts
    - packages/audit/test/Retention.test.ts
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md

key-decisions:
  - "The comparison asserts refusal-or-nothing on both sides (the entry point's ArchiveInputInvalid or RetentionInputInvalid refusal against the step's failure, each spread to its members; undefined against undefined when the step admits), which covers 'equal refusals' and 'an admitted batch is not refused' in one assertion per entry."
---

# Phase 89 Plan 08: The per-entry-point comparison Summary

**`hostBatchFaults.ts` holds one fault table (24 writer batches, 24 plan batches, 12 rows lists, each with the terms result the step is given), and `ForeignRows.test.ts` gains one describe with a row per entry point that runs the table through the entry point and through `admitBatch` or `admitRows` and asserts the two refusals are equal; the six rows that restated the order are removed.**

## Performance

- **Completed:** 2026-11-26 (start 03:30Z); **Tasks:** 2 (one tracer, one auto); two plan commits plus the summary commit
- **Files:** 1 test helper created, 2 test files edited in their declared regions, the evidence file extended

## Accomplishments

- **Tracer (Task 1, `4f26c15a`):** `writerBatches` is every `now` in {1000, NaN} by key material absent, not a list (`7`) or an item refused (`[null]`) by rows that are good, not a list, a refused row or a list with a hole; `planBatches` is the same `now` values by `maxAgeMs` 10, NaN or -1 by the same rows; `rowsLists` is good rows, no rows, the seven values that are not a list, a refused row, a hole and a list the step admits but a sequence check refuses. Each entry carries the terms result written out with `ArchiveInputRefusal` and `RetentionInputRefusal` constructors. The four rows pass on the real code and each was seen failing under a scratch entry point (recorded under `## 89-08 the per-entry-point rows`): `writer-rows-first` (4 rows failed under it: the comparison row and the three order rows still in place), `verify-skips-holes` (1), `retention-maxage-first` (1), `purge-maxage-first` (1). The source equals its committed text afterwards.
- **Task 2 (`21899c74`):** the regions 111-114, 156-166, 231-246 and 359-368 of `ForeignRows.test.ts` and lines 138-141 of `Retention.test.ts` are removed, nothing else moved. The six removed titles and what holds each now (D-25): `a non-finite now is refused before the rows are read` (H7, H8: the step table), `planRetention reads now and maxAgeMs before the rows` (H6, H9, H10), `the inputs read before the rows are still read first` (H7, H9), `now is read before the keys, and the keys before the rows` (H6, H10), `the rows are read after the keys the reader reads` (H5), `checks now before maxAgeMs` in `Retention.test.ts` (H6); the per-entry-point comparison proves each entry point calls the step, so the order is asserted once.
- Gates: `89-pinned-check.mjs --all-applied` prints `pinned: 47 files hold their base text, 5 of 5 born files held, 3 of 3 declared edits applied`; the audit suite is green (724 rows in 34 files, 0 failed: 726 plus the four new rows minus the six removed); `tsc -p tsconfig.test.json`, `node scripts/check-house-style.mjs` (645 files clean), `scan-ids` and `scan-forbidden` pass.

## Task Commits

1. Task 1: `4f26c15a` `test(89-08): each function that takes a batch refuses what the admission step refuses` (`hostBatchFaults.ts`, `ForeignRows.test.ts`, the evidence)
2. Task 2: `21899c74` `test(89-08): remove the order rows the admission step table holds` (`ForeignRows.test.ts`, `Retention.test.ts`)

## Deviations from Plan

### Auto-fixed Issues

None. The plan's hand-written key-material terms (`7` is `KeyMaterialNotAList { value: 7 }`, `[null]` is `KeyMaterialItemRefused { index: 0 }`) match what `snapshotKeyMaterial` returns, as read from `AuditArchive.ts` before writing the table, so no comparison row needed a correction.

### Plan notes (choices the plan left open)

- **The plan commit ledger** (protocol 0c) was written at the start of the plan (`plan_head_before` is `93f7081b`); `commits: 2` is the measured `rev-list --count` before the summary commit.
- **The `<verify>` texts were run from script files** (`bash <file>`), extracted verbatim from the plan; the scratch edits ran through a script that backs up each module with `cp` and restores it.
- **The fault table's names are messages only**: `name` is the third argument of each `assert.deepStrictEqual`, so a failing entry names itself; no title carries one.
- **Doc comments** of `hostBatchFaults.ts` say what the table is and why it names faults and terms, never a winner.

### Auth gates

None.

## Issues Encountered

None.

## Next Phase Readiness

- Plans 09 to 11: the changeset, the spec records and the mutation close.

## Known Stubs

None.

## Threat Flags

None. T-89-23 is mitigated by the four comparison rows over a table the step answers and by the pinned check admitting only the declared removals; T-89-24 by the four rows failing under each reordering scratch edit, recorded.

## Denied commands

None.

## Self-Check: PASSED

- `packages/audit/test/hostBatchFaults.ts` and this summary exist; `4f26c15a` and `21899c74` are ancestors of HEAD.
- Task 1 verify (`verify-89-08-t1.sh`): exit 0. Task 2 verify (`verify-89-08-t2.sh`): exit 0.
