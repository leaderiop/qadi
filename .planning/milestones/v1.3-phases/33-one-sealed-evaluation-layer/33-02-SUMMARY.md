---
phase: 33-one-sealed-evaluation-layer
plan: 02
subsystem: core
tags: [evaluation-environment, shadowing, seal, review-layer, simulation, test-helpers]
requires: [33-01]
provides:
  - "evaluationEnvironment, EvaluationEnvironmentOptions, EvaluationShadowing, EvaluationClock exported from @qadi/core"
  - "simulationLayer, qadiReviewLayer, testLayer and subjectSetLayer all built on the one builder"
affects: [33-03, 33-05, 33-06]
tech-stack:
  added: []
  patterns: ["required closed-union argument dispatched with Match.value + Match.exhaustive", "clock as an already-built Layer<never> so core never imports effect/testing"]
key-files:
  created:
    - packages/core/src/EvaluationEnvironment.ts
    - packages/core/test/EvaluationEnvironment.test.ts
    - packages/core/test/EvaluationEnvironment.tst.ts
  modified:
    - packages/core/src/index.ts
    - packages/devtools/src/model/Simulation.ts
    - packages/testing/src/QadiReviewLayer.ts
    - packages/core/test/helpers.ts
key-decisions:
  - "simulationLayer is annotated Layer.Layer<EvaluationServices>: it hides the shadowing services from its type; no caller reads them"
  - "No Layer.fresh wrapper: the private cache layer is created inside each builder call and Effect builds each provide under a forked memo map; the freshness test would fail otherwise"
requirements-completed: [SEAL-04]
phase_base: a201e2fbc09660c3d49e56d8a1936d0ccc663a28
commits: 2
plan_head_before: 4f7d91c371d7a92a22ea6f9d9b0a70b6e3e5f2d9
plan_head_after: ba8212594f61cffdb1a75606c2d42435109d0eb7
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
duration: 20 min
completed: 2026-11-12
status: complete
---

# Phase 33 Plan 02: One sealed evaluation environment Summary

`@qadi/core` now has one evaluation-environment builder with a required `shadow: "none" | "sinkAndCache"` argument; the simulation (`sinkAndCache`), the review layer and core's test helpers (`none`) are all built on it, and every INV-QD-042 seal test passes unchanged.

## Commits

- d8122f1c: feat(33-02): one sealed evaluation environment in core, the simulation built on it (tracer: module, barrel line, two core test files, `Simulation.ts`)
- ba821259: refactor(33-02): the review layer and core's test helpers built on the evaluation environment (`QadiReviewLayer.ts`, `helpers.ts`)

Both end with the `Co-Authored-By: Claude Opus 5.5` trailer (checked with `git log -1 --format=%B`).

## Results

- core builder: `Tests  7 passed (7)`; tstyche: `Tests: 6 passed`, `Assertions: 10 passed`
- devtools seal and conformance files (Simulation, SimulationSource, WhatIf, SimulationSession, ReviewSimulationConformance): `Tests  171 passed (171)`; full devtools project `1232 passed`
- testing `QadiReviewLayer.test.ts` pin: `Tests  4 passed (4)`
- full core + testing projects: `Tests  2208 passed (2208)`
- `pnpm build`, `pnpm typecheck`, `pnpm circular`, `pnpm lint` (house-style 470 files clean) green; oxlint warnings are pre-existing in unrelated files
- No testing or devtools test file changed since the 33-01 conformance pin commit. `pnpm spec:api` was not run (accepted red until 33-05).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Chained `Effect.provide` warning in the new core test**
- **Found during:** Task 1 (typecheck)
- **Issue:** the TS language service flagged `multipleEffectProvide` on the discarding-sink case.
- **Fix:** the inner provide is bound to a const and the outer applied separately (same nesting, so the capturing sink still sits outside the environment).
- **Files modified:** `packages/core/test/EvaluationEnvironment.test.ts` (before its commit)
- **Commit:** d8122f1c

**2. [Rule 1 - Bug] Module doc named `effect/testing`, tripping the plan's own check**
- **Issue:** the plan's verify scans the raw module text for `effect/testing`; the header comment spelled it out.
- **Fix:** reworded to "imports nothing from Effect's testing modules".
- **Commit:** d8122f1c

## Known Stubs

None.

## Threat Flags

None. The mitigations for T-33-03 to T-33-05 are in place and tested: required `shadow`, the discarding sink called directly, a private cache per build, `shadow: "none"` explicit in both the review layer and the helpers.

## Self-Check: PASSED

Created files exist; both commits are ancestors of HEAD; `git rev-list --count 4f7d91c3..HEAD` was 2 before this SUMMARY commit.
