---
phase: 20-decision-cache-shared-computation
plan: 01
subsystem: core
tags: [decision-cache, issue-64, uninterruptible-regime, mutation-base, ARCH-68]

repro_outcome: reproduced
phase_base: a7a5a8cb876f274dc5237c3e1822fd5e4a664377
repro_tally: "20/20 runs RED for the stated reason (B's exit interrupts-only; 1 resolver invocation before the gate); 0 passes, 0 other failures"
mutation_baseline:
  packages/core/src/DecisionCache.ts: 94.79 (91/96; 81 killed, 10 timeout, 5 survived, 0 no-coverage)

requires: []
provides:
  - "RED test `a fresh ask joining a compute abandoned inside a port's uninterruptible region gets a real answer — issue #64, uninterruptible regime` in packages/core/test/DecisionCache.test.ts"
  - "20-base.txt and 20-mutation-base.json (DecisionCache.ts 0.9479)"
affects: [20-02, 20-03, 20-04]

key-files:
  created:
    - .planning/phases/20-decision-cache-shared-computation/20-base.txt
    - .planning/phases/20-decision-cache-shared-computation/20-mutation-base.json
  modified:
    - packages/core/test/DecisionCache.test.ts

requirements-completed: []
duration: ~15 min
completed: 2026-11-10
---

# Phase 20 Plan 01: Reproduce the #64 follow-up gap — Summary

**The issue-#64 follow-up gap reproduces deterministically through `DecisionCache`'s current interface: a fresh ask that was never interrupted joins a compute abandoned inside a port's uninterruptible region and receives that compute's interrupt.**

## Phase base

`phase_base: a7a5a8cb876f274dc5237c3e1822fd5e4a664377` (HEAD before this phase's first commit; also in `20-base.txt`).

## Mutation base (XC-05)

Taken before any change: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionCache.ts'`, scored with the plan's node one-liner into `20-mutation-base.json`.

| File | Score | Killed | Timeout | Survived | No coverage |
|------|-------|--------|---------|----------|-------------|
| `packages/core/src/DecisionCache.ts` | 0.9479 | 81 | 10 | 5 | 0 |

The Stryker sandbox was created (11:10:14) before the test file was edited (about 11:10:35), so the base measures the phase base's tests. `SharedComputation.ts` does not exist yet; 20-04 holds it to the break threshold (80).

## Task 1: the reproduction

The test is appended after the two existing REGRESSION PIN tests, in the same `describe`. It follows the plan's `<behavior>` exactly:

1. The resolver bumps `invocations`, then runs `Effect.uninterruptible(Deferred.succeed(started) → Deferred.await(gate))`, then answers 5.
2. Under `testLayer(alice, { AttributeResolver }) + decisionCacheLayer()`: fork A = `evaluate(needsLookup)`, await `started`.
3. Fork `Fiber.interrupt(fiberA)` (not awaited, per the plan's deadlock pitfall), then 20 `Effect.yieldNow`.
4. Fork B = `evaluate(needsLookup)`, then 20 `Effect.yieldNow`; read `invocationsBeforeGate` (reported, not asserted).
5. Open the gate, `Fiber.await(fiberB)`, join the interrupter.
6. Assert `Exit.isSuccess(exitB) && isAllowed(exitB.value)`; the message carries the invocation count and whether B's cause is interrupts only.

Result on the phase base, every run:

```
AssertionError: fresh ask B got a failure (interrupts only: true); resolver invocations before the gate opened: 1
```

- **20/20 runs RED for that exact message** (`for i in $(seq 1 20)` loop, each matched against the message). No intermittency, so no tightening was needed.
- `invocationsBeforeGate = 1` shows B **joined** the abandoned compute rather than claiming a new one. This is the mechanism the doc comment above `awaitShared` predicts: `Fiber.interrupt(entry.fiber)` only records the interrupt while the compute is uninterruptible, the entry stays in `inFlight` with `waiters` at 0, B's join raises it to 1, and when the region ends the compute's `onExit` settles `claim` with the interrupted exit.
- The assertion is only that B gets an allow, so the same test turns green under 20-03's fix, where B claims a fresh compute (invocations then 2).
- No `.skip`, `.fails`, `it.todo` or try/catch; no `as`.

## Task 2: skipped

`repro_outcome: reproduced`, so the conditional checkpoint does not apply. `_DECISIONS.md` answers 20-01 T2 (conditional) as `A`: "Only if #64 does not reproduce: stop the phase, keep the test as a pin." Its condition is not met, so A was not applied. The phase continues, and the "open gap" doc comment in `DecisionCache.ts` is left for 20-03, which closes the gap.

## Verification

- Plan verify 1 (`repro_outcome`, 40-hex `phase_base`, non-empty `20-mutation-base.json`): pass.
- Plan verify 2 (`! pnpm vitest run --project core …DecisionCache.test.ts -t "uninterruptible regime"`): the test is RED, as required.
- Plan verify 3 (`-t "REGRESSION PIN"`): both pins pass. All 38 other DecisionCache tests pass (`-t "^(?!.*uninterruptible regime)"`).
- `pnpm typecheck` exit 0; `oxlint` on the test file clean; `node scripts/check-house-style.mjs` clean (443 files).

## Deviations from Plan

None. The plan's own `phase_base` grep requires a 40-character sha, so the full form of `a7a5a8cb` is recorded.

## Commits

- `e5a0403f` test(20-01): a fresh joiner inherits an abandoned compute's interrupt (#64), red
- docs(20-01): complete plan (this summary, ROADMAP, STATE)

## Notes for 20-02..20-04

- The new test is RED until 20-03. Every core run in 20-02 must exclude it: `-t "^(?!.*uninterruptible regime)"`. 20-02 also asserts it is still RED after the extraction.
- 20-03 closes the gap, then rewrites the "open gap (issue #64 follow-up)" paragraph above `awaitShared` ("Left open rather than guessed at here") to cite the fix and this test.
- 20-04 compares `DecisionCache.ts` against 0.9479 and holds the new `SharedComputation.ts` to 80.
- Ids for the phase: ARCH-68, ADR-QD-132, CCR-QD-410 (PROJECT.md reservations); BEH/INV from the reservations or the free leftovers.

## Self-Check: PASSED
