---
phase: 20-decision-cache-shared-computation
plan: 02
subsystem: core
tags: [decision-cache, single-flight, shared-computation, issue-64, ARCH-68]

requires:
  - phase: 20-01
    provides: "the RED #64 uninterruptible-regime test; phase_base a7a5a8cb; DecisionCache.ts mutation base 0.9479"
provides:
  - "package-private packages/core/src/SharedComputation.ts (makeSharedComputation, Shared, SharedComputationHooks, SharedComputation)"
  - "packages/core/test/SharedComputation.test.ts: 11 plain-key tests (string keys, Deferred latches, Ref counters, no walk)"
  - "DecisionCache delegates single-flight to it; generation counting and FIFO eviction stay in DecisionCache.ts"
affects: [20-03, 20-04]

key-files:
  created:
    - packages/core/src/SharedComputation.ts
    - packages/core/test/SharedComputation.test.ts
  modified:
    - packages/core/src/DecisionCache.ts

key-decisions:
  - "`onOutcome` hook needed: yes. Today's metric runs between the claim and the wait, so a coalesced join still waiting is counted. It is a constructor hook (one closure per cache, not one per call), not a per-call `run` argument."
  - "`reset()` added to the module's interface (not in the plan's sketch): `clear` empties the in-flight table, and that table now lives in the module. A plain synchronous function so `clear` stays one `Effect.sync` step."
  - "`run` is generic over `R` (the plan's sketch had `Effect<A, E>`): `getOrCompute`'s compute needs `PortServices`."
  - "Outcome type reuses `CacheOutcome` from EvaluationMetrics.ts (type-only import, no cycle) rather than declaring a second identical union."

requirements-completed: []
duration: ~45 min
completed: 2026-11-10
status: complete
---

# Phase 20 Plan 02: Extract the shared computation — Summary

**`DecisionCache`'s single-flight protocol now lives in a package-private `SharedComputation.ts`, generic over its key and tested with plain string keys and latches; the cache delegates to it with its interface, metric order and every existing test unchanged, and 20-01's #64 test is still RED for the same reason.**

## Precondition

`repro_outcome: reproduced` in 20-01-SUMMARY.md: met. `_DECISIONS.md` 20-01 T2 = `A` ("Only if #64 does not reproduce: stop the phase, keep the test as a pin"): its condition is not met, so it does not apply.

## What moved

- `InFlightClaim` (now `<A, E>`), `awaitShared`, and the hit/join/claim step, with every doc comment that describes them, including the "open gap (issue #64 follow-up)" paragraph above `awaitShared`, moved verbatim apart from renaming `getOrCompute` to `run` where the comment means the module's own function. 20-03 rewrites that paragraph.
- `Effect.uninterruptibleMask`, `Deferred.makeUnsafe` inside the sync step, `Effect.onExit` and `Effect.forkDetach` are unchanged.
- The hit check stays in the claim step: the module calls the cache's `cached(key)` inside the same `Effect.sync` as the join and the claim, so the claim-window fix is kept.
- The `claim(key)` hook runs inside that step (the cache reads `generation` there) and returns the per-claim settle. The settle runs synchronously in the compute's `onExit`, before the identity-checked `inFlight` removal and before `Deferred.done`. The original had the write and the removal as two chained `Effect.sync` steps; they are now one step, which removes a yield point and nothing else.
- DecisionCache keeps `entries`, `insertionOrder`, `generation`, the FIFO loop and their comments. A one-line pointer says where single-flight went. `getOrCompute` is `Effect.map(shared.run(key, compute), …)` to keep `CacheLookup`'s `trace` field.

## Tests (written RED first)

`packages/core/test/SharedComputation.test.ts`, 11 tests (one assertion added after the mutation run): one key coalesces (outcomes `miss`, `coalesced`, the join counted while still waiting); two keys give two computes; cached means `hit` with no compute; a key cached between two asks is a hit, never a second claim; a failure settles every waiter and the cache keeps nothing, then a retry runs fresh; one of two waiters interrupted leaves compute running; every waiter interrupted interrupts compute; the settle runs once per claim, before any waiter observes; an interrupted claimant leaves no waiter behind (a later ask joins and gets the value); the claimant's leave is counted (once the remaining waiters leave, compute is interrupted); `reset` forgets claims, and the stale compute does not remove the fresh claim.

