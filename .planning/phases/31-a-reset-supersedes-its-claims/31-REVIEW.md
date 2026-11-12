---
phase: 31-a-reset-supersedes-its-claims
reviewed: 2026-11-12T00:00:00Z
depth: standard
files_reviewed: 4
files_reviewed_list:
  - packages/core/src/SharedComputation.ts
  - packages/core/src/DecisionCache.ts
  - packages/core/test/SharedComputation.test.ts
  - .changeset/shared-computation-reset-supersedes.md
findings:
  critical: 0
  warning: 1
  info: 4
  total: 5
  necessity: 1
status: issues_found
---

# Phase 31: Code Review Report

**Reviewed:** 2026-11-12
**Depth:** standard
**Files Reviewed:** 4
**Status:** issues_found

## Summary

I traced every interleaving I could construct through `SharedComputation.ts` and found no source defect.

- **Reset and exit ordering.** `reset` and the compute's `onExit` run as separate synchronous steps. Whichever order they land in, a claim that was Live at reset time never reaches `hooks.settle`. A claim that settled before the reset is wiped by `clear`'s own `entries` flush.
- **Stale `onExit` and `forget`.** `forget` removes by identity, so a stale `onExit` cannot remove a fresh claim.
- **Invariant: only Live claims are in `inFlight`.** A claim leaves `inFlight` by being superseded, abandoned or settled. This means `reset` only ever visits Live claims.
- **Single settle per key.** At most one Live claim per key can settle, so the "one append per `entries` insert" comment in `DecisionCache.ts` still holds with superseded computes running beside a fresh one.
- **Reset between claim and fork.** A `reset` landing between the claim step and the fork leaves `entry.fiber` `undefined`. That is covered by the existing `uninterruptibleMask`. The fork still happens, `onExit` still answers waiters, and `settle` is skipped.
- **Waiter and fiber accounting.** Waiters are answered exactly once through `Deferred.done`, and the last-leaver interrupt is unchanged.

No `as`, `!`, `any`, `switch`, `Effect.fnUntraced` or `async`/`await` was added. New doc comments name no plan or decision ids, and `check-house-style.mjs` is clean.

`vitest --project core` on `SharedComputation.test.ts` and `DecisionCache.test.ts` passes (57 tests).

The one real weakness is in the property test's command generator, which narrows what it explores. The rest is minor comment and quality debt.

Not checked: the mutation scores, and the actual values of the three coverage counters in the property test.

## Warnings

### WR-01: Property test can only ever pick the first two candidates, so most waiters and computes are never targeted by Leave or Settle

**File:** `packages/core/test/SharedComputation.test.ts:599` (`const pick = FastCheck.nat(1)`), used at 769 and 779
**Issue:**
- `FastCheck.nat(1)` generates 0 or 1. The runner does `running[cmd.pick % running.length]` and `waiting[cmd.pick % waiting.length]`.
- Whatever the list length, only the two oldest waiting waiters, and the two oldest running computes for a key, can ever be chosen.
- Command sequences run to 16 steps and `Run` has weight 7, so many waiters pile up behind the first two. A Leave or Settle never targets the third or later one until the drain.
- The "last waiter of a superseded or Live compute leaves" interleavings are therefore sampled from a much smaller space than the property's name and the 300-run budget suggest.
- The three counters at 824-826 count how often events happened, not which candidates were reachable, so they cannot catch this.
- When the list is empty, `pick % 0` is `NaN` and `running[NaN]` is `undefined`. The "nothing to do" branch works only through that accident.

**Fix:** Generate an unbounded index and guard emptiness explicitly.
```ts
const pick = FastCheck.nat(15); // >= maxLength, so every candidate is reachable
// ...
const chosen = running.length === 0 ? undefined : running[cmd.pick % running.length];
```
Re-check that the three counter floors (30) still hold after the change.

## Info

### IN-01: Superseded and Abandoned are never observably different; the lookup tables carry rows that cannot be reached

**File:** `packages/core/src/SharedComputation.ts:82-99, 245, 390, 412`
**Category:** necessity
**Issue:**
- The only reader of `standing` is `entry.standing === "Live"` (line 390). Superseded and Abandoned are indistinguishable to every consumer, as the comment at 82-85 itself concedes.
- The two transition tables carry no behaviour. `afterReset` is only ever applied to claims in `inFlight`, and `inFlight` holds Live claims only, so its Superseded and Abandoned rows are unreachable. The same holds for `afterLastLeave`'s Abandoned row: `waiters` reaches 0 once per claim.
- The comment says the tables exist only so a literal assignment would not be an unkillable (equivalent) mutant. That justification is for the mutation tool, not for the runtime.
- Superseded versus Abandoned is a deliberate, locked spec distinction (D-01, SUPR-01), so this rests on judgment and is Info. The tables are the part I would revisit.

**Fix:** If the distinction is kept for the spec's sake, keep the type but assign directly (`entry.standing = "Superseded"`). Record the equivalent mutant in the mutation notes rather than adding two 3-row tables to production code. Otherwise a `"Live" | "Stale"` field says the same thing.

### IN-02: Property runner dispatches on `_tag` with an if/else chain whose final `else` silently absorbs any new command

**File:** `packages/core/test/SharedComputation.test.ts:716-800`
**Issue:**
- `Run`, `Reset` and `Settle` are tested explicitly, and everything else falls into the `Leave` branch.
- AGENTS.md §5a requires `_tag` dispatch to use `Match.tagsExhaustive` so that a new variant is a compile error. The house-style gate only catches `switch`, so this passes it.
- A fifth `Command` variant would be run as a `Leave` with no compile error.

**Fix:** Use `Match.type<Command>().pipe(Match.tagsExhaustive({...}))`, or at minimum make the last branch `else if (cmd._tag === "Leave")` followed by an exhaustiveness check (`const _: never = cmd`).

### IN-03: File header says an abandoned or superseded exit "is dropped" and attributes the superseded rule to issue #64

**File:** `packages/core/src/SharedComputation.ts:20-24`
**Issue:**
- "An abandoned or superseded compute's exit is dropped" is true only toward the adapter. A superseded claim's exit still answers every waiter. A reader skimming the header could take it that the superseded waiters go unanswered, which is the opposite of the behaviour.
- "(issue #64)" is now attached to a sentence that also covers reset-supersession, which has nothing to do with #64.

**Fix:** "An abandoned or superseded compute's exit never reaches the adapter; a superseded one still answers its waiters." Move the `(issue #64)` mention to the abandonment half of the sentence.

### IN-04: Stale `generation` comment remains in `DecisionCache.test.ts` (known debt)

**File:** `packages/core/test/DecisionCache.test.ts:864`
**Issue:** The comment says the flush "Advances `generation`". The counter no longer exists; `clear` now supersedes via `SharedComputation.reset`. The file is intentionally byte-identical to the phase base, so this is the known debt carried to a later phase. A grep of `packages/*/src`, `packages/core/test` and the specs found no other stale mention of the `generation` counter or the `claim` hook. The other `generation` hits are `CircuitBreaker.ts`, `SimulationSession.ts` and their specs, which are unrelated mechanisms.
**Fix:** In the later phase, reword to "Supersedes ask 1's claim and empties `inFlight`".

---

_Reviewed: 2026-11-12_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
