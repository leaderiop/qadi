---
phase: 25-session-only-simulator
reviewed: 2026-11-11T00:00:00Z
depth: standard
files_reviewed: 24
files_reviewed_list:
  - .changeset/devtools-headless-interface.md
  - .changeset/simulation-session.md
  - .changeset/simulator-session-only.md
  - features/features/devtools-simulator/devtools-simulator.steps.test.ts
  - packages/devtools/src/index.ts
  - packages/devtools/src/model/Inspect.ts
  - packages/devtools/src/model/Replay.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/src/react/useScoped.ts
  - packages/devtools/src/react/useSimulationSession.ts
  - packages/devtools/test/model/SimulationSession.test.ts
  - packages/devtools/test/react/Simulator.test.tsx
  - packages/devtools/test/react/useSimulationSession.test.tsx
  - packages/devtools/test/surface.tst.ts
  - spec/behaviors/29-devtools-simulator.md
  - spec/decisions/047-a-headless-devtools-model.md
  - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
  - spec/decisions/index.yaml
  - spec/devtools-spec/02-screens.md
  - spec/overview.md
  - spec/README.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

Iteration 2. I checked the three fix commits (`0a6872c6`, `df588d1a`, `bb1dddb8`) against the source and the diff. All three are correct and introduce no regression. No Critical or Warning findings remain. The two Info items from the previous report are still open; they were out of the fixer's scope.

- **WR-02 (`useScoped` clears its value on cleanup):** correct. The cleanup runs `setValue(undefined)` before closing the scope. A hidden `Activity` keeps state, so a child that read the session once (`DockFrame`) unmounts, and the next effect pass remounts it on the fresh session. StrictMode's simulated unmount and remount still end on the second session. A real unmount calls `setValue` after unmount, which is a no-op in React 18 and later. The regression test holds a child that reads the session once through `useState`, and it asserts the child ends on the new session. ADR-QD-137 decision 6 and its revision line (1.0 to 1.1) match the code. The fixer's argument that the closed session is never rendered, so no `Running` to `Idle` reset is needed in the finalizer, holds: the value is cleared in the same cleanup that closes the scope.
- **WR-03 (scope closed when the build throws):** correct. `close()` is shared between the catch path and the cleanup. A synchronous throw, a die, or an async `make` (`runSync` rejecting) is caught and the scope is closed before the rethrow. `Scope.make()` sits outside the `try`, which is fine because it acquires nothing. The test registers a finalizer and then dies, and it asserts the finalizer ran once.
- **WR-04 (changeset sentence):** correct. The `SimulatorProps` clause is gone and nothing else in the file changed. The remaining text names only exports that exist.
- **WR-01 (skipped):** not re-raised. I checked for a path where `land` commits inside `runFork` before `FiberHandle.setUnsafe`. `start` commits `Running` and then forks. `land` runs `program`, which goes through `simulate` and `whatIf`, and those go through `DecisionCache`. `Simulator.test.tsx:103-115` documents that `DecisionCache.getOrCompute` forks `compute` onto a detached fiber, so a run never settles in the synchronous part of `runFork`. The `Refused` branch of `start` commits without forking. The isolated `FiberHandle` behaviour is not reachable through the session. This holds only while `simulate` goes through `DecisionCache`. A change that made a fixture run synchronous would reopen it.

No AGENTS.md violations in the changed `useScoped.ts` or in the new tests: no `as`, `!`, `any` or `switch`. The one `let built: A` plus try/catch is a bridge from `Effect.runSync` at a React boundary, where there is no Effect context to use `Effect.exit` in.

## Info

### IN-01: `BaselineCard` renders an empty sentence silently if the "present exactly when `Checked`" invariant breaks

**File:** `packages/devtools/src/react/Simulator.tsx:475-491`
**Issue:** Unchanged from the previous report. `reading` is `BaselineReading | undefined`, and the `Checked` branch does `reading?.matches === true` and `{reading?.sentence}`. If the model ever gave `undefined` for a `Checked` baseline, the card would show a blank verdict line with no match tick, which reads as "no comment" rather than as a fault. The model guarantees the invariant today, but the view does not state it.
**Fix:** Pass the pair as one discriminated value from the model, or render an explicit "baseline reading unavailable" line when `reading` is `undefined`.

### IN-02: Stale test-file comments about runs settling synchronously

**File:** `packages/devtools/test/react/Simulator.test.tsx:9-10` and `:415-416`
**Issue:** Unchanged from the previous report. The header says "Runs are forked, and a fixture run settles synchronously inside `runFork` — so `act` around the click is enough". The comment at 415 says "A fixture run settles inside `runFork`". The `run` helper at lines 103-124 says the opposite, that a click no longer settles in one `act` and the helper waits real ticks. The fixer's own investigation confirmed no run lands synchronously, so the two comments are false. The session owns the runs, and the view forks nothing.
**Fix:** Rewrite the header to say the session owns the run and the tests wait on the snapshot, and reword the 415 comment to say the unmount test checks the cleanup path only.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
