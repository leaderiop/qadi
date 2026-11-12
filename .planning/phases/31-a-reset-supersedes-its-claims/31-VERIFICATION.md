---
phase: 31-a-reset-supersedes-its-claims
verified: 2026-11-12T09:30:00Z
status: passed
score: 4/4 must-haves verified
covered_files:
  - ".changeset/shared-computation-reset-supersedes.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-01-PLAN.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-01-SUMMARY.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-02-PLAN.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-02-SUMMARY.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-03-PLAN.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-03-SUMMARY.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-04-PLAN.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-04-SUMMARY.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-05-PLAN.md"
  - ".planning/phases/31-a-reset-supersedes-its-claims/31-05-SUMMARY.md"
  - "packages/core/src/DecisionCache.ts"
  - "packages/core/src/SharedComputation.ts"
  - "packages/core/test/SharedComputation.test.ts"
  - "spec/behaviors/21-decision-cache.md"
  - "spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md"
  - "spec/invariants.md"
covered_digest: "v4:sha256:f7985b020ae950b690c63871e442a227ef7835f0dae3ec516d7068f6668f1f56"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 31: A reset supersedes its claims Verification Report

**Phase Goal:** `SharedComputation` owns its own staleness rule: a reset supersedes every in-flight claim, so the decision cache keeps no generation counter and a stale answer cannot re-enter a cleared cache.
**Verified:** 2026-11-12
**Status:** passed
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | After a reset every waiter of an in-flight claim is answered exactly once, the superseded exit never reaches `settle`, its compute is still interrupted when its last waiter leaves, an ask after the reset claims afresh; pinned at the seam by stale-last, stale-first plus third ask, two-key and parked-uninterruptible races | VERIFIED | `SharedComputation.ts`: closed `Standing = "Live" \| "Superseded" \| "Abandoned"`; `reset` maps every in-flight entry through `afterReset` then empties `inFlight`; the compute's `onExit` calls `hooks.settle` only when `standing === "Live"` while `Deferred.done` always runs; `awaitShared`'s last leaver still interrupts the fiber (`afterLastLeave` keeps Superseded). `SharedComputation.test.ts` has the four named race tests (lines 395, 426, 459, 501) plus the amended reset test (316), none going through `evaluate`. I ran SharedComputation.test.ts and DecisionCache.test.ts: 2 files, 57 tests, all passed. |
| 2 | `DecisionCache` has no `generation`/`myGeneration` or stale-write check; `clear` is only the steps the adapter still owns; seam tests landed before the deletion; existing `DecisionCache.test.ts` pins pass unchanged | VERIFIED | `grep -i generation packages/core/src/DecisionCache.ts` is empty. `clear` (line 273) ends in `shared.reset()`. `git diff 7d89747a..HEAD -- packages/core/test/DecisionCache.test.ts` is empty (byte-identical). Commit order from `git log`: `f3cdf7a3` (RED seam races) then `f29466c4` (standing) then `ce9d2a46` (counter deleted, alone), then `22c33642` (settle hook). Only `audit/CircuitBreaker.ts` still uses "generation", unrelated. |
| 3 | A property test over generated run/reset/settle/leave interleavings holds: no superseded exit settled, every waiter answered exactly once, post-reset ask claims afresh | VERIFIED | `SharedComputation.test.ts` lines 565 to 860: a model-based `FastCheck` property (`numRuns: 300, seed: 3101`) comparing the settle log, answers, started and interrupted computes to a reference model after every step, with coverage floors (at least 30 each for superseded-settled, superseded-last-leave, claim-beside-superseded) so the property cannot pass vacuously. Commands dispatch via `Match.tagsExhaustive`. Passes in my run. |
| 4 | The staleness rule is a stated behaviour: new BEH under the decision-cache behaviour, BEH-QD-439 and INV-QD-025's Enforcement restated, ADR-QD-132 amended | VERIFIED | `spec/behaviors/21-decision-cache.md` v1.9 adds BEH-QD-491 ("A stale answer never re-enters a cleared cache") and BEH-QD-439 names the superseded state; `spec/invariants.md` has INV-QD-307 and INV-QD-025 restated; `spec/decisions/132-...md` amended; `spec/traceability.md` 1.155 rows; CCR-QD-422 in `spec/README.md`; patch changeset `.changeset/shared-computation-reset-supersedes.md` for `@qadi/core`. Only the reserved numbers are used (BEH-QD-491, INV-QD-307; ADR-QD-144 left unused, ADR-QD-132 amended, as the roadmap anticipated). |

**Score:** 4/4 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `packages/core/src/SharedComputation.ts` | VERIFIED | `Standing` field, `reset`, `settle(key, exit)` hook replacing the claim-time hook; wired from `DecisionCache.ts` (`settle` at line 229, `shared.reset()` at line 280). Header doc says an abandoned or superseded exit is withheld from the adapter (review fix IN-03). |
| `packages/core/src/DecisionCache.ts` | VERIFIED | No generation counter; adapter keeps only settled-answer memory and FIFO eviction. |
| `packages/core/test/SharedComputation.test.ts` | VERIFIED | Seam races and property, substantive and passing. |
| Spec records (BEH-491, INV-307, ADR-132, traceability, CCR-422, changeset) | VERIFIED | Present and cross-linked. |

