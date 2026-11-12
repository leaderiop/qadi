---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
reviewed: 2026-11-12T19:30:00Z
depth: standard
files_reviewed: 28
files_reviewed_list:
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/model/DockModel.ts
  - packages/devtools/src/react/DiagnosticsNotice.tsx
  - packages/devtools/src/react/useStoreSnapshot.ts
  - packages/devtools/src/react/useDiagnostics.ts
  - packages/devtools/src/react/useTimeline.ts
  - packages/devtools/src/react/useDockModel.ts
  - packages/devtools/src/react/useScoped.ts
  - packages/devtools/src/react/useSimulationSession.ts
  - packages/devtools/src/react/DevtoolsDock.tsx
  - packages/devtools/src/react/ServicesPanel.tsx
  - packages/devtools/src/react/QuestionsPanel.tsx
  - packages/devtools/src/react/PolicyExplorer.tsx
  - packages/devtools/src/react/RoleViewer.tsx
  - packages/devtools/src/react/index.ts
  - examples/nextjs-newsroom/src/client/Counters.tsx
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/model/DockModel.test.ts
  - packages/devtools/test/react/DiagnosticsLifetime.test.tsx
  - packages/devtools/test/react/TimelineLifetime.test.tsx
  - packages/devtools/test/react/DiagnosticsNotice.test.tsx
  - packages/devtools/test/react/DiagnosticsScreens.test.tsx
  - packages/devtools/test/react/useStoreSnapshot.test.tsx
  - packages/devtools/test/react/useDiagnostics.test.tsx
  - .changeset/dock-diagnostics-feed.md
findings:
  critical: 0
  warning: 3
  info: 5
  total: 8
  necessity: 1
status: issues_found
---

# Phase 34: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 28
**Status:** issues_found

## Summary

The feed's run-token design holds up. A replaced run's exit cannot write (F9 proves the `mine === generation` guard in `onExit` is load-bearing: a dying layer release leaves a non-interrupt cause). `Starting` is published before the fork, `Live` is marked from `accept` and not from the store's notify, and the dock model merges on change with identity kept when nothing is supplied. No `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await` or `console` in the reviewed src. No stale references to `useRunningStore`, `useDockSession` or `useExplorerSession` in `packages/devtools/src`, `packages/react/src` or `examples/`. The notice copy matches UI-SPEC word for word. `pnpm vitest run --project devtools` passes (55 files, 1313 tests).

There are two real gaps, both at the scope-close boundary, and both reproduced against an instrumented copy of `DiagnosticsFeed.ts` (outside the repo). The `mine !== generation` guard in the marking `accept` is unreachable on effect 4.1.2, and the mutation record's evidence for that is wrong (see WR-03 and IN-01).

No critical issues.

## Warnings

### WR-01: A defect while the scope closes is reported as `Stopped` after the feed is closed

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:176-181, 210-216`
**Issue:** `generation` is bumped by `start` and `off`, but not when the scope closes. Closing the scope interrupts the run through `FiberHandle`, so `onExit` runs with `mine === generation`. If the run's cause is not interrupts-only, `show(Stopped)` publishes on a feed that no longer exists. A layer whose release dies is enough, and F9 covers only the replace path, not the close path. Reproduced: `makeDiagnosticsFeed({ layer: dyingRelease })` in a scope, `Scope.close`; the subscriber is notified `Stopped` and `getSnapshot().status` reads `Stopped` after the close. In the dock this lands in `DockModel`'s `remerge` (never unsubscribed) and in whatever React listener has not yet been removed during unmount. It contradicts the file's own rule, "closing it interrupts the run, without a `Stopped`", and F17 only proves the non-dying case.
**Fix:** Bump the token when the scope closes. Register the finalizer after `FiberHandle.make` so it runs before the handle interrupts the fiber (finalizers run in reverse order):
```ts
const handle = yield* FiberHandle.make<void>();
yield* Effect.addFinalizer(() =>
  Effect.sync(() => {
    generation += 1;
    closed = true;
  }),
);
```
Add a case beside F17 with a dying release and assert no notification.

### WR-02: `restart()` or `configure` on a closed feed publishes `Starting` and never leaves it

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:190-195, 248-250`
**Issue:** `start` publishes `Starting` before `fork`, and `fork` on a closed handle interrupts the new fiber at once, so nothing ever follows. Reproduced: after `Scope.close`, `feed.restart()` leaves `getSnapshot().status` at `Starting` and notifies. A closed feed's commands should do nothing, like `idleDiagnostics`' `restart`. The reachable route is a stale `model.diagnostics.restart` captured by a consumer across a `useScoped` rebuild (Activity hide/show, StrictMode). The notice's `onRestart` is `model.diagnostics.restart`, memoised on `[status, model]`; a click handler held across the rebuild would drive the closed model, and that screen would show a permanent "Waiting for the first sample.".
**Fix:** Share the `closed` flag from WR-01 and have `start` and `off` return at once when it is set:
```ts
const start = (next: DiagnosticsDockOptions) => {
  if (closed) return;
  ...
};
```

### WR-03: F16 does not exercise the accept guard, and the survivor argument leans on it

