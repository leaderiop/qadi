---
phase: 20-decision-cache-shared-computation
plan: 03
subsystem: core
tags: [decision-cache, single-flight, shared-computation, issue-64, ARCH-68]

requires:
  - phase: 20-02
    provides: "package-private SharedComputation.ts (awaitShared, the claim step); the RED #64 test in DecisionCache.test.ts"
provides:
  - "abandon-on-last-leave in packages/core/src/SharedComputation.ts: a claim is joinable only while somebody waits on it"
  - "two plain-key seam tests matching -t \"abandon\" in packages/core/test/SharedComputation.test.ts"
  - "20-01's \"uninterruptible regime\" test GREEN through evaluate, unedited (2 resolver invocations)"
affects: [20-04]

key-files:
  modified:
    - packages/core/src/SharedComputation.ts
    - packages/core/test/SharedComputation.test.ts

key-decisions:
  - "Of the three options the old doc comment listed, the first, taken at abandonment instead of at join: the last leaver marks the claim `abandoned` and removes it from `inFlight` (by identity) in the same `Effect.sync` that sees `waiters` reach 0, before `Fiber.interrupt`. No new error type, no public type change."
  - "An abandoned compute's result is NOT cached at all (its claim's settle is never called), rather than cached-unless-fresher. Writing it next to a fresh claim's result would double-append the key to DecisionCache's insertion order, the claim-window defect's shape."
  - "The identity-checked removal is factored into one `forget(key, entry)` helper used by both the abandoning leave and the compute's `onExit`."

requirements-completed: [CACHE-03, CACHE-04, XC-06]
duration: ~25 min
completed: 2026-11-10
status: complete
---

# Phase 20 Plan 03: Close the #64 follow-up gap — Summary

**A shared computation is joinable only while somebody waits on it: the last waiter to leave removes the claim from the in-flight table in the same synchronous step that abandons it, so a fresh ask starts its own compute instead of inheriting an interrupt it never received, and the abandoned compute's exit is dropped.**

## Precondition and decisions

`repro_outcome: reproduced` in 20-01-SUMMARY.md: met. `_DECISIONS.md` 20-01 T2 = `A` ("Only if #64 does not reproduce: stop the phase, keep the test as a pin"): its condition is not met, so it does not apply. 20-03 has no `checkpoint:decision` of its own.

## Tests first (RED)

Added to `SharedComputation.test.ts` (commit 78bc0852), sharing one choreography (`abandonWhileParked`): key `"k"`; compute counts its invocation, then `Effect.uninterruptible(started → await gate)`, then succeeds with the invocation number; A forks, `started` is awaited, `Fiber.interrupt(A)` is forked (not awaited), B forks, the gate opens.

- "a fresh ask never joins a computation every waiter has abandoned (#64)": B's exit is `Exit.succeed({ value: 2, outcome: "miss" })`, two invocations.
- "an abandoned computation writes nothing: only the fresh claim settles": the settle log is `[{ claim: 2, exit: Exit.succeed(2) }]`.

RED on 20-02's tree, for the predicted reasons: B's exit was a Failure whose cause is a single `Interrupt` (it joined A's claim), and the settle log held `{ claim: 1, exit: Failure(Interrupt) }` (A's settle was called; no second claim existed).

## The fix (commit daf75c97)

- `InFlightClaim` gains `abandoned: boolean` (false at claim).
- `awaitShared(key, entry)`'s `onInterrupt` sync step: decrement; if waiters remain, stop; otherwise set `abandoned`, `forget(key, entry)`, and return the fiber to interrupt, as before.
- The compute's `onExit`: `if (!entry.abandoned) settle(exit)`, then `forget(key, entry)` (a no-op after an abandonment or a `reset`), then `Deferred.done` (reaches nobody after an abandonment).
- Doc comments: the module header now states the regime as closed. The "Left open rather than guessed at here" paragraph above `awaitShared` is rewritten. It keeps the idle-and-interruptible cascade explanation (why the two REGRESSION PIN tests pass), states the new regime, names which of the three listed options was taken and why, cites the two "abandon" seam tests and `DecisionCache.test.ts`'s "issue #64, uninterruptible regime" test, and records the unchanged cost below. `InFlightClaim`'s doc describes `abandoned`.

### Which: not cached at all

An abandoned compute's eventual result is never cached, whatever its exit, because its claim's settle is never called. This holds even when no fresh claim exists. The alternative ("cache unless a fresher one exists") would need the adapter to compare claims and would still double-append in the window where both settle. Pinned by "an abandoned computation writes nothing" (uninterruptible regime) and by the amended "every waiter interrupted" assertion (idle regime, see Deviations).

### Observation (not in scope)

`Fiber.interrupt` awaits its target's exit, so the last leaver still waits until a compute parked uninterruptibly leaves that region, exactly as before. The new doc paragraph says so.

## Must-not-regress

- Single-flight for waiters still waiting: "two asks for one key…", "one of two waiters interrupted…", "an interrupted claimant leaves no waiter behind…" all pass. A join only reaches a claim with `waiters > 0`, and those are never removed.
- Both REGRESSION PIN tests: pass (inside the 39/39 DecisionCache run).
- `clear` generation semantics: unchanged. `reset` still empties `inFlight`, and the stale compute's removal is still identity-checked (`forget`). The "reset forgets in-flight claims" seam test and every DecisionCache `clear` test pass.
- `DecisionCache.test.ts` is unedited since 20-01: `git diff --numstat a7a5a8cb -- packages/core/test/DecisionCache.test.ts` → `64 0`.
- 20-01's test passes with **2** resolver invocations. Checked with a temporary `process.stdout.write` of `invocationsBeforeGate` (printed `INVOCATIONS=2`), then reverted with `git checkout` of that one file. Never committed.