### Key Link Verification

| From | To | Status | Details |
|------|----|--------|---------|
| `DecisionCache.clear` | `SharedComputation.reset` | WIRED | `clear` calls `shared.reset()` inside its own `Effect.sync` step, with no generation bookkeeping around it. |
| compute `onExit` | `hooks.settle` | WIRED | Gated on `standing === "Live"`, before `Deferred.done`. |
| `awaitShared` last leave | `Fiber.interrupt` | WIRED | Unchanged for superseded claims. |

### Data-Flow Trace (Level 4)

Not applicable: no rendered data. The flow is an internal single-flight value path, exercised end to end by the seam tests and the `DecisionCache.test.ts` race pins.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Seam races, property and the unchanged cache race pins | `npx vitest run --project core packages/core/test/SharedComputation.test.ts packages/core/test/DecisionCache.test.ts` | 2 files, 57 tests passed | PASS |
| Full merge gate on the final HEAD (orchestrator-run log) | `pnpm check:pr < /dev/null` | EXIT=0, 16 of 17 steps (mutation is release-PR only) | PASS (log read, not re-run) |

### Probe Execution

Step 7c: SKIPPED. The phase declares no probe scripts.

### Requirements Coverage

Every ID in the plan frontmatter is accounted for in `.planning/REQUIREMENTS.md`, and the phase's requirement list matches the plans' union. No orphaned requirements.

| Requirement | Source Plan | Status | Evidence |
|-------------|-------------|--------|----------|
| SUPR-01 | 31-02, 31-03 | SATISFIED | `reset` supersedes every in-flight claim in one synchronous step; `Superseded` is distinct from `Abandoned`; waiters answered, last-leave interrupt kept, exit never settled. |
| SUPR-02 | 31-02 | SATISFIED | No `generation` in `DecisionCache.ts`; `clear` ends in `shared.reset()`. |
| SUPR-03 | 31-01, 31-02 | SATISFIED | Four seam races landed first (`f3cdf7a3`), `DecisionCache.test.ts` unchanged. |
| SUPR-04 | 31-03 | SATISFIED | Model-based property, 300 runs, seed 3101, with non-vacuity floors. |
| SUPR-05 | 31-04 | SATISFIED | BEH-QD-491, BEH-QD-439, INV-QD-025 and INV-QD-307, ADR-QD-132 amended. |
| WX-01 | 31-05 | SATISFIED | `pnpm check:pr` exit 0 on the current HEAD (log read). |
| WX-02 | 31-04 | SATISFIED | CCR-QD-422, BEH-QD-491, INV-QD-307 and the ADR-QD-132 amendment use reserved numbers; ADR-QD-144 unused. |
| WX-03 | 31-04 | SATISFIED | No export added or removed (`SharedComputation` is package-private); `spec/overview.md` correctly untouched, gate 13 green inside `check:pr`. |
| WX-04 | 31-05 | SATISFIED | My own scan of added `packages` lines found no `as`, `!`, `any`, `switch`, `fnUntraced`, `async`/`await`, `console` or ambient clock. No script, AGENTS.md or budget file changed since the base. |
| WX-05 | 31-01, 31-05 | SATISFIED | Mutation: SharedComputation.ts 0.9857 to 0.9859, DecisionCache.ts 0.9583 to 0.9762; neither fell. Coverage thresholds are enforced inside `check:pr`, which is green. |
| WX-06 | 31-01, 31-05 | SATISFIED | RED seam races committed first on the phase base (`f3cdf7a3`), baseline alone before them (`4f22f6a7`). |
| WX-07 | 31-04 | SATISFIED | No public break (internal module; `clear` behaves as before), so a patch changeset is the right record and `upgrading.md` correctly untouched. |

WX-01 to WX-07 are milestone-wide ("All v1.3 phases"); judged here for this phase's share only.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| (none) | | No TBD/FIXME/XXX/TODO in the changed source, test or spec files | none | |
| `packages/core/test/DecisionCache.test.ts` | 864 | Stale "generation" comment | Info | Known and non-blocking: the file is frozen this phase by SUPR-03, and the comment is carried to Phase 36. |

### Process Notes (not blockers)

- Wave-1 commits `4f22f6a7` and `f3cdf7a3` carry a Sonnet trailer and the SDK docs commits `896addf1` and `56981394` carry none. Cosmetic, orchestrator-known.
- The 31-05 commit-order check predates the three review-fix commits (`bb637525`, `b7da31c4`, `a1475c57`) by design. Those touch only a header comment and the property test, and `check:pr` is green after them.
- I did not re-run `pnpm check:pr` or Stryker; I read the orchestrator's `check:pr` log and the committed mutation JSON.

### Human Verification Required

None. The phase has no UI or external-service surface; the behavior-dependent truths (cancellation, supersession, exactly-once answers) are exercised by passing tests, including the model-based property.

### Gaps Summary

No gaps. The staleness rule now lives in `SharedComputation` (closed `Standing`, `reset` supersedes, `settle` only for Live claims), `DecisionCache` keeps no generation counter and its own test file is byte-identical to the phase base, the four seam races and the property pin the rule, and the spec records are in place.

---

_Verified: 2026-11-12T09:30:00Z_
_Verifier: Claude (gsd-verifier)_
