---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
verified: 2026-11-21T03:45:00Z
status: passed
score: 6/6 must-haves verified
covered_files:
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-01-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-01-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-02-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-02-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-03-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-03-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-04-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-04-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-05-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-05-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-06-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-06-SUMMARY.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-07-PLAN.md"
  - ".planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-07-SUMMARY.md"
  - "AGENTS.md"
  - "packages/core/bench/DecisionCache.bench.ts"
  - "packages/core/src/DecisionCache.ts"
  - "packages/core/src/SharedComputation.ts"
  - "packages/core/src/TraceDiff.ts"
  - "packages/core/test/DecisionCache.test.ts"
  - "spec/README.md"
  - "spec/behaviors/21-decision-cache.md"
  - "spec/invariants.md"
  - "spec/process/house-rules-evidence.md"
  - "spec/traceability.md"
covered_digest: "v4:sha256:3a750fbffb7c01352689b776d2dd77bbc6bacc236789d38d96c4eb0bb76a48db"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 67: No equivalent mutants, no magic race bound Verification Report

**Phase Goal:** `DecisionCache`'s eviction and `SharedComputation`'s claim dispatch have no branch whose mutant is equivalent or surviving for want of a check, and the I5 race test finds both orderings without a bound tied to `walk`'s step count.
**Verified:** 2026-11-21
**Status:** passed
**Re-verification:** No, initial verification

