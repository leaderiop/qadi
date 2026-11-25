---
phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
plan: 10
subsystem: testing
tags: [mutation-testing, stryker, check-scripts, devtools, diagnostics]
requires:
  - phase: QD-83-the-diagnostics-feed-folds-its-reading-as-a-value
    provides: the base record and rename-aware scorer (83-01), the code, tests, spec and ADR of plans 02 to 09
provides:
  - the mutation close of DiagnosticsFeed.ts, Diagnostics.ts and DockModel.ts, compared with the base through the rename
  - every phase check run once on the finished tree, with the close facts recorded
affects: [83-11]
phase_base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
plan_head_before: c067ab4bd431fbd86143cc38ff60b33f0553d456
plan_head_after: 108c01b16da27e8f2fcd600ecc9bd2e13375007f
actuals:
  tokens: 26000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: [a close measured once, alone, on a tree equal to HEAD, then compared with a committed base]
key-files:
  created:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-mutation-close.json
  modified:
    - .planning/phases/QD-83-the-diagnostics-feed-folds-its-reading-as-a-value/83-RED-EVIDENCE.md
key-decisions:
  - "The close needed no survivor test: no open mutant and no new Ignored mutant, so no test file was added and no held file edited"
  - "Five characterisation rows that no earlier edit failed were seen failing under one restored scratch edit each, so seen-failing passes for both files"
requirements-completed: []
duration: 25min
completed: 2026-11-25
status: complete
---

# Phase 83 Plan 10: The mutation close and the close checks Summary

The three diagnostics model files close with no open mutant and no new Ignored mutant against the base (`Diagnostics.ts` read
under its base name `DiagnosticsStore.ts`), the score falling only by deleted killed mutants, and every phase check passes
on the finished tree.

## What was done

- **Task 1.** With nothing else running, `pnpm exec stryker run stryker.devtools.mjs --mutate
  packages/devtools/src/model/DiagnosticsFeed.ts,packages/devtools/src/model/Diagnostics.ts,packages/devtools/src/model/DockModel.ts`
  ran alone with stdin closed on a tree equal to HEAD `c067ab4b` (188 mutants, 4 min 36 s, final score 100.00). `83-mutation.mjs
  record close diagnostics` wrote `83-mutation-close.json` and `compare` passed. No survivor, so no test was written and no
  `--restart` was needed. Commit `61c95a2b`.
- **Task 2.** Every close check was run; the results are below. `seen-failing` first failed for four rows of the
  characterisation (FC1, FC5, FC6, FC11) and for `MR2`: each passes on the base and under the edits of plan 83-03, so the
  evidence held no failure line for them. Each was shown failing under one scratch edit of the model file, restored with
  `cp` (`git diff --quiet HEAD -- packages scripts` held afterwards), and recorded in `83-RED-EVIDENCE.md` (commit
  `108c01b1`). No source or test file changed.

## Per-file mutation

Counts are killed+timeout, survived, no coverage, ignored.

| File | Base | Close | Open at close |
| ---- | ---- | ----- | ------------- |
| `DiagnosticsFeed.ts` | 60 / 0 / 0 / 14 | 59 / 0 / 0 / 14 | none |
| `Diagnostics.ts` (base `DiagnosticsStore.ts`) | 57 / 0 / 0 / 6 | 32 / 0 / 0 / 6 | none |
| `DockModel.ts` | 65 / 0 / 0 / 12 | 65 / 0 / 0 / 12 | none |

`compare` output: `no file has an open or Ignored mutant its base did not have, and every score that fell lost only killed
mutants` (0 new Ignored in each file; the base `DiagnosticsStore.ts` is read against `Diagnostics.ts` through `git diff -M
-U0` of the two paths).

Deleted killed mutants, named from the `git diff -M` hunks (the base record keeps per-mutant lines only for Ignored and open
mutants, so these are identified by the code that left, not by a recorded mutant list):

