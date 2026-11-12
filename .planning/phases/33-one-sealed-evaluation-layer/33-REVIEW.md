---
phase: 33-one-sealed-evaluation-layer
reviewed: 2026-11-12T16:10:00Z
depth: standard
files_reviewed: 19
files_reviewed_list:
  - packages/core/src/EvaluationEnvironment.ts
  - packages/core/src/index.ts
  - packages/core/test/EvaluationEnvironment.test.ts
  - packages/core/test/EvaluationEnvironment.tst.ts
  - packages/core/test/helpers.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/Simulation.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/test/model/ReviewSimulationConformance.test.ts
  - packages/devtools/test/surface.tst.ts
  - packages/testing/src/QadiReviewLayer.ts
  - packages/testing/test/QadiReviewLayer.test.ts
  - packages/testing/test/TestLayers.test.ts
  - .changeset/sealed-evaluation-environment-core.md
  - .changeset/sealed-evaluation-environment-devtools.md
  - .changeset/sealed-evaluation-environment-testing.md
  - apps/website/src/content/docs/docs/packages/testing.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase 33: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 19
**Status:** issues_found

## Summary

No blocker or warning found. The seal holds. `evaluationEnvironment` puts `shadowing(...)` last in
`Layer.mergeAll`, so a later-wins context merge means neither a ports layer nor a clock layer can
re-expose an outer sink or cache. `decisionCacheLayer()` is called once per `evaluationEnvironment`
call and built fresh on every `Effect.provide`, which the "every build gets a private cache" test
proves with two different policies (`[1, 1]`, outer cache 0). The sink and cache tests provide the
real sink and cache around the environment, not inside it, so they are not vacuous.

`simulationLayer` services are unchanged for every source mode: same `sim` prefix, same ports, same
subject layer, same sink and cache shadowing. The clock behaves identically for the two typed values.
The two clock maps agree: both send `"deterministic"` to `TestClock.layer()` and everything else to
`Layer.empty`. Only the unreachable untyped-value default differs from the old devtools code, where an
unknown value used to select `TestClock`. The house rules are met: `pnpm typecheck` and the
`check-house-style.mjs` and `check-api-surface.mjs` scripts are clean. The `--project core`, `--project testing` and
`--project devtools` vitest runs pass. `pnpm lint` reported warnings only, none in the reviewed
files. No remaining `clock: "test"` or `SimulationClock` outside history (CHANGELOG, CCR rows, ADR-146, the spec
notes marked "until CCR-QD-424", and the upgrade note's "Before" block).

Three minor prose and test-strength items follow.

## Info

### IN-01: New test comments claim `it.effect`'s `TestClock` would make a live-clock read zero, which is not what the assertion reads

**File:** `packages/core/test/EvaluationEnvironment.test.ts:146`, `packages/testing/test/QadiReviewLayer.test.ts:80`, `packages/devtools/test/model/ReviewSimulationConformance.test.ts:112`
**Issue:** The comments say `it.effect` supplies a `TestClock`, "under which a live clock would read
zero too", as the reason for `it.live`. The assertions read `Context.get(builtContext, Clock.Clock)`.
A built `Layer.empty` context has no `Clock` entry, so `Clock` (a `Context.Reference`) resolves to its
real default regardless of the ambient fiber clock. The pre-existing
`packages/devtools/test/model/Simulation.test.ts:260-267` asserts the same live `> 0` under `it.effect` and
passes. `it.live` is harmless, but the stated reason is wrong, and a reader will be misled about what
the test isolates.
**Fix:** Either drop the claim or restate it truthfully, for example: "`it.live` so the evaluation
reads no ambient `TestClock`; the `Context.get` reads the layer's own contribution, and
`Layer.empty` contributes none, so the default real clock answers."

### IN-02: `durationMillis === 0` assertions cannot tell a deterministic clock from a live one

**File:** `packages/core/test/EvaluationEnvironment.test.ts:154-159`, `packages/devtools/test/model/ReviewSimulationConformance.test.ts:138-141`
**Issue:** Under `it.live` a trivial in-memory evaluation also measures 0 ms (the existing
`Simulation.test.ts` comment at about line 242 says so explicitly). The `durationMillis` assertions
therefore pass whichever clock layer is built. The `Context.get(...) === 0` assertions just above them
carry the proof, so the test is not vacuous overall, but the `evaluate` leg does not show that
`evaluate` reads the environment's clock.
**Fix:** Either drop those two assertions, or keep them and note that they are consistency checks only.
`TestLayers.test.ts`'s `TestClock.adjust` case already proves an evaluation reads the provided clock.
If a stronger check is wanted, `yield* TestClock.adjust(...)` inside the provided effect and read
`Clock.currentTimeMillis`, as that case does.

### IN-03: `SimulationSource` prose says the seal is "supplied" in `simulationLayer`

**File:** `packages/devtools/src/model/SimulationSource.ts:18-21`, `packages/devtools/test/model/SimulationSource.test.ts:6`
**Issue:** "The seal lives in `simulationLayer`, not here: `CurrentSubject`, `DecisionSink` and
`DecisionCache` are supplied there in every mode." After this phase `simulationLayer` supplies only
`CurrentSubject`. It states `shadow: "sinkAndCache"` to core's `evaluationEnvironment`, which supplies the sink and
cache. Still true as intent, but no longer literally accurate. `Simulation.ts` and `spec/invariants.md`
INV-QD-042 were updated; these two spots were not. (Line 114 is the known `@qadi/testing` mention and is
not raised.)
**Fix:** "The seal is stated in `simulationLayer`, which supplies `CurrentSubject` and asks core's
`evaluationEnvironment` for `shadow: "sinkAndCache"`; so no source ... reach ...". Same wording in the
test header.

---

_Reviewed: 2026-11-12T16:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
