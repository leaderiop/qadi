---
phase: 31-a-reset-supersedes-its-claims
plan: 02
subsystem: core/SharedComputation
tags: [single-flight, decision-cache, staleness, superseded-claims]
requires: [31-01]
provides:
  - "SharedComputation: closed `standing` (Live | Superseded | Abandoned) and a `reset` that supersedes every in-flight claim"
  - "DecisionCache with no generation counter; `clear` is three statements"
affects: [31-03, 31-04, 31-05]
tech-stack:
  added: []
  patterns: ["closed transition tables typed so no row can return to Live"]
key-files:
  created: []
  modified:
    - packages/core/src/SharedComputation.ts
    - packages/core/src/DecisionCache.ts
key-decisions:
  - "Transitions are module-scope tables (afterReset, afterLastLeave) typed Exclude<Standing, 'Live'>, not literal assignments, so the unobservable Superseded/Abandoned split adds no unkillable mutants"
requirements-completed: [SUPR-01, SUPR-02]
duration: 15 min
completed: 2026-11-12
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 896addf1b3277f03dd201f3e70411f588050ac53
plan_head_after: ce9d2a461819d97072cc555e9db7369092346d31
commits: 2
---

# Phase 31 Plan 02: A reset supersedes its claims Summary

`SharedComputation` now owns its staleness rule: an in-flight claim carries one closed `standing`, `reset` moves every
claim to Superseded before emptying the table, and the compute's `onExit` settles only a Live claim. `DecisionCache` then
dropped the generation counter in its own commit, and `clear` is `entries`, `insertionOrder`, `shared.reset()`.

## Commits

- `f29466c4` `feat(31-02): a reset supersedes its in-flight claims` (SharedComputation.ts only)
- `ce9d2a46` `refactor(31-02): DecisionCache keeps no generation counter` (DecisionCache.ts only)

## Test runs

- After Task 1: `SharedComputation.test.ts` + `DecisionCache.test.ts`, 2 files, 56 tests passed (17 + 39). The five RED tests from
  31-01 are green with `SharedComputation.test.ts` unchanged since the RED commit. `pnpm typecheck`, `pnpm lint`
  (house-style: 465 files clean) and `pnpm circular` pass.
- After Task 2: same two files, 56 tests passed. `git diff 7d89747a -- packages/core/test/DecisionCache.test.ts` is empty.
  `pnpm typecheck` and `pnpm lint` pass.

## Unobservable by design

A Superseded claim's last leave keeping it Superseded (`afterLastLeave.Superseded`) has no observable effect: the only reader
of `standing` is the `=== "Live"` guard, which treats Superseded and Abandoned alike, and `forget` is already a no-op because
`reset` removed the claim. The distinction SUPR-01 asks for is kept as a state, not as a behaviour. That is why the
transitions are tables rather than assignments (a literal `= "Superseded"` would be an equivalent mutant).

## Doc blocks rewritten

`packages/core/src/SharedComputation.ts`:
- header, third and last paragraphs (:12-26)
- `SharedComputation.reset` doc (:57-65)
- new `Standing` doc, table comment, `afterReset`, `afterLastLeave` docs (:70-98)
- `InFlightClaim` doc, the `standing` paragraph (:109-121)
- `awaitShared`'s "So a claim is joinable only while somebody waits on it" paragraph (:200-219)
- `onExit` comment (:391-393)

`packages/core/src/DecisionCache.ts`:
- `DecisionCacheShape.clear` doc, last paragraph (:92-98)
- adapter comment above `makeSharedComputation` (:222-226)
- `clear`'s inline comment (:275-279)

`run`'s claim-step comment naming the adapter's claim-time read is left for 31-03, which removes it with the call.

## Deviations from Plan

None - plan executed exactly as written.

Notes (not deviations): the dispatch's project rule requires the `Claude Opus 5.5` trailer, used on both commits (31-01 used the
harness `Sonnet 5.5` trailer). `Read` of the 31-02 `<precondition>` evidence: `phase_base` is 40-hex in 31-01-SUMMARY.md and
nothing under `packages/` was uncommitted at start. `DecisionCache.test.ts:864` still says the flush "Advances `generation`";
that file stays byte-identical this phase (carried spec debt, as 31-01 recorded). Mutation was not re-run here; 31-05 compares.

## Known Stubs

None.

## Threat Flags

None. T-31-03/04/05 mitigations are in place: Live-only settle plus synchronous supersede, `Deferred.done` and the last-leaver
interrupt untouched, and `DecisionCache.test.ts` byte-identical to the phase base.

## Self-Check: PASSED

- FOUND: `packages/core/src/SharedComputation.ts`, `packages/core/src/DecisionCache.ts`
- FOUND: `f29466c4`, `ce9d2a46` (ancestors of HEAD); `git diff-tree` of `ce9d2a46` lists only `packages/core/src/DecisionCache.ts`
- `grep -ci generation packages/core/src/DecisionCache.ts` is 0
