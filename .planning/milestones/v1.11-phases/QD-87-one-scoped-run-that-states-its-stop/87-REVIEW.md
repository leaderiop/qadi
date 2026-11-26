---
phase: QD-87-one-scoped-run-that-states-its-stop
reviewed: 2026-11-25T22:10:00Z
depth: standard
files_reviewed: 22
files_reviewed_list:
  - packages/devtools/src/model/StatedRun.ts
  - packages/devtools/src/model/ConfigurePrologue.ts
  - packages/devtools/src/model/SupersedingRun.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/SimulationSession.ts
  - packages/devtools/src/react/Simulator.tsx
  - packages/devtools/src/react/StoppedBox.tsx
  - packages/devtools/src/react/theme.ts
  - packages/core/src/ThrownMessage.ts
  - packages/devtools/test/builtFeeds.ts
  - packages/devtools/test/model/ConfigurePrologue.test.ts
  - packages/devtools/test/model/DiagnosticsFeed.stop.test.ts
  - packages/devtools/test/model/SimulationSession.stop.test.ts
  - packages/devtools/test/model/StatedRun.characterisation.test.ts
  - packages/devtools/test/model/StatedRun.stores.test.ts
  - packages/devtools/test/model/StatedRun.test.ts
  - packages/devtools/test/model/SupersedingRun.test.ts
  - packages/devtools/test/model/TimelineFeed.stop.test.ts
  - packages/devtools/test/react/Simulator.broke.test.tsx
  - .changeset/devtools-one-stated-run.md
  - .changeset/core-cause-text-doc.md
findings:
  critical: 0
  warning: 2
  info: 4
  total: 6
status: issues_found
---

# Phase 87: Code Review Report

**Reviewed:** 2026-11-25T22:10:00Z
**Depth:** standard (with cross-file checks of the call sites)
**Files Reviewed:** 22 (23 listed paths counting the two changesets as one scope item each; `files_reviewed` counts source and test files)
**Status:** issues_found

## Summary

The run ordering holds up. I traced these paths and found no defect in any of them:

- **Publish, then fork.** `StatedRun.start` calls `begin`, runs `starting` in a `try`, and forks in the `finally`. `fork` re-checks the token, so a listener that supersedes from inside the publish leaves only the newer engine installed, and the outer run is dropped by the token check. The held-slot drain in `SupersedingRun` covers a nested start from an engine's synchronous prefix.
- **Outside interrupts versus self-interrupt.** `stop` is `fork(begin(), Effect.void)`, `begin` replaces `current` before the old fiber is interrupted, and the close finalizer clears `current` before the handle's own finalizer interrupts. An outside interrupt therefore never reaches the `isCurrent` check with a current token. Effect also skips the `Effect.exit` continuation of an interrupted, interruptible fiber. Only a self-interrupt reads a current interrupt-only failure, which is what D-08 intends.
- **Stale writes.** `guard` drops a write from a non-current token before the value is read, for the timeline sink and the diagnostics sink.
- **The session's `Running` guard.** `run._tag !== "Running"` correctly stops a listener that throws on the `Ran` or `Broke` commit from overwriting a landed result. The hook only fires for a current run, and a current run's `run` is `Running` unless it landed.
- **Diagnostics absent-options path.** `sameFieldsOrAbsent` is passed `(held, wanted)` in the same order as before. `closed` is checked first, `complete(undefined)` yields `undefined`, and `configure(undefined)` on an `Off` feed is a no-op.
- **Gates.** The `same` predicate `sameFields(a, b) && watchFailure === undefined` is the old predicate. `held` is read before `hold` runs, so `before` is the old value.
- **Timeline.** `held.source` is now read at engine build, after the `Reading` publish, where it was read before. A nested configure from a listener supersedes the outer run either way, so there is no observable difference.
- **Verification run.** I ran the 9 new and edited devtools test files, and all 77 tests pass.

There are no Critical findings. The two Warnings are a public-doc regression and a changeset that omits a user-visible behaviour change. The Infos are citation drift, one changeset imprecision, an accessibility gap, and a brittle test constant.

## Warnings

### WR-01: Public `subscribe` JSDoc now points at a package-private module and no longer states the listener contract

**File:** `packages/devtools/src/model/TimelineFeed.ts:66-70`, `packages/devtools/src/model/DiagnosticsFeed.ts:98-105`
**Issue:** `TimelineStatusReadout` and `DiagnosticsReadout` are exported from the package root (ADR-QD-173) and their JSDoc ships in the `.d.ts`. No `removeComments` is set. This phase replaced the old `subscribe` paragraphs with "(see `StatedRun.ts`)". `StatedRun.ts` is out of the barrel and out of the `exports` map (ADR-QD-099), so a consumer reading the type cannot open it.

The replacement also dropped the contract that the old text carried, from ADR-QD-177: every listener is called, then what they threw is rethrown, one value as itself or several as an `AggregateError`. What remains covers only the `Reading` or `Starting` publish of `restart` and `configure`. A consumer now has no statement of what happens when their listener throws on a publish from the run. That case is the `Stopped`, `Live` or `Reading` publish inside the forked fiber, where a throw becomes an unobserved defect and is lost. `DiagnosticsReadout` keeps one sentence about it ("the `Stopped` is held even when a listener throws"). `TimelineStatusReadout` has none.