Base `eacf89b4`, HEAD `76332d92`. `git diff 0e3f9cbd..HEAD -- packages scripts package.json` is empty, and so is `git diff e195dd19..HEAD -- packages`, so the bench of record, the mutation close (`adb01b5f`) and the `check:pr` run all describe the shipped source. `git status` is clean under `packages`.

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
| - | ----- | ------ | -------- |
| 1 | SC1 / MUTE-01: the eviction has no branch that cannot be taken; FIFO and capacity validation unchanged; the surviving mutant is gone | VERIFIED | `DecisionCache.ts:265-278`: `Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity)` then `HashMap.removeMany`; no `while`, no `Option`, and `import * as Option` is removed. I ran `Chunk.splitAt` on 5 elements: `-3`, `NaN`, `0`, `0.9` take nothing; `1.5` takes 1; `>= 5` and `Infinity` take all, so the doc claims hold. The validation `Number.isInteger(capacity) && capacity >= 0` is untouched in the diff. FIFO tests (`evicts the oldest ...`, `capacity: 0 ...`, `never evicts a key with a compute still in flight`) exist and `DecisionCache.test.ts` + `SharedComputation.test.ts` pass (60/60). The base survivor (`:287` ConditionalExpression) is absent from the close record (`DecisionCache.ts` 38/38, `open: []`). |
| 2 | SC2 / MUTE-02: the claim result is dispatched closed; every tag mutant killed; no `switch` or Stryker-disable; the hit check stays in the one synchronous claim step; the form was chosen after a bench | VERIFIED | `SharedComputation.ts:366-380`: `arms: { readonly [T in Claim<A,E>["_tag"]]: ClaimArm<...> }`, so a missing arm is a compile error, and `answer` indexes it by `claim._tag`. The three arms are calls (`answerHit`, `answerJoined`, `answerOwned`). `hooks.cached(key)`, the `inFlight` lookup and the claim stay in one `Effect.sync` (`:431-448`), joined to the arm by `Effect.flatMap`. The Stryker report on disk shows the tag-literal mutants at lines 433, 439 and 448 Killed, and the close record has 71/71 with `open: []`. `grep` of the source and test diff for `switch`, `Stryker`, `fnUntraced`, `as`, `!`, `any`, `async`: nothing added. `check-house-style.mjs` is clean (3 declared switches, unchanged). The form was chosen on `67-DISPATCH.md`'s fixed rule (`Match` failed with two workloads +7.2% and +7.7%, the table passed 0 slower, geomean -4.15%); numbers in the doc match that file. |
| 3 | SC3 / MUTE-03: the race test iterates until both orderings are seen at every budget, cap 512, margin 3, no number tied to `walk`, shown RED with the hit check split | VERIFIED | `DecisionCache.test.ts:1250-1322`: per budget `seen` counts, `end = cap (512)`, and when `coalesced > 0 && hit > 0` it sets `end = gap + 1 + margin` with `margin = 3`; a budget not landing on both sides in 512 gaps is pushed to `capped` and asserted `[]` (names the budget and counts); `raced` (one walk of `K`, exact FIFO) is asserted on every run. The `gap <= 48` loop and the "re-measure" comment are gone (grep). `ownerSpin = 3` is the pre-existing owner spin input, unchanged from the base. RED, independently reproduced: I split the hit check into its own `Effect.sync` in the current `SharedComputation.ts`, ran the race test, and it failed with `kWalks: 2` at budget 3 gap 40, budget 4 gap 22 and budget 6 gap 13, then restored the file (SHA-256 identical, `git status` clean). `67-RED-EVIDENCE.md` records the same on the base, and the 512-cap failure path (`ownerSpin = 520`). |
| 4 | SC4 / MUTE-04: Stryker scores not below Phase 61's (0.977, 0.986, 1.000); both named survivors gone | VERIFIED | `67-mutation.mjs compare` exits 0: `DecisionCache.ts` 42/43 to 38/38, `Lifecycle.ts` 42/42 to 42/42, `SharedComputation.ts` 70/71 to 71/71, 0 new ignored, close leaves no mutant open, none open on a line the phase wrote. `--self-test`: 11 passed. Both survivors (`DecisionCache.ts:287`, `SharedComputation.ts:319`) are absent from the close record. The `ignoreStatic:false` evidence run (39/40 and 71/79) leaves open only `DecisionCache.ts:141` and `SharedComputation.ts:89-99`, which predate the phase (the phase's hunks start at line 104+ of `SharedComputation.ts`). |
| 5 | Every text about the eviction, the dispatch and I5 states only what the code and measurements hold | VERIFIED | Source comments (`DecisionCache.ts` 197-209, 240-278; `SharedComputation.ts` 104-107, 175, 270+, 398-448; `TraceDiff.ts` no longer cites the guard) match the code, and the `Chunk.take`/`drop` "view over the chunks it already holds" claim matches effect's `ISlice` backing. BEH-QD-166's reasons (split rounds down, negative evicts all, `NaN` evicts none) match my run; its amendment note says the requirement is unchanged. INV-QD-379's claims (one append per walk, evict in the settling step, `capacity: 0` retains nothing, mutants killed) and its three named tests are true. AGENTS.md §5a's paragraph (tables `afterReset` and `afterLastLeave` exist in `SharedComputation.ts`; third form chosen because `Match` failed a gate fixed in advance) matches `67-DISPATCH.md`. `house-rules-evidence.md` §2's new subsection matches `67-DISPATCH.md` and `67-BENCH.md` figure for figure (+7.2/+7.7, +1.87%, -4.15%, base spreads 6.0-15.0% and 1.1-3.1%, load 3.86 and 10.22 to 16.09, later run +2.8/+1.0, -2.51%) and states what the runs do not hold. `spec/overview.md` (Rev 1.130) names no eviction loop, claim dispatch or I5; its `DecisionCache`/`decisionCacheLayer` rows are signature-level and nothing is stale. No stale "eviction loop" claim remains outside change history and deferred IN-01 (below). |
| 6 | CCR-QD-458 row cites every revised spec document at its current Revision | VERIFIED | Line 8 of each: `21-decision-cache.md` 1.12, `invariants.md` 1.166, `traceability.md` 1.233, `README.md` 1.272, `house-rules-evidence.md` 1.3: all equal the row. It also names AGENTS.md §5a and the three source files, the test and the bench. `spec-revise.mjs --check` clean; `verify-traceability.sh --strict`: PASS 21, FAIL 0. The row names ADR-QD-180, BEH-QD-671-675 and INV-QD-380 as Unused. |

