---
phase: QD-81
plan: 06
subsystem: devtools-model
tags: [dock-model, callAll, derived-store, sightings-rail, configure, devtools]
requires:
  - phase: QD-81
    provides: callAll and the feeds' publish-then-fork windows closed (81-04, 81-05), DL1 to DL17 and the pinned check (81-02, 81-03)
provides:
  - the sightings rail as the dock model's fourth derived store (RailKey over the timeline and the held catalogue), moving once per change
  - configure as seven steps through callAll, each reading held when it runs, with "More than one step of the dock's configure threw."
  - CR22 restated from the measured counts
  - the DockModel header and docs restated
affects: [81-07, 81-08, 81-09, 81-10]
key-files:
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/ConfigureRule.test.ts
    - packages/devtools/test/model/DockModel.listeners.test.ts
    - .planning/phases/QD-81-the-dock-model-applies-every-input-whatever-a-listener-throws/81-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: CR22's building and built records were restated from the measurement, the explorer and the simulation falling from 3 to 2 in both and nothing else moving, so the assertion is rewritten (not left untouched) and the flip recorded"
  - "Decided autonomously: DL15's expected rail order was swapped to newest first (a test authoring slip, the rail has always been newest first) and committed on its own"
requirements-completed: [COLL-01, COLL-02, COLL-03, COLL-04, COLL-05, COLL-06, WX-04, WX-07]
duration: 12min
completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 79ae942875eef461131f034f70ee75539539f48a
plan_head_after: 6de35d7fe2ce001edb63e1c251fbd19b73dbf5dc
actuals:
  tokens: 9000
  tasks: 3
  commits: 2
coverage:
  - id: D1
    description: "Every dock input is applied whatever a listener throws, on configure and on the record path, and the rail moves once per change"
    requirement: COLL-01
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/DockModel.listeners.test.ts#DL1 to DL17"
        status: pass
    human_judgment: false
  - id: D2
    description: "CR22 restated from the measured counts, flip recorded, pinned check passes with all four declared flips applied"
    requirement: COLL-04
    verification:
      - kind: command
        ref: "node 81-pinned-check.mjs --all-applied"
        status: pass
    human_judgment: false
  - id: D3
    description: "One collect loop, in callAll; the whole devtools project, the typecheck, house-style and oxlint pass"
    requirement: WX-04
    verification:
      - kind: command
        ref: "node 81-check.mjs single-source; pnpm exec vitest run --project devtools; pnpm typecheck"
        status: pass
    human_judgment: false
---

# Phase QD-81 Plan 06: The dock Summary

The sightings rail is now a derived store over the timeline and `configure` runs seven idempotent steps through `callAll`, so a throwing listener on any store skips no later step and the explorer and the simulation hear each change once.

## Accomplishments

- `RailKey { shown, catalogue }` and a `makeDerivedStore` built right after the timeline feed; the explorer's and the simulation's `setSightings` are its two listeners, then `dock.setTimeline` on the timeline. `spread`, the `shown` and `rail` closure variables and the identity-guarded timeline listener are deleted; `sightings` reads the rail's snapshot. The rail is not a `DockModel` member, so the ten-store list is unchanged.
- `configure`: `completeDockInputs` outside the collector, then `callAll` over the timeline feed, `rail.refresh()`, the roles list, the simulation's ports, the gates feed, the diagnostics feed and the shown reading, in that order, each reading `held` when it runs. No `before`, no catalogue comparison, no `try`.
- The header, the `sightings` doc and the `configure` doc restated: four derived stores, seven steps, throws rethrown after the last step.
- CR22 retitled and restated; flip recorded in `81-RED-EVIDENCE.md`.

## Measured counts

- CR22 building after the change: timeline 2, dock 2, explorer 2, simulation 2, roles 0, diagnostics 1, timelineStatus 0, questions 2, services 1, lens 0 (before: explorer 3, simulation 3).
- CR22 built after the change: timeline 2, dock 2, explorer 2, simulation 2, roles 0, diagnostics 2, timelineStatus 0, questions 3, services 2, lens 0 (before: explorer 3, simulation 3).
- after counts (capacity and catalogue): timeline 1, dock 1, explorer 1, roles 1, simulation 1, diagnostics 0, timelineStatus 0, questions 0, services 0, lens 0

Only the explorer and the simulation moved in CR22; no other count changed, so nothing needed explaining beyond the rail's two listeners. Devtools `Tests` line: 87 files, 1934 passed (1934).

## Task Commits

1. Tracer and Task 2 together: `6de35d7f` fix(81-06): the dock model applies every input whatever a listener throws (`DockModel.ts`, `ConfigureRule.test.ts`, `81-RED-EVIDENCE.md`)
2. `4341c046` test(81-06): the record-path test lists the rail newest first (`DockModel.listeners.test.ts`)
3. Task 3 verification only; no source change.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DL15 expected the rail oldest first**
- **Found during:** Task 1 (tracer verify)
- **Issue:** DL15 asserted `[canRead, canWrite]` after two accepts; `policiesSeen` walks the timeline newest first, so the correct rail is `[canWrite, canRead]`. The test had only ever been seen red (on the base), never green.
- **Fix:** swapped the two expected rows; the assertion that the explorer and the simulation hold the model's rail is untouched. DL15 is not in the pinned check's held set.
- **Files modified:** `packages/devtools/test/model/DockModel.listeners.test.ts`
- **Commit:** 4341c046

**2. [Plan wording] Task 1 and Task 2 committed together**
- Task 1 carries no commit step; the code, CR22, the docs and the evidence went in one commit as Task 2 states, so the pinned and single-source checks held on the commit.

**Total deviations:** 1 auto-fixed (1 test bug). **Impact:** none on the code under test.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `packages/devtools/src/model/DockModel.ts`, `ConfigureRule.test.ts`, `81-RED-EVIDENCE.md`: found
- commits `6de35d7f`, `4341c046`: found on `arch-wave-15`
- `81-pinned-check.mjs --all-applied`: 4 of 4 flips applied; `81-check.mjs single-source`, `scan-ids`, `scan-forbidden`, `commit`: pass
- devtools project 1934 passed, `pnpm typecheck`, house-style (3 declared switches, 77 type-test files) and oxlint clean
