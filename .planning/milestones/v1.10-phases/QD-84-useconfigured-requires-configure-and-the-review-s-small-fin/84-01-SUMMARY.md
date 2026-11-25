---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 01
subsystem: devtools
tags: [mutation, checks, base-measurement]
requires: []
provides:
  - "84-mutation.mjs and 84-mutation-base.json: the lens session's Stryker floor, measured at the phase base"
  - "84-check.mjs: the phase's commit, scan, trailer and structural checks, each seen failing"
affects: [84-02, 84-03, 84-04, 84-05, 84-06, 84-07, 84-08, 84-09, 84-10, 84-11, 84-12, 84-13]
key-files:
  created:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin84-mutation.mjs
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin84-mutation-base.json
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin84-check.mjs
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin84-RED-EVIDENCE.md
status: complete
duration: 10min
completed: 2026-11-25
commits: 2
plan_head_before: e0327e7d41ef52de5d837d01d2fa0a17bade8e6f
plan_head_after: e0ceca600c898f771b1bea3c5d4333321fe18544
actuals:
  tokens: 30000
  tasks: 3
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 01: The mutation base and the phase checks Summary

The lens session's mutation floor (52 of 52 killed, 22 Ignored, nothing open) is recorded on the phase base by a
scorer copied from Phase 83's, and the phase's shared check helper is committed with every mode seen failing.

phase_base: 8ff027e1af33826bd1d90e6c039384ae8e7906dc
execution_start: e0327e7d41ef52de5d837d01d2fa0a17bade8e6f
base_record: ff0be2b4f784a675baa24b7a478c194b7e4049da

## Base facts

```
house-style: 613 file(s) clean (3 declared switch(es), 77 type-test file(s))
api-surface: 942 export(s) documented across 9 package(s)
dod-table: 26 step(s) match pnpm check, 177 reference(s) resolve
doc-examples: 119 block(s) compile
devtools-claims: 8 claim(s) registered across 6 file(s)
website-doc-examples: 77 block(s) compile


Qadi specification verification
| Status | Check                                      | Detail
| ------ | ------------------------------------------ | ------
| PASS   | appendices/index.yaml -> disk              | 1 entr(y|ies) resolve
| PASS   | appendices/ disk -> index.yaml             | no orphans
| PASS   | behaviors/index.yaml -> disk               | 34 entr(y|ies) resolve
| PASS   | behaviors/ disk -> index.yaml              | no orphans
| PASS   | decisions/index.yaml -> disk               | 153 entr(y|ies) resolve
| PASS   | decisions/ disk -> index.yaml              | no orphans
| PASS   | devtools-spec/index.yaml -> disk           | 5 entr(y|ies) resolve
| PASS   | devtools-spec/ disk -> index.yaml          | no orphans
| PASS   | models/index.yaml -> disk                  | 38 entr(y|ies) resolve
| PASS   | models/ disk -> index.yaml                 | no orphans
| PASS   | process/index.yaml -> disk                 | 3 entr(y|ies) resolve
| PASS   | process/ disk -> index.yaml                | no orphans
| PASS   | invariants -> traceability                 | all 184 invariant(s) traced
| PASS   | decisions -> traceability                  | 153 ADR(s) traced
| PASS   | ADR Document ID = file number              | 129 ADR(s) agree
| PASS   | urs -> traceability table                  | 38 requirement(s) traced
| PASS   | features -> traceability                   | all REQ tags defined
| PASS   | relative link integrity                    | 5499 link(s) resolve, none gitignored
| PASS   | §4 test files -> disk                     | 353 file(s) exist
| PASS   | CCR register coverage                      | known, tracked gap unchanged: 078 079 080 081 123 124 125 126 127 128 129 130 131 132 134 136 137
| PASS   | Revision = newest history entry            | every header agrees

PASS: 21   FAIL: 0   SKIP: 0 (strict: skips count as failures)


reservation-sha256: e9c52607f228412910c66caaacc19c7a5dfb85ac5fa34266c7bd63c250a4d313
devtools-tests: Tests  1956 passed (1956)
tstyche: exit 0: Duration:   10.6s
83-pinned: pinned: 6 files hold their base text, 2 of 2 born files held, 1 of 1 declared flips applied
83-earlier: 81-pinned-check.mjs: exit 0: pinned: 8 files hold their base text, 5 of 5 declared flips applied
83-earlier: 81-check.mjs single-source: exit 0: single-source: one collect loop, in callAll
83-earlier: 79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed
83-earlier: 79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
83-earlier: 80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
83-earlier: 80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
83-earlier: 80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
83-earlier: exit 0
83-no-store: no-store: the reading is held in the feed's one snapshot
83-single-fold: single-fold: one per-field keep-if-equal, in foldReading
83-stale-path: stale-path: no live mention of the three old paths
83-registers: registers: packages/devtools/test/model/Diagnostics.tst.ts named alike by the budget, AGENTS.md and traceability
```

