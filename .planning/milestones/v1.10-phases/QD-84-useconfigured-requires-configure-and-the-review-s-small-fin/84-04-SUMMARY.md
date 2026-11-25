---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 04
subsystem: devtools
tags: [characterisation, dock, stop-notice, red-evidence]
requires: ["84-03"]
provides:
  - "DockFrame.stops.characterisation.test.tsx: DS1 to DS3, the dock's two stop notices through DevtoolsDock, held from its commit"
affects: [84-09]
key-files:
  created:
    - packages/devtools/test/react/DockFrame.stops.characterisation.test.tsx
  modified:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: b87b8084
plan_head_after: 91537372d9629ae13d31c9ee199565c167b34bba
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
requirements-completed: []
---

# Phase QD-84 Plan 04: The dock's two stop notices, characterised Summary

Three rows pin, through `DevtoolsDock` with a dying source and an always-throwing collector, that each feed's stop is
announced once on its own history, that a second stop re-announces only its own feed, and that Restart reaches the
rebuilt feed of its own kind after a hidden-then-shown dock. No source file changed.

## What was built

- `DockFrame.stops.characterisation.test.tsx` (3 tests, green on the base): DS1 announce attribute across Log/Services
  switches; DS2 a diagnostics Restart gives a fresh alert on its own box and leaves the timeline box at `none`; DS3 the
  dock inside an `Activity`, hidden then shown, with counted source reads and collector calls.
- Held by `84-pinned-check.mjs` from its commit: `2 of 3 born files held`.

## Seen failing (84-RED-EVIDENCE.md)

- `shared-ledger` (timeline notice handed the diagnostics ledger): DS1 `the timeline stop on Log, mounted again: expected 'alert' to equal 'none'`; DS2 `expected 'alert' to equal 'none'`
- `swapped-restarts` (the two notices' restart handlers swapped): DS3 `expected 2 to be above 2` (DS2 failed too, `expected 1 to be above 1`; only the DS3 line is recorded, DS2 already has its line)

Each scratch edit was restored with `cp` from a copy; `git diff --quiet HEAD -- packages scripts` and
`git status --porcelain` were checked afterwards.

## Commits

- 91537372: test(84-04): characterise the two stop notices of the dock

## Deviations from Plan

- The task 2 verify checks `git status --porcelain -- packages scripts spec AGENTS.md` is empty before the commit, but
  the new test file is untracked until committed, and `84-check.mjs commit` only judges an existing commit. I committed
  with `git commit` and ran the check and the rest of the verify afterwards (tree clean, 33 tests green, `2 of 3 born
  files held`).
- The memo-keyed-on-status scratch edit the plan's note rules out was not used; the swapped restarts are DS3's scratch
  edit, as the plan states.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: the characterisation file, 3 tests green (three runs); `TimelineNotice.test.tsx` and `DiagnosticsNotice.test.tsx` green (33 tests across the three files).
- FOUND: 91537372 on `arch-wave-15` with the one trailer; `84-check.mjs` `seen-failing`, `scan-ids`, `scan-forbidden`, `commit` and `trailers` pass; `packages/devtools/src` equals `phase_base`; tsc, oxlint and `check-house-style` clean.
