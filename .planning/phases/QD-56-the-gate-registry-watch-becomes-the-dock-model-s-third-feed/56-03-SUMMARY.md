---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 03
subsystem: devtools
tags: [red-test, collector-double, questions-thunk, diagnostics-poll, tdd]
requires: ["56-02"]
provides:
  - QuestionsPanel.thunk.test.tsx, the D-03 outcome pinned RED through the public dock
  - collectorDouble.ts, the scripted, counting collector that replaces the questions thunk as the poll's probe
  - the poll's defect, restart and cadence cases moved onto the double, green on the base
affects: [56-07, 56-13]
actuals:
  tokens: 9500
  tasks: 3
  commits: 3
plan_head_before: 9e54e3931643711b4b5d46f39123de007bea595f
plan_head_after: 73cb5b57abfee22037636136ed6a67cd2ec27993
tech-stack:
  added: []
  patterns: ["a probe the phase moves is replaced by the poll's other host-supplied read before the move, so the tests keep their claims"]
key-files:
  created:
    - packages/devtools/test/react/QuestionsPanel.thunk.test.tsx
    - packages/devtools/test/collectorDouble.ts
  modified:
    - packages/devtools/test/model/DiagnosticsFeed.test.ts
    - packages/devtools/test/react/useDiagnostics.test.tsx
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/react/DiagnosticsScreens.test.tsx
    - packages/devtools/test/react/DevtoolsDock.test.tsx
key-decisions:
  - "Q4 flips a `sick` flag after the failure is on screen, rather than throwing on calls 1 and 2, because a failure that lasts two 10 ms polls can be gone before a 50 ms `vi.waitFor` tick sees it"
requirements-completed: [GFED-05, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 03: The D-03 RED test and the poll probes moved

A throwing questions thunk is pinned RED as a stated failure in the questions panel with a live poll (five cases, all failing by assertion on the base), and every poll test that used a thunk as its probe now samples a scripted collector, green on the base.

## RED on the base

Run on the phase base (no commit under `packages/*/src`), `pnpm exec vitest run --project devtools packages/devtools/test/react/QuestionsPanel.thunk.test.tsx`:

```
Test Files  1 failed (1)
     Tests  5 failed (5)
```

| Case | Base result | Failing assertion |
|---|---|---|
| Q1 a thunk that throws is stated in the questions panel, and the poll keeps running | fail | `qadi-questions-failed` never appears (`expected undefined to not equal undefined`) |
| Q2 a thunk that throws what cannot be described names the questions, not the registry | fail | same, the paragraph never appears |
| Q3 a registry and a thunk that both throw are both stated, the registry first | fail | same |
| Q4 a thunk that throws and then answers mends with no residue | fail | same, at the first wait (the poll is `Stopped`) |
| Q5 a supplied reading's questions win over a throwing thunk, and no failure is stated | fail | `expected 'Stopped' to equal 'Live'` |

No case fails by an import, type or render error. Q5 fails on the base too, by its `Live` assertion: the poll is `Stopped` there.

## Task Commits

1. Task 1: `ecc7d463` `test(56-03): a throwing questions thunk is stated in the panel and the poll lives (RED)` (QuestionsPanel.thunk.test.tsx alone).
2. Task 2: `53e8ec80` `test(56-03): the poll's defect and cadence cases sample a scripted collector, not a questions thunk` (collectorDouble.ts, DiagnosticsFeed.test.ts, useDiagnostics.test.tsx).
3. Task 3: `73cb5b57` `test(56-03): the dock's poll-defect cases sample a dying collector, and its thunk cases go through the seam` (DockModel.test.ts, DiagnosticsScreens.test.tsx, DevtoolsDock.test.tsx).

## Ported cases

- `DiagnosticsFeed.test.ts`: F4, F5, F6, F7, F10, F12, F14, F15, F16, F17, F18, F21, F23, F25, F28, F29 (titles of F4, F5, F6, F16, F29 say "collector" where they said "source"). F2's `reading.questions` assert and F13's `["questions", ...]` row stay for 56-07; `source` and `collectorOf` stay for F13.
- `useDiagnostics.test.tsx`: "reports a sampler that died as Stopped and keeps the last reading".
- `DockModel.test.ts`: M18 (retitled "a throwing collector"), M27, M54. M49 and the gate-watch cases untouched.
- `DiagnosticsScreens.test.tsx`: D4, D5, D6 (its empty thunk now goes through `questionsProp`), D7, D8, D11; `throwsFirst` returns `{ state, collector }`.
- `DevtoolsDock.test.tsx`: the two thunk cases, retitled "reads the questions thunk, so the React panel needs no value prop" and "a supplied reading's questions win over the thunk", through `questionsProp({ diagnostics: {} }, ...)`.

## Verification

- Task 1 RED run as above; the two file and git verifies pass.
- Tasks 2 and 3: the ported files green (37 tests, then 146 tests), `pnpm typecheck` exit 0, `pnpm lint` reports `house-style: 553 file(s) clean` with only pre-existing warnings.
- Whole devtools project with `--exclude '**/QuestionsPanel.thunk.test.tsx'`: 1604 passed.
- Exactly three `test(56-03)` commits, each with the trailer; the two characterisations have no commit from this plan; `git diff <phase_base> HEAD -- packages/*/src` is empty.

## Deviations from Plan

**1. [Rule 1 - Test determinism] Q4 mends by a flag, not by call count**
- **Found during:** Task 1.
- **Issue:** the table has the thunk throw on calls 1 and 2 and then answer. At `intervalMillis: 10` that failure lasts about 20 ms, shorter than `vi.waitFor`'s 50 ms tick, so after 56-07 the failure paragraph could unmount before the test observes it and the case would fail for the wrong reason.
- **Fix:** the thunk throws while `sick.failing` is true; the test waits for the failure paragraph, flips the flag, then waits for no failure and one `qadi-question-block`. The claim (throws, then answers, mends with no residue) is the same.
- **Files modified:** QuestionsPanel.thunk.test.tsx (before its first commit).
- **Commit:** `ecc7d463`.

**Total deviations:** 1 auto-fixed (1 test-determinism). **Impact:** none on scope or on what the case pins.

## Known Stubs

None.

## Threat Flags

None.

## Next

Ready for 56-04 (GatesFeed). Until 56-07 makes it green, every whole-project devtools run in 56-04..56-06 passes `--exclude '**/QuestionsPanel.thunk.test.tsx'` and excludes nothing else.

## Self-Check: PASSED

- `QuestionsPanel.thunk.test.tsx` and `collectorDouble.ts` exist; `ecc7d463`, `53e8ec80` and `73cb5b57` are ancestors of HEAD.
- All three `test(56-03)` commits end with the trailer; no change under `packages/*/src` since `phase_base`.
