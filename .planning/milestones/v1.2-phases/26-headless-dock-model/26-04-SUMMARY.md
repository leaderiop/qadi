---
phase: 26-headless-dock-model
plan: 04
subsystem: devtools
tags: [dock-model, react, use-scoped, activity, strictmode, preserve-contract]
requires:
  - phase: 26-headless-dock-model
    provides: "26-02's makeDockModel (scoped, configure by identity) and 26-03's held-choice cell and PolicyChoice arms"
provides:
  - "react/useDockModel.ts: useDockModel (one useScoped scope per mounted dock, one configure layout effect) and usePaused"
  - "DevtoolsDock: owner renders null until the model exists, then DockFrame; Screen takes { model, view, shown, host }"
  - "useOwnedDockSession, useOwnedExplorerSession, useOwnedHeldChoice, useOwnedSimulationSession deleted; the public surface loses useOwnedSimulationSession"
  - "panel props that accept an absent value (portCalls, hydration, gates, onInvalidate, unknownParents)"
affects: [26-05, 26-06]
actuals:
  tokens: 10500
  tasks: 2
  commits: 2
plan_head_before: d6b1672558e2d692499c3d84a933e95775354131
plan_head_after: 7812541a4c6f1ca32a918b0bef6032127c7a6fe8
commits: 2
tech-stack:
  added: []
  patterns:
    - "an owner hook that builds a model through useScoped and forwards every host input through one configure layout effect; the model diffs by identity, so a re-render with unchanged props dispatches nothing"
    - "host props the dock only passes through travel as the rest of its own props (`...host`), typed Pick<DevtoolsDockProps, ...>, so no conditional spread is needed under exactOptionalPropertyTypes"
key-files:
  created:
    - packages/devtools/src/react/useDockModel.ts
  modified:
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/src/react/useDockSession.ts
    - packages/devtools/src/react/useExplorerSession.ts
    - packages/devtools/src/react/useSimulationSession.ts
    - packages/devtools/src/react/index.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/react/ServicesPanel.tsx
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/RoleViewer.tsx
    - packages/devtools/test/surface.test.ts
    - packages/devtools/test/react/useSimulationSession.test.tsx
    - spec/overview.md
    - .changeset/simulation-session.md
    - .changeset/simulator-session-only.md
key-decisions:
  - "host props travel as `...host` (the rest of DevtoolsDockProps) typed Pick<DevtoolsDockProps, gates | unknownParents | onInvalidate>: passing `{ gates, unknownParents, onInvalidate }` explicitly would not typecheck against the optional fields under exactOptionalPropertyTypes, and widening the public props to `| undefined` was not needed"
  - "usePaused lives in useDockModel.ts beside the hook; useDockSession.ts stays as the readers-only file with useDockSnapshot"
  - "`nothing` (the stable empty source) is kept as the dock's `source` default, so useDockModel's input keeps `source: Source` as the plan states"
  - "useSimulationSession absorbed useOwnedSimulationSession's body unchanged: still built through useScoped, three guarded layout effects, still SimulationSessionView | undefined"
requirements-completed: [DMOD-01, DMOD-03, DMOD-05, WX-03, WX-04]
coverage:
  - id: D1
    description: "DevtoolsDock owns exactly one DockModel through useDockModel (one scope per mounted dock, one configure layout effect, forks nothing) and renders null until it exists"
    requirement: DMOD-01
    verification:
      - kind: unit
        ref: "pnpm vitest run --project devtools: 46 files, 1235 tests (DevtoolsDock.test.tsx unedited); plan Task 1 labelled checks all silent"
        status: pass
    human_judgment: false
  - id: D2
    description: "The four owned hooks are gone from code, comments and tests; Screen takes four props; no conditional spread, useState or catalogueOf in the dock; layout effects only in useDockModel (1), useScoped (1), useSimulationSession (3)"
    requirement: DMOD-03
    verification:
      - kind: other
        ref: "plan Task 1 and Task 2 labelled bash checks (v1, v1b, v2a, v2b), all exit 0"
        status: pass
    human_judgment: false
  - id: D3
    description: "The StrictMode double-mount case and the Activity hide/show case survive, re-pointed at useDockModel: a run survives the double mount and is interrupted on unmount, and a child that read the model once holds the fresh one after hide/show"
    requirement: DMOD-03
    verification:
      - kind: unit
        ref: "packages/devtools/test/react/useSimulationSession.test.tsx (keeps a run alive through StrictMode's double mount; never leaves a child holding the closed session its owner replaced)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Nothing visible changed: theme and the pure views frozen, no class/stylesheet/focus/key-handler, TABS and data-testid sets equal the phase base, useScoped.ts byte-identical"
    requirement: DMOD-05
    verification:
      - kind: other
        ref: "plan Task 2 frozen-surface check; the three review diffs below; git diff 7396491d -- useScoped.ts is empty"
        status: pass
    human_judgment: true
    rationale: "pixels, focus retention and render timing in a real browser are not asserted by any test (26-UI-SPEC: Phase 25's human_needed item stands)"
  - id: D5
    description: "useOwnedSimulationSession is out of the barrel, surface.test.ts, the overview row and both unreleased changesets"
    requirement: WX-03
    verification:
      - kind: other
        ref: "pnpm spec:api (906 exports documented), pnpm test:tstyche, surface.test.ts in the devtools project"
        status: pass
    human_judgment: false
