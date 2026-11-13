---
phase: 33-one-sealed-evaluation-layer
plan: 03
subsystem: testing-devtools
tags: [clock, vocabulary, breaking, evaluation-clock]
requires: [33-02]
provides:
  - "@qadi/testing TestLayerOptions.clock typed EvaluationClock (live | deterministic)"
  - "@qadi/devtools reads EvaluationClock; SimulationClock removed"
affects: [33-05, 33-06]
tech-stack:
  added: []
  patterns: ["one literal-to-layer map per package, annotated Layer.Layer<never>"]
key-files:
  modified:
    - packages/testing/src/QadiReviewLayer.ts
    - packages/testing/test/TestLayers.test.ts
    - packages/devtools/test/model/ReviewSimulationConformance.test.ts
    - packages/devtools/src/model/Simulation.ts
    - packages/devtools/src/model/SimulationSession.ts
    - packages/devtools/src/react/Simulator.tsx
    - packages/devtools/src/index.ts
    - packages/devtools/test/surface.tst.ts
key-decisions:
  - "Both clock maps are annotated Layer.Layer<never>; the old 'deliberately unannotated' argument is dropped"
  - "EvaluationClock is not re-exported from devtools; callers import it from @qadi/core"
requirements-completed: [SEAL-05]
phase_base: a201e2fbc09660c3d49e56d8a1936d0ccc663a28
commits: 2
plan_head_before: 274936d358528bf485cec6d458d5475fee0dd327
plan_head_after: f8c9c10f819c9659c1f96ce4154f09bdb4ad71d9
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
duration: 12 min
completed: 2026-11-12
status: complete
---

# Phase 33 Plan 03: One clock vocabulary Summary

`@qadi/testing` and `@qadi/devtools` now both take core's `EvaluationClock` ("live" | "deterministic"); the testing literal and `SimulationClock` are gone, each package keeps one annotated map to a layer.

## Commits

- d0d8ca65: refactor(33-03): @qadi/testing's clock option takes the shared evaluation clock (3 files)
- f8c9c10f: refactor(33-03): @qadi/devtools reads the shared evaluation clock; SimulationClock removed (5 files)

Both end with the `Co-Authored-By: Claude Opus 5.5` trailer (checked). Both are Breaking for their package (33-05 records it).

## Results

- testing: `TestLayers.test.ts` + `QadiReviewLayer.test.ts` `Tests  39 passed (39)`; full testing project `46 passed`
- devtools: conformance `Tests  4 passed (4)`; full devtools project `1232 passed`
- tstyche: `Tests: 252 passed`, `Assertions: 512 passed`
- `pnpm build`, `pnpm typecheck`, `pnpm lint` (house-style 470 clean), `pnpm circular` green
- The two test files differ from the review-rebuild commit only by the exact `clock: "test"` to `clock: "deterministic"` substitution; `surface.tst.ts` lost exactly one line.
- `packages/devtools/package.json` unchanged since the phase base; no `effect/testing` in core src.
- No caller outside `packages/` needed the rename (features/ and examples/ clean). Remaining mentions of the old names are in `spec/` (`overview.md`, `devtools-spec/02-screens.md`, `behaviors/29-devtools-simulator.md`) and two CHANGELOGs (history); 33-04/33-05 own them. `pnpm spec:api` not run (accepted red until 33-05).

## Deviations from Plan

**1. [Verify false positive] Task 2's `@qadi/testing` grep matches a doc comment**
- `packages/devtools/src/model/SimulationSource.ts:114` has a pre-existing comment ("Not `@qadi/testing`'s: ..."); the plan's naive grep over devtools src flags it though nothing imports the package. Verified by hand that no devtools src file imports `@qadi/testing` (only the devDependency in package.json, unchanged). The comment was left as is: the file is outside the plan's file set.

## Known Stubs

None.

## Threat Flags

None. T-33-07 (test edits limited to the literal) and T-33-08 (no new devtools dependency on testing, no `effect/testing` in core) hold.

## Self-Check: PASSED

Both commits are ancestors of HEAD; `git rev-list --count 274936d3..HEAD` was 2 before this SUMMARY commit.