- differs from plan time: none (every gate line, the reservation sha256, the pinned line and the earlier-check lines,
  with the one expected TF29 line, are the plan-time evidence; the devtools suite reads 1956 tests, which the plan did not
  state)

lens base score: 52/52
base packages/devtools/src/model/LensSession.ts: 52/0/0/22
  ignored: 45 ObjectLiteral, 46 ArrowFunction, 54 ObjectLiteral, 55 ArrowFunction, 56 ArrowFunction, 82 ArrayDeclaration, 83 ObjectLiteral, 86 ObjectLiteral, 87 ArrowFunction, 88 ArrowFunction, 94 ObjectLiteral, 95 ArrowFunction, 96 ArrowFunction, 107 ObjectLiteral, 108 ArrowFunction, 109 ArrowFunction, 118 ObjectLiteral, 119 ArrowFunction, 123 ArrowFunction, 130 ObjectLiteral, 131 ArrowFunction, 135 ArrowFunction; open: none

earlier checks: node .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-pinned-check.mjs --all-applied, node .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-earlier-checks.mjs, node .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-check.mjs no-store|single-fold|stale-path|registers

## Commits

- ff0be2b4: docs(84-01): record the mutation base of the lens session
- e0ceca60: chore(84-01): add the phase check helper

## Deviations from Plan

None in the files and commits the plan names. Four choices the plan left open, each stated so a later plan reads them:

- `84-mutation.mjs` judges with `ABSOLUTE = [LensSession.ts]`, so the 83 self-test cases that exercise the removed-mutant rule
  on a file that is not absolute pass `judge` an empty absolute list (their expected counts are unchanged); the absolute bar
  has its own cases. The self-test is 44 cases, ending `self-test: 44 passed`.
- `84-check.mjs` `one-path`: the plan's reason text "useLens subscribes to the lens before the questions store" names the
  opposite of its rule (the first call's argument must be `questions`, the second `lens`, as the decided shape has it), so
  the reason reads `useLens does not subscribe to the questions store first and the lens second`. The reason "useLens does not
  read questions.getSnapshot() when an event arrives" fires when the hook does not read it (the handlers must, the decided shape
  and the lens invariant both say so), and passes on the base.
- `84-check.mjs` runs its dispatcher only when it is the script run, so a judge can be imported (the `trailers` evidence line
  is the judge on a planted message with two trailers). Its self-test is 216 cases.
- `commit --first` also fails a plan commit that is not first among the plan commits, so the second 84-01 commit passes
  `commit` without `--first` and fails with it.

## Self-Check: PASSED

- FOUND: 84-mutation.mjs, 84-mutation-base.json, 84-check.mjs, 84-RED-EVIDENCE.md in the phase directory.
- FOUND: ff0be2b4 and e0ceca60 on `arch-wave-15`; the base record is the first plan commit, a child of the execution start.
- Verify steps of the three tasks run as written and exit 0; the tree outside `.planning/` equals `phase_base`.
