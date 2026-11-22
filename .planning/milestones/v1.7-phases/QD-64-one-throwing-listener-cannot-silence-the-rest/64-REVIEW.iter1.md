---
phase: QD-64-one-throwing-listener-cannot-silence-the-rest
reviewed: 2026-11-20T16:20:00Z
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
  warning: 1
  info: 2
  total: 3
status: issues_found
---

# Phase QD-64: Code Review Report

**Reviewed:** 2026-11-20
**Depth:** standard
**Files Reviewed:** 18

## Summary

The `notify` change in `ExternalStore.ts` is correct. It iterates the live set, collects throws, rethrows by count (0 / 1 / many) and never inspects a thrown value's type. State is assigned before `notify` in both `set` and `publish`. `undefined` and `null` throws are handled by count, not truthiness. No `as`, `!`, `any`, `switch` or `async` appears in the diff, and no milestone decision numbers, plan ids or phase numbers leaked into shipped source, tests, test titles or comments. Spec ids (ADR-QD-177, BEH-QD-656, INV-QD-373) are allowed. `ARCH-111` and `CCR-QD-455` appear only in spec change history, as the repo's convention does.

I ran the four affected test files (101 tests, all pass) and `oxlint` on the store, its test and the helper (clean). I checked the tests against the code for vacuous passes:
- The `thrownBy` helper records `threw` separately, so a falsy throw is still asserted.
- F30, G48 and TF25 each reach a real notification, with non-empty `seen` assertions (`["Off"]`, `["Read"]`, `[["x"]]`).
- The nested `AggregateError` test checks identity for both the alone case and the beside case.

The spec claims I cross-checked all hold:
- Every `@qadi/devtools` store (feeds, dock, sessions) is built on `makeExternalStore`.
- The timeline feed's own store is a listener of the `inner` store under it.
- `@qadi/react`'s gate registry swallows listener throws.
- ADR-QD-173 named no listener rule before the amendment.
- `begin()` fences the old run by token, so "nothing reading" is accurate.

One caveat in the amended texts is incomplete, and one is conditional.

## Warnings

### WR-01: The out-of-scope caveat omits the timeline's resize path, where a throw skips `readSource` entirely and the new source is never read

**File:** `packages/devtools/src/model/TimelineFeed.ts:166-172` (text affected: `TimelineFeed.ts:56-64`, `packages/devtools/README.md:164-171`, `spec/decisions/177-one-throwing-listener-cannot-silence-the-rest.md` decision 5, `spec/behaviors/28-devtools-screens.md` BEH-QD-656 trailing paragraph, the CCR-QD-455 row in `spec/README.md`)

**Issue:** Every amended text describes the escape window as "between a feed's run `begin()` and its `fork()`". It names the `Reading`-over-`Stopped` and `Starting` cases as the only examples. The timeline's `configure` has an earlier throw point that the window does not cover:

```ts
inputs = next;
const resized = next.capacity !== before.capacity;
if (resized) {
  inner = bounded(next.capacity);
  inner.subscribe(push);
  push();            // view.publish -> notify -> may throw here
}
if (resized || next.source !== before.source) readSource(next.source);
```

When a capacity change comes with a source change and a listener throws on `push()`, the throw leaves before `readSource` runs. Three things follow:
- `begin()` is never called, so the old read is not fenced and keeps writing into the new `inner`.
- The new source is never read.
- `inputs` already holds `next`, so a later `configure` with the same source sees `next.source === before.source` and never re-reads. Only `restart()` recovers.

The result is not "`Reading` with nothing reading". Status is unchanged, and the feed reads the old source indefinitely while the host believes it handed over a new one. Because `notify` now deliberately lets the throw through, this path is the contract's main user-visible consequence. The texts say "the rest of that call does not run", but they then spell out the window as the only residue, so a reader would conclude `push()` is safe.

**Fix:** State the second point in each amended text, for example in BEH-QD-656 and ADR-QD-177 decision 5:

> A throw on the timeline's resize publish (`configure` with a new `capacity`) leaves before `readSource`, so a source handed in the same call is not read and the old read keeps running until `restart`.

Or close it in code, which is out of this phase's scope: call `readSource` before `push()`, or wrap `push()` and rethrow after. If the code is left alone, add one test that pins the behaviour.

## Info

### IN-01: "A throw during a publish from the poll is stated as the poll's stop" holds only when the `Stopped` publish itself does not throw

**File:** `packages/devtools/src/model/DiagnosticsFeed.ts:97-105`

**Issue:** This sentence was kept from the earlier text. A listener that throws on the `Live` publish is the likely one to throw again on the `Stopped` publish. `onFailure` runs inside `Effect.sync` in the run's `onExit` (`SupersedingRun.ts:118-124`). A throw there is a defect inside a finalizer, so nothing states the stop, status stays `Live`, and the poll is dead. The new "every listener is called" contract does not change this, and the doc now sits beside the new contract text, so it reads as stronger than it is.

**Fix:** Qualify it: "...is stated as the poll's stop, unless a listener throws on that `Stopped` publish too, in which case the status stays as it was."

### IN-02: No test pins the `Starting` / `Reading` window claims the new doc comments make

**File:** `packages/devtools/test/model/DiagnosticsFeed.test.ts` (F30), `packages/devtools/test/model/TimelineFeed.test.ts` (TF25)

**Issue:** The new texts assert specific post-throw states: the diagnostics feed "stays `Starting` with no new poll", and the timeline "says `Reading` with nothing reading". F30 and TF25 only cover the isolation and rethrow contract, through `configure(undefined)` and `accept`. Neither exercises the `restart` / `configure` publish of `Starting` or `Reading` that the caveats describe. These are the exact statements a previous review caught records overstating the code on, and they are currently unpinned. `ExternalStore.ts` still does the isolation correctly, so this is a documentation-risk gap, not a defect.

**Fix:** Add one test per feed. Subscribe a throwing listener, call `restart()` from `Live` / `Stopped`, assert the rethrow, assert the status tag is `Starting` / `Reading`, and assert no further samples or records arrive under `TestClock`.

---

_Reviewed: 2026-11-20_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
