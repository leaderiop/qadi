---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 03
subsystem: devtools
tags: [effect, fiberhandle, usescoped, timeline, usesyncexternalstore, stryker, changeset]

requires:
  - phase: 34-02
    provides: the diagnostics feed and DockModel's seventh store, whose DockModel.ts this plan edits again
provides:
  - model/TimelineFeed.ts, one scoped timeline read (makeTimelineFeed, TimelineFeed, TimelineFeedInputs, idleTimeline) shared by the dock model and useTimeline
  - react/useStoreSnapshot.ts, the one store-snapshot hook (a single useSyncExternalStore call)
  - useTimeline rebuilt as useScoped(makeTimelineFeed) plus configure in a layout effect, signature unchanged
  - the useTimeline lifetime change recorded as a Breaking lead in .changeset/dock-diagnostics-feed.md and in upgrading.md
  - TimelineFeed.test.ts (TF1..TF8)
affects: [34-04, 34-06, 34-08, 34-09]

actuals:
  tokens: 15000
  tasks: 3
  commits: 3
plan_head_before: 31108b0da5c15acca2d8a6247e9b2d5bf3aa0429
plan_head_after: 79f3609bb139adb19d308984b26f533e09582bc2
commits: 3

tech-stack:
  added: []
  patterns:
    - "a hook that owns a read builds a feed in useScoped and forwards its inputs to configure in a layout effect (useDockModel's shape)"
    - "the pass before the scoped value exists reads a module-scope inert store, never a live shared one"

key-files:
  created:
    - packages/devtools/src/model/TimelineFeed.ts
    - packages/devtools/src/react/useStoreSnapshot.ts
    - packages/devtools/test/model/TimelineFeed.test.ts
    - .changeset/dock-diagnostics-feed.md
  modified:
    - packages/devtools/src/react/useTimeline.ts
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/react/TimelineLifetime.test.tsx
    - apps/website/src/content/docs/docs/reference/upgrading.md

key-decisions:
  - "idleTimeline is inert (accept, clear and setPaused do nothing, never paused) so a caller on the first pass cannot feed a store several components share"
  - "DockModel's timeline listener is subscribed at build, before any host listener, so the rail still moves first; it ignores a re-published identical snapshot (a pause toggle)"
  - "the dock's diagnostics feed local was renamed diagnosticsFeed so the two feeds read apart"

requirements-completed: [DIAG-04, WX-06, WX-07]

coverage:
  - id: D1
    description: "useTimeline reads its source in a scope the hook holds, through the one store-snapshot hook, signature unchanged; useTimeline.test.tsx untouched and green"
    requirement: DIAG-04
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/useTimeline.test.tsx (Tests  4 passed (4)); TimelineLifetime.test.tsx L1, L2"
        status: pass
    human_judgment: false
  - id: D2
    description: "The two deliberate pins flip in the commit that changes the behaviour, assertion by assertion"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/TimelineLifetime.test.tsx L3, L4 (Tests  4 passed (4))"
        status: pass
    human_judgment: false
  - id: D3
    description: "The lifetime change is a Breaking lead in the devtools minor changeset and an upgrading.md section whose After fence compiles"
    requirement: WX-07
    verification:
      - kind: command
        ref: "pnpm spec:website-examples (54 block(s) compile)"
        status: pass
    human_judgment: false
  - id: D4
    description: "One timeline read implementation serves the dock and useTimeline, and both model files hold the mutation bar"
    requirement: DIAG-04
    verification:
      - kind: unit
        ref: "TimelineFeed.test.ts TF1..TF8; DockModel.test.ts unedited; Stryker TimelineFeed.ts 31/31, DockModel.ts 48/48"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-12
status: complete
---

# Phase 34 Plan 03: useTimeline on a scoped timeline feed Summary

**`useTimeline` now reads its source in a scope it holds, through a package-private `makeTimelineFeed` that the dock model also uses, with one store-snapshot hook under both; the lifetime change is recorded as Breaking.**

