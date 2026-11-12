---
phase: 35-the-atom-set-owns-its-eviction-sweep
reviewed: 2026-11-12T22:30:00Z
depth: standard
files_reviewed: 17
files_reviewed_list:
  - packages/react/src/QadiAtoms.ts
  - packages/react/src/QadiProvider.tsx
  - packages/react/src/QuestionBook.ts
  - packages/react/src/SweepScheduler.ts
  - packages/react/test/QadiAtoms.sweep.test.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/react/test/QadiProvider.sweep.test.tsx
  - packages/react/test/QadiProvider.test.tsx
  - packages/react/test/QuestionBook.test.ts
  - packages/react/test/SweepScheduler.test.ts
  - packages/react/test/support/settle.ts
  - packages/react/test/support/sweepCounter.ts
  - packages/react/test/v4-reactivity-smoke.test.ts
  - .changeset/atom-set-sweep.md
  - .changeset/question-book.md
  - apps/website/src/content/docs/docs/reference/upgrading.md
  - stryker.react.mjs
findings:
  critical: 0
  warning: 1
  info: 3
  total: 4
  necessity: 0
status: issues_found
---

# Phase 35: Code Review Report

**Reviewed:** 2026-11-12T22:30:00Z
**Depth:** standard
**Files Reviewed:** 17
**Status:** issues_found

## Summary

The mechanism holds up under adversarial tracing. I read `effect`'s `Scheduler.js` and `yieldNowWith` directly:

- `Effect.yieldNow` resumes through `MixedSchedulerDispatcher`, which uses `setImmediate` (or `setTimeout` 0) and drains a swapped-out bucket list. A task scheduled during a drain therefore lands in the next macrotask. The sweep cannot run inside the render path or inside a registry's dispose-then-reread stack.
- The pending flag clears immediately before `sweep()`, in one synchronous `Effect.sync`. A release landing between the clear and the sweep is impossible, and a release landing before it is picked up by the sweep, which reads live state.
- `sweep` raises no signal, so no signal can be lost to a running sweep.
- `sweep` only evicts `liveCount === 0` entries, so a live entry is never evicted.
- A throwing sweep cannot wedge the flag, because the flag is already cleared.
- There is no module-scope state. The fork slot is an `#fork` private field.
- No leaked fibers: each fiber is one-shot, with no timer.

Beyond reading, I ran the seven affected react test files three times (118 tests, all green, no flake). `check-house-style.mjs` is clean, and `tsc --noEmit` for `@qadi/react` is clean. oxlint reports only three pre-existing unused-parameter warnings (`QadiAtoms.ts:362`, `v4-reactivity-smoke.test.ts:284,321`), none introduced here.

The doc comments name no plan ids. `ADR-QD-148`, `ADR-QD-080` and `CCR-QD-150` are the repo's normal citation style and the ADR file exists. No `as`, `!`, `any`, `switch`, `async` or `console` appears in the changed `src` files. No mention of `sweepIntervalMillis` or `sweepEvictions` remains anywhere under `packages/`, `examples/` or `apps/website`, apart from `upgrading.md` and the changeset. The changeset and upgrading text match the code.

What remains is one robustness gap in the scheduler and three minor items.

## Warnings

### WR-01: A fork that throws or never dispatches leaves the pending flag stuck true, and the bound stops holding with no recovery

**File:** `packages/react/src/SweepScheduler.ts:51-55`
**Issue:** `request` sets `pending = true` and then calls `fork(episode)`. The flag is cleared only inside the episode, so it clears only if the fork starts the episode and the episode reaches its `Effect.sync`. Two ways to get there:

- **A throwing fork.** `SweepFork` is an injectable seam (`withSweepFork`), and a fork that throws leaves `pending` true permanently. Every later `request` returns at the `if (pending) return` guard, and the atom set stops enforcing `maxTrackedQuestions` for the rest of its life. No test covers a throwing fork.
- **A discarded timer.** The default fork is `Effect.runFork`. `Scheduler.js` documents that on some runtimes (its Cloudflare Workers note) request-owned scheduler timers can be discarded, leaving fibers suspended. In that case the episode never resumes, `pending` never clears, and the failure is silent.

The default fork cannot throw in Node or a browser, so only the second path is plausible in production. The failure is still silent and permanent for the lifetime of the atom set, and the header comment advertises that a wedged scheduler is impossible ("a throwing sweep cannot wedge the scheduler"), which is true only of the sweep and not of the fork.

**Fix:** Make the flag self-healing at the fork call, and add a test with a fork that throws.
```ts
request: () => {
  if (pending) return;
  pending = true;
  try {
    fork(episode);
  } catch (cause) {
    pending = false;
    throw cause;
  }
},
```
The discarded-timer case cannot be fixed at this layer. If it matters for a supported runtime, say so in the header comment rather than claiming the scheduler cannot wedge.

## Info

### IN-01: The "What this closure owns" comment block now sits above `scheduler`, not above the `book` it describes

**File:** `packages/react/src/QadiAtoms.ts:320-321`
**Issue:** The long comment about the question book, structural keying and `v4-reactivity-smoke.test.ts` previously led directly into `const book = makeQuestionBook(...)`. The new `const scheduler = ...` line was inserted between the comment and the book, so the comment now reads as describing the scheduler. It also does not mention the scheduler, even though it is a new per-atom-set owner that belongs in the "everything per-atom-set lives here" list.
**Fix:** Move `const scheduler = makeSweepScheduler(...)` above the comment block, with a one-line comment of its own (`// The sweep's deferral: one pending flag per atom set`). Alternatively, add the scheduler to the list of things the closure owns.

### IN-02: `S9`'s mid-wait assertions depend on the dispatcher's bucket-drain order

**File:** `packages/react/test/QadiAtoms.sweep.test.ts:196-199`
**Issue:** After the unmounts, the test does one `await Effect.runPromise(Effect.yieldNow)` and then asserts `forks === 1` and `sweeps === 0`. That is a precise claim about interleaving: the registry removals run in the first drained bucket, the fork's `yieldNow` lands in the next, and the test's continuation resumes in between. It holds today, and I confirmed it against `MixedSchedulerDispatcher.runTasks` (drain swaps the buckets). It is coupled to scheduler internals that `v4-reactivity-smoke.test.ts` does not pin, so an `effect` bump that changes batching would fail here with a confusing message. The same shape does not appear in the provider tests, which use `settle` and `waitFor`.
**Fix:** Either pin the "fork is one turn behind the release" ordering in `v4-reactivity-smoke.test.ts` and cite it here, or assert `sweeps` stays 0 only at the fork (`sweepsAtFork`, already asserted below) and drop the mid-wait `sweeps === 0`.

### IN-03: "One macrotask later" understates the release path

**File:** `packages/react/src/QadiAtoms.ts:210`, `.changeset/atom-set-sweep.md:6`, `apps/website/src/content/docs/docs/reference/upgrading.md:555`
**Issue:** Three places say the sweep runs "one macrotask" after the book goes over its bound. That is exact for an admission. For the release-after-unmount path, the registry removes its node a macrotask after the unmount (pinned by the smoke test "the last unsubscribe removes a node a macrotask later"), and only then does the book signal, so the sweep is at least two macrotasks after the unmount. `settle.ts` already says this ("A release after an unmount needs two or more turns"). Public docs say "one macrotask after the book passes it", which is technically right but easy to read as "one macrotask after unmount".
**Fix:** Say "a macrotask after the book goes over it" in the public docs, or "within a few macrotasks", and keep the precise count to the test helper's comment.

---

_Reviewed: 2026-11-12T22:30:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
