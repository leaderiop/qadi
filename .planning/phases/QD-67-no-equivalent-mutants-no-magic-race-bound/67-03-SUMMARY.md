---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 03
subsystem: core
tags: [decision-cache, eviction, chunk, hashmap, mutation]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-01's mutation base and race test, committed before this eviction
provides:
  - DecisionCache's eviction as one Chunk.splitAt and one HashMap.removeMany, with no loop, no Option and no guard
  - comments that say what the new code holds (capacity doc, insertionOrder, settle, eviction), and TraceDiff's child-guard comment without the eviction comparison
affects: [67-04, 67-07]

actuals:
  tokens: 2500
  tasks: 2
  commits: 1
plan_head_before: c8ab2f0f8c9b1d66c759523aeca586ae0e862d5b
plan_head_after: 570d76b1c87e0999e9dda0c48b19b7311cc70ce6

tech-stack:
  added: []
  patterns:
    - "an eviction written as a count-driven split, so a count of zero or below is the no-eviction case and no branch exists to be mutated"

key-files:
  created: []
  modified:
    - packages/core/src/DecisionCache.ts
    - packages/core/src/TraceDiff.ts

key-decisions:
  - "The eviction is straight-line code (Chunk.splitAt + HashMap.removeMany); FIFO order and the capacity validation are unchanged"

requirements-completed: [MUTE-01, WX-04, WX-06]

coverage:
  - id: D1
    description: "The eviction has no branch a cache cannot take, and every existing test passes against it unedited"
    requirement: MUTE-01
    verification:
      - kind: unit
        ref: "packages/core/test/DecisionCache.test.ts#evicts the oldest completed entry once exceeded, insertion order (FIFO)"
        status: pass
      - kind: other
        ref: "Task 1 verify checks (79 tests across DecisionCache.test.ts and TraceDiff.test.ts, 0 failed; core suite 2667 tests, 0 failed; typecheck, oxlint and house-style clean)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The split's count is not an equivalent mutant: its - as + fails the cache's tests"
    requirement: MUTE-01
    verification:
      - kind: other
        ref: "evict-plus run: 42 tests, 2 failed (the FIFO test and the race test)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The eviction commit changes no test and follows the race-test commit"
    requirement: WX-06
    verification:
      - kind: other
        ref: "Task 2 automated verify (commit holds exactly the two sources; git diff HEAD^ HEAD under packages/core/test and packages/core/bench is empty)"
        status: pass
    human_judgment: false

duration: 4min
completed: 2026-11-21
status: complete
---

# Phase 67 Plan 03: The eviction as one split Summary

**DecisionCache's eviction loop and its `Option.isSome` guard, whose mutant could not be killed, became `Chunk.splitAt` plus `HashMap.removeMany`, with every test unedited and the split's count shown to fail a test when its `-` becomes `+`.**

## Performance

- **Duration:** 4 min
- **Tasks:** 2
- **Files modified:** 2 (`DecisionCache.ts` 314 to 304 lines, `TraceDiff.ts` one comment)

## Accomplishments

- `settle` now evicts in three statements: `const [evicted, kept] = Chunk.splitAt(insertionOrder, HashMap.size(entries) - options.capacity);`, `entries = HashMap.removeMany(entries, evicted);`, `insertionOrder = kept;`. With comments stripped, `DecisionCache.ts` holds no `while (`, `Option.`, `import * as Option`, `getUnsafe` or `isNonEmpty`. `eviction.patch` matched its SHA-256 (`637a5a4d...`) and both files matched their planned after hashes (`b0379586...`, `1f1ad6e4...`).
- **Test counts:** `DecisionCache.test.ts` and `TraceDiff.test.ts` ran 79 tests, 0 failed; the core suite ran 2667 tests, 0 failed, 0 failed suites. `pnpm typecheck` exits 0, oxlint on `packages/core/src` exits 0, and the house-style line is unchanged (`house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`).
- **The mutant shown failing:** with `HashMap.size(entries) - options.capacity` replaced by `HashMap.size(entries) + options.capacity` (one occurrence, refused otherwise), `DecisionCache.test.ts` ran 42 tests and 2 failed: `evicts the oldest completed entry once exceeded, insertion order (FIFO)` and `a joiner racing its owner's completion never recomputes the key, and FIFO stays exact`. The file was restored from the kept copy and its SHA-256 is `b0379586...` again.
- The comments now state what the code holds: the `capacity` doc says what `Chunk.splitAt` makes of a negative or `NaN` count, the `insertionOrder` comment names `Chunk.take` and `Chunk.drop`, and the eviction comment states `Chunk.size(insertionOrder) === HashMap.size(entries)`. `TraceDiff.ts`'s child-guard comment ends "reports it as a survivor for that reason."; `git grep` finds none of the old claims in `packages/core/src`.

## Task Commits

1. **Task 1 (tracer: the patch, the gates, the suites) and Task 2 (the mutant, the commit)** - `570d76b1` (refactor). Task 1 changes the working tree only; the plan commits both tasks' result as one commit.

**Plan metadata:** the `docs(67-03): summary` commit that holds this file.

## Files Created/Modified

- `packages/core/src/DecisionCache.ts` - the eviction as one split and one removal; `import * as Option` removed; four comments rewritten
- `packages/core/src/TraceDiff.ts` - the child guard's comment without its comparison to the eviction guard

## Decisions Made

- The patch was applied verbatim against its SHA-256. No test, bench file, `SharedComputation.ts` or `Lifecycle.ts` changed.

## Deviations from Plan

None - plan executed exactly as written.

Task 1's last check (`the working tree changes other files than the two sources`) is a pre-commit check; it was run before the commit and read `DecisionCache.ts` and `TraceDiff.ts` only. Run after the commit it would report an empty tree, so only Task 2's verify was re-run on the committed state (exit 0).

## Issues Encountered

None.

## Flagged for the owner

- **`TraceDiff.ts` is a fourth file** in the plan's scope: one comment dropped its comparison with a guard that no longer exists.
- **The negative-capacity test's title is left as history**, unedited, as the plan states. Its title (`rejects a negative capacity rather than looping forever`, line 1052) and its comment (line 1054, "the eviction loop's own exit condition") name the loop that no longer exists; the test still passes because the capacity is rejected at construction.
- **The `+` mutant fails two tests, one of them the race test**, so the race test is reading the eviction's count as well as the single flight.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path or schema changed.

## Next Phase Readiness

67-04 applies the arm table (`choice: table`) to `SharedComputation.ts` against this eviction. No blockers.

## Self-Check: PASSED

- `packages/core/src/DecisionCache.ts` and `packages/core/src/TraceDiff.ts` exist; commit `570d76b1` is on `arch-wave-12` and is the only commit of the plan before this summary.
- Task 2's verify exits 0; `git diff HEAD^ HEAD -- packages/core/test` is empty.

---
*Phase: QD-67-no-equivalent-mutants-no-magic-race-bound*
*Completed: 2026-11-21*
