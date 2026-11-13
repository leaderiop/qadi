---
phase: 34-diagnostics-as-the-dock-model-s-seventh-store
reviewed: 2026-11-12T20:30:00Z
depth: standard
files_reviewed: 27
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
  warning: 0
  info: 0
  total: 0
  necessity: 0
status: clean
---

# Phase 34: Code Review Report

**Reviewed:** 2026-11-12T20:30:00Z
**Depth:** standard
**Files Reviewed:** 27
**Status:** clean

## Summary

Iteration 2 re-review. The files changed since iteration 1 (`DiagnosticsFeed.ts`, `DiagnosticsNotice.tsx`, `DevtoolsDock.tsx`, `test/helpers.ts` and the three notice/feed/screen tests) were read in full. The rest of the scope is unchanged since iteration 1 and was not re-found faulty. `pnpm vitest run --project devtools` passes: 55 files, 1320 tests.

Each iteration-1 fix was checked against the code and holds.

**WR-01, finalizer ordering.** `FiberHandle.make` registers its interrupt through `Effect.acquireRelease`, and `Effect.addFinalizer` is called after it. Scope finalizers run in reverse order of registration, so the generation bump runs before the handle interrupts the run. The interrupted run's `onExit` then sees `mine !== generation`, and a release that dies during interruption is no longer reported as `Stopped`. `accept` is guarded by the same token. F24 and F25 would fail without the finalizer: F24 observes a published `Stopped`, and F25 observes a published `Starting` after close.

**WR-02, closed flag.** `configure` and `restart` return before touching `options`, the token or the store. No path reaches `start` or `off` once `closed` is set.

**IN-02, IN-03.**
- `off()` runs only when `before !== undefined`.
- `start` publishes the single module-scope `diagnosticsStarting.status`, and `show` drops a repeat on identity of status and reading, so F27's `seen` stays empty.
- F26 is a regression pin and cannot fail without the change, because `ExternalStore.set` already dedups. The fix report says so, and the test title does not claim more.

**IN-04, StopLedger.**
- The ledger is a React ref that holds the last stop's identity and a count. It holds no decision, so AGENTS.md §13 is intact.
- `status` keeps its identity through `DockModel.mergedOf`, which wraps the same `status` object, so a supplied-reading change cannot re-announce.
- Stop to Stop remounts: the render keys `count + 1`, then the layout effect commits `{ stop, count + 1 }`, so later renders of the same stop keep the same key.
- StrictMode: the `useState` initializer runs twice before any effect and gives the same answer. The doubled layout effect is a no-op the second time, because the stop already equals the status. N9 checks the alert after a StrictMode mount.
- Remount and tab switch: a revisit with the same stop is silent (D7). A stop first seen while no notice was mounted alerts on the first visit (D8). A rebuilt dock starts from `noStops`, so it announces again.
- N12 asserts that the node is replaced and that the role is present on the second mount. It does not pass vacuously.

**UI-1, UI-2, UI-3.**
- The persistent `role="status"` div has no style and sits first in the fragment, so it is the same node across `Off`, `Starting`, `Live`, `Stopped` and the restart. N13 pins this.
- Content appears only for `Starting`. `Live` and `Off` clear it, which is a removal and not an announcement.
- The alert wraps only the lead and body. The reason `<pre>` is a sibling, which N11 pins.
- The root drops `outline: none`.
- Changed assertions (N1-N4, N10, D9, D10) still test what their titles say.

**House rules.** No `as`, `!`, `any`, `switch`, `Effect.fnUntraced`, `async`/`await` or `console` in the changed source or tests. The notice dispatches with `Match.type` built at module scope. Doc comments lead with a one-line summary and cite only ADR ids, as AGENTS.md prescribes. No plan, wave or finding ids appear in the changed source.

All reviewed files meet quality standards. No new issues found.

## Accepted / carried

Neither item alone prevents `clean`.

- **IN-01:** the marking-accept token guard in `DiagnosticsFeed.ts` is unreachable on effect 4.1.2, and `TimelineFeed`'s accept has no token. The survivor record was corrected (WR-03). Carried to the milestone's carried-debt phase.
- **IN-05:** `TimelineFeed` ends its fiber silently on a throwing source. This predates the phase. Carried to the same phase.

Not verified by this review: the focus ring and the screen-reader behaviour of the persistent region and the per-stop remount in a real browser. This is the fix report's own open item.

---

_Reviewed: 2026-11-12T20:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
