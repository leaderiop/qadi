---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
plan: 01
subsystem: testing
tags: [stryker, vitest, react, strictmode, activity, devtools, characterisation]
phase_base: 20089321559c80641eaed7ca3dbecf4e41a1ea3f

requires:
  - phase: 33-one-sealed-evaluation-layer
    provides: the devtools tree this phase starts from
provides:
  - 34-mutation-base.json, the phase's mutation baseline measured with stryker.devtools.mjs
  - DiagnosticsLifetime.test.tsx, a green-on-base pin of the diagnostics poll's lifecycle (8 tests)
  - TimelineLifetime.test.tsx, a green-on-base pin of useTimeline's lifecycle (4 tests)
affects: [34-02, 34-03, 34-04, 34-05, 34-06, 34-07, 34-09]

actuals:
  tokens: 3950
  tasks: 3
  commits: 3
plan_head_before: 20089321559c80641eaed7ca3dbecf4e41a1ea3f
plan_head_after: 5410eceaca3f71c02e9ee32727989bdc307c885c
commits: 3

tech-stack:
  added: []
  patterns:
    - "characterisation pins carry titles that state today's behaviour, so the commit that flips one rewrites title and assertions together"

key-files:
  created:
    - .planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-base.json
    - packages/devtools/test/react/DiagnosticsLifetime.test.tsx
    - packages/devtools/test/react/TimelineLifetime.test.tsx
  modified: []

key-decisions:
  - "Baseline measured before any pin or src change: DockModel.ts and DiagnosticsStore.ts both at ratio 1, no survivors"
  - "Async-layer cases (H2, K5) use a real 30 ms Effect.sleep in the layer's acquire, as useDiagnostics.test.tsx already waits on real time"

requirements-completed: [WX-05, WX-06]

coverage:
  - id: D1
    description: "34-mutation-base.json classifies every file the phase measures, edits unmeasured, creates and deletes, committed alone as the phase's first plan commit"
    requirement: WX-05
    verification:
      - kind: other
        ref: "node writer from 34-01-PLAN.md Task 1 step 3 (exit 0), then the Task 1 key-shape verify and the first-plan-commit check"
        status: pass
    human_judgment: false
  - id: D2
    description: "The diagnostics poll's lifecycle across StrictMode, a hidden Activity and diagnostics going undefined is pinned for the hook (H1..H3) and the dock (K1..K5) on the untouched base"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/DiagnosticsLifetime.test.tsx (Tests  8 passed (8))"
        status: pass
    human_judgment: false
  - id: D3
    description: "useTimeline's lifecycle across StrictMode, a re-render, a capacity change and a hidden Activity is pinned (L1..L4) on the untouched base"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/TimelineLifetime.test.tsx (Tests  4 passed (4))"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-12
status: complete
---

# Phase 34 Plan 01: Mutation baseline and lifecycle pins Summary

**Devtools mutation baseline (DockModel.ts and DiagnosticsStore.ts both at 1) plus twelve green-on-base pins of how the diagnostics poll and a timeline live across StrictMode, a hidden Activity and a changed prop, with no src change.**

## Performance

- **Duration:** 8 min
- **Started:** 2026-11-12T17:08:00Z
- **Completed:** 2026-11-12T17:15:00Z
- **Tasks:** 3
- **Files modified:** 3 (all created; nothing under `packages/*/src`)

## phase_base

`20089321559c80641eaed7ca3dbecf4e41a1ea3f`, the parent of the `chore(34-01)` commit. 34-02..34-09 read it from here.

## Reserved numbers

Free at the base (no `git grep` hit in `spec packages .changeset AGENTS.md apps/website/src examples`, and no `spec/decisions/147-*`): `ARCH-82`, `ADR-QD-147`, `CCR-QD-425`, `BEH-QD-506`..`BEH-QD-510`, `INV-QD-313`, `INV-QD-314`.

## Baseline

Measured with `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/DockModel.ts,packages/devtools/src/model/DiagnosticsStore.ts'`, alone, exit 0, log at `/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/13b3a680-6983-4c4f-9cad-4ed79d71ff4f/scratchpad/34-stryker-base.log`.

| File | Total | Killed | Timeout | Survived | No cov |
|------|-------|--------|---------|----------|--------|
| `DiagnosticsStore.ts` | 100.00 | 60 | 0 | 0 | 0 |
| `DockModel.ts` | 100.00 | 55 | 0 | 0 | 0 |

**Survivors: none for either file.** The D-16 premise holds: DockModel.ts base is exactly 1.

The writer's printed JSON (committed as `34-mutation-base.json`):

