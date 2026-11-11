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
  warning: 4
  info: 2
  total: 6
  necessity: 0
status: issues_found
---

# Phase 25: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Files Reviewed:** 24
**Status:** issues_found

## Summary

The session refactor is sound on the main paths. The `generation` guard, the LIFO finalizer that bumps it before the handle closes, and the "subscriber moved the session during `Running`" guard in `start` all hold up. I read `effect`'s `FiberHandle` source and ran it to check the lifetime claims. No AGENTS.md violations were found in the new source: no `as`, `!`, `any`, `switch`, `Date.now` or `console`, and `Match` and `Effect.fn` are used as the house rules require. No path turns a failure into a denial: `Broke` and `Failed` render as failures, and `reading` is read once from the outcome.

The defects are in run-lifetime edges the new tests do not cover. The main one is a re-entrant `run` from a `Ran` notification, which `FiberHandle` can interrupt. Spec and doc content was spot-checked against the code, not audited line by line. The 250 KB spec and diff outputs were only partly read.

## Warnings

### WR-01: A `run` issued from a subscriber notified by a synchronously-landing run is interrupted, and `Running` sticks

**File:** `packages/devtools/src/model/SimulationSession.ts:559` (and `land`, 500-529)
**Issue:** `fork(land(...))` is `FiberHandle.runtime(runs)`. That function calls `runFork(effect)` first and only afterwards `setUnsafe(handle, fiber)`, so the handle never knows about a fiber that is still starting. If the program settles synchronously (a Fixtures run, as the test headers say), `land` calls `commit()` inside `runFork`, before the outer fiber is registered.
- A subscriber notified by that `Ran` commit can call `session.run(...)`, for example after `chooseSource("Live")`. Its fiber is registered first and is async, so it stays in the handle.
- When control returns, `setUnsafe` registers the already-finished outer fiber, sees the nested fiber as `previous`, and calls `previous.interruptUnsafe`.
- The nested run is interrupted although its `generation` is current. It never lands, `run` stays `Running` forever, and both run buttons stay disabled.

I reproduced the handle behaviour in isolation: an outer fiber that forks a 50 ms effect into the same handle from inside itself ends with `{ nestedDone: false, nestedInterrupted: true }`. The existing re-entrancy tests only exercise the `Running` notification, where the outer run is skipped by `mine === generation`. None covers a notification from `land`.

**Fix:** Make `land` yield once before it can commit, so the fiber is always registered first:
```ts
const land = Effect.fn("qadi.devtools.simulationSession.run", { root: true })(function* (...) {
  yield* Effect.yieldNow; // the handle registers this fiber before anything here can notify
  const exit = yield* Effect.exit(program(...));
  ...
```
Alternatively fork first and commit `Running` afterwards, with a regression test: subscribe on `Ran`, call `chooseSource("Live")` and `run("Run")`, and assert the second run lands.

### WR-02: `DockFrame` captures a session that `useScoped` can later replace, and a closed session is left `Running`

**File:** `packages/devtools/src/react/DevtoolsDock.tsx:176-189` and `packages/devtools/src/react/useDockSession.ts:28` (with `useScoped.ts:21-28`)
**Issue:** `useScoped` builds a new value every time its layout effect re-runs, and React >=19.2.4 is the peer dependency, so `<Activity mode="hidden">` is in scope. The hidden-to-visible transition runs the layout cleanup (the scope closes) and then the layout effect (a fresh session is built), while `value` state is retained.
- `DockFrame` stays mounted. Its `useOwnedDockSession(timeline, simulation)` reads `simulation` once, in `useState`, as the comment on `DockFrame` says. So the dock session's `replay` keeps pointing at the closed session, while `Simulator` renders the new one. "Replay in simulator" then re-seeds a dead session and nothing happens.
- The finalizer (lines 353-358) bumps `generation` and sets `closed`, but never moves `run` off `Running` or notifies. The old `dispose` committed `Idle`. For the render pass that reads the retained closed session, the form shows a permanent "running" state with disabled buttons.

**Fix:** Remount the frame per session so every hook that reads the session once is rebuilt, for example by giving `useScoped` an epoch (an incrementing counter state) and using it as `<DockFrame key={epoch}>`. In the finalizer, also reset `run` to `Idle` when it is `Running` and publish once, or document that a closed session is never rendered.

### WR-03: `useScoped` leaks the scope if `make()` throws

**File:** `packages/devtools/src/react/useScoped.ts:22-23`
**Issue:** `Scope.make()` is created and then `Effect.runSync(Scope.provide(make(), scope))` runs. If `make()` throws or defects after acquiring anything (for example a throwing `session.seed` on a malformed entry), the exception leaves the layout effect before the cleanup is returned. The scope is never closed, and a handle or fiber it already acquired is never released. React error boundaries then show the error while the scope stays open.
**Fix:**
```ts
const scope = Effect.runSync(Scope.make());
let built: A;
try {
  built = Effect.runSync(Scope.provide(make(), scope));
} catch (error) {
  Effect.runFork(Scope.close(scope, Exit.void));
  throw error;
}
```

### WR-04: The `simulation-session` changeset still describes an interface this phase removed

**File:** `.changeset/simulation-session.md:5`
**Issue:** It says "`SimulatorProps` gains an optional `session`". After this phase `Simulator` is not exported (`devtools-headless-interface.md` removes it) and its `session` prop is required. It also says the hooks "build the session in a scope", which is correct. The first claim is wrong in the same release.
**Fix:** Delete the `SimulatorProps` sentence, and drop `Simulator` from any consumer-facing list in that file.

## Info

### IN-01: `BaselineCard` renders an empty sentence silently if the "present exactly when `Checked`" invariant breaks

**File:** `packages/devtools/src/react/Simulator.tsx:475-491`
**Issue:** `reading` is typed `BaselineReading | undefined`, and the `Checked` branch does `reading?.matches === true` and `{reading?.sentence}`. If `baselineReading` were ever `undefined` for a `Checked` baseline, the card would show a blank verdict line with no match tick. That reads as "no comment" rather than as a fault. The model guarantees the invariant today, but the view does not state it.
**Fix:** Pass the pair as one discriminated value from the model (for example `baseline: { baseline, reading }`), or render an explicit "baseline reading unavailable" line when `reading` is `undefined`.

### IN-02: Stale test-file header

**File:** `packages/devtools/test/react/Simulator.test.tsx:9-10`
**Issue:** The header still says "Runs are forked, and a fixture run settles synchronously inside `runFork`". A view no longer forks anything, since the session owns runs. The `run` helper's long `DecisionCache` comment also contradicts it by saying a click no longer settles in one `act`.
**Fix:** Rewrite both comments to say the session owns the run and that the tests wait on the snapshot.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
