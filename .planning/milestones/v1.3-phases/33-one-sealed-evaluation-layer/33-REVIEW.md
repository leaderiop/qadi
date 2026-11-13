---
phase: 33-one-sealed-evaluation-layer
reviewed: 2026-11-12T16:10:00Z
depth: standard
files_reviewed: 21
files_reviewed_list:
  - packages/core/src/EvaluationEnvironment.ts
  - packages/core/src/index.ts
  - packages/core/test/EvaluationEnvironment.test.ts
  - packages/core/test/EvaluationEnvironment.tst.ts
  - packages/core/test/helpers.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/Simulation.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/model/SimulationSource.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/test/model/ReviewSimulationConformance.test.ts
  - packages/devtools/test/model/SimulationSource.test.ts
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
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 33: Code Review Report

**Reviewed:** 2026-11-12T16:10:00Z
**Depth:** standard
**Files Reviewed:** 21
**Status:** clean

## Summary

Iteration 2 re-review of the three comment-only fixes from iteration 1 (commits 0fa3028d, 09af1949). All reviewed files meet quality standards. No issues found.

**Iteration 1 changes checked against the code they describe**

- `git diff 5dac3c01 HEAD -- packages` touches five files, 22 insertions and 9 deletions. Filtering out comment lines leaves an empty diff, so no test, assertion, count or source statement changed.
- IN-01 and IN-02 (`EvaluationEnvironment.test.ts`, `ReviewSimulationConformance.test.ts`, `QadiReviewLayer.test.ts`). The new comments say a built `Layer.empty` context has no `Clock` entry, so `it.live` buys nothing for the `Context.get` reads. I checked this by running `Layer.build(Layer.empty)` under a `TestClock` fiber with a scratch script. `Context.get(..., Clock.Clock)` returned a real, non-zero time, so the reads are independent of the fiber's clock and the claim holds. The statement that the `durationMillis === 0` assertions are a consequence and do not discriminate is also correct, because the `Context.get` assertions on the built layer context are what separate `TestClock.layer()` from `Layer.empty`. The claim about needing a port that takes real time and blocking forever under a frozen `TestClock` is consistent with `TestClock` semantics.
- IN-03 (`SimulationSource.ts`, header of `SimulationSource.test.ts`). `simulationLayer` in `Simulation.ts` supplies `CurrentSubject` and calls `evaluationEnvironment({ ..., shadow: "sinkAndCache" })` for every source mode. `shadowing("sinkAndCache")` installs the discarding sink and a private `decisionCacheLayer()`. The reworded prose matches this.

**House rules**

- No `as` casts, `!`, `any`, `switch`, `Effect.fnUntraced`, `async` or `await` in the phase's source and test files. The grep hits for ` as ` are all `import * as` lines.
- The doc comments added or changed by the phase lead with a one-line summary.
- The phase introduced no plan or `D-NN` ids. The `ARCH-NN` and `D-NN` strings in `SimulationSession.ts`, `SimulationSource.test.ts` and `QadiReviewLayer.ts` all predate the phase (`git diff a201e2fb` adds none). `INV-QD-311` and `ADR-QD-146` are spec ids, not plan ids.

**Substantive checks re-confirmed**

- The seal. `shadow: "sinkAndCache"` installs `Layer.succeed(DecisionSink, { record: () => Effect.void })` and `decisionCacheLayer()`, so an outer sink or cache never sees a simulated decision. The core test "every build gets a private cache of its own" asserts the outer cache stays at size 0. `qadiReviewLayer` passes `shadow: "none"`, which is `Layer.empty`, so the review layer shadows nothing.
- A fresh private cache on every build. `decisionCacheLayer()` is constructed inside `shadowing(...)`, and the core test asserts sizes of `[1, 1]` across two evaluations on the same environment value.
- `simulationLayer` behaves the same for every source mode. It builds one `evaluationEnvironment` call whose `shadow` is a constant `"sinkAndCache"`. Only `ports` varies by source.
- The two clock maps agree. `Simulation.ts` `clockLayer` and `QadiReviewLayer.ts` `clockLayer` both map `"deterministic"` to `TestClock.layer()` and anything else to `Layer.empty`. `ReviewSimulationConformance.test.ts` pins both.
- Tests: `vitest run --project core --project testing --project devtools` on the three affected areas passed, 33 files and 973 tests.

---

_Reviewed: 2026-11-12T16:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
