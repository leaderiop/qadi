---
phase: QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws
plan: 02
subsystem: devtools-model-tests
tags: [regression-tests, red-first, listener-contract, dock-model, devtools]
requires:
  - phase: QD-81
    provides: 81-check.mjs (seen-failing, unchanged, scan-ids, scan-forbidden, commit) and phase_base
provides:
  - packages/devtools/test/model/DockModel.listeners.test.ts, DL1 to DL17, written and seen failing on the phase base
  - the `## 81-02` section of 81-RED-EVIDENCE.md, one line per title, and the base counts of a capacity-and-catalogue configure
affects: [81-04, 81-05, 81-06]
key-files:
  created:
    - packages/devtools/test/model/DockModel.listeners.test.ts
  modified:
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: every row but the timeline's and the dock's runs from two starting capacities, 5 (moved to 3) and 3 (left where it was), because with a moved capacity the dock's own timeline listener hands the sightings to the explorer and the simulation before the catalogue step and that step mends a throw there, so the explorer and simulation rows are green on the base from 5 alone; the unmoved run is the one that reproduces the defect"
  - "Decided autonomously: the new source yields once before it answers, so its records arrive after configure has returned; a source whose backlog is delivered inside the fork puts the first record's notification inside the read, where a throw from any listener kills the read in the fix as well"
  - "The two throwing rows, a timeline listener and a dock listener, run from capacity 5 alone: only a moved capacity gives them a notification inside configure"
requirements-completed: [COLL-01, COLL-02, COLL-04, COLL-05, WX-06, WX-07]
duration: 55min
completed: 2026-11-24
status: complete
commits: 1
plan_head_before: 7dc1a551306ea07882643d86f14704704b582247
plan_head_after: a855e00b74284ee67d495a874bd9b95f611a56e7
actuals:
  tokens: 6500
  tasks: 3
  commits: 1
coverage:
  - id: D1
    description: "DL1 to DL10: one throwing listener per store of the dock model, one configure moving all eight inputs, every input read back after the poll sampled, the thrown value by identity and an identical configure that changes nothing"
    requirement: COLL-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL1 to DL10 (red on the base: DL3 to DL9; green characterisations DL1, DL2, DL10)"
        status: fail
    human_judgment: false
  - id: D2
    description: "DL11 to DL14: the store sweep, two throwers as one AggregateError in step order with the exact message, and the undefined and null throws"
    requirement: COLL-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL11 to DL14 (red on the base: DL12 to DL14; DL11 a green characterisation)"
        status: fail
    human_judgment: false
  - id: D3
    description: "DL15 the record path, DL16 the rail publishes once, DL17 the nested configure, all red on the base"
    requirement: COLL-02
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL15, DL16, DL17"
        status: fail
    human_judgment: false
  - id: D4
    description: "81-RED-EVIDENCE.md names the failing assertion of every red title and a scratch failure for every green one, and records the base counts"
    requirement: WX-06
    verification:
      - kind: command
        ref: "node 81-check.mjs seen-failing packages/devtools/test/model/DockModel.listeners.test.ts"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 02: the dock model's listener tests, written and seen red Summary

Seventeen tests (DL1 to DL17) pin the dock model's listener contract on the untouched phase base: one throwing listener on
each of the ten stores, two throwers, a thrown `undefined` and `null`, the record path, the rail's publish count and a
nested `configure`. Thirteen fail on the base for the reason each states and four pass and were shown failing once by a
scratch edit; no file under `packages/devtools/src` changed.

phase_base: e757ef370731c8388de9924e6ad1744cd6363e89

## Performance

- **Duration:** about 55 min (2026-11-24)
- **Tasks:** 3 (one tracer, two auto)
- **Files created:** 1 test file; 1 evidence file extended
- **Commits:** `a855e00b` (the test file and the evidence, one commit)

## Accomplishments

