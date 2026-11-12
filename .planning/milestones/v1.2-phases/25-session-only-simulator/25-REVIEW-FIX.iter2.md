---
phase: 25-session-only-simulator
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/25-session-only-simulator/25-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 3
skipped: 1
status: partial
---

# Phase 25: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/25-session-only-simulator/25-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4 (WR-01 to WR-04; the two Info findings are out of scope)
- Fixed: 3
- Skipped: 1

**Verification ran in the main checkout.** `workflow.use_worktrees` is `false`, so no worktree was created. The gates were `pnpm vitest run --project devtools` (1195 passed), `pnpm test:bdd` (568 passed), `pnpm typecheck`, `pnpm lint` and `pnpm lint:style`, all green. `node scripts/spec-revise.mjs --check` is also green.

## Fixed Issues

### WR-02: `DockFrame` captures a session that `useScoped` can later replace

**Files modified:** `packages/devtools/src/react/useScoped.ts`, `packages/devtools/test/react/useSimulationSession.test.tsx`, `spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md`
**Commit:** 0a6872c6
**Applied fix:** The cleanup in `useScoped` now calls `setValue(undefined)` before it closes the scope. A hidden `<Activity>` runs the cleanup and later the effect again with state kept. Whatever read the value once (`DockFrame`) now unmounts, and the next session remounts it. This differs from the review's `key={epoch}` suggestion: the closed session is never rendered, so the finalizer needed no `Running` to `Idle` reset. ADR-QD-137 decision 6 states the behaviour, with a revision line (1.0 to 1.1).
**Regression test:** a child that reads the session once, under `<Activity>` hidden then visible. It failed before the fix, with the child still holding the first session.
**Status:** fixed

### WR-03: `useScoped` leaks the scope if `make()` throws

**Files modified:** `packages/devtools/src/react/useScoped.ts`, `packages/devtools/test/react/useSimulationSession.test.tsx`
**Commit:** df588d1a
**Applied fix:** The build runs in `try/catch`. On a throw the scope is closed through the same `close()` the cleanup uses, and the error is rethrown.
**Regression test:** a `make` that registers a finalizer and then dies. It failed before the fix (finalizer count 0) and expects 1 now.
**Status:** fixed

### WR-04: The `simulation-session` changeset describes an interface this phase removed

**Files modified:** `.changeset/simulation-session.md`
**Commit:** bb1dddb8
**Applied fix:** Removed the "`SimulatorProps` gains an optional `session`" clause. `Simulator` is no longer exported and its `session` prop is required.
**Status:** fixed

## Skipped Issues

### WR-01: A `run` issued from a subscriber notified by a synchronously-landing run is interrupted, and `Running` sticks

**File:** `packages/devtools/src/model/SimulationSession.ts:559` (and `land`, 500-529)
**Reason:** The premise does not hold for the real `SimulationSession`. I could not make a failing regression test. The race needs a run that settles inside `runFork`, before `FiberHandle.setUnsafe` registers the fiber. I probed Run and Sweep, with attribute and role policies, under `it.effect` and under a plain `Effect.runSync` scope. In every case the snapshot was still `Running` right after `session.run(...)`, so no run lands synchronously and the outer fiber is registered first. The `FiberHandle` behaviour the reviewer reproduced in isolation is real, but the session's runs never reach it. The "a fixture run settles synchronously" claim in the test headers is stale (see IN-02). No code was changed and the probe tests were removed. A `yieldNow` in `land` would be harmless but would not fix anything observable.
**Original issue:** A `Ran` notification from a synchronously-landing run could register a nested run that the outer fiber's later registration interrupts, leaving `run` stuck at `Running`.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
