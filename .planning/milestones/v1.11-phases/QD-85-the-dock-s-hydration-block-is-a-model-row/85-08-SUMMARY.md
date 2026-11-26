---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 08
subsystem: devtools
tags: [dock-frame, use-sync-external-store, render-count, profiler, seen-failing]
requires:
  - phase: QD-85
    provides: "85-05: model.hydration; 85-07: the panel reads its own store and the frame's shown prop became unused"
provides:
  - "useDiagnosticsStatus(readout): DiagnosticsStatus, beside usePaused, through the one useStoreSnapshot"
  - "DockFrame reads only the poll's status; Screen has no shown prop and the Diagnostics import is gone"
  - "DockFrame.renders.test.tsx: R1 (reading-only poll commits nothing), R2 (control), R3 (hydration follows the model's store)"
  - "85-RED-EVIDENCE.md: the 85-08 section"
affects: [85-09, 85-10]
tech-stack:
  added: []
  patterns:
    - "A component narrows a store subscription with a derived getSnapshot through useStoreSnapshot, not a second useSyncExternalStore call"
    - "A render count is taken outside act, with Testing Library's waitFor, so the updates commit as on a page"
key-files:
  created:
    - packages/devtools/test/react/DockFrame.renders.test.tsx
  modified:
    - packages/devtools/src/react/useStoreSnapshot.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the render tests wait with Testing Library's waitFor, not vi.waitFor inside act, because inside one async act React queues every update until the act closes, so a commit count reads zero whatever the frame subscribes to (R1 then passed on the base and R2 failed)"
  - "Decided autonomously: R1 and R2 settle relative to the poll rather than to a fixed call number, because waitFor polls every 50ms and the 10ms poll is already several samples in when it returns; R2's control stops the feed from a flag set after the settle, so the stop's commit cannot fall before the count is read"
requirements-completed: []
status: complete
duration: 15min
completed: 2026-11-25
commits: 2
plan_head_before: ab4d753d754b8712b9055975f175ff590be39ffe
plan_head_after: 1e49d7550de2a340d8b13b2f9faa67f39a075571
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "DockFrame reads the diagnostics store only through useDiagnosticsStatus(model.diagnostics) and hands the status to useStopNotice; Screen has no shown prop and the Diagnostics type import is gone"
    requirement: HYDV-04
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs frame-reads-status"
        status: pass
    human_judgment: false
  - id: D2
    description: "With the log tab open and the status Live, polls that move only the reading commit nothing under the dock; a poll that stops the feed does commit, so the count is not blind"
    requirement: WX-04
    verification:
      - kind: test
        ref: "packages/devtools/test/react/DockFrame.renders.test.tsx#R1"
        status: pass
      - kind: test
        ref: "packages/devtools/test/react/DockFrame.renders.test.tsx#R2"
        status: pass
    human_judgment: false
  - id: D3
    description: "Counts handed to a mounted dock reach the open hydration block, and later counts replace them, through the model's store alone"
    requirement: HYDV-04
    verification:
      - kind: test
        ref: "packages/devtools/test/react/DockFrame.renders.test.tsx#R3"
        status: pass
    human_judgment: false
  - id: D4
    description: "R1 was seen failing on the whole-snapshot frame, and R2 and R3 under their scratch edits; every held characterisation and the dock's tests stay green and unedited"
    requirement: WX-06
    verification:
      - kind: other
        ref: ".planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md#85-08"
        status: pass
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-pinned-check.mjs --all-applied"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 08: The dock frame reads the poll's status alone Summary

`DockFrame` now subscribes to the diagnostics store through `useDiagnosticsStatus`, a one-line hook beside `usePaused` that
runs `useStoreSnapshot` over a `getSnapshot` picking `.status`. The feed keeps the status object across samples that change
nothing, so a poll that moved only the reading re-renders nothing under the dock, and the frame no longer forwards a reading
to `Screen`: the questions tab reads its own hydration store.

## Accomplishments

- **Hook and frame** (tracer, `b20c2311`): `useDiagnosticsStatus(readout: DiagnosticsReadout): DiagnosticsStatus` with a doc
  comment in `usePaused`'s shape; `DevtoolsDock.tsx` calls it in one line, drops `shown={shown}`, `Screen`'s `shown` prop and
  the `Diagnostics` type import. `useSyncExternalStore` is still called once in `src/react`.
- **Render tests**: R1 (reading-only polls commit nothing: 3 commits at the settle and still 3 after three more samples), R2
  (the control: a collector that starts throwing after the settle commits the `Stopped` notice), R3 (counts handed by a
  rerender reach the open seeded cell, then other counts replace them).
- **Seen failing** (`1e49d755`): R1 on the base frame (6 commits against 3, three runs); R2 under a one-time
  `model.diagnostics.getSnapshot().status` read; R3 under `hydration={undefined}`. Each restored with `cp`; `packages` clean
  afterwards.
- Verified: R1 to R3, `DockFrame.stops.characterisation`, `DevtoolsDock`, `DiagnosticsScreens`, both held QuestionsPanel
  characterisations, the hydration cells, `useStoreSnapshot` and `ConfigureFirstRender.characterisation` (143 tests) pass;
  `frame-reads-status` (failing on purpose since 85-07), `scan-forbidden`, `scan-ids` pass;
  `85-pinned-check.mjs --all-applied` prints `18 files hold their base text, 1 of 1 born files held, 1 of 1 declared edits
  applied`; `tsc -p tsconfig.test.json`, `pnpm lint` (house style clean, 621 files) and `pnpm circular` pass.

## Task Commits

1. **Task 1 (tracer): the status hook, the frame and the render tests** - `refactor(85-08): the dock frame reads the poll's status alone` (`b20c2311`)
2. **Task 2: R2 and R3 seen failing** - `docs(85-08): record the frame's render tests seen failing` (`1e49d755`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first draft of R1 and R2 counted nothing**
- **Found during:** Task 1
- **Issue:** The plan's wording waits "inside `act`". Inside one async `act`, React holds every update until the act closes,
  so R1 passed on the whole-snapshot base (it could never see a commit) and R2 failed (it could never see the stop). A second
  draft then settled on a fixed call number: `waitFor` polls every 50ms, so by the time it returned the 10ms poll was already
  past that call and the stop's commit had landed before the count was read.
- **Fix:** the tests wait with Testing Library's `waitFor` (it leaves the act environment, so updates commit as on a page),
  settle by what the poll has read when the wait returns, and R2 starts throwing from a flag set after the settle.
- **Files modified:** `packages/devtools/test/react/DockFrame.renders.test.tsx`
- **Commit:** `b20c2311`

**Total deviations:** 1 auto-fixed (bug in the draft test, before commit). **Impact:** none on the shipped change.

The tracer feedback gate re-ran the task's verify end to end and passed: tracer verified, expanding.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-85-14 holds: `getSnapshot` returns the stored status object, and R1 and R2 run the hook against a live poll;
T-85-15 holds: the frame still hands the status to `useStopNotice` and `DockFrame.stops.characterisation.test.tsx` is green and
unedited.

## Issues Encountered

None beyond the deviation above.

## Next Phase Readiness

Ready for 85-09. `frame-reads-status` now passes.

## Self-Check: PASSED

- FOUND: packages/devtools/test/react/DockFrame.renders.test.tsx
- FOUND: packages/devtools/src/react/useStoreSnapshot.ts (`useDiagnosticsStatus`)
- FOUND: commits b20c2311 and 1e49d755