RED: `Failed to resolve import "../src/SharedComputation.ts"` (commit 27dc92d7). GREEN after 37de116c: 11/11.

## The #64 test after the extraction: still RED, same reason

`pnpm vitest run --project core packages/core/test/DecisionCache.test.ts -t "uninterruptible regime"`:

```
AssertionError: fresh ask B got a failure (interrupts only: true); resolver invocations before the gate opened: 1: expected false to be true
 × a fresh ask joining a compute abandoned inside a port's uninterruptible region gets a real answer — issue #64, uninterruptible regime
```

This is the same message as in 20-01: B joined (one invocation) and inherited A's interrupt.

## Bench before

Command: `pnpm bench packages/core/bench/DecisionCache.bench.ts --reporter=default` on the unchanged tree (c014a5c2), three runs, hz (ops/sec):

| Row | Run 1 | Run 2 | Run 3 | Median |
|-----|-------|-------|-------|--------|
| hit (same subject/policy/resource) | 74,173 | 100,362 | 91,378 | 91,378 |
| hit, realistic tree | 72,980 | 95,766 | 75,611 | 75,611 |
| hit, fresh-but-equal subject | 47,664 | 53,579 | 45,329 | 47,664 |
| miss (distinct policy per call) | 61,322 | 49,814 | 48,228 | 49,814 |

## Bench after

A plain after-run (three runs, right after the change) came out 30–40% faster on every row: 124,463 / 104,623 / 65,836 / 75,528 medians. That is machine drift, not a gain, so both sides were re-measured **interleaved** (before, after, before, after, …; the "before" file restored from c014a5c2 for each before-run, then the working copy restored):

| Row | Before (interleaved) runs | Median | After (interleaved) runs | Median |
|-----|---------------------------|--------|--------------------------|--------|
| hit | 95,191 / 112,493 / 114,463 | 112,493 | 125,088 / 97,502 / 122,310 | 122,310 |
| hit, realistic tree | 96,431 / 100,673 / 101,738 | 100,673 | 106,300 / 103,392 / 103,346 | 103,392 |
| hit, fresh-but-equal subject | 61,868 / 62,299 / 64,698 | 62,299 | 66,606 / 65,014 / 64,881 | 65,014 |
| miss | 71,295 / 66,067 / 70,784 | 70,784 | 74,187 / 74,943 / 73,452 | 74,187 |

No row regresses: every after-median is at or above its before-median and inside the before-runs' spread. No inlining was needed. No row was added (the bench header's argument against a `coalesced` row stands).

## Mutation (XC-05)

Command: `pnpm exec stryker run <temp config> --mutate 'packages/core/src/DecisionCache.ts,packages/core/src/SharedComputation.ts'`, then scored with 20-01's node one-liner on `reports/mutation/mutation.json`. Dry run: "Initial test run succeeded" (the RED test excluded, see Deviations).

| File | Base (`20-mutation-base.json`) | First run | Final | Killed | Timeout | Survived | No cov |
|------|------|-----------|-------|--------|---------|----------|--------|
| `DecisionCache.ts` | 0.9479 | 0.9583 | **0.9583** (ratio 1.011) | 36 | 10 | 2 | 0 |
| `SharedComputation.ts` | none (new) | 0.9672 | **0.9836** | 60 | 0 | 1 | 0 |

No touched file drops. SharedComputation.ts has no base, because it does not exist at the phase base. Its first measurement is recorded here and **not** written into `20-mutation-base.json`, which stays a phase-base file. 20-04 holds it to the break threshold (80).

Each survivor checked:

