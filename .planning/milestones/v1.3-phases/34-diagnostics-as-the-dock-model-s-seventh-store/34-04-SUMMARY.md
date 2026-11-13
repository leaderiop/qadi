---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 04
subsystem: devtools
tags: [react, usesyncexternalstore, usestoresnapshot, refactor]

requires:
  - phase: 34-03
    provides: react/useStoreSnapshot.ts, the one store-snapshot hook
provides:
  - usePaused in react/useStoreSnapshot.ts, reading the timeline's pause through useStoreSnapshot (one subscription)
  - the dock, explorer, role viewer, simulation and timeline reads all going through useStoreSnapshot
  - useDockSession.ts and useExplorerSession.ts deleted; no constant-undefined run passed to useRunningStore
  - useStoreSnapshot.test.tsx (S1..S3)
affects: [34-05, 34-06, 34-09]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2
plan_head_before: 5923a4291711bb2799b9ff572689e73c581c5d18
plan_head_after: 2086026dadb2e4ed2e3a06576a8f5e7aed160079
commits: 2

tech-stack:
  added: []
  patterns:
    - "a screen reads a model store through useStoreSnapshot and nothing else; a derived primitive (isPaused) is a { subscribe, getSnapshot } pair over the same store"

key-files:
  created:
    - packages/devtools/test/react/useStoreSnapshot.test.tsx
  modified:
    - packages/devtools/src/react/useStoreSnapshot.ts
    - packages/devtools/src/react/useDockModel.ts
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/PolicyExplorer.tsx
    - packages/devtools/src/react/RoleViewer.tsx
    - packages/devtools/src/react/useSimulationSession.ts
  deleted:
    - packages/devtools/src/react/useDockSession.ts
    - packages/devtools/src/react/useExplorerSession.ts

key-decisions:
  - "usePaused reads through useStoreSnapshot, so D-14's stated second useSyncExternalStore fallback is not taken"
  - "useSimulationSnapshot and the owned hook's private read move to useStoreSnapshot too, signatures unchanged"

requirements-completed: []  # DIAG-04 not marked: requirements.ready-ids lists it blocked (sibling plans 34-05..34-09 still declare it)

coverage:
  - id: D1
    description: "Every React read of a model store goes through useStoreSnapshot; useDockSession.ts and useExplorerSession.ts are gone; useRunningStore's only caller is useDiagnostics"
    requirement: DIAG-04
    verification:
      - kind: unit
        ref: "pnpm vitest run --project devtools (Test Files  53 passed (53); Tests  1289 passed (1289)); both tasks' structural node verifies"
        status: pass
    human_judgment: false
  - id: D2
    description: "useStoreSnapshot keeps snapshot identity and holds one subscription per store; usePaused holds one subscription"
    requirement: DIAG-04
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/useStoreSnapshot.test.tsx (S1, S2, S3; Tests  3 passed (3))"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-12
status: complete
---

# Phase 34 Plan 04: One snapshot hook for every store read Summary

**The dock, explorer, role viewer, simulation and timeline all read their stores through `useStoreSnapshot`; `usePaused` moved beside it, and the two keep-alive reader modules that passed a constant-`undefined` run to `useRunningStore` are deleted.**

## Performance

- **Duration:** 8 min
- **Tasks:** 2 (a tracer, then an auto/tdd task)
- **Files:** 10 (7 edited, 1 created, 2 deleted)

## Accomplishments

- `usePaused` is `useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused })`: one subscription, a primitive snapshot, so no second `useSyncExternalStore` was needed.
- `DevtoolsDock`'s `DockFrame` reads `useStoreSnapshot(dock)`; `PolicyExplorer` and `RoleViewer` read their session and held choice the same way; `useSimulationSnapshot` and the owned hook's read do too.
- `useSyncExternalStore` is now called in exactly `useStoreSnapshot.ts` and `useRunningStore.ts` (the other files `git grep -l` lists name it only in comments); `useRunningStore`'s only caller is `useDiagnostics.ts`, which 34-06 rebuilds.
- S1..S3 pin value identity, one subscription across re-renders, unsubscribe on unmount, the subscription moving to a new store, and `usePaused` over `makeTimelineStore`.

## Commits

- `9f40fcbb` refactor(34-04): the dock reads its session and pause through one snapshot hook
- `2086026d` refactor(34-04): every store read in the React layer goes through one hook

## Verification

- `git grep -l useSyncExternalStore -- packages/devtools/src`: `model/DiagnosticsStore.ts`, `model/ExplorerSession.ts`, `model/ExternalStore.ts`, `model/SimulationSession.ts`, `model/TimelineStore.ts`, `react/useDiagnostics.ts`, `react/useRunningStore.ts`, `react/useStoreSnapshot.ts`. Comment-stripped, only `useRunningStore.ts` and `useStoreSnapshot.ts` call it (the plan's check passes).
- Task 1 suites (DevtoolsDock, useTimeline, TimelineLifetime, DiagnosticsLifetime): `Tests  79 passed (79)`.
- `packages/devtools/test/react`: `Tests  279 passed (279)`; whole devtools project: `Test Files  53 passed (53)`, `Tests  1289 passed (1289)`; `useStoreSnapshot.test.tsx`: `Tests  3 passed (3)`.
- `pnpm typecheck`, `pnpm lint` (house-style: 476 files clean; only pre-existing oxlint warnings), `pnpm circular`: pass after each commit.
- No existing test file edited.

## Deviations from Plan

None - plan executed exactly as written. The INV-QD-107 sentence from `useExplorerSession.ts` already appears in `PolicyExplorer.tsx` and `RoleViewer.tsx`'s prop docs, so nothing was moved.

## Issues Encountered

None. `requirements.ready-ids` lists DIAG-04 as blocked (later plans in the phase declare it), so it was not marked complete.

## Known Stubs

None.

## Next

Ready for 34-05.

## Self-Check: PASSED

- Created and deleted files verified on disk / in git; both commit hashes are ancestors of HEAD.
