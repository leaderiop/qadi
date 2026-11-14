---
phase: QD-37-a-scoped-run-that-a-newer-run-supersedes
reviewed: 2026-11-14T00:00:00Z
depth: standard
files_reviewed: 8
files_reviewed_list:
  - packages/devtools/src/model/SupersedingRun.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/test/model/SupersedingRun.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/SimulationSession.runs.test.ts
findings:
  critical: 0
  warning: 0
  info: 4
  total: 4
  necessity: 1
status: issues_found
---

# Phase 37: Code Review Report

**Depth:** standard. `SupersedingRun.ts` and `SupersedingRun.test.ts` were read in full, the three stores by their diff against `c52e0d65`, and the `FiberHandle` 4.1.2 source (`setUnsafe`, `runtime`) for the close, replace and re-entrancy behaviour the module relies on. The `.runs` test file and the other store test diffs were checked by stat and house-style greps only.

## Summary

No bug, no security issue, no house-style violation, and no departure from D-01..D-13.

1. **Re-entrancy.** `drain` is correct. `starting` stays true across the whole loop, so a nested fork, including one from a finalizer of the run being replaced (`setUnsafe` interrupts the previous fiber inside `install`), lands in `held` and is picked up by the next iteration. A stale held fork is re-checked with `isCurrent` and skipped. A stop from inside a start becomes a held `Effect.void` that replaces the outer run. A scope close from inside a start sets `current = undefined`, so nothing held installs, and the handle is `Closed` by the time the outer fiber registers, so `setUnsafe` interrupts it (R14). `try/finally` resets `starting` and `held`. A throwing `install` is not reachable: `runFork` captures a prefix's defects in the fiber, and a throwing `onFailure` becomes a defect inside the `onExit` finalizer.
2. **`onFailure` wrapping.** See IN-01.
3. **Publish between `begin` and `fork`, and the landing guard.** Both hold in all three stores. `TimelineFeed` publishes `status.set(READING)` and guards `accept` with `isCurrent`. `DiagnosticsFeed` publishes `show(Starting)` and guards `marking.accept`. `SimulationSession` runs `commit()` between them, and `land` checks `isCurrent` right after `Effect.exit`, with no yield before its writes. The two feeds gain `fork`'s post-publish re-check (D-06), and the session's `supersede` is the unconditional `stop` (D-05).
4. **House style.** There is no `as`, `!`, `any`, `switch`, `async`/`await` or `Promise` in src. Imports are `effect/*` namespaces with `.ts` extensions. The test's one `Effect.promise`/`Effect.runPromise` pair wraps `FastCheck.asyncProperty`, following the `SharedComputation.test.ts` precedent.

The property's reference model is an independent restatement, not a mirror of the implementation.

## Info

### IN-01: The `onFailure === undefined ? run : run.pipe(onExit …)` branch exists only to keep a latent TypeError out, and no test can see it

**Category:** necessity (rests on judgment)
**File:** `packages/devtools/src/model/SupersedingRun.ts:112-124`
**Issue:** 37-09 named the surviving mutant at `onFailure === undefined` as equivalent, and that is accurate. A hook-less failing run, always wrapped, would call `undefined(...)` inside an `onExit` finalizer, which becomes a defect in a fiber nothing observes. So the branch's only job is to avoid a wrapper whose only effect would be a swallowed TypeError. No behavioural test can pin it, and it leaves the hook-less path (the session) structurally different from the hooked one.
**Fix:** Always wrap, and call the hook optionally (`hooks?.onFailure?.(exit.cause)`). The session's `land` gains one `onExit` finalizer and no behaviour change. This removes the equivalent-mutant class and the latent TypeError.

### IN-02: Two forks of the same token behave differently when the second is held

**File:** `packages/devtools/src/model/SupersedingRun.ts:125-128`
**Issue:** `held` is a single slot that a later nested fork overwrites. From inside a start, `fork(t, x); fork(t, y)` never starts `x`, yet `fork(t, x)` returned `true`. Outside a start, the same two calls start `x` and then interrupt it for `y`, and `x`'s synchronous prefix is observable. No store forks one token twice (each `begin` is paired with one `fork`), so this is latent and undocumented.
**Fix:** Document "a token is forked once", or have `fork` return `false` for a token it has already forked.

### IN-03: The "opens no span" assertions (R5, R7) have no positive control

**File:** `packages/devtools/test/model/SupersedingRun.test.ts:143-162, 182-199`
**Issue:** The tests compare `spans.length` before and after `stop()`, but nothing in the file shows that `collectingTracer` sees a span at all, so they would also pass with an unwired tracer.
**Fix:** Run one traced effect through the same provider and assert `spans.length` grows, as `SimulationSession.runs.test.ts:76` does.

### IN-04: A doc comment still describes the session's handle as its own

**File:** `packages/devtools/src/model/SimulationSession.ts:325-326`
**Issue:** "…so that the handle its runs fork into is acquired and released with that scope" refers to a member the session no longer has. The handle is now internal to `makeSupersedingRun`.
**Fix:** Say "the superseding run its runs fork into".

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
