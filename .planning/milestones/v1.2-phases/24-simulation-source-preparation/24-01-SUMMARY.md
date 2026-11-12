---
phase: 24-simulation-source-preparation
plan: 01
subsystem: testing
tags: [devtools, simulation, tdd, stryker, vitest, effect]

requires:
  - phase: 23-sink-record-fields-stated-once
    provides: closed phase base (965ff14c lineage), WX conventions
provides:
  - one-recorder-per-run characterisation test (green on the phase base)
  - prepareSource table test over all 12 (choice x ports x capture) combinations, red by absence
  - per-file mutation baseline for SimulationSource.ts and SimulationSession.ts
affects: [24-02, 24-03]

actuals:
  tokens: 1983
  tasks: 2
  commits: 2

commits: 2
plan_head_before: 2c24f19d0c71f583181f0bb5a561ff26544aeaa9
plan_head_after: d998f7e3cd64cf1fb07cd3179a6cf13a188f2f9e
reserved_numbers_free: true

tech-stack:
  added: []
  patterns: ["red-by-absence test in its own file so neighbouring suites stay green"]

key-files:
  created:
    - packages/devtools/test/model/SimulationSource.prepare.test.ts
    - .planning/phases/24-simulation-source-preparation/24-mutation-base.json
  modified:
    - packages/devtools/test/model/SimulationSession.test.ts

key-decisions:
  - "Red test is red by absence (prepareSource not exported); no defect exists, so no RED-on-base regression test (D-01)"

patterns-established:
  - "Mutation baseline is measured before any src change and stored as JSON beside the phase"

requirements-completed: [SRC-01, SRC-02, SRC-03, WX-02, WX-05, WX-06]

coverage:
  - id: D1
    description: "A second Live run's capture holds only what that run asked (one recorder per run)"
    requirement: SRC-02
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSession.test.ts#a second Live run's capture holds only what that run asked"
        status: pass
    human_judgment: false
  - id: D2
    description: "prepareSource table test over 12 combinations, committed red"
    requirement: SRC-03
    verification:
      - kind: unit
        ref: "packages/devtools/test/model/SimulationSource.prepare.test.ts#prepares every (choice x ports x capture) combination (ARCH-72)"
        status: fail
    human_judgment: true
    rationale: "Red by design until 24-02 adds prepareSource; the verifier should confirm it turns green there."
  - id: D3
    description: "Mutation baseline recorded and reserved numbers confirmed free"
    requirement: WX-05
    verification:
      - kind: other
        ref: ".planning/phases/24-simulation-source-preparation/24-mutation-base.json"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 24 Plan 01: Simulation source preparation, setup Summary

**Mutation baseline (Session 96.19%, Source 94.44%), a green one-recorder-per-run characterisation test, and a 12-row `prepareSource` table test committed red-by-absence.**

## Performance

- **Duration:** about 8 min
- **Completed:** 2026-11-11T06:00:14Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified); no file under `packages/*/src`

## Accomplishments
- Reserved numbers ARCH-72, ADR-QD-136, CCR-QD-414, BEH-QD-455..459, INV-QD-292..293 confirmed unused in `spec`, `packages`, `.changeset`, `AGENTS.md`; `spec/decisions` has no `136-*` (WX-02). `next-id.mjs` was not run.
- Per-file Stryker baseline at the phase base (before any src change), recorded in `24-mutation-base.json` (WX-05): `SimulationSession.ts` 0.9619 (353 killed, 14 survived), `SimulationSource.ts` 0.9444 (17 killed, 1 survived); overall 96.10.
- Characterisation test: a session over two sightings with real ports, Live source; after the first and second policy runs `answerCount(capture)` is 1 both times, so each Live run captures with its own recorder (T-24-01). Green on the base.
- `SimulationSource.prepare.test.ts`: 12-row table (3 choices x ports x capture), the six option sentences, and a `simulate`-driven check that two Live preparations record alone.

## Task Commits

1. **Task 1: numbers free, mutation baseline, characterisation test** - `504ee3fd` (test)
2. **Task 2: RED, prepareSource's table** - `d998f7e3` (test)

## TDD Gate Compliance

RED: `SimulationSource.prepare.test.ts` (3 tests) fails with `TypeError: prepareSource is not a function` at the first call in each test (vitest does not typecheck, so the missing named export surfaces at call time rather than at load). Semantic assessment: each target test executes and fails because the planned seam does not exist, not through a typo or fixture fault; the planned assertions are never reached, which is the only way a new seam can be red (D-01). The formal `gsd_run check tdd-red-evidence` classifier was not run: the plan's own verify (nonzero exit, failure names `prepareSource`, neighbouring suites green) was used. GREEN and REFACTOR belong to 24-02 by design; this plan is the RED half.

## Decisions Made

None beyond the plan. Note for 24-02: the new test file does not typecheck until `prepareSource`/`SourceChoice` are exported from `SimulationSource.ts` (red by absence); `pnpm typecheck` will be red between this plan and 24-02.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. Stryker's sandbox was created before the new test edits (initial dry run of 327 tests finished before the test file was touched), so the baseline is the true phase base.

## Known Stubs

None.

## Next Phase Readiness

24-02 can move the rule into `SimulationSource.ts` and turn `SimulationSource.prepare.test.ts` green; compare mutation against `24-mutation-base.json` afterwards.

## Self-Check: PASSED

- FOUND: packages/devtools/test/model/SimulationSource.prepare.test.ts, 24-mutation-base.json, SimulationSession.test.ts change
- FOUND commits: 504ee3fd, d998f7e3
- No `packages/*/src` file in this plan's commits

---
*Phase: 24-simulation-source-preparation*
*Completed: 2026-11-11*
