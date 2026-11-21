---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
reviewed: 2026-11-21T00:00:00Z
depth: standard
files_reviewed: 14
files_reviewed_list:
  - packages/core/src/DecisionCache.ts
  - packages/core/src/SharedComputation.ts
  - packages/core/src/TraceDiff.ts
  - packages/core/test/DecisionCache.test.ts
  - packages/core/bench/DecisionCache.bench.ts
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/ab.sh
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/bench/analyze.mjs
  - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs
  - AGENTS.md
  - spec/behaviors/21-decision-cache.md
  - spec/invariants.md
  - spec/traceability.md
  - spec/README.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 0
status: issues_found
---

# Phase QD-67: Code Review Report

**Reviewed:** 2026-11-21
**Depth:** standard
**Files Reviewed:** 13 (the TraceDiff.ts change is a comment only)
**Status:** issues_found

## Summary

No Critical findings. The eviction rewrite and the claim dispatch hold up against the effect source in
`node_modules`, and I re-ran what could be re-run: `DecisionCache.test.ts` and `SharedComputation.test.ts`
(60 tests, green), `check-house-style.mjs` (clean), `oxlint` on the four source files (clean), `tsc -p
packages/core/tsconfig.json --noEmit` (clean), `67-mutation.mjs --self-test` (10 passed), `67-mutation.mjs compare`
(passes), `analyze.mjs --self-test` (7 passed).

**Eviction.**
- `Chunk.splitAt(self, n)` is `[take(self, n), drop(self, n)]`. Both run `Count.normalize`, which is `n > 0 ? floor(n) : 0`. A
  negative, `NaN` or zero count therefore takes nothing and drops nothing. A count at or over the length takes everything.
- Capacity 0, size equal to capacity, and one over capacity all evict exactly the oldest overflow, FIFO.
- `HashMap.removeMany` is a plain `remove` fold, so it adds no cost when the evicted chunk is empty.
- `insertionOrder` and `entries` cannot disagree. A Live claim is the only writer, and there is at most one Live claim per key
  at a time. `clear()` resets both, and then `reset()` supersedes every claim, so a stale walk never settles. The rewritten
  comment says only what the code holds. The deleted loop's invariants (termination, non-empty order, a repeated key never
  appended twice) are either structurally gone or still held by the one synchronous claim step.
- `capacity` is validated by `Number.isInteger(...) && >= 0`, so the clamped-negative path is unreachable in production.
  Its only job is to bound the damage if that check is ever loosened, and the BEH-QD-166 text says that.

**Dispatch.**
- The claim step's `Effect.sync` body is unchanged from the base. The return annotation changed to `Claim<A, E>`.
- The hit check, join and claim are still one synchronous step. `Effect.flatMap(claimStep, arm)` runs inside the same
  `uninterruptibleMask`.
- `answerOwned` keeps the same `onExit`, `forkDetach`, `entry.fiber` assignment, and `restore(awaitShared(...))`, in the same order.
- The three hoisted arms are built once per `makeSharedComputation`. The only per-call allocation on the hit path is the
  `flatMap` continuation closure and the `Shared` result, which is less than the generator it replaced.
- No `as`, `!`, `any`, `switch`, `Effect.fnUntraced` or Stryker-disable was introduced. The table has no `Object.hasOwn` and no
  fail-closed row, and AGENTS.md says why.

**Race test.**
- The loop ends at `first-both-sides gap + 1 + margin`, so margin 3 means three more gaps after the first `hit`.
- `capped` fails with a readable per-budget message. The 512 cap is never reached on a green run (the 26 to 42 runs per budget in
  RED-EVIDENCE).
- The per-run assertions (`kWalks === 1`, `miss,miss,miss,hit`) are unchanged.
- No other test in the file changed (the diff is one hunk).
- The only vacuity path would be a budget that never reaches both sides, and `capped` catches exactly that.

**Tooling.** `mapLine` handles both hunk shapes correctly (`-a,b` removal and `-a,0` pure insertion), and the multiplicity fix works.
`analyze.mjs`'s `REQUIRED` keys match the bench test and task names character for character. The capacity-bound workload
(distinct policy per call, capacity 64, 300 ms warmup) is full after 64 calls and evicts exactly once per insert from then on.

What remains is one tooling hardening gap and a few stale or redundant texts.

## Warnings

### WR-01: `67-mutation.mjs record` does not check that the working tree is the commit it records as `head`

