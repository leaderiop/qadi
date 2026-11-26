---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 01
subsystem: testing
tags: [audit, stryker, characterisation, admission-order, read-once, fast-check, host-batch]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
base_record: 5efd54494eeda4d07f0e723656fc9f7c25f15fc9
born_order: d7e4a0e7dcd7c0c1b512d7489a7b70bd97f6188b
born_reads: 940583c3fafcdf9aea058c48ab4b18153fbcdeac
plan_head_before: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_after: 940583c3fafcdf9aea058c48ab4b18153fbcdeac

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: the 87-mutation.mjs scorer (judge, judgeNew, EXAMINED, EQUIVALENT) and the RED evidence line forms
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: the self-test that asserts nothing about the real EXAMINED or EQUIVALENT (88-08 deviation 1)
provides:
  - 89-mutation.mjs, the phase scorer for the one audit group (base over five files, close over six, the removed-mutant rule, the absolute rule for HostBatch.ts, EXAMINED, EQUIVALENT, the moved note, phase91_base)
  - 89-mutation-base.json, phase_base and the audit base measured on the unchanged tree, committed alone and first
  - AdmissionOrder.characterisation.test.ts, 73 rows (which refusal wins, the spans, the three property rows, what a refusal leaves unread), green on the base
  - BatchReadOnce.test.ts, 13 rows (maxAgeMs read once, a null or undefined policy refused, a flipping list judged as checked, the rows list read once per entry point), 12 red and 1 green on the base
  - 89-RED-EVIDENCE.md, every seen-failing and red-before line of the plan
affects: [QD-89 plans 02 to 11, HostBatch.ts, AuditArchive.ts, ArchiveFacts.ts, Retention.ts]

actuals:
  tokens: 32000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a scorer whose one group is measured at the base over the files that exist and at the close over those plus the born one, with the same bail setting, so the touched files compare and the born file is judged absolutely"
    - "a literal winner for every pair of faults per entry point, so no abstraction under test can make a row pass by construction"

key-files:
  created:
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation.mjs
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-mutation-base.json
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-RED-EVIDENCE.md
    - packages/audit/test/AdmissionOrder.characterisation.test.ts
    - packages/audit/test/BatchReadOnce.test.ts
  modified: []

key-decisions:
  - "The scorer's judgeNew has no killers clause and reads a Timeout from the file's own count; SequenceIntegrity.ts, which holds no mutant, is the one file a report may omit and is recorded with zero counts."
  - "The three property rows derive the first fault from a stated order; every other row writes its expected refusal or span list literally."

patterns-established:
  - "A row an edit leaves green is made narrower in what it asserts (S8 asserts the plans return plain Results), never skipped"

requirements-completed: []

coverage:
  - id: D1
    description: "89-mutation-base.json holds phase_base and the audit base (212 killed, 20 Ignored static, 0 survived over the five files), committed alone as the first plan commit"
    verified_by: node 89-mutation.mjs --self-test (92 passed) and the Task 1 verify
  - id: D2
    description: "73 characterisation rows green on the base, each seen failing under a base-side scratch edit"
    verified_by: AdmissionOrder.characterisation.test.ts (73 passed) and the Task 2 verify
  - id: D3
    description: "13 read rows: B5 green and B1 to B4, B6 to B13 red on the base, each recorded with its failing text"
    verified_by: BatchReadOnce.test.ts (12 failed, 1 passed on the base) and the Task 3 verify
---

# Phase 89 Plan 01: Measure the base and pin the admission order and the batch reads on it Summary

**A mutation scorer for the one audit group, its base record (212 mutants killed, 20 Ignored static, none open), 73 characterisation rows that pin which refusal wins, which spans open and what stays unread, all green on the base and each seen failing, and 13 read-once rows of which 12 are red on the base.**

## Performance

- **Started:** 2026-11-26, about 02:27Z; **Completed:** 2026-11-26T02:44Z (roughly 17 minutes)
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 5; no file under `packages/audit/src`, no existing test and `stryker.audit.mjs` changed
- Scratch files lived in `$TMPDIR/qd89` (run scripts, vitest JSON reports, backups of `AuditArchive.ts`, `ArchiveFacts.ts` and `Retention.ts`); each was restored with `cp` and `git diff --quiet 8ee14f6f -- packages/audit/src stryker.audit.mjs` holds.

## Accomplishments

- **Tracer (Task 1):** `89-mutation.mjs` is `87-mutation.mjs` regrouped for one `audit` group. Its self-test drives every judge with planted records (92 cases, none reading the real `EXAMINED` or `EQUIVALENT`) and oxlint is clean. The base ran on the clean tree with the exact base invocation: 232 mutants, 212 killed, 20 Ignored static, 0 survived, as the research measured. Per file: `AuditArchive.ts` 82/82 with 14 Ignored, `ArchiveFacts.ts` 55/55 with 4, `Retention.ts` 57/57 with 2, `CodecMade.ts` 18/18 with 0, `SequenceIntegrity.ts` 0/0 (no mutants). `89-mutation-base.json` names `phase_base`, the base and close invocations, `born: [HostBatch.ts]`, three `moved` entries, `unmeasured: []` with the reason and no `RENAMED`. It is the first plan commit after `phase_base`, holding only the scorer and the record.
- **Characterisation (Task 2):** `AdmissionOrder.characterisation.test.ts` holds 73 rows, all green on the base: W1 to W18 (writer, 6 singles and 12 pairs), R1 to R13 and P1 to P13 (the plans), V1 to V4 (verify), O1 to O3 (fast-check over every set of faults), S1 to S8 (spans), SF1 to SF4 (the sequence span on refused rows), L1 to L5 (what a refusal leaves unread) and F1 to F5 (`verifiedArchiveFacts` called directly, last). `IMPOSSIBLE` names the four impossible pairs; `rowItem x break` is a real pair won by `EntryNotMadeByCodec`. Fourteen base-side scratch edits fail between 2 and 30 rows each and between them fail every one of the 73; 146 `- failed (...)` lines are recorded.
- **Read rows (Task 3):** `BatchReadOnce.test.ts` holds B1 to B13. On the base B5 (a number, a string or `{}` as the policy) passes and the other twelve fail with the text each `- red before:` line records: B1 and B2 read `maxAgeMs` 3 times over two rows, B3 reads it twice when refused, B4 throws `TypeError: Cannot read properties of null (reading 'maxAgeMs')`, B6 archives the flipped plain row, B7 fails `SequenceIntegrityError`, B8 and B9 plan the plain row, and B10 to B13 read the list's index `0` 4, 4, 2 and 3 times. B5 was seen failing under `(base policy-value)`.