**Score:** 6/6 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/DecisionCache.ts` | split eviction, no `Option` | VERIFIED | substantive, wired through `hooks.settle`, runs in the cache layer |
| `packages/core/src/SharedComputation.ts` | `Claim` union, arm table, three arms | VERIFIED | wired: `run` calls `answer` through `Effect.flatMap` |
| `packages/core/test/DecisionCache.test.ts` | adaptive race sweep | VERIFIED | passes; shown RED by the hit-check split |
| `packages/core/bench/DecisionCache.bench.ts` | capacity-bound workload | VERIFIED | workload at end of file |
| `67-mutation-{base,close,static}.json`, `67-mutation.mjs` | scored records and scorer | VERIFIED | `compare` and `--self-test` pass |
| `67-RED-EVIDENCE.md`, `67-DISPATCH.md`, `67-BENCH.md` | evidence | VERIFIED | figures agree with the spec text |

### Key Link Verification

| From | To | Via | Status | Details |
| ---- | -- | --- | ------ | ------- |
| `run`'s claim step | arm table | `Effect.flatMap` then `answer(claimed, ...)` | WIRED | hit check, join and claim in one `Effect.sync` |
| `DecisionCache` settle | `Chunk.splitAt` / `HashMap.removeMany` | direct | WIRED | `entries` and `insertionOrder` updated in one sync step |
| INV-QD-379 | tests, BEH-QD-166, traceability | links and rows | WIRED | rows present in `traceability.md` |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Cache and single-flight suites | `pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/SharedComputation.test.ts` | 60 passed | PASS |
| Race test RED with hit check split | scratch edit, one named test, restored | fails with `kWalks: 2` at budgets 3, 4, 6 | PASS |
| `Chunk.splitAt` clamping | node script over `-3, NaN, 0, 0.9, 1.5, 5, Infinity` | as BEH-QD-166 says | PASS |
| Scorer | `67-mutation.mjs --self-test` / `compare` | 11 passed / exit 0 | PASS |
| House style | `node scripts/check-house-style.mjs` | 560 files clean | PASS |
| Spec gates | `spec-revise.mjs --check`, `verify-traceability.sh --strict` | clean, 21 PASS 0 FAIL | PASS |

I did not run `check:pr`, Stryker or the bench, as instructed; `check:pr` exited 0 on HEAD per the caller.

### Requirements Coverage

| Requirement | Status | Evidence |
| ----------- | ------ | -------- |
| MUTE-01 | SATISFIED | Truth 1 |
| MUTE-02 | SATISFIED | Truth 2 |
| MUTE-03 | SATISFIED | Truth 3 |
| MUTE-04 | SATISFIED | Truth 4 |
| WX-01 | Pending by design | `check:pr` green on HEAD (caller's run); the row closes with the milestone |
| WX-02 | Pending by design | ADR named Unused in the CCR row; CCR-QD-458, BEH-QD-166 amendment, INV-QD-379 and traceability rows present |
| WX-03 | Pending by design | no export added or removed (`Claim`, `ClaimArm`, `Restore` are module-private); gate 13 inside `check:pr` |
| WX-04 | Pending by design | nothing from the list added in `packages/*/src` or test diffs |
| WX-05 | Pending by design | scores held or raised (Truth 4); coverage via `check:pr` |
| WX-06 | Pending by design | race test committed (`2b01cfa2`) and shown RED before the source change; eviction rewrite is covered by the existing FIFO tests, whose mutants it now kills |
| WX-07 | Pending by design | no D-number, plan id or phase number in the shipped source or test titles (greps empty) |

No orphaned requirements: all 11 IDs in the ROADMAP row are claimed.

### Anti-Patterns Found

None blocking. No `TBD`/`FIXME`/`XXX` markers in the phase's source changes.

### Known and accepted (not gaps)

- Dispatch choice rests on one run per candidate under load; the rule was fixed first and followed, and the records state the noise and say they hold no figure for the cost of `Match`.
- Deferred to the milestone audit: IN-01 (stale comments at `DecisionCache.test.ts` ~1054-1100 in the negative, `NaN` and fractional capacity tests still say "eviction loop"), IN-02 (redundant `oneSided` assertion, kept by the owner), IN-03 (scorer self-test does not cover the `refuseDirty` call sites).
- Static survivors at `SharedComputation.ts:89-99` and `DecisionCache.ts:141` predate the phase.

### Human Verification Required

None.

### Gaps Summary

No gaps. Each success criterion and MUTE-01..04 holds in the code, the race test's RED was reproduced independently, the scorer's compare passes against Phase 61's floors, and the spec texts and CCR row agree with the code and the measurements.

---

_Verified: 2026-11-21_
_Verifier: Claude (gsd-verifier)_
