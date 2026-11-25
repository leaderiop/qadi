---
phase: QD-81
plan: 10
subsystem: testing
tags: [mutation, stryker, close, scans, archived-checks, devtools, dock-model]
requires:
  - phase: QD-81
    provides: the base mutation record (81-01), the tests and fixes of 81-02 to 81-06, the spec and docs of 81-07 to 81-09
provides:
  - 81-mutation-close.json, the model group measured on the close head with the base invocation
  - F33, the test that pins the diagnostics feed's stale-run guard
  - the close scans, the pinned and single-source checks and the archived checks re-recorded in 81-RED-EVIDENCE.md
affects: [81-11]
key-files:
  created:
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-mutation-close.json
  modified:
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-pinned-check.mjs
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the one new survivor (DiagnosticsFeed.ts:191, the stale-run guard in accept) is closed by a new test, F33, shown failing by replacing the guard with false in the working tree and restoring it; the close was then re-measured and re-recorded with --restart"
  - "Decided autonomously: TF37 moved ahead of TF36 so the archived 79-pinned check fails on TF29 alone, instead of recording TF36 as a second expected failure"
  - "Decided autonomously: 81-pinned-check.mjs declares the added F33, the check being this phase's own record"
requirements-completed: [COLL-04, WX-04, WX-05, WX-06, WX-07]
duration: 40min
completed: 2026-11-25
status: complete
commits: 4
plan_head_before: f88cc6a84e24bcfc5086acb4633dc096b5280f4c
plan_head_after: 7ebd3dbf3a7888c8466781cb3412e3689550b698
actuals:
  tokens: 4000
  tasks: 2
  commits: 4
coverage:
  - id: D1
    description: "The five model files' mutation score did not fall, measured with the base's invocation at both ends"
    requirement: WX-05
    verification:
      - kind: command
        ref: "node 81-mutation.mjs compare: no file has an open or Ignored mutant its base did not have"
        status: pass
    human_judgment: false
  - id: D2
    description: "The final tree is scanned and checked against the phase's records and the archive"
    requirement: WX-06
    verification:
      - kind: command
        ref: "scan-ids, scan-forbidden, single-source, 81-pinned-check --all-applied, seen-failing, unchanged, the commit order and 81-archived-checks.mjs"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 10: The close of the measurement and the scans Summary

The five model files score as well at the close as at the base, measured with the same invocation, after one new test (F33) closed the only survivor the phase's fixes left alive; every scan passes and the archived v1.9 checks fail on TF29 alone.

## Accomplishments

- **Mutation close**: `stryker.devtools.mjs` over the five model files, run alone with stdin closed. The first run on the close head had one new survivor, `DiagnosticsFeed.ts:191` `ConditionalExpression -> false`, the `if (!runs.isCurrent(token)) return;` guard in the feed's `accept`. At the base the pre-flip F31 killed it (a throw on the `Starting` left the old poll running behind its token); with the window closed, no held test reached a stale `accept`. F33 does: A's collector reconfigures the feed on its first sample, the new run is held until A's start returns, and A's sample must not reach the store. It fails with the guard replaced by `false` and passes with it. The close was re-run on the head holding F33 and re-recorded with `record close model --restart`.
- **Compare** (`81-mutation.mjs compare`, on the final record), per file, base to close:
  - `ExternalStore.ts` 88/88 -> 84/84, survived 0 -> 0, no coverage 0 -> 0, ignored 3 -> 3 (0 new)
  - `DockModel.ts` 69/69 -> 65/65, survived 0 -> 0, no coverage 0 -> 0, ignored 12 -> 12 (0 new)
  - `TimelineFeed.ts` 35/35 -> 37/37, survived 0 -> 0, no coverage 0 -> 0, ignored 11 -> 11 (0 new)
  - `DiagnosticsFeed.ts` 58/58 -> 60/60, survived 0 -> 0, no coverage 0 -> 0, ignored 14 -> 14 (0 new)
  - `SimulationSession.ts` 242/248 -> 246/250, survived 6 -> 4, no coverage 0 -> 0, ignored 4 -> 4 (0 new)
  - `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed mutants`
  - The base record names head `e757ef37`, the close record `424ff7f7`; the invocations are equal. `SimulationSession.ts` holds 4 of its 6 base survivors (lines 310, 317, 319, 402).