- `Diagnostics.ts`, 25 killed mutants: `makeDiagnosticsStore` and its `DiagnosticsStore` interface (`subscribe`, `getSnapshot`,
  `accept` and the `makeExternalStore` it built), the five-term `===` chain that decided whether `accept` published, and
  `questions` (the field, `questions: undefined` in `noDiagnostics`, `keep(current.questions, next.questions)` and
  `supplied.questions ?? sampled.questions` in `mergeReading`, and `questions: undefined` in the run's `accept`).
- `DiagnosticsFeed.ts`, 1 killed mutant: the `store = makeDiagnosticsStore()` reset in `off` (and the `marking` wrapper's
  `target`), which the one snapshot replaced.
- `DockModel.ts`: none removed.

The Ignored counts hold (14, 6, 12): each base Ignored mutant is matched to its close line through the same diff and none is
new.

## Edge evidence

- WX-05 boundary: each file's close is compared with its base floor (table above), by `83-mutation.mjs compare`.
- WX-05 precision: the base of `Diagnostics.ts` is matched to the close by `git diff -M -U0`; the deleted killed mutants are
  named above (the store and the `===` chain).
- WX-05 concurrency: the close ran alone, stdin closed, after `ps` showed no vitest, Stryker or other runner, on a tree equal
  to HEAD (`record close` refuses otherwise).
- WX-04 adjacency, empty, encoding, ordering: `scan-forbidden` passes over the added lines of the files listed in the close
  facts, and its self-test (`83-check.mjs` plan 83-01) covers the flagged and the allowed neighbours.
- WX-06 adjacency, empty, ordering: every test the phase added or flipped has a `red on the base`, `failed` or `green on the
  base` line in `83-RED-EVIDENCE.md`, each dated before the commit that made it pass; `seen-failing` passes for the
  characterisation and `DockModel.reading.test.ts`.
- DIAG-01 adjacency, empty, encoding, ordering: `83-pinned-check.mjs --all-applied` passes.
- DIAG-03 (flagged assumption), judged: no edge class of its own; the removal of `Diagnostics.questions` is judged by the type
  pins (`Diagnostics.tst.ts`, `surface.tst.ts`, both tstyche passes, plan 83-05), `MR1`, and gate 14's refusal in the next plan.
  A host's read of `Diagnostics.questions` is a compile error, not a runtime `undefined`.
- WX-07 (flagged assumption), judged: no edge class of its own; `scan-ids` over every added line passes, `trailers` over the 27
  plan commits passes, and no tag contains `phase_base` and no phase commit is on a remote-tracking branch.

## Close facts

```
base: bc02e8e625eed08227910dfdfd4544ae66ed23ca
close head measured: c067ab4bd431fbd86143cc38ff60b33f0553d456
scan-ids: no id or phase wording in added lines
scan-forbidden: no forbidden form in added lines
trailers: 27 plan commits, each with one Claude trailer
no-store: the reading is held in the feed's one snapshot
single-fold: one per-field keep-if-equal, in foldReading
stale-path: no live mention of the three old paths
registers: packages/devtools/test/model/Diagnostics.tst.ts named alike by the budget, AGENTS.md and traceability
seen-failing: packages/devtools/test/model/DiagnosticsFeed.characterisation.test.ts
seen-failing: packages/devtools/test/model/DockModel.reading.test.ts
pinned: 6 files hold their base text, 2 of 2 born files held, 1 of 1 declared flips applied
81-pinned-check.mjs: exit 0: pinned: 8 files hold their base text, 5 of 5 declared flips applied
81-check.mjs single-source: exit 0: single-source: one collect loop, in callAll
79-pinned-check.mjs: exit 1: packages/devtools/test/model/TimelineFeed.test.ts: TF29: an assertion or a line other than a construction changed
79-characterisation-check.mjs: exit 0: characterisation: packages/devtools/test/react/ConfigureFirstRender.characterisation.test.tsx holds its first commit (cf3186d9)
80-pinned-check.mjs --all-applied: exit 0: pinned: 4 files hold their base text, 4 of 4 declared edits applied
80-characterisation-check.mjs --all-flipped: exit 0: characterisation: packages/react/test/InstrumentToggle.characterisation.test.tsx holds its first commit (2cca1f46), 1 of 1 flips applied
80-characterisation-check.mjs --red-recorded: exit 0: red-recorded: every flip has its red line
manifests: package.json, pnpm-lock.yaml, pnpm-workspace.yaml, packages/*/package.json equal phase_base (git diff --quiet: 0)
tags: git tag --contains phase_base prints nothing
remote: git branch -r --contains 38fb5b28 (the first phase commit) prints nothing
budgets: MODULE_STATE_BUDGET, SWITCH_BUDGET, UNTRACED_BUDGET unchanged; NOT_CALLABLE_PIN_BUDGET differs by one key's path only
  (packages/devtools/test/model/DiagnosticsStore.tst.ts -> Diagnostics.tst.ts, callable 3, constructable 0 in both)
```

The earlier checks print the archived base lines, with only the TF29 line of `79-pinned-check.mjs` failing, as at the base.

Added lines read by the scans (every file outside `.planning/` that differs from `phase_base`, lines added): `.changeset/devtools-diagnostics-has-no-questions.md` 9,
`AGENTS.md` 1, `apps/website/.../packages/devtools.md` 6, `apps/website/.../reference/upgrading.md` 35, `packages/devtools/README.md` 5,
`packages/devtools/src/index.ts` 8, `src/model/Diagnostics.ts` 51, `DiagnosticsFeed.ts` 18, `DockModel.ts` 1, `ExternalStore.ts` 7,
`Gates.ts` 3, `GatesFeed.ts` 1, `PortCards.ts` 1, `src/react/DevtoolsDock.tsx` 1, `src/react/index.ts` 1, `src/react/useDiagnostics.ts` 1,
`test/builtFeeds.ts` 1, `test/dockModelFixtures.ts` 1, `test/model/ConfigureInputs.tst.ts` 1, `ConfigureRule.test.ts` 1,
`Diagnostics.test.ts` 143, `Diagnostics.tst.ts` 18, `DiagnosticsFeed.characterisation.test.ts` 299, `DiagnosticsFeed.test.ts` 2,
`DockModel.reading.test.ts` 38, `DockModel.test.ts` 2, `PortCards.test.ts` 1, `test/react/DevtoolsDock.test.tsx` 1,
`DiagnosticsScreens.test.tsx` 1, `useDiagnostics.test.tsx` 1, `test/surface.tst.ts` 17, `scripts/check-house-style.mjs` 1,
`scripts/check-package-install.mjs` 15, and under `spec/`: `README.md` 3, `behaviors/28-devtools-screens.md` 183,
`decisions/047` 8, `169` 13, `173` 14, `196` 203, `decisions/index.yaml` 4, `invariants.md` 37, `overview.md` 7, `traceability.md` 28.

## Commits

- `61c95a2b` docs(83-10): the mutation close of the three diagnostics model files
- `108c01b1` docs(83-10): the characterisation rows seen failing under a scratch edit

## Deviations from Plan

**1. [Rule 3 - Blocking] The task 1 verify compares the base record with `phase_base`.** `83-mutation-base.json` was added by
the first commit after `phase_base` (`38fb5b28`), so `git diff --quiet <phase_base> -- 83-mutation-base.json` can never pass
(the file does not exist there). The "not rewritten" claim was checked against its one commit instead: `git log` lists only
`38fb5b28` for the file and `git diff --quiet HEAD -- 83-mutation-base.json` holds. The verify's other steps ran as written.

**2. [Rule 1 - Missing evidence] `seen-failing` failed for FC1, FC5, FC6, FC11 and MR2.** They are characterisation and
green-on-the-base rows no earlier edit failed. Fixed by seeing each fail under one restored scratch edit and recording it
(commit `108c01b1`), which task 2's truths require; no test or source changed.

## Known Stubs

None.

## Threat Flags

None. Nothing under `packages/` or `scripts/` changed in this plan; no package was installed; nothing was pushed, tagged or versioned.

## Self-Check: PASSED

Files found: `83-mutation-close.json`, `83-RED-EVIDENCE.md`. Commits found: `61c95a2b`, `108c01b1`.
