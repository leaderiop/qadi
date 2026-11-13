---
phase: 33-one-sealed-evaluation-layer
fixed_at: 2026-11-12T16:15:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/33-one-sealed-evaluation-layer/33-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 33: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/33-one-sealed-evaluation-layer/33-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 3
- Skipped: 0

All three are comment-only changes. No test, assertion or count changed.

**Verification environment:** run in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created). `vitest run` over the five touched test files (core, testing and devtools projects): 5 files, 65 tests, all pass. `pnpm typecheck` clean, `pnpm lint` warnings only (none in touched files), `node scripts/check-house-style.mjs` clean.

## Fixed Issues

### IN-01: it.live comments gave a wrong reason

**Files modified:** `packages/core/test/EvaluationEnvironment.test.ts`, `packages/testing/test/QadiReviewLayer.test.ts`, `packages/devtools/test/model/ReviewSimulationConformance.test.ts`
**Commit:** 0fa3028d
**Applied fix:** Reworded each comment to say that `it.live` buys nothing for the `Context.get` reads, because a built `Layer.empty` context has no `Clock` entry and the real default answers whichever clock the test fiber runs under. `TestLayers.test.ts` was not changed: its `it.live` docblock predates this phase and concerns `qadiTestLayer` evaluations run in the test fiber, where the ambient `TestClock` does matter. `it.live` is kept everywhere.

### IN-02: durationMillis === 0 assertions do not discriminate on their own

**Files modified:** `packages/core/test/EvaluationEnvironment.test.ts`, `packages/devtools/test/model/ReviewSimulationConformance.test.ts`
**Commit:** 0fa3028d (shared with IN-01, since both edit the same comment blocks)
**Applied fix:** Added comments stating that the `Context.get(...)` clock assertions carry the proof of determinism and that `durationMillis` is their consequence, which also reads 0 ms under a live clock. The devtools comment adds that a discriminating check would need a port that takes real time, which blocks under a frozen `TestClock`. The assertions are kept.

### IN-03: SimulationSource prose said simulationLayer supplies the seal

**Files modified:** `packages/devtools/src/model/SimulationSource.ts`, `packages/devtools/test/model/SimulationSource.test.ts`
**Commit:** 09af1949
**Applied fix:** Both now say the seal is stated in `simulationLayer`, which supplies `CurrentSubject` and asks core's `evaluationEnvironment` for `shadow: "sinkAndCache"`, and that the builder installs the discarding sink and private cache. The ADR/INV ids (ADR-QD-146, INV-QD-042) are in the commit body only; the doc comments cite none.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
