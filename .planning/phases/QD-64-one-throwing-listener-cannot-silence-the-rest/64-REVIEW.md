---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
reviewed: 2026-11-20T17:00:00Z
depth: standard
files_reviewed: 18
files_reviewed_list:
  - .changeset/devtools-every-listener-is-called.md
  - packages/devtools/README.md
  - packages/devtools/src/model/DiagnosticsFeed.ts
  - packages/devtools/src/model/ExternalStore.ts
  - packages/devtools/src/model/GatesFeed.ts
  - packages/devtools/src/model/TimelineFeed.ts
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/DiagnosticsFeed.test.ts
  - packages/devtools/test/model/ExternalStore.test.ts
  - packages/devtools/test/model/GatesFeed.test.ts
  - packages/devtools/test/model/TimelineFeed.test.ts
  - spec/README.md
  - spec/behaviors/28-devtools-screens.md
  - spec/decisions/173-the-devtools-headless-interface-is-its-feeds.md
  - spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md
  - spec/decisions/index.yaml
  - spec/invariants.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
---

# Phase QD-64: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard (iteration 2)
**Files Reviewed:** 18

## Summary

Iteration 1's WR-01 is fixed, and the fix is accurate. I traced every amended text against `TimelineFeed.ts` `configure` (lines 166-172). The texts checked are the `subscribe` and `configure` doc comments, the README listener paragraph, ADR-QD-177 decision 5, the BEH-QD-656 trailing paragraph, and the CCR-QD-455 row.

What the code does when a listener throws on `push()` after a capacity change:
- `inputs = next` is already assigned.
- `inner` is already replaced, empty.
- `begin()` is not reached. The old token stays current, so the old read keeps writing through `timeline.accept`, which now resolves to the new `inner`.
- `readSource` is skipped, so the new source is not read.
- A second `configure` with the same inputs sees `resized` false and `next.source === before.source`, so it does not read either.
- `status.restart` calls `readSource(inputs.source)`, which reads the new source.

Each of these matches a sentence in the amended texts: "the previous read goes on", "a source handed in by that call is not read", "configuring the same inputs again does not read it", "only `restart` does", and "leaves before `begin()`". The older "between `begin()` and `fork()`" window is still stated separately and still true.

Nothing else in the amended texts contradicts the code. The `ExternalStore.ts` `notify` change is unchanged from iteration 1 and still correct. The phase-closing diff adds no leaked decision numbers, plan ids, requirement ids or phase numbers to source, tests or comments. The only ids in the new spec text are ADR/BEH/INV/CCR ids, which the repo allows. The code is untouched by 87267447, so the feeds' publish ordering stays as the phase requires. No critical issues or warnings remain. IN-01 and IN-02 carry forward, and IN-03 is new.

## Info

### IN-01: "A throw during a publish from the poll is stated as the poll's stop" holds only when the `Stopped` publish does not throw (carried forward, unchanged)

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:97-105`

**Issue:** `onFailure` runs inside `Effect.sync` in the run's `onExit` (`SupersedingRun.ts:118-124`). If a listener throws on the `Live` publish, it may throw on the `Stopped` publish too. That second throw is a defect in a finalizer, so nothing states the stop, status stays `Live`, and the poll is dead. The sentence now sits beside the new contract text and reads as stronger than it is.

**Fix:** Qualify it: "...is stated as the poll's stop, unless a listener throws on that `Stopped` publish too, in which case the status stays as it was."

### IN-02: No test pins the post-throw states the doc comments claim (carried forward, now includes the resize path)

**File:** `packages/devtools/test/model/TimelineFeed.test.ts` (TF25), `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F30)

**Issue:** The texts assert specific post-throw states: `Reading` with nothing reading, a diagnostics feed that stays `Starting` with no new poll, and, newly, the resize case where the old read continues and the new source is unread. TF25 and F30 cover only isolation and rethrow, through `accept` and `configure(undefined)`. A change that reordered `push()` and `readSource` would leave every test green while making the prose false.

**Fix:** Add one test per described window. For the resize case, subscribe a throwing listener, call `configure({ source: b, capacity: 2 })` from a feed on source `a` with capacity 5, and assert:
- the rethrow;
- no read of `b` started;
- `a`'s records still land in the new timeline;
- a repeat `configure` with the same inputs reads nothing;
- `status.restart()` reads `b`.

### IN-03: The resize text speaks of a "new" source, but the skipped read also covers an unchanged one

**File:** `packages/devtools/README.md:171-173`, `packages/devtools/src/model/TimelineFeed.ts:80-85`

**Issue:** `configure` re-reads whenever `resized`, even when the source is the same (`if (resized || next.source !== before.source) readSource(...)`), because the emptied timeline has to be refilled. A throw on the resize publish therefore also skips that refill for a capacity-only change. The README and the `configure` doc comment say "a new `source` in the same call is not read", which describes only the source-change case. A reader with a replaying source and a capacity-only `configure` is not warned that their timeline stays empty until `restart`. The `subscribe` comment and ADR/BEH say "a source handed in by that call", which is slightly closer, but they also frame it as a new source.

**Fix:** Say the read is skipped, not just a new source, for example: "ends the call before the read it would start: the previous read goes on, the emptied timeline is not refilled from the source, a new source is not read, and ...".

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
