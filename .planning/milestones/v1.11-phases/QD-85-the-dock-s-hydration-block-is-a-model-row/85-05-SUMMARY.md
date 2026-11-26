---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 05
subsystem: devtools
tags: [dock-model, derived-store, hydration-view, store-pins, seen-failing]
requires:
  - phase: QD-85
    provides: "85-04: hydrationView and HydrationInput; 85-02: 85-check.mjs three-predicates; 85-03: the pinned-file check"
provides:
  - "packages/devtools/src/model/DockModel.ts: DockModel.hydration, the eleventh store and fifth derived store, parents [shownReading], key { hydration: reading.hydration, unsampled }, compute hydrationView; shownInputOf, the one module-scope reader of the shown snapshot that the services and hydration keys share"
  - "M57, DL21 and the eleven-name sweeps in DockModel.test.ts, ConfigureRule.test.ts and DockModel.listeners.test.ts, with CR22's counts read from the run"
  - "85-RED-EVIDENCE.md: the 85-05 section (M57 red on the base, then M57, CR22, DL11, the member list, DL21 and three-predicates each seen failing)"
affects: [85-06, 85-07, 85-09, 85-10]
tech-stack:
  added: []
  patterns:
    - "Two derived stores keyed off one shared function declaration that turns the shown snapshot into { reading, unsampled }, with the questions key keeping its own guard"
key-files:
  created: []
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/DockModel.test.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - packages/devtools/test/model/DockModel.listeners.test.ts
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: shownInputOf takes the DiagnosticsSnapshot and returns the named ShownInput { reading: Diagnostics, unsampled }, an interface rather than an inline literal, so the checker's function-body reading is not confused by a return type that is also a block"
  - "Decided autonomously: CR22's hydration counts are 1 while the poll layer is building and 2 once built, so the title now says one more on four stores; both read from the red run, matching Research A1"
  - "Decided autonomously: DL21 is heard: true, matching Research A4, because the configure's own reading moves hydration from Unwired to Counts"
  - "Decided autonomously: DL16's literal heard object gained hydration: 0, a pin the plan did not list but which the eleven-name sweep makes necessary"
requirements-completed: [HYDV-03, HYDV-05, WX-04, WX-06]
status: complete
duration: 15min
completed: 2026-11-25
commits: 2
plan_head_before: 3740ae4aff49b1dce275747f99a67dccd2d2fa8a
plan_head_after: 25973921b80fbcdf68ef2275699d2e69e26d5bf4
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "model.hydration serves the hydration view as a derived store keyed by the reading's counts and the unsampled flag by identity, Unwired on a bare model, Pending while the poll layer builds and Counts for supplied counts, from the first snapshot"
    requirement: HYDV-03
    verification:
      - kind: test
        ref: "packages/devtools/test/model/DockModel.test.ts#M57"
        status: pass
      - kind: other
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs three-predicates"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every place that names the dock's stores says eleven and names hydration, and a throwing hydration listener leaves every configure input applied"
    requirement: HYDV-05
    verification:
      - kind: test
        ref: "packages/devtools/test/model/ConfigureRule.test.ts#CR22"
        status: pass
      - kind: test
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL21"
        status: pass
    human_judgment: false
  - id: D3
    description: "M57, CR22, DL11, the member-list test, DL21 and three-predicates are each seen failing under one scratch edit of the store or its key"
    requirement: WX-06
    verification:
      - kind: other
        ref: ".planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md#85-05"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 05: The dock model serves the hydration view Summary

`DockModel.hydration` is the model's eleventh store and fifth derived store: `hydrationView` over the shown reading, recomputed
only when the reading's counts or the unsampled flag change identity, with the services and hydration keys reading one shared
function declaration and the questions guard untouched. Nothing renders it yet; 85-07 switches the panel to it.

## Performance

- **Duration:** about 15 min
- **Completed:** 2026-11-25
- **Tasks:** 2 (a tracer and an auto task)
- **Files:** 4 source and test files modified, 1 evidence file appended

## Accomplishments

- `DockModel.ts` gains `hydration` after `services` in the interface (with its doc comment), the store built with
  `makeDerivedStore` directly after `services` and before any host listener, and the member in the returned model. The header
  now says five derived stores and names `hydration`. `configure` is unchanged at seven steps; the store is notified inside
  step 7's existing `callAll` (T-85-09).
