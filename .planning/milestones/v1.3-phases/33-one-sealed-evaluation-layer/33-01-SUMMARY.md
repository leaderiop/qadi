---
phase: 33-one-sealed-evaluation-layer
plan: 01
subsystem: testing
tags: [mutation-baseline, characterisation-pin, evaluation-environment, review-layer, simulation]
requires: []
provides:
  - "33-mutation-base.json: nothing measured at the base; six unmeasured touched src files with reasons; the new core module"
  - "packages/testing/test/QadiReviewLayer.test.ts: review layer passes an outer sink and cache through, mints eval-N ids, keeps the runtime clock"
  - "packages/devtools/test/model/ReviewSimulationConformance.test.ts: review layer and simulation agree on ids, fail-closed ports and clocks"
affects: [33-02, 33-03, 33-06]
tech-stack:
  added: []
  patterns: ["baseline JSON derived from stryker.config.mjs mutate globs, committed alone first", "characterisation pin green on the untouched base"]
key-files:
  created:
    - .planning/phases/33-one-sealed-evaluation-layer/33-mutation-base.json
    - packages/testing/test/QadiReviewLayer.test.ts
    - packages/devtools/test/model/ReviewSimulationConformance.test.ts
  modified: []
key-decisions:
  - "Baseline records the absence of a measured mutant rather than a score: the writer reads stryker.config.mjs and refuses any mismatch"
  - "Testing pin names no clock option; the conformance pin names the testing clock literal only on the one `clock: \"test\"` line 33-03 renames"
requirements-completed: [SEAL-03]
phase_base: a201e2fbc09660c3d49e56d8a1936d0ccc663a28
commits: 3
plan_head_before: a201e2fbc09660c3d49e56d8a1936d0ccc663a28
plan_head_after: 646ad991f0422adee4130bfaa17ff6a6cde4be76
actuals:
  tokens: 5000
  tasks: 3
  commits: 3
duration: 12 min
completed: 2026-11-12
status: complete
---

# Phase 33 Plan 01: Baseline and characterisation pins Summary

A mutation baseline derived from Stryker's own globs (nothing measured, one new module to be measured) and two vitest pins, green on the untouched base, that hold the review layer and a simulation to the same ids, fail-closed ports and clocks through the refactor.

## Reserved numbers

All ten (ARCH-81, ADR-QD-146, CCR-QD-424, BEH-QD-501..505, INV-QD-311..312) were free: no hit in spec, packages, .changeset, AGENTS.md, apps/website/src, and no `spec/decisions/146-*` file.

## Baseline JSON (writer output)

```json
{"measured":{},"unmeasured":{"packages/core/src/index.ts":"excluded by stryker.config.mjs mutate","packages/testing/src/QadiReviewLayer.ts":"outside stryker.config.mjs mutate (packages/core/src only)","packages/devtools/src/model/Simulation.ts":"outside stryker.config.mjs mutate (packages/core/src only)","packages/devtools/src/model/SimulationSession.ts":"outside stryker.config.mjs mutate (packages/core/src only)","packages/devtools/src/react/Simulator.tsx":"outside stryker.config.mjs mutate (packages/core/src only)","packages/devtools/src/index.ts":"outside stryker.config.mjs mutate (packages/core/src only)"},"new":["packages/core/src/EvaluationEnvironment.ts"]}
```

No Stryker run was made.

## Pin results (on the untouched base)

- `pnpm vitest run --project testing packages/testing/test/QadiReviewLayer.test.ts`: `Tests  4 passed (4)`
- `pnpm vitest run --project devtools packages/devtools/test/model/ReviewSimulationConformance.test.ts`: `Tests  4 passed (4)`

`pnpm typecheck` clean for both files; `pnpm lint` house-style clean (468 files); remaining oxlint warnings are pre-existing in unrelated files. Base agreement held on every port: no disagreement between the two layers was found.

## Commits

- cd00086e: chore(33-01): mutation baseline for the evaluation-environment files (33-mutation-base.json alone)
- 28f3237f: test(33-01): pin that the review layer leaves an outer sink and cache in effect (QadiReviewLayer.test.ts alone)
- 646ad991: test(33-01): pin that the review layer and a simulation agree (ReviewSimulationConformance.test.ts alone)

Each ends with the `Co-Authored-By: Claude Opus 5.5` trailer. No `packages/*/src` file changed.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Chained `Effect.provide` warning and `Decision.reason` type error in the new tests**
- **Found during:** Tasks 2 and 3
- **Issue:** the TS language service flagged `multipleEffectProvide` on the testing pin; the conformance pin read `.reason` on the `Decision` union before narrowing.
- **Fix:** the inner provide is bound to a const and the outer provide applied separately (same nesting, so the sink and cache are still provided around the review environment); the conformance test narrows to `Deny` before comparing reasons.
- **Files modified:** the two new test files (before their commits)
- **Commit:** 28f3237f, 646ad991

SEAL-03 is marked complete (the tool listed it ready); WX-05, WX-06 and SEAL-04 were reported blocked and finish with later plans of this phase.

## Known Stubs

None.

## Self-Check: PASSED

Three created files exist; the three commits are ancestors of HEAD; the first three `(33-0N)` commits are the baseline, the testing pin and the conformance pin, each carrying only its own file; `git diff a201e2fb..HEAD -- packages/*/src` is empty.