```json
{"measured":{"packages/devtools/src/model/DockModel.ts":1,"packages/devtools/src/model/DiagnosticsStore.ts":1},"unmeasured":{"packages/devtools/src/react/useDiagnostics.ts":"outside stryker.devtools.mjs mutate (packages/devtools/src/model/** only)","packages/devtools/src/react/useTimeline.ts":"…same reason…","packages/devtools/src/react/useDockModel.ts":"…","packages/devtools/src/react/useScoped.ts":"…","packages/devtools/src/react/useSimulationSession.ts":"…","packages/devtools/src/react/DevtoolsDock.tsx":"…","packages/devtools/src/react/ServicesPanel.tsx":"…","packages/devtools/src/react/QuestionsPanel.tsx":"…","packages/devtools/src/react/PolicyExplorer.tsx":"…","packages/devtools/src/react/RoleViewer.tsx":"…","packages/devtools/src/react/index.ts":"…"},"new":["packages/devtools/src/model/DiagnosticsFeed.ts","packages/devtools/src/model/TimelineFeed.ts","packages/devtools/src/react/DiagnosticsNotice.tsx","packages/devtools/src/react/useStoreSnapshot.ts"],"deleted":{"packages/devtools/src/react/useDockSession.ts":"deleted by this phase; outside stryker.devtools.mjs mutate","packages/devtools/src/react/useExplorerSession.ts":"…","packages/devtools/src/react/useRunningStore.ts":"…"}}
```

(The `…` stand for the identical reason string; the committed file carries each in full.)

## Pins

- `DiagnosticsLifetime.test.tsx`: `Tests  8 passed (8)` on the untouched base, first run, no test fixed.
- `TimelineLifetime.test.tsx`: `Tests  4 passed (4)` on the untouched base, first run, no test fixed.

Cases a later plan flips on purpose, with titles that name today's behaviour: H2 and K5 (a hidden-then-shown hook or dock shows the reading it held at once), L3 (a capacity change hands back a new store) and L4 (a paused timeline stays paused across a hidden-then-shown tree). H2 and K5 assert `builds === 1` right after the show, so they stand in the window before the 30 ms rebuild and cannot pass vacuously.

## Existing pins kept unchanged

Named here and not edited by this plan:

- `packages/devtools/test/model/DiagnosticsStore.test.ts`: the `mergeReading` cases (per-field precedence and the identity rule)
- `packages/devtools/test/react/DevtoolsDock.test.tsx`: the `diagnostics` describe
- `packages/devtools/test/react/useDiagnostics.test.tsx`: five cases (start on mount, nothing for undefined, finalizer on unmount, no restart on an equal literal, restart on a replaced layer)
- `packages/devtools/test/react/useTimeline.test.tsx`: four cases (renders what the source produced, closes the connection on unmount, and the two `useTimelineStore` re-render cases)

## Task Commits

1. **Task 1: mutation baseline** - `5e6d08be` (chore)
2. **Task 2: diagnostics lifetime pin** - `1257c0a2` (test)
3. **Task 3: timeline lifetime pin** - `5410ecea` (test)

Each carries exactly one file; the first three `(34-0` commits are these three, in this order, before any `packages/*/src` change.

## Decisions Made

- Baseline recorded as raw ratios (1 and 1), so a later single surviving mutant is a measurable drop in 34-09.
- `DiagnosticsStore.ts` is measured although this phase is not expected to edit it, per the plan's flagged assumption.

## Deviations from Plan

None - plan executed exactly as written. One non-deviation worth recording: the pin helpers `counted()` and `slowCounted()` share a small private `counting(build)` factory rather than being two copies of the same acquire/release body; the exported shape the plan names is unchanged.

## Issues Encountered

None. `pnpm lint` prints pre-existing oxlint warnings in unrelated files (`features/step-definitions/CustomPredicateGivenSteps.ts`, `packages/react/src/QadiAtoms.ts`, `packages/devtools/test/model/HeldChoice.test.ts`, `scripts/check-house-style.mjs`); none names this plan's files and house-style reports clean.

## Known Stubs

None.

## Threat Flags

None. No network, auth or schema surface was touched; only a JSON file and two test files were added.

## Next Phase Readiness

34-02 may start: the baseline and both pins are committed on the untouched base, and `phase_base` is recorded above.

## Self-Check: PASSED

- FOUND: `.planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-base.json`
- FOUND: `packages/devtools/test/react/DiagnosticsLifetime.test.tsx`
- FOUND: `packages/devtools/test/react/TimelineLifetime.test.tsx`
- FOUND commits `5e6d08be`, `1257c0a2`, `5410ecea` (each an ancestor of HEAD; each message ends with the Opus 5.5 trailer)
- No file under `packages/*/src` differs from the phase base.

---
*Phase: 34-diagnostics-as-the-dock-model-s-seventh-store*
*Completed: 2026-11-12*