## Verification

- `pnpm vitest run --project core packages/core/test/SharedComputation.test.ts`: 13/13. `… DecisionCache.test.ts`: 39/39, with no `-t` exclusion.
- Whole core project, no exclusion, `--coverage --coverage.include='src/**/*.ts'`: 62 files, 2034 passed, 0 skipped. All files 99.32%. SharedComputation.ts at 100% (absent from the not-full rows). DecisionCache.ts 100/92.85/100/100, as in 20-02.
- `pnpm test:bdd` (after `pnpm typecheck`): 34 files, 568 passed.
- `pnpm typecheck` exit 0. `pnpm lint` exit 0: house-style 445 files clean, 3 declared switches, UNTRACED_BUDGET unchanged, no warning in a touched file. `pnpm circular`: no cycle.
- `! grep -q 'Left open rather than guessed at here'` over SharedComputation.ts and DecisionCache.ts: pass.
- No `as`, `!` non-null assertion, `any`, `switch`, `Effect.orDie` or `Effect.fnUntraced` added.

## Bench after fix

Command: `pnpm bench packages/core/bench/DecisionCache.bench.ts --reporter=default`, by file path. The runs were **interleaved**: before, after, before, after, before, after. For each before-run, `SharedComputation.ts` was swapped to its pre-fix version (`git show 78bc0852:…`), and the HEAD version was put back for each after-run. The tree was clean afterwards. hz (ops/sec):

| Row | Before runs | Median | After runs | Median |
|-----|-------------|--------|------------|--------|
| hit (same subject/policy/resource) | 96,402 / 95,149 / 124,874 | 96,402 | 98,109 / 112,741 / 126,218 | 112,741 |
| hit, realistic tree | 83,167 / 85,522 / 106,950 | 85,522 | 84,368 / 105,782 / 109,201 | 105,782 |
| hit, fresh-but-equal subject | 50,119 / 45,928 / 67,374 | 50,119 | 49,301 / 67,796 / 67,825 | 67,796 |
| miss (distinct policy per call) | 56,678 / 60,233 / 77,323 | 60,233 | 57,749 / 76,687 / 76,722 | 76,687 |

The machine sped up roughly 30% between before-2 and after-2, so the medians favour "after" more than the code does. Compared pairwise, adjacent runs differ by at most ±2% (pair 1: +1.8 / +1.4 / −1.6 / +1.9 %; pair 3: +1.1 / +2.1 / +0.7 / −0.8 %). That is within noise. No row regresses. The fix adds one boolean read per exit and one helper call per last leave; the hit path is untouched.

## Mutation (XC-05)

Command: `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionCache.ts,packages/core/src/SharedComputation.ts'`. No temporary config was needed: the RED test is green, so the dry run passes.

| File | Base | After 20-02 | After 20-03 | Killed | Timeout | Survived | No cov |
|------|------|-------------|-------------|--------|---------|----------|--------|
| `DecisionCache.ts` | 0.9479 (`20-mutation-base.json`) | 0.9583 | **0.9583** (ratio 1.011) | 36 | 10 | 2 | 0 |
| `SharedComputation.ts` | none (new in 20-02) | 0.9836 | **0.9857** (69/70) | 69 | 0 | 1 | 0 |

The survivors are the same three judged in 20-02, and no new one appeared:
- SharedComputation.ts:282 `_tag: "Claimed"` → `""`: equivalent; `run` tests only `Hit` and `Joined`.
- DecisionCache.ts:278 `Option.isSome(oldest)` → `true`: unreachable inside the eviction loop. Carried over from the base.
- DecisionCache.ts:300 `generation += 1` → `-= 1`: equivalent; only inequality is read. Carried over from the base.

The new branches (`waiters > 0`, `abandoned = true`, `!entry.abandoned`, the `forget` identity check) are all killed.

## Deviations from Plan

1. **[Rule 1] One pre-existing seam assertion amended.** 20-02's "every waiter interrupted: compute is interrupted" asserted `settled` equals `["k:Failure"]`, which is the abandoned claim's interrupted exit being settled. The plan's "an abandoned compute's exit settles no cache write (its claim's settle is not called)" contradicts that assertion, so it now reads `[]`, with a one-line comment. The test's name and its behaviour (compute is interrupted) are unchanged. `DecisionCache.test.ts` is untouched.
2. **Bench interleaved from the start**, following 20-02's lesson about drift, instead of three sequential after-runs set beside 20-02's table. The "Bench after fix" table above holds both sides.
3. **Mutation run here.** The plan leaves mutation to 20-04. The caller asked for it in 20-03, so it ran here. 20-04 may reuse these numbers if `SharedComputation.ts` and `DecisionCache.ts` do not change again.

## Commits

- `78bc0852` test(20-03): a fresh ask never joins an abandoned computation, red
- `daf75c97` fix(20-03): a claim is joinable only while somebody waits on it (#64)
- docs(20-03): complete plan (this summary, ROADMAP, STATE)

## Deferred to 20-04

- Spec records for the regime: BEH/INV for "a claim is joinable only while somebody waits on it" and "an abandoned compute's exit is dropped", plus the "Fiber.interrupt awaits the parked compute" limit. Grep `spec/` to confirm ADR-QD-132 and CCR-QD-410 are free, then use them.
- The `@qadi/core` patch changeset: a fresh ask no longer inherits an abandoned compute's interrupt, and an abandoned compute's result is no longer cached.
- The final mutation compare. The numbers above stand unless the files change again.
- `pnpm check:pr`.

## Self-Check: PASSED