## Task Commits

1. Task 1: `5efd54494eeda4d07f0e723656fc9f7c25f15fc9` `docs(89-01): record the mutation base`
2. Task 2: `d7e4a0e7dcd7c0c1b512d7489a7b70bd97f6188b` `test(89-01): pin the admission order and spans on the base`
3. Task 3: `940583c3fafcdf9aea058c48ab4b18153fbcdeac` `test(89-01): pin the defects of the batch reads on the base`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The base report omits the file that holds no mutant**
- **Found during:** Task 1, `record base` after the Stryker run.
- **Issue:** the plan wants every file of the five in the record, `SequenceIntegrity.ts` with zero counts, but Stryker's report lists no file with no mutant (its `files` held four), so the scorer's exact-set check refused the report.
- **Fix:** `MAY_BE_ABSENT` names `SequenceIntegrity.ts`; `classify` reads an omitted file of that set as zero counts and `tally` skips its on-disk comparison. The self-test pins a report omitting it (read, zero counts) and one omitting the born file (refused). Self-test 90 to 92 passed.
- **Files modified:** `89-mutation.mjs` (before its commit). **Commit:** 5efd5449.

**2. [Rule 1 - Bug] S8 as written could not fail under its own scratch edit**
- **Found during:** Task 2, designing `(base plan-as-effect)`: a plan that returns an Effect is never run inside `Effect.sync`, so asserting only the span list `[]` stays green.
- **Fix:** S8 also asserts what each plan call returns is a plain `Result` (`failure`, `success`, `failure`, `success`). With it, `(base plan-as-effect)` fails S8 and O2. The expectation of the row, no span, is unchanged.
- **Files modified:** `AdmissionOrder.characterisation.test.ts` (before its commit). **Commit:** d7e4a0e7.

**3. [Rule 1 - Bug] B7's first assertion printed nothing about the failure**
- **Found during:** Task 3, the red run printed `expected false to be true`.
- **Fix:** B7 asserts the outcome tag (`expected 'SequenceIntegrityError' to equal 'success'` on the base), so the `- red before:` line says why. **Commit:** 940583c3.

**4. [Rule 1 - Bug] B13's archive read the counted list**
- **Found during:** Task 3, the first run: building the archive from `[...rows]` on the counting proxy added reads.
- **Fix:** one `trio` array backs both the counting list and the archive. **Commit:** 940583c3.

### Plan notes

- **A seen-failing edit changed more rows than named.** `(base writer-no-now)` also fails W7 to W11, O1, S1, L1 and L3, `(base facts-no-rows)` also fails O1, O3 and F5 and `(base plan-no-checks)` also fails O2, S8, L4 and L5; each failing row has its own line, and a row an edit leaves green was not needed because the named sets together cover all 73. Under `(base policy-value)` B3 stays green, because the edit stops the second read, so 12 rows fail, B5 among them.
- **Verifies ran from script files.** Each `<automated>` block was run as the same text in a scratch script (`bash <file>`), not inline through `bash -c '...'`; none contains `rm`.
- **Trailer.** Every commit carries `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, the value the phase fixes; the session's own attribution reminder names another model and was not used.

### Auth gates

None.

## Issues Encountered

None that remain. The audit suite is red by design on the base while `BatchReadOnce.test.ts` holds its twelve RED rows, until plans 06 and 07 land (the plan's reversibility table records it).

## Next Phase Readiness

- Plan 02 can add `89-check.mjs` over `phase_base` in `89-mutation-base.json`; the characterisation is held byte for byte from `d7e4a0e7` except its three declared regions, and `BatchReadOnce.test.ts` from `940583c3`.
- `EXAMINED` and `EQUIVALENT` stay empty until plan 09.

## Known Stubs

None.

## Threat Flags

None. T-89-01 is mitigated by the base record (names `phase_base`, the invocation and every file's counts, refused on a dirty tree, committed alone first) and the evidence lines; T-89-02 and T-89-03 by B4 and B6 to B13, red on the base for plans 05 to 07 to turn green.

## Self-Check: PASSED

- Files found: 89-mutation.mjs, 89-mutation-base.json, 89-RED-EVIDENCE.md, AdmissionOrder.characterisation.test.ts, BatchReadOnce.test.ts, this summary.
- Commits found as ancestors of HEAD: 5efd5449, d7e4a0e7, 940583c3, each ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count 8ee14f6f..HEAD` is 3 before the metadata commit.
- The three task verifies re-ran green after the summary existed; `git diff --quiet 8ee14f6f -- packages/audit/src stryker.audit.mjs` holds; nothing is modified under `packages`; no `.vitest/` or `.stryker-tmp/` remains; no added line under `packages` holds a phase-relative phrase or an id.
