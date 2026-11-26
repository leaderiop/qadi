---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 01
subsystem: testing
tags: [devtools, stryker, characterisation, announce-once, strictmode, useStopNotice, stoppedbox]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
base_record: 00618a5e9818f32b2a8e838c6d3487bd377e13ef
born_dock: 22840399224ea7452c3f32a26ee0b196570fec3f
born_hook: fb404767308664f5709b7e99b3a0b0514fe56d96
plan_head_before: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_after: fb404767308664f5709b7e99b3a0b0514fe56d96

requires:
  - phase: QD-87-one-scoped-run-that-states-its-stop
    provides: the 87-mutation.mjs scorer (regrouped here for one born module) and the 87-RED-EVIDENCE.md line forms
provides:
  - 88-mutation.mjs, the phase scorer for one born module (ledger group, absolute rule, EXAMINED, EQUIVALENT, measured-set rule, four UNMEASURED react files)
  - 88-mutation-base.json, phase_base and the 43 model files at the base with their blobs, nothing touched, committed alone and first
  - DockFrame.announce.characterisation.test.tsx, A1 to A5 each plain and under StrictMode, green on the base
  - useStopNotice.test.tsx, H1 to H3 and C1, green on the base
  - 88-RED-EVIDENCE.md, every seen-failing line of the plan
affects: [QD-88 plans 02 to 10, StoppedBox.tsx, useStopNotice.ts, StopLedger.ts]

actuals:
  tokens: 17054
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a scorer whose base measures nothing and states it: the measured set (every model file with its blob) is the base, and the close proves none moved and only the born module was added"
    - "a MutationObserver that counts an element when it is added or removed, so a box handed over inside a larger subtree and replaced before the observer reads is still counted"

key-files:
  created:
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-mutation.mjs
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-mutation-base.json
    - .planning/phases/QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule/88-RED-EVIDENCE.md
    - packages/devtools/test/react/DockFrame.announce.characterisation.test.tsx
    - packages/devtools/test/react/useStopNotice.test.tsx
  modified: []

key-decisions:
  - "The base record lists the 43 `.ts` files under packages/devtools/src/model at phase_base with their blobs and measures no group; `compare` proves at the close that no listed blob changed, that StopLedger.ts is the only model file added, and that neither it nor its test differs between the close head and HEAD."
  - "`record base` takes no group argument and `record base ledger` is refused as a usage error; a request is parsed by one pure function the self-test drives."

patterns-established:
  - "An announce-once row reads only data-announce, role and element identity, so it states what a screen-reader user depends on and holds however the ledger is kept"

requirements-completed: []

coverage:
  - id: D1
    description: "88-mutation-base.json holds phase_base and the 43 model files measured on it, committed alone as the first plan commit"
    verified_by: node 88-mutation.mjs --self-test (68 passed) and the Task 1 verify
  - id: D2
    description: "A1 to A5, plain and StrictMode, green on the base and each seen failing under a base-side scratch edit"
    verified_by: DockFrame.announce.characterisation.test.tsx (10 passed) and the Task 2 verify
  - id: D3
    description: "H1 to H3 and C1 green on the base and each seen failing under a base-side scratch edit"
    verified_by: useStopNotice.test.tsx (4 passed; 14 with the dock file) and the Task 3 verify
---

# Phase 88 Plan 01: Measure the base and pin announce-once on it Summary

**A mutation scorer for the one born ledger module, its base record (43 model files, nothing touched), and 14 rows that pin announce-once through the dock (plain and StrictMode) and through the hook, all green on the base and each seen failing.**

## Performance

- **Started:** 2026-11-25, about 22:40Z; **Completed:** 2026-11-25T23:00Z (roughly 20 minutes)
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 5; no file under `packages/*/src`, no existing test and `stryker.devtools.mjs` changed
- Scratch files lived in `$TMPDIR/qd88` (run scripts, vitest JSON reports, copies of `StoppedBox.tsx` and `useStopNotice.ts`); no `zz-spike88-*` file was found in the tree.

## Accomplishments