- `DockModel.listeners.test.ts` builds each row from one `throwingRow(store)`: a model at capacity 5 or 3 on a source whose
  live stream dies (timeline status `Stopped`), a throw-once listener on the store, one `configure` moving all eight inputs,
  then every input read back after the poll sampled (capacity, entries, status `Reading`, roles, the rail shared by the
  explorer, the simulation and `sightings()`, the dock's rows, the handed ports through the `Live` source option, the
  registry and thunk through the questions join, the poll sampling the collector, the supplied reading merged, the
  services row), the thrown value by identity, and an identical fresh literal changing nothing.
- DL12 pins the two-throwers row to `[timelineBoom, rolesBoom]` and the exact message `More than one step of the dock's
  configure threw.`; DL13 and DL14 pin `undefined` and `null` rethrown as themselves.
- DL15 (always-throwing explorer, two `timeline.accept`s), DL16 (the publish counts of a capacity-and-catalogue
  `configure`) and DL17 (a roles listener that calls `configure` from inside a step, compared field by field with a fresh
  model) are red on the base.

## Base results

Red on the base (13): DL3 roles, DL4 explorer, DL5 simulation, DL6 diagnostics, DL7 timelineStatus, DL8 questions, DL9
services, DL12 two throwers, DL13 undefined, DL14 null, DL15 record path, DL16 rail count, DL17 nested `configure`.

Green on the base, characterisations shown failing once by a copy-backed scratch edit (4): DL1 timeline, DL2 dock, DL10
lens, DL11 store sweep.

- DL1 green (characterisation)
- DL2 green (characterisation)
- DL3 red
- DL4 red
- DL5 red
- DL6 red
- DL7 red
- DL8 red
- DL9 red
- DL10 green (characterisation)
- DL11 green (characterisation)
- DL12 red
- DL13 red
- DL14 red
- DL15 red
- DL16 red
- DL17 red

base counts (capacity and catalogue): timeline 1, dock 1, explorer 2, roles 1, simulation 2, diagnostics 0, timelineStatus 0, questions 0, services 0, lens 0

DL16 asserts the same counts with the explorer and the simulation at 1, so it is red on the base exactly on those two.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's single scenario leaves the explorer and simulation rows green on the base**
- **Found during:** Task 1 (the tracer's first run: DL4 passed on the base)
- **Issue:** a `configure` that moves the capacity makes the dock's own timeline listener deliver the explorer's and the
  simulation's first notification, and the catalogue step that follows spreads again and applies the rest, so a throw-once
  listener on either store leaves every input applied. The defect shows only when the first notification lands in the
  catalogue step, which needs the capacity left where it was. A second finding: a source that hands its records inside the
  fork puts the first record's notification inside the read, where the throw kills the read in the fix as well.
- **Fix:** `throwingRow` runs each store from capacity 5 (moved to 3) and from capacity 3 (left); the timeline and dock
  rows run from 5 alone; the new source yields once before it answers; the dying source's record sits at time 50 so the
  unmoved run reads `x, a, b` in order. Expectations were not weakened: the unmoved run asserts the same eight inputs.
- **Files modified:** packages/devtools/test/model/DockModel.listeners.test.ts
- **Verification:** DL4 red on the base from capacity 3 and green from capacity 5 (checked by running it from 5 alone)
- **Commit:** a855e00b

**Total deviations:** 1 auto-fixed (1 scenario correction). **Impact:** none on scope; the file holds the seventeen titles the
plan names, with two starting capacities inside the rows that need both.

## Issues Encountered

None beyond the deviation above.

## Known Stubs

None.

## Next Phase Readiness

Ready for 81-03 (the held tests flipped and retitled). 81-04 to 81-06 are judged by these rows.

## Self-Check: PASSED

The test file and the evidence file exist, commit `a855e00b` is an ancestor of HEAD, the measured commit count is 1, and no file under `packages/devtools/src` differs from `phase_base`.