duration: 3min
completed: 2026-11-11
status: complete
---

# Phase 26 Plan 04: The dock on the model Summary

**`DevtoolsDock` builds one `DockModel` through `useDockModel` (one `useScoped` scope, one `configure` layout effect, no fibers), renders `null` for the one pass before it exists, and hands `Screen` the model; four `useOwned*` hooks are gone and all 1235 devtools tests, `DevtoolsDock.test.tsx` unedited, still pass.**

## Performance

- **Duration:** about 3 min
- **Started:** 2026-11-11T12:56Z
- **Completed:** 2026-11-11T12:59Z
- **Tasks:** 2 (2 code commits)
- **Files modified:** 14 (one created)

## Counts, before and after (phase base to now)

| Measure | Before | After |
| ------- | ------ | ----- |
| `useLayoutEffect(` in `src/react` | 7 (`useDockSession` 1, `useExplorerSession` 2, `useSimulationSession` 3, `useScoped` 1) | 5 (`useDockModel` 1, `useScoped` 1, `useSimulationSession` 3) |
| `=== undefined ? {} :` in `DevtoolsDock.tsx` | 10 | 0 |
| `Screen` props | 18 | 4 (`model`, `view`, `shown`, `host`) |
| `useState` / `catalogueOf` in `DevtoolsDock.tsx` | 0 / 2 lines | 0 / 0 |
| `useMemo` in `DevtoolsDock.tsx` | 2 | 1 (`mergeReading` only) |
| `useOwned` in `packages/devtools/src` + `test` | 22 lines, 8 files | 0 |

**Surface change:** `useOwnedSimulationSession` removed from `src/react/index.ts`, `test/surface.test.ts` and `spec/overview.md`'s `useSimulationSession` row (rewritten: the row now says `useSimulationSession` builds the session in a scope the component owns). No other export changed; `useDockModel`, `usePaused` and `useDockSnapshot` are package-private.

**Changesets edited** (both unreleased, so no consumer is broken): `.changeset/simulation-session.md` and `.changeset/simulator-session-only.md` each named `useOwnedSimulationSession`; both now name only `useSimulationSession` and `useSimulationSnapshot`.

## Panel bodies checked (Task 2 step 1)

`ServicesPanel`, `QuestionsPanel` and `RoleViewer` each destructure the prop and test it with `=== undefined`; none reads it with `in` or `hasOwnProperty`. Making `portCalls`, `hydration`, `gates`, `onInvalidate` and `unknownParents` `?: T | undefined` changes no behaviour (grep confirmed, bodies untouched).

## The three 26-UI-SPEC review diffs (Task 2 step 4)

Each captured against the phase base `7396491d` before filtering, so a broken base cannot read as empty. The base diff also contains 26-03's edits.

**(a) Added lines carrying a style key in the edited views:** no output. No hunk to review.

**(b) Added or removed lines carrying a rendered string or attribute:**

```
-            {snapshot.shown.sighting.label} is no longer in the log
+            {snapshot.shown.value.label} is no longer in the log
```

One hunk, in `PolicyExplorer.tsx`, and it is 26-03's, not this plan's: the held arm's field was renamed `sighting` to `value`. The rendered sentence is byte-identical (`{label} is no longer in the log`); it is a field rename, not a relocation, and was already reviewed and tested in 26-03 (`PolicyExplorer.test.tsx`'s `qadi-policies-evicted` case passes). Nothing in `DevtoolsDock.tsx` appears in this diff: every `data-testid`, `aria-*`, placeholder, `clear view`, `unattached`, `decisions ·` and `Filter decisions` line is unchanged text in unchanged position.

**(c) Added or removed element lines in the dock:**

```
-        <button type="button" style={button(false)} onClick={clear}>
+        <button type="button" style={button(false)} onClick={() => timeline.clear()}>
```