- `shownInputOf(snapshot)` is a module-scope function declaration returning `{ reading, unsampled: isUnsampled(status) }`;
  the services key and the hydration key both read it, so `isUnsampled` is called twice in the file (the questions guard and
  the reader) and `three-predicates` passes. The hydration key reads `reading.hydration` by reference, no copy or spread
  (T-85-10).
- M57 pins `Unwired` on a bare model, `Pending` while the poll layer is still building and `Counts` for supplied counts, from
  the first snapshot. It was seen red on the base (the member did not exist) before the store was written.
- Every store-name pin moved in the same commit: the sweeps in `ConfigureRule.test.ts` (`storesOf`, `storeNames`,
  `snapshotsOf`, `heardOnEach`, `silent`), CR22 (hydration 1 while building and 2 once built, title now "one more on four
  stores"), `DockModel.listeners.test.ts` (`storesOf`, `storeNames`, `stateOf`, DL16's literal, and DL21 after DL20 with
  `heard: true`) and the member list in `DockModel.test.ts`.
- Each new pin was seen failing under one scratch edit and restored with `cp`: a compute that always says Unwired fails M57;
  empty parents fail CR22 (with DL21 and M57); leaving `hydration` out of the returned model fails DL11 and the member list
  (and 19 other tests); a constant key fails DL21 on `heard` (with CR22 and M57); the services key calling `isUnsampled`
  itself fails `three-predicates`.
- Verified: the whole devtools project (1998 tests), the held QuestionsPanel characterisations, `85-pinned-check.mjs`,
  `scan-forbidden`, `scan-ids`, `tsc -p tsconfig.test.json`, `pnpm lint` (house style clean) and `pnpm circular` pass.

## Task Commits

1. **Task 1 (tracer): the hydration store and every store-name pin** - `feat(85-05): the dock model serves the hydration view` (`4fc5d20b`)
2. **Task 2: the store pins seen failing** - `docs(85-05): record the store pins seen failing` (`25973921`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The shared reader's reading type is `Diagnostics`, not `DiagnosticsReading`**
- **Found during:** Task 1, typecheck
- **Issue:** The snapshot's `reading` is `Diagnostics` (its `hydration`, `wiring` and `activity` may be undefined);
  typing `ShownInput.reading` as `DiagnosticsReading` failed `exactOptionalPropertyTypes`.
- **Fix:** `ShownInput.reading: Diagnostics`, with `Diagnostics` imported as a type.
- **Files modified:** `packages/devtools/src/model/DockModel.ts`
- **Commit:** `4fc5d20b`

**2. [Rule 1 - Bug] DL16 pinned a literal ten-store object**
- **Found during:** Task 1, the listeners run after the sweeps moved
- **Issue:** DL16's expected object listed ten names, so the eleven-store sweep made it fail for a missing key.
- **Fix:** `hydration: 0` added (a capacity and catalogue move does not touch the hydration store).
- **Files modified:** `packages/devtools/test/model/DockModel.listeners.test.ts`
- **Commit:** `4fc5d20b`

**3. [Rule 3 - Blocking] M57 formatted on one line**
- **Found during:** Task 1 verify gate
- **Issue:** The plan's verify greps `it.effect("M57: ` on one line, and the first draft broke after `it.effect(`.
- **Fix:** The row is written as `it.effect("M57: …", () =>` like the DL rows; the commit was amended before anything else
  built on it.
- **Files modified:** `packages/devtools/test/model/DockModel.test.ts`
- **Commit:** `4fc5d20b`

**Total deviations:** 3 auto-fixed (1 bug, 2 blocking). **Impact:** none on the plan's shape; no `configure` step or module-scope
arrow const was added, and no held file moved.

The tracer feedback gate re-ran the task's `<verify>` end to end and passed: tracer verified, expanding.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-85-09 is pinned by DL21 and T-85-10 by `three-predicates` (reading by reference, no spread).

## Issues Encountered

None.

## Next Phase Readiness

Ready for 85-06. The panel still renders its own decision; 85-07 switches it to `model.hydration`.

## Self-Check: PASSED

- `packages/devtools/src/model/DockModel.ts`, the three test files and `85-RED-EVIDENCE.md` exist and hold the changes above.
- Commits `4fc5d20b` and `25973921` are ancestors of HEAD; the first holds exactly `DockModel.ts` and the three pin files.
- `git status --porcelain -- packages` is clean; no `.vitest/` directory is left.