- **SharedComputation.ts `fiber === undefined` → `false`** (first run): **reachable, killed.** A non-last waiter's leave would call `Fiber.interrupt(undefined)` and die inside its own `onInterrupt`. The "one of two waiters interrupted" test now asserts that the leaving waiter's exit is interrupts-only. The mutant was applied by hand and the test fails on it (commit 75a1f4c4).
- SharedComputation.ts:241 `_tag: "Claimed"` → `""`: equivalent. `run` tests `Hit` and `Joined`, and everything else is the claim, so the literal is never read.
- DecisionCache.ts:278 `Option.isSome(oldest)` → `true`: equivalent and unreachable. Inside the eviction loop `insertionOrder` is never empty; the comment above it says why. This survivor carries over from the base (5 survivors there).
- DecisionCache.ts:300 `generation += 1` → `-= 1`: equivalent. Only inequality with the captured value is read. Also carried over from the base.

## Verification

- `pnpm vitest run --project core packages/core/test/SharedComputation.test.ts && pnpm exec tsc -b packages/core`: pass (11/11).
- `SharedComputation` is not in `packages/core/src/index.ts`; there is no `fnUntraced` in the module: pass.
- `pnpm vitest run --project core packages/core/test/DecisionCache.test.ts -t "^(?!.*uninterruptible regime)"`: 38 passed, 1 skipped (the RED test). `-t "REGRESSION PIN"`: 2 passed.
- `! pnpm vitest run … -t "uninterruptible regime"`: RED as required (quoted above).
- `git diff --numstat a7a5a8cb… -- packages/core/test/DecisionCache.test.ts`: `64 0` (20-01's lines only, 0 deletions).
- Whole core project `-t "^(?!.*uninterruptible regime)"` with `--coverage.include='src/**/*.ts'`: 62 files, 2031 passed, 1 skipped. All files 99.32% statements. SharedComputation.ts is at 100% (absent from the not-full rows); DecisionCache.ts is 100/92.85/100/100.
- `pnpm typecheck` exit 0. `pnpm lint` exit 0 (house-style 445 files clean; UNTRACED_BUDGET unchanged; no warning in the touched files). `pnpm circular`: no cycle.

## Deviations from Plan

1. **[Rule 3 - Blocking] Bench command.** `pnpm bench --project core …` fails with "No projects matched the filter core" (the Phase 16 note: `--project` does not work in bench mode). Ran by file path with `--reporter=default` instead.
2. **[Rule 3 - Blocking] Module interface.** Added `reset()` (`clear` must empty the in-flight table, which moved into the module) and a generic `R` on `run` (the compute needs `PortServices`). `onOutcome` is a constructor hook, not a per-call argument (see key-decisions).
3. **Interleaved bench re-run** (described above), because the sequential after-run was skewed by machine drift.
4. **Mutation run config.** Stryker's dry run fails on any failing test, and the RED test is in DecisionCache.test.ts. The run used a temporary vitest config (`testNamePattern: "^(?!.*uninterruptible regime)"`, merged over `packages/core/vitest.config.ts`) and a temporary Stryker config pointing at it. Both files were deleted after the run and never committed.

## Commits

- `27dc92d7` test(20-02): single-flight over a plain key, red
- `37de116c` feat(20-02): SharedComputation, single-flight over a generic key
- `36eb0a2e` refactor(20-02): DecisionCache delegates single-flight to SharedComputation
- `75a1f4c4` test(20-02): a waiter's leave is an interrupt and nothing else
- docs(20-02): complete plan (this summary, ROADMAP, STATE)

## Notes for 20-03 / 20-04

- 20-03: fix #64 in `SharedComputation.ts`, where `awaitShared` and the claim step now live. Pin it RED first in `SharedComputation.test.ts` with a plain key (`-t "abandon"`), using a compute parked in `Effect.uninterruptible`. Then rewrite the "Left open rather than guessed at here" paragraph above `awaitShared` (now in SharedComputation.ts). After the fix, the DecisionCache "uninterruptible regime" test must be GREEN with 2 invocations, and the `-t` exclusion is dropped.
- 20-04: the mutation compare against `20-mutation-base.json` (DecisionCache.ts 0.9479); SharedComputation.ts has no base (0.9836 after 20-02, recorded only in this summary), threshold 80. Stryker's dry run fails while the RED test exists, so a run before 20-03 needs the same temporary `testNamePattern` config (Deviations 4). Spec records (BEH/INV for the regime, ADR-QD-132 and CCR-QD-410 after grepping that they are free), the `@qadi/core` patch changeset, and `check:pr`.

## Self-Check: PASSED
