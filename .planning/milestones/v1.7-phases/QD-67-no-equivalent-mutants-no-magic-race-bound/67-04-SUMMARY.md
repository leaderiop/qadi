---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 04
subsystem: core
tags: [single-flight, claim-dispatch, arm-table, mutation]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550

requires:
  - phase: QD-67-no-equivalent-mutants-no-magic-race-bound
    provides: 67-02's dispatch choice (table) and 67-03's eviction
provides:
  - SharedComputation's claim result dispatched through a closed arm table, every arm a call to answerHit, answerJoined or answerOwned
affects: [67-05, 67-07]

actuals:
  tokens: 4000
  tasks: 2
  commits: 1
plan_head_before: 9c2746320fd353fd48774e935af3c87417871c4f
plan_head_after: e195dd194ae9f33a3787570e4107978dd094036a

tech-stack:
  added: []
  patterns:
    - "a tagged claim dispatched by a row-typed table indexed by its tag, so a missing arm is TS2741 and each arm is a call"

key-files:
  created: []
  modified:
    - packages/core/src/SharedComputation.ts

key-decisions:
  - "The arm table is indexed directly (choice: table), with no Object.hasOwn row; the claim step is byte-identical to the base"

requirements-completed: [MUTE-02, WX-04]

coverage:
  - id: D1
    description: "The claim result is dispatched closed and the claim step is unchanged"
    requirement: MUTE-02
    verification:
      - kind: other
        ref: "Task 1 verify: SHA-256 0af92391..., the 17 claim-step lines equal the base's, core suite 2667 tests 0 failed, typecheck, oxlint, house-style, api-surface clean"
        status: pass
    human_judgment: false
  - id: D2
    description: "Every hand-applied tag, arm and dispatch mutant is killed, and a removed arm does not compile"
    requirement: MUTE-02
    verification:
      - kind: other
        ref: "tag-mutants.sh table: tag-mutants: every mutant killed (10 mutants); removed Claimed arm: TS2741 naming SharedComputation.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "The dispatch adds no forbidden token and leaves the budgets alone"
    requirement: WX-04
    verification:
      - kind: other
        ref: "added-tokens: 0 hit(s); house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-21
status: complete
---

# Phase 67 Plan 04: The claim dispatched closed Summary

**`SharedComputation.run` now joins its one synchronous claim step to a row-typed arm table with `Effect.flatMap`; the owner's former 70 lines are the local function `answerOwned`, and all ten hand-applied tag mutants fail tests.**

## Performance

- **Duration:** 8 min
- **Tasks:** 2
- **Files modified:** 1 (`SharedComputation.ts`)

## Accomplishments

- `67-DISPATCH.md` says `choice: table`, so `cand-T.patch` (SHA-256 `00e6adad...`, checked) was applied; `SharedComputation.ts` is then `0af92391...`, the table candidate's hash. It adds `Restore`, `Claim<A, E>`, `ClaimOf`, `ClaimArm`, `answerHit`, `answerJoined`, `answerOwned`, `arms`, `answer`, and `run` becomes `Effect.uninterruptibleMask((restore) => Effect.flatMap(Effect.sync(...), (claimed) => answer(claimed, key, compute, restore)))`. The arms are in the order Hit, Joined, Claimed (lines 372 to 374).
- The claim step (17 lines, `const cached = hooks.cached(key);` to `return { _tag: "Claimed", entry };`) is byte-identical to the phase base's.
- **Test counts:** the core suite ran 2667 tests, 0 failed, 0 failed suites. `pnpm typecheck` exits 0, oxlint on `packages/core/src` exits 0, `house-style: 560 file(s) clean (3 declared switch(es), 66 type-test file(s))`, `api-surface: 939 export(s) documented across 9 package(s)`, `added-tokens: 0 hit(s)`.
- **`tag-mutants.sh table`** ended `tag-mutants: every mutant killed`, and the file was back at `0af92391...` after it:

| Mutant | Failed / total |
| --- | --- |
| claim-Hit (tag emptied) | 21/60 |
| claim-Joined (tag emptied) | 19/60 |
| claim-Claimed (tag emptied) | 55/60 |
| hit-outcome (hit arm's object literal emptied) | 21/60 |
| arm-Hit (arm emptied) | 21/60 |
| arm-Joined (arm emptied) | 19/60 |
| arm-Claimed (arm emptied) | 55/60 |
| arms-empty (arm set emptied) | 56/60 |
| answer (helper replaced) | 56/60 |
| dispatch (dispatch replaced) | 56/60 |

- **Removed-arm compile error:** deleting the `Claimed` arm line made `pnpm typecheck` exit 2 with `packages/core/src/SharedComputation.ts(371,9): error TS2741: Property 'Claimed' is missing in type '{ Hit: ...; Joined: ...; }' but required in type '{ readonly Claimed: ClaimArm<K, A, E, "Claimed">; ... }'.` The file was restored from `sc-keep.ts` and is `0af92391...` again; nothing under `packages` is uncommitted.

## Task Commits

1. **Task 1 (tracer: patch, claim-step check, gates, core suite, commit)** - `e195dd19` (refactor)
2. **Task 2 (mutants and removed arm)** - no commit; scratch evidence only, reported above.

**Plan metadata:** the `docs(67-04): summary` commit that holds this file.

## Files Created/Modified

- `packages/core/src/SharedComputation.ts` - the claim dispatched by the arm table; the owner arm extracted to `answerOwned`

## Decisions Made

- The patch was applied verbatim against its SHA-256. No test, bench file, `scripts/` file or `stryker.config.mjs` changed.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## Flagged for the owner

- **The arm table is indexed directly**, `arms[claim._tag](...)`, with no `Object.hasOwn` row. The type of `claim._tag` is the closed union, so a tag outside it is a compile error and the table has no runtime row for one.
- **`run` joins the claim step to its arm with `Effect.flatMap`**, inside the one `Effect.uninterruptibleMask`; the `Effect.sync` block holding the hit check is unchanged.
- The mutant counts above are hand-applied runs of the two single-flight test files at a 1 s test timeout; 67-07's Stryker close is the run under per-test coverage.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path or schema changed.

## Next Phase Readiness

67-05 benches the final source. No blockers.

## Self-Check: PASSED

- `packages/core/src/SharedComputation.ts` exists at `0af92391...`; commit `e195dd19` is on `arch-wave-12` and is the only commit of the plan before this summary.
- Both task verifies exit 0.

---
*Phase: QD-67-no-equivalent-mutants-no-magic-race-bound*
*Completed: 2026-11-21*