Failure scenario: an integrator reading the published `d.ts` for `useTimeline`'s status cannot find where throws from a `Stopped` publish go, and cannot find the cited file.

**Fix:** state the contract in the public comment and drop the pointer to the private file.
```ts
/**
 * Registers a listener, and returns the function that removes it. Every listener is called,
 * and then what they threw is rethrown out of whatever published: one value as itself,
 * several as one `AggregateError`. A throw on the `Reading` that `restart` or `configure`
 * publishes is rethrown once the new read has started, so the status never says `Reading`
 * with nothing reading (ADR-QD-194). A throw on a publish from the read itself is not
 * rethrown: the status is held and the throw is dropped with the read's fiber.
 */
```
Make the same change in `DiagnosticsReadout`, keeping its existing `Stopped`-is-held sentence.

### WR-02: The devtools changeset omits the session's other behaviour change (a run that dies before its own exit read now reads `Broke`)

**File:** `.changeset/devtools-one-stated-run.md:5`, behaviour at `packages/devtools/src/model/SimulationSession.ts:365-369`
**Issue:** the changeset lists the Simulator text and `<pre>` change and the feed self-interrupt change. It says nothing about the third observable change.

- **Base.** `land` was forked with no hook (`runs.fork(mine, land(...))`). A defect outside `Effect.exit(program)`, for example in `readOutcome`, the run span, or `capture` handling, ended the fiber. The fiber handle drops a dead fiber silently, so `run` stayed `Running` forever.
- **Now.** The `stopped` hook turns that into `Broke{ message: causeMessage(cause) }`. `StatedRun.stores.test.ts` SS1 pins this with a tracer that refuses the run span.
- **Policy.** D-04 says the changeset states each visible change, and the changeset text is what a consumer reads.

Failure scenario: a host that polls `run._tag === "Running"` as "still going" sees a new `Broke` for a case that used to hang. The release note does not say it can happen.

**Fix:** add one clause, for example: "A simulation run that fails outside its own result read, and used to stay `Running` with nothing running, now reads `Broke`."

## Info

### IN-01: Doc comments cite the wrong decision for the new module

**File:** `packages/devtools/src/model/SimulationSession.ts:35`, `packages/devtools/src/model/StatedRun.ts:22-35`
**Issue:** the session header reads "one stated run (`makeStatedRun`, ADR-QD-150)". ADR-QD-150 is the `SupersedingRun` protocol. The decision that created `makeStatedRun` is ADR-QD-200 (`spec/decisions/200-one-scoped-run-that-states-its-stop.md`, which exists). `StatedRun.ts` and `ConfigurePrologue.ts` cite ADR-QD-150, 182, 192 and 194 but never ADR-QD-200. Their peer module `SupersedingRun.ts` cites its own ADR, so a reader grepping `ADR-QD-200` in `src` finds nothing.
**Fix:** cite ADR-QD-200 in the headers of `StatedRun.ts` and `ConfigurePrologue.ts`, and in the session header change "(`makeStatedRun`, ADR-QD-150)" to "(`makeStatedRun`, ADR-QD-200 over ADR-QD-150's protocol)".

### IN-02: Changeset describes the old feed states as "reading or starting", but a polled diagnostics feed that was `Live` also stayed put

**File:** `.changeset/devtools-one-stated-run.md:5`
**Issue:** the changeset says an interrupting collector or read "showed reading or starting with nothing running". A poll that had already sampled and then interrupts itself stayed `Live`, which is the case `StatedRun.ts:10-15` itself names ("a status that stayed `Reading` or `Live`"). The release note undercounts the states that change.
**Fix:** "showed reading, starting or live with nothing running".

### IN-03: The Simulator's broken-run box is a new keyboard tab stop but is never announced

**File:** `packages/devtools/src/react/Simulator.tsx:106-112`
**Issue:** the `<pre role="group" aria-label tabIndex=0>` copies the stopped box's focus treatment, which is correct. It does not copy the stopped box's announcement: `StoppedBox` puts `role="alert"` on its lead line, and the Simulator's `Broke` section has no live region. A screen-reader user who presses Run and gets a defect hears nothing, and the box has just become a tab stop whose label ("Why the simulation failed") only makes sense if they knew to look for it. This is not new to the phase (the old `<span>` was silent too), but the phase made the message a first-class reading surface.
**Fix:** give the box's heading `role="alert"` (or wrap the section in `role="status"`), as `StoppedBox` does for its lead.

### IN-04: Simulator reason-style tests hard-code the palette

**File:** `packages/devtools/test/react/Simulator.broke.test.tsx:28-29, 119-122`
**Issue:** `REASON_STYLE` is a literal serialised `style` string containing `#14161a` and `#2a2f39`, and SB1 and SB4 assert byte equality against it. A palette tweak in `theme.ts` (`colors.surface`, `colors.border`) fails both rows although the property they name, "the simulator uses the stopped box's style", still holds. SB1 does protect the move of `reasonStyle` to `theme.ts` being byte-identical, which is the point, but the rows stay coupled to unrelated colour changes.
**Fix:** compare the Simulator block's `style` attribute to the stopped box's rendered `style` attribute in one test, and keep one literal row only for the "byte-identical to before the move" pin, with a comment saying it is a deliberate golden.

---

_Reviewed: 2026-11-25T22:10:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