- **Scans**, each with stdin closed, on the close tree:
  - `scan-ids`: no id or phase wording in added lines
  - `scan-forbidden`: no forbidden form in added lines
  - `single-source`: one collect loop, in callAll
  - `81-pinned-check.mjs --all-applied`: pinned: 8 files hold their base text, 4 of 4 declared flips applied
  - `seen-failing`: `DockModel.listeners.test.ts` and `ExternalStore.callAll.test.ts` whole; TF28, TF29, TF37, F31, F33, SR6 and G49 by title
  - `unchanged package.json pnpm-lock.yaml pnpm-workspace.yaml "packages/*/package.json" AGENTS.md scripts/check-house-style.mjs .oxlintrc.json`: passes
  - every `test(81-02)`, `test(81-03)` and `test(81-04)` commit is an ancestor of every `fix(81-05)` and `fix(81-06)` commit
- **Archived checks** (from the scratch copy; `.planning/milestones/` unchanged):
  - `79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed`
  - `79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)`
  - `80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied`
  - `80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied`
  - `80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line`

## Task Commits

1. `424ff7f7` test(81-10): the stale-run guard in the diagnostics feed's accept is pinned
2. `652184fd` test(81-10): the added timeline test sits before TF36 and the pinned check declares F33
3. `8ddc53f8` docs(81-10): record the mutation close of the five model files
4. `7ebd3dbf` docs(81-10): the close scans and the archived checks recorded

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The task 1 verify checks the base record against `phase_base`, which does not hold it**
- **Found during:** Task 1
- **Issue:** `81-check.mjs unchanged 81-mutation-base.json` compares the tree with `phase_base`, but the base record is created by 81-01 after `phase_base`, so it always reports "differs from phase_base". Every other part of the verify passes.
- **Fix:** the intent, that the base was not re-baselined, was checked directly: `git diff 34d1e005 HEAD -- 81-mutation-base.json` is empty and that commit is the only one touching the file.
- **Files modified:** none
- **Commit:** none

**2. [Rule 1 - Bug] TF36 failed the archived 79-pinned check beside TF29**
- **Found during:** Task 2
- **Issue:** the archived check cuts a test to the next test or the closing line. TF37, appended after TF36 in 81-03, put a blank line inside TF36's block, so the check failed on TF36 with no line of it changed. The plan expects TF29 alone.
- **Fix:** TF37 moved ahead of TF36 with no line of either changed; the archived check then fails on TF29 alone.
- **Files modified:** `packages/devtools/test/model/TimelineFeed.test.ts`
- **Commit:** 652184fd

**3. [Rule 3 - Blocking] `81-pinned-check.mjs` did not declare F33**
- **Found during:** Task 2
- **Issue:** a test added in this plan to a pinned file is a difference the check reports.
- **Fix:** `added: ["F33"]` for `DiagnosticsFeed.test.ts`; `--self-test` still passes (17).
- **Files modified:** `81-pinned-check.mjs`
- **Commit:** 652184fd

**4. [Precondition wording] The task 1 precondition names HEAD's subject as `docs(81-09): CCR-QD-473 completed`**
- HEAD was `docs(81-09): complete the README, changeset and CCR-QD-473 plan`, the plan's own close-out commit made after the plan was written. The facts the precondition stands for held: 81-09 complete, `packages` and `spec` clean, no vitest or Stryker running.

**Total deviations:** 3 auto-fixed (2 bug, 1 blocking), 1 precondition wording. **Impact:** none on scope; the close record was measured on `424ff7f7`, and the two later commits change only the order of two tests in a file and the pinned check's declaration, no source, so it was not re-measured.

## Known Stubs

None.

## Flagged assumptions

- Assumption (flagged): COLL-04's edge probe was unclassified. Its content, one rail move on a capacity-and-catalogue configure, CR22 and BEH-QD-735 restated, the step order pinned, a refused capacity throwing before anything moves (M55) and M56 green, is covered by DL16, CR22, BEH-QD-741, BEH-QD-735, M55 and M56; no boundary, adjacency or ordering case beyond those was identified
- Assumption (flagged): WX-07's edge probe was unclassified. It is held by `scan-ids` (decision numbers, plan ids, requirement ids, phase numbers and phase-relative wording in shipped source, test titles and spec text), run at every plan and here on the whole diff, and by the commit rules (nothing released, published, pushed or merged), scanned in 81-11

## Threat Flags

None.

## Next

Ready for 81-11.

## Self-Check: PASSED
