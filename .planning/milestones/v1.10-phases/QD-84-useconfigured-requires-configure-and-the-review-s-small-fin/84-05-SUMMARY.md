---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 05
subsystem: devtools
tags: [characterisation, timeline, useConfigured, red-evidence]
requires: ["84-04"]
provides:
  - "useTimeline.inputs.characterisation.test.tsx: TI1 to TI3, the timeline hook's per-render inputs, held from its commit"
  - "useConfigured.test.tsx: the double carries its own configure, held from its commit"
affects: [84-06]
key-files:
  created:
    - packages/devtools/test/react/useTimeline.inputs.characterisation.test.tsx
  modified:
    - packages/devtools/test/react/useConfigured.test.tsx
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 2
plan_head_before: 016b828b794ba80497903e4e2ad37600f4f84037
plan_head_after: f6e3e6ff4bd8cc776b4131d9404315690b50b1c8
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 05: The timeline hook's inputs and the useConfigured double Summary

Three rows pin that `useTimeline`'s fresh inputs record each render costs nothing (an equal record publishes nothing and
keeps the status reference; a moved capacity publishes and moves it), and `useConfigured`'s test double now carries its
own `configure` so the signature change in 84-06 touches one line of the test. No source file changed.

## What was built

- `useTimeline.inputs.characterisation.test.tsx` (3 tests, green on the base) over a dying source: the timeline store is
  counted by a listener and the status read by reference identity. G43 and `DockRegistryReads.test.tsx` stay green and
  unedited (45 tests across the three files).
- `useConfigured.test.tsx`: `Double` declares `configure`, the free function is gone, the harness call is
  `useConfigured(make, (double, inputs) => double.configure(inputs), inputs)`; U1 to U4 unchanged (4 tests green).
- `84-pinned-check.mjs`: `useConfigured.test.tsx held from f6e3e6ff, 0 of 1 edits applied`, `3 of 3 born files held`.

## Seen failing (84-RED-EVIDENCE.md)

- `no-same-fields` (the `sameFields` early return of `TimelineFeed.configure` removed): TI1 and TI2 `Maximum update depth exceeded` (TI3 failed the same way).
- `configure-ignored` (`configure` returns early once a source is held): TI3 `expected +0 to be above +0`; TI1 and TI2 pass.
- `no-tap` (build is `make()`): U1 `expected [] to deeply equal [ 'first' ]`.
- `swallowed-throw`: U2 `expected [ [] ] to deeply equal []`.
- `value-only-key` (layout effect keyed `[value]`): U3 `expected 2 to equal 3`.
- `first-inputs` (tap reads the first render's inputs): U4 `expected 'first' to equal 'second'`.

Each scratch edit was restored with `cp` from a copy; `git diff --quiet HEAD -- packages/devtools/src` held afterwards.

## Commits

- 3378b8ee: test(84-05): characterise the timeline hook's per-render inputs
- f6e3e6ff: test(84-05): the useConfigured double carries its own configure

## Deviations from Plan

- The tree-clean, `commit`, `trailers` and pinned checks of both verifies were run after the commit (the test file is
  untracked before it, and `84-check.mjs commit` judges an existing commit); the tests, scratch-edit failures,
  `seen-failing`, `scan-ids` and `scan-forbidden` ran before.
- `configure-ignored` is not the plan's "bare `return;`": that also stops the first configure, so the source is never
  read, the setup's wait for a stopped status fails, and every row fails for the wrong reason. The edit used returns
  early only once a source is held (`if (reads.closed() || held.source !== undefined) return;`), which fails TI3 alone.
- Removing `sameFields` fails all three rows (an unbounded re-render loop), not TI1 and TI2 only; the evidence records
  the TI1 and TI2 lines and TI3 has its line from `configure-ignored`.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: both test files, 3 and 4 tests green; held `GatesFeed.test.ts` and `DockRegistryReads.test.tsx` green.
- FOUND: 3378b8ee and f6e3e6ff on `arch-wave-15` with the one trailer; `84-check.mjs` `seen-failing`, `scan-ids`, `scan-forbidden` and `commit` pass; `packages/devtools/src` equals `phase_base`; tsc and oxlint clean.