- **Tracer (Task 1):** `88-mutation.mjs` is `87-mutation.mjs` regrouped for one born module. Its self-test drives every judge with planted records (68 cases, none asserting that the real `EXAMINED` or `EQUIVALENT` is empty) and oxlint is clean. `record base` wrote `phase_base` 892c4d36 with the 43 model files and their blobs; the commit holds exactly the scorer and the record and is the first plan commit after `phase_base`. The Task 1 verify passed before any expansion task began.
- **Dock rows (Task 2):** ten rows, A1 to A5 each plain and under `<StrictMode>`, green on the base. Each was seen failing: `(base V1)` (ledger write removed from the box's layout effect) fails 8 rows, A1 to A4 in both modes; `(base write-in-hook)` fails all 10; `(base remount-after-commit)` fails A1 and A5 in both modes.
- **Hook rows (Task 3):** H1 fails only under `(base record-in-render)`, H2 only under `(base memo-on-status)`, H3 only under `(base no-memo)`, C1 only under `(base two-commits)` (4 commits with a stop shown against 2 over a live source, bound 1). Both born files together run 14 passing rows; `tsc -p tsconfig.test.json` exits 0.

## Task Commits

1. Task 1: `00618a5e9818f32b2a8e838c6d3487bd377e13ef` `docs(88-01): record the mutation base`
2. Task 2: `22840399224ea7452c3f32a26ee0b196570fec3f` `test(88-01): pin announce-once through the dock on the base`
3. Task 3: `fb404767308664f5709b7e99b3a0b0514fe56d96` `test(88-01): pin the stop notice hook on the base`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The research draft of A5 could not see a box remounted by its own commit**
- **Found during:** Task 2, the `(base remount-after-commit)` scratch edit left all ten rows green.
- **Issue:** the draft `watchAdded` looked only at added nodes. A stop that mounts inside a larger subtree is added as that subtree, and a box replaced by the box's own layout effect is gone before the observer reads, so its first element was never counted.
- **Fix:** `watchAdded` also walks each record's `removedNodes` (an element that is removed was first added). With it the edit fails A1 (distinct alert elements 4, wanted 2) and A5 (2 box elements, wanted 1) in both modes; the base stays green.
- **Files modified:** `DockFrame.announce.characterisation.test.tsx` (before its commit).
- **Commit:** 22840399.

**2. [Rule 1 - Bug] A2 as first written asserted the wrong silence**
- **Found during:** Task 2, first run on the base.
- **Issue:** after the dock started on Log and moved to Services, the timeline stop had already been announced on Log, so on return it is `none`, as the plan says; the first draft asserted `alert`.
- **Fix:** the scenario, not the expectation, follows the plan: the timeline stays `none` after the diagnostics Restart; the timeline Restart then alerts afresh and the diagnostics stays `none`.
- **Commit:** 22840399.

### Plan defects

None. Every verify ran as written and passed. The one place the plan left the form open: it names `watchAdded` as recording elements "when added"; the removed-node walk above is stated in its doc comment.

### Auth gates

None.

## Issues Encountered

- **State command declined:** `state.advance-plan` returned `plan_position_unreadable` (STATE.md reads `Plan: Not started`, none of the labelled forms the verb parses; it suggests `Current Plan: 2` with `Total Plans in Phase: 10`). It changed nothing and was not retried or repaired by hand, per the run rules; the orchestrator owns the counter. `roadmap.update-plan-progress` (1 of 10 summarized), `state.update-progress`, `state.record-metric`, two `state.add-decision` and `state.record-session` ran once each and succeeded.
- `88-RED-EVIDENCE.md` carries one `- failed (<tag>): <title>` line per failing row, because the verify matches a row by a line that ends with its exact title; the `(scratch edit: ...; <n> row(s) failed under it)` line gives the count per edit.
- The plan commit ledger (`gsd-plan-head-before-QD-88-01`) was written after the three commits, from the recorded `phase_base`, which is the HEAD this plan started on; `commits: 3` is `git rev-list --count 892c4d36..fb404767`.

## Next Phase Readiness

- Plan 02 can add `88-check.mjs` over `phase_base` in `88-mutation-base.json`; the two born test files are held byte for byte from `22840399` and `fb404767`.
- `EXAMINED` stays empty until plan 08 runs the four static mutants by hand.

## Known Stubs

None.

## Threat Flags

None. T-88-01 is mitigated by the base record (names `phase_base`, the blobs and the invocation, refuses a dirty tree, committed alone first); T-88-02 by A1 to A5, H1 and C1, each seen failing under an edit that loses or repeats the alert.

## Self-Check: PASSED

- Files found: 88-mutation.mjs, 88-mutation-base.json, 88-RED-EVIDENCE.md, DockFrame.announce.characterisation.test.tsx, useStopNotice.test.tsx, this summary.
- Commits found as ancestors of HEAD: 00618a5e, 22840399, fb404767.
- `git diff --quiet 892c4d36 -- packages/devtools/src packages/devtools/test/helpers.ts stryker.devtools.mjs` holds; nothing is modified under `packages`; no `.vitest/` remains.