**File:** `.planning/phases/34-diagnostics-as-the-dock-model-s-seventh-store/34-mutation-survivors.json:6`, `packages/devtools/test/model/DiagnosticsFeed.test.ts:356-377`
**Issue:** The record says "F16 ... shows the interrupted run never reaches its accept". F16 shows nothing of the kind. The mutant that disables the guard survived, which is the evidence that F16 passes either way: with `restart()` called inside sample 2, the final reading is `b` and the status `Live` whether or not the stale `a` was accepted first, because the new run's `b` lands after it. I confirmed the actual claim separately, by running an instrumented copy of the feed with a log on the dropped-accept branch: with `restart()` inside the question thunk the branch is never taken, so the interrupted run does not reach `accept` on effect 4.1.2. So the conclusion (equivalent mutant) is right on this runtime, but the cited evidence cannot show it, and nothing in the repo would notice if a future effect version changed when an interrupt is observed. See IN-01 for whether the guard should stay.
**Fix:** Either correct the survivor note to say "unreachable on effect 4.1.2; F16 does not distinguish it", or make F16 able to: have the source record the order of acceptance (a `subscribe` log that includes the reading) and assert that `a` is never published as a reading.

## Info

### IN-01: The `mine !== generation` guard in the marking `accept` is unreachable, and should stay (necessity)

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:200`
**Category:** necessity
**Issue:** Verdict on the guard asked about: unreachable on effect 4.1.2. The only way an old run can reach `accept` after `generation` moved is by running a step after the replacement interrupted it. `restart()` from inside the sample (the one re-entrant route there is) shows the fiber is interrupted before its `accept`, and an old fiber suspended on a sleep, a layer build or an async collector is interrupted where it stands. A stale accept would also need the `off()` route to matter, and `off` has the same interruption. Evidence: the instrumented run described in WR-03. If it were reached, the cost would be real and not cosmetic: after `off()` it would set `sampled = true` and publish `Live` over a fresh `diagnosticsOff` store, so the dock would say "Live" with nothing running.
**Fix:** Keep it. It is one line, it costs nothing on the hot path, and the failure it blocks (a panel stating `Live` after `Off`) is the exact class of defect this phase exists to remove. Say plainly in the survivor note that it is defence against a scheduler that does not interrupt before the next step, not a reachable path. Remove it only if the project prefers no untested lines over a one-line safeguard; that is a judgement call, not a defect either way. The same applies to the unguarded `timeline.accept -> inner.accept` route in `TimelineFeed.ts:73`: it relies on the same interruption ordering without a token.

### IN-02: `configure(undefined)` redoes the whole `off()` on every call, even when already off

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:221-236`, `packages/devtools/src/model/DockModel.ts:155`
**Issue:** `DockModel.configure` calls `diagnosticsFeed.configure(next.diagnostics)` on every dispatch. With no diagnostics, each call bumps `generation`, forks `Effect.void` into the handle, allocates a new `DiagnosticsStore` and does a no-op `view.set`. Harmless, but it is churn on a path that runs on every host render where an input changed, and it makes the "an unchanged prop dispatches nothing" claim only true for observable effects.
**Fix:** `if (next === undefined) { if (before !== undefined) off(); return; }`. Initial `init === undefined` already leaves the feed in its `Off` state.

### IN-03: A restart while `Starting` publishes `Starting` again

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:176-181, 195`
**Issue:** `show`'s dedup compares `current.status === status`. `DiagnosticsStatus.Starting()` builds a new object each call, so the comparison can never hold for `Starting`, and a `restart()` or an equal-reading re-`start` while already `Starting` notifies listeners with an identical state. `Live` is deduplicated because `accept` reuses the existing object; `Starting` is not.
**Fix:** In `start`, skip the publish when the current status is already `Starting` and the reading is unchanged: `if (!DiagnosticsStatus.$is("Starting")(view.getSnapshot().status)) show(DiagnosticsStatus.Starting());`.

### IN-04: A second stop on a mounted notice flips `role` rather than remounting, against the spec's stated mechanism

**File:** `packages/devtools/src/react/DiagnosticsNotice.tsx:105-111`
**Issue:** UI-SPEC fixes the mode at mount, so that "a new stop (`Stopped`, `Starting`, `Stopped`) is a remounted notice". The implementation instead re-decides on a new status while mounted (`setAlert(announced.current !== status)`). The two agree when `Starting` was rendered in between, since `noticeOf` swaps the component. They diverge when a restart's run fails synchronously and React renders only `Stopped(old)` then `Stopped(new)`: the same `<section>` stays mounted and gains `role="alert"` after the fact. Assistive technology generally does not announce a role added to an element already in the tree, so that second stop can be silent. N9 asserts the attribute flips (`getAttribute("role") === "alert"`) and not that anything would be announced.
**Fix:** Key the notice by the status value so a new stop always remounts and the mount-time decision stays the only one: `<StoppedNotice key={...} />`, using a counter held by the notice owner, or `status` identity through a `WeakMap<Stopped, number>`. Then the `seen`/`setSeen` block can go.

### IN-05: `TimelineFeed` repeats the silent-death the diagnostics feed was built to fix

**File:** `packages/devtools/src/model/TimelineFeed.ts:79-83`
**Issue:** `forkRead(runSource(...))` goes into a `FiberHandle`, and a source whose `read` or stream dies ends the fiber with nothing said (the research finding for diagnostics applies identically). The timeline then freezes on its last records with no status. This is how the code behaved before this phase, so it is not a regression, and a status for the timeline is outside this phase's scope; it is listed so it is not mistaken for covered.
**Fix:** Out of scope here. If wanted later, give `TimelineFeed` the same `onExit` plus run-token shape and a closed status.

---

_Reviewed: 2026-11-12T19:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