## Performance

- **Duration:** 4 min
- **Tasks:** 3
- **Files:** 4 created, 4 modified

## Commits

| Task | Commit | Subject |
|------|--------|---------|
| 1 (tracer) | `add1d189` | feat(34-03): useTimeline reads through a scoped timeline feed |
| 2 | `ed935407` | docs(34-03): record the useTimeline lifetime change |
| 3 | `79f3609b` | refactor(34-03): the dock model reads its source through the timeline feed |

The tracer gate: Task 1's three verifies passed (structure checks, useTimeline.test.tsx byte-identical to the phase base and green, typecheck, lint, madge) before Task 2 began.

## TimelineLifetime flips (WX-06)

Both in `packages/devtools/test/react/TimelineLifetime.test.tsx`, in the Task 1 commit, and no other line of the file changed.

| Case | Old | New |
|------|-----|-----|
| L3 title | `L3 a capacity change hands back a new store` | `L3 a capacity change keeps the store and reads the source again into the new bound` |
| L3 final assertion | `assert.notStrictEqual(after, before)` | `assert.strictEqual(after, before)` |
| L4 title | `L4 a paused timeline stays paused across a hidden-then-shown tree` | `L4 a hidden-then-shown tree rebuilds the timeline: it is live again` |
| L4 right-after-show assertion on the `paused` text | `"true"` | `"false"` |

L1 and L2 stay green unedited.

## Test results

- `useTimeline.test.tsx`: `Tests  4 passed (4)`, file identical to the phase base `20089321559c80641eaed7ca3dbecf4e41a1ea3f`. With `TimelineLifetime.test.tsx`: `Tests  8 passed (8)`.
- DockModel, TimelineFeed and TimelineStore together: `Tests  63 passed (63)`; `DockModel.test.ts` and `TimelineStore.test.ts` unedited.
- `TimelineFeed.test.ts`: 8 cases (`Tests  8 passed (8)`).
- Whole devtools project: `Test Files  52 passed (52)`, `Tests  1286 passed (1286)`.
- `pnpm typecheck`, `pnpm lint` (house-style: 476 files clean) and `pnpm circular` pass; `pnpm spec:website-examples`: 54 blocks compile.
- `git grep -l useRunningStore -- packages/devtools/src` lists `useDiagnostics.ts`, `useDockSession.ts`, `useExplorerSession.ts`, `useRunningStore.ts` and `useScoped.ts`, and not `useTimeline.ts`.

## Mutation result

`pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/TimelineFeed.ts,packages/devtools/src/model/DockModel.ts'`, log `t3-stryker.log` in the scratchpad.

| File | Base | Final | Killed | Survived |
|------|------|-------|--------|----------|
| `DockModel.ts` | 1 | **100.00** | 48 | 0 |
| `TimelineFeed.ts` | new | **100.00** | 31 | 0 |

No survivor, so `34-mutation-survivors.json` is untouched.

## Deviations from Plan

None - plan executed exactly as written. Two small choices inside the plan's latitude: the diagnostics feed local in `DockModel.ts` became `diagnosticsFeed` (the timeline feed is `timelineFeed`), and `timelineFeed.configure(...)` takes the place of the old resize branch at the head of `configure`; every existing `DockModel` test stayed green unedited.

## Known Stubs

None.

## Threat Flags

None. T-34-07 and T-34-08 are mitigated as planned: the read lives in the feed's scope (L1, `useTimeline.test.tsx` close-on-unmount, TF6), and `idleTimeline` is inert (TF8).

## Next Phase Readiness

Ready for 34-04. `useTimeline` no longer uses `useRunningStore`; its remaining callers are `useDiagnostics` (34-06) and the two keep-alive hooks (34-04). `34-06` appends the `useDiagnostics` lead to `.changeset/dock-diagnostics-feed.md`.

## Self-Check: PASSED