**File:** `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs:157-178`
**Issue:** `record()` stores `git rev-parse HEAD` as `head`. `tally()` checks only that the Stryker report's `source` equals the file
on disk. Nothing checks that the file on disk equals the file at `HEAD`. `compare` then maps base lines to close lines with
`git diff -U0 <base head> <close head>`. If a close (or the static evidence run) is recorded with an uncommitted edit to
`DecisionCache.ts` or `SharedComputation.ts`, the report's line numbers belong to a tree that no commit holds. The line mapping
then misaligns silently, and an open or Ignored mutant can be waved through as "known" or "not on a written line". The static
record is checked against `close.head` by equality of the SHA string only, which has the same blind spot. This is the one way
the new line-mapping design the phase advertises can let a regression pass. It requires a dirty tree at record time, so it is
a hardening gap and not a live defect.
**Fix:** In `record` and `evidence`, refuse a dirty tree for the files read.
```js
const dirty = git("status", "--porcelain", "--", ...FILES).trim();
if (dirty !== "") fail([`record from a clean tree; these are modified: ${dirty}`]);
```

## Info

### IN-01: The negative-capacity test, the NaN test and the fractional test still describe the deleted loop

**File:** `packages/core/test/DecisionCache.test.ts:1052`, `:1054-1056`, `:1077-1078` (NaN test comment), `:1095-1096` (fractional test comment)
**Issue:** Agreed with the known item. The title "rejects a negative capacity rather than looping forever" and the comment "used
to make the eviction loop's own exit condition unsatisfiable" name a loop that no longer exists. The same applies to two sibling
comments. The NaN test says "`size(entries) > NaN` is always false". The fractional test says "NaN makes the eviction condition
permanently false". The behavior they pin still holds: NaN evicts none, a negative evicts everything, and the guard rejects
both. But the stated mechanism is the old one, and BEH-QD-166 now states the new one. The tests assert on the construction
defect only, so nothing fails. This is left as a stale rationale.
**Fix:** Retitle to "rejects a negative capacity rather than retaining nothing" and rewrite the three comments to the split
mechanism ("`Chunk.splitAt` reads a negative count as zero and the overflow as everything"). No assertion changes.

### IN-02: The trailing `oneSided` assertion in the race test is now dead

**File:** `packages/core/test/DecisionCache.test.ts:1249, 1316-1320` (the `sides` array, `oneSided` filter and its `assert`)
**Issue:** `capped` is non-empty exactly when some budget has `seen.coalesced === 0 || seen.hit === 0`. That is the same fact
`oneSided` recomputes from `sides`. Once `assert.deepStrictEqual(capped, [])` has passed, `oneSided` is `[]` by construction. It
cannot fail on its own, and `sides` is built only to feed it. The result is a second, weaker copy of the same check, and a
reader may think it guards something `capped` does not.
**Fix:** Delete `sides`, `oneSided` and its comment, or keep `sides` only if it is used elsewhere. `capped` carries the check
with a better message.

### IN-03: AGENTS.md §5a paragraph does not point at its evidence and sits as a bare carve-out

**File:** `AGENTS.md:329-332`
**Issue:** §5a's own rule is that a departure from `Match` is measured and the measurement cited (`ADR-QD-034`, `ADR-QD-092`,
`house-rules-evidence.md`). The new paragraph states the shape rule correctly. The tables exist as claimed (`afterReset`,
`afterLastLeave` and `arms`, each closed, so a missing row is TS2741), but it cites no measurement. The measurement exists
(`67-DISPATCH.md`: the `Match` form failed the gate with `miss` +7.2% and capacity-bound +7.7%, and the table passed) and is
reachable only through CCR-QD-458. The paragraph also states an exemption to "dispatching on a `_tag` uses `effect/Match`"
without saying it is one. A future reader sees a third dispatch form with no record of why `Match.type` was not used.
**Fix:** Add one clause: "measured against the hoisted `Match` form and taken because that form failed the 5% band
(CCR-QD-458, `.planning` evidence kept in the phase directory, or `spec/process/house-rules-evidence.md` if the numbers are
moved there)". Prefer moving the numbers into `house-rules-evidence.md` like the other §5a evidence, since `.planning/` is not a
durable citation target for a normative document.

### IN-04: The dispatch choice rests on one noisy run per form, under different host load

**File:** `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-DISPATCH.md` (Match and Table sections)
**Issue:** This is not a defect in the code. It limits what the text may claim. `Match` failed on a run with load 3.86 and base
spreads of 6% to 15% (above the 5% band the gate then applies to the deltas). The table passed on a run that started at load
10.22 and ended at 16.09. The final re-run of the committed source shows `miss` +2.8% and `capacity-bound` +1.0%, in the same
direction as the `Match` deltas but smaller. The gate was fixed in advance and followed, which is the point of a fixed gate.
But AGENTS.md and the CCR row say "the `Match` form failed the gate" without the caveat that its base spreads exceeded the band.
Nothing in the repo contradicts the choice. The evidence is thinner than the prose implies.
**Fix:** State the base spreads next to the verdict in CCR-QD-458 or in the cited evidence ("failed on a run whose base spread was
6.0% to 15.0%"), so a later reader does not treat "Match is 7% slower" as a measured constant.

---

_Reviewed: 2026-11-21_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