One hunk: the same `<button>` element, same attributes and label, with its handler now reading the model's timeline instead of the removed `useTimeline`'s `clear`. It adds no element and no wrapper; it is the toolbar's one expected wiring change (the pause button's `onClick` has the same shape but its line carries no element tag, so it is outside this filter).

## Activity behaviour (accepted)

Required by 26-UI-SPEC's recorded assumption. The timeline now lives in the model, whose scope `useScoped` closes on cleanup, so hiding then showing the dock in a React `Activity` rebuilds the whole model: `paused` returns to `live` and the backlog is re-read from the source. It follows D-04, D-05 and D-13 (one scope per mounted dock). A host that never wraps the dock in `Activity` (the documented case) never sees it. Making the timeline survive a hidden `Activity` is a design change for a later phase and was not attempted here. `useScoped.ts` is unchanged, so its `setValue(undefined)` on cleanup still unmounts every reader of a closed model, and the re-pointed `Activity` test pins that a child holds the fresh model.

## Task Commits

1. **Task 2 step 1: panel props accept an absent value** - `689a1f04` (refactor)
2. **Task 1 and Task 2 step 2: `useDockModel`, the dock on it, the owned hooks deleted, `Screen` reduced to the model** - `7812541a` (feat)

**Plan metadata:** the `docs(26-04): complete the dock-on-the-model plan` commit (SUMMARY, STATE.md, ROADMAP.md).

## Decisions Made

See `key-decisions`. One carries forward: the dock hands `configure` every input on every render (as 26-02 asked); the model's per-field identity diff makes the call a no-op when nothing moved, so an unchanged re-render resets nothing (T-26-11).

## Deviations from Plan

### Departures from the plan's wording

- **Task 2 did not get its own code commit for `Screen`.** `Screen` reading `props.shown.portCalls` and passing optional values straight through only typechecks once the panels accept `| undefined`, and the new `Screen` is part of the same `DevtoolsDock.tsx` rewrite as Task 1's owner and frame. So the panel widening is its own commit (`689a1f04`, compiles standalone) and the dock rewrite, including the four-prop `Screen`, is `7812541a`. Both tasks' verify scripts were run against the final tree.
- **`host` is the rest of the dock's props, typed `Pick<DevtoolsDockProps, "gates" | "unknownParents" | "onInvalidate">`,** rather than an object literal `{ gates, unknownParents, onInvalidate }` built in `DockFrame`. The literal does not typecheck against `Pick`'s optional fields under `exactOptionalPropertyTypes`; the rest destructure has exactly that type and keeps the public props untouched.
- **`spec/overview.md`'s `useSimulationSession` row and the two changesets were edited here, not left to 26-06,** as the orchestrator's note for this run directed and because gate 13 (`pnpm spec:api`) must be green at the end of the plan. Task 1 step 4's "26-06's" remark was superseded for those three files.

### Auto-fixed Issues

None: the plan executed without a failing check.

**Total deviations:** 0 auto-fixed, 3 wording departures.

## Issues Encountered

None. The devtools project, the `devtools-simulator` feature (after `tsc -b`, as 26-03 noted) and every gate passed on the first run.

## Known Stubs

None.

## Notes for 26-05 and 26-06

- 26-05: `DevtoolsDock.test.tsx` is byte-identical to the phase base; its 13 Model-class duplicates are still there to delete.
- 26-06: `spec/behaviors/28-devtools-screens.md:772` and `spec/invariants.md:3246` still name `useOwnedDockSession` in prose (the gates do not read them); `spec/overview.md:13`'s change history names `useOwnedSimulationSession` (history, exempt). `HeldChoice`'s overview row already exists (26-03).

## Verification

- `pnpm vitest run --project devtools`: 46 files, 1235 tests, `DevtoolsDock.test.tsx` unedited.
- `pnpm --filter @qadi/features exec vitest run features/devtools-simulator`: 20 tests; `pnpm test:bdd`: 34 files, 568 tests.
- `pnpm typecheck`, `pnpm lint` (exit 0, warnings only in files this plan did not touch), `pnpm lint:style` (454 files clean, no budget edit), `pnpm test:tstyche`, `pnpm circular`, `pnpm spec:api` (906 exports documented): all green.
- Plan labelled checks (Task 1 x2, Task 2 x2): all exit 0, no `FAIL` line. `git diff 7396491d -- packages/devtools/src/react/useScoped.ts` is empty.

## Self-Check: PASSED

- FOUND: `packages/devtools/src/react/useDockModel.ts`, this SUMMARY.
- FOUND: commits `689a1f04` and `7812541a` (ancestors of HEAD).
- `useOwned` appears nowhere in `packages/devtools/src` or `packages/devtools/test`.
