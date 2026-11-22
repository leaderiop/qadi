---
phase: QD-67-no-equivalent-mutants-no-magic-race-bound
plan: 01
subsystem: testing
tags: [stryker, mutation, vitest, effect, single-flight, race-test]
phase_base: eacf89b4b3ab9ef6189312ab904f7d4943714550

requires:
  - phase: QD-61-decisioncache-is-asked-only-the-question
    provides: the three-file mutation floors (42/43, 42/42, 70/71) and the race test this plan rewrites
provides:
  - the phase's mutation scorer (67-mutation.mjs) with line-number mapping and multiset counts, seen failing on a planted case of each fix
  - the base mutation record of DecisionCache.ts, Lifecycle.ts and SharedComputation.ts on phase_base
  - a race test with no bound tied to a walk's step count, seen red with the hit check split out of the claim step
affects: [67-02, 67-03, 67-04, 67-05, 67-06, 67-07]

actuals:
  tokens: 6300
  tasks: 3
  commits: 3
plan_head_before: eacf89b4b3ab9ef6189312ab904f7d4943714550
plan_head_after: 97aa3f39af3da3cdec7edd79ddd0e15087e9bf33

tech-stack:
  added: []
  patterns:
    - "a race sweep that runs each budget until both orderings are seen, then a margin, with a cap that fails naming the budget and its counts"

key-files:
  created:
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation-base.json
    - .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-RED-EVIDENCE.md
  modified:
    - packages/core/test/DecisionCache.test.ts

key-decisions:
  - "The race loop's cap (512) and margin (3) are stated as a cap and a margin, not measurements of walk; the 30 000 ms timeout stays, its comment now saying it bounds a reported failure"
  - "The base was recorded with the core suite green (82 files, 2667 tests) and before any test or source of the phase changed"

requirements-completed: [MUTE-03, MUTE-04, WX-05, WX-06, WX-07]

coverage:
  - id: D1
    description: "Mutation base of the three single-flight files recorded on phase_base by a scorer seen able to fail"
    requirement: MUTE-04
    verification:
      - kind: other
        ref: "node .planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs --self-test (self-test: 10 passed; both plants exit 1 naming their case)"
        status: pass
      - kind: other
        ref: "Task 1 automated verify (the base-record commit's parent is phase_base; open mutants exactly DecisionCache.ts:287 and SharedComputation.ts:319)"
        status: pass
    human_judgment: false
  - id: D2
    description: "The race test sweeps each budget until it has seen both sides, with a cap and a margin, and fails when the claim step is split"
    requirement: MUTE-03
    verification:
      - kind: unit
        ref: "packages/core/test/DecisionCache.test.ts#a joiner racing its owner's completion never recomputes the key, and FIFO stays exact"
        status: pass
      - kind: other
        ref: "Task 2 automated verify (three green runs, split patch red with kWalks 2, forced cap red through the cap, no timeout)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The race test is the only test text changed; no other file under packages differs from phase_base"
    requirement: WX-06
    verification:
      - kind: other
        ref: "node race-span.mjs <phase_base> (race-span: 7 hunk(s), all inside the race test) and a planted title edit exiting 1"
        status: pass
    human_judgment: false

duration: 5min
completed: 2026-11-21
status: complete
---

# Phase 67 Plan 01: The mutation base and the race loop Summary

**The Stryker base of DecisionCache, Lifecycle and SharedComputation is recorded on the phase base by a line-mapping, multiset scorer, and the I5 race test now sweeps each budget until it has seen both orderings, with a cap of 512 that fails loudly and a margin of 3.**

## Performance

- **Duration:** 5 min
- **Started:** 2026-11-21T01:34:00Z
- **Completed:** 2026-11-21T01:39:00Z
- **Tasks:** 3
- **Files modified:** 4 (three created, one modified)

## Accomplishments

- The core suite is green on the base (82 files, 2667 tests, 0 failed), and Stryker's three-file run took 57 s. The scorer's `--self-test` prints `self-test: 10 passed`; a copy with `left.set(k, n)` fails naming `a second copy of a base Ignored mutant the evidence did not kill fails`, and a copy exempting by text fails naming `an evidence survivor on a written line whose text is a base line's fails`.
- **The mutation base** (`67-mutation-base.json`, `head` = `phase_base`, one recorded invocation):

| File | Killed | Timeout | Survived | NoCoverage | Ignored | Score |
| --- | --- | --- | --- | --- | --- | --- |
| `DecisionCache.ts` | 32 | 10 | 1 | 0 | 2 | 42/43 |
| `Lifecycle.ts` | 42 | 0 | 0 | 0 | 2 | 42/42 |
| `SharedComputation.ts` | 70 | 0 | 1 | 0 | 8 | 70/71 |

  Open mutants: `DecisionCache.ts:287 Survived ConditionalExpression -> true` and `SharedComputation.ts:319 Survived StringLiteral -> ""`; `Lifecycle.ts` has none. They are exactly the two the phase is built on.
- **The race test** runs, per budget and from gap 0, until `coalesced` and `hit` are both above zero, then three gaps more. Runs per budget, before (fixed `gap <= 48`) and after: 49 to 42, 49 to 26, 49 to 19, 49 to 17; 196 runs to 104. The side changes at gap 38, 22, 15 and 13, each followed by 4 `hit` runs.
- **Wall time:** the race test takes 260.2, 261.2 and 263.4 ms over three green runs; the file's 42 tests pass each time.
- **RED evidence:** with the hit check split out of the claim step (`pre-i5-split.patch`, never committed, reversed and `SharedComputation.ts` checked back to its base SHA-256), the race test exits 1 with `budget 3 gap 38`, `budget 4 gap 21` and `budget 6 gap 12`, each `{"joined":"miss","kWalks":2,...}`. With the owner spun past every gap (`let ownerSpin = 520;`, scratch), it exits 1 in 17.85 s through the cap, naming `budget <n>: {"coalesced":512,"hit":0,"miss":0} in 512 gaps` for n = 3 to 6, with no `Test timed out`.
- `race-span.mjs` finds all 7 hunks of the file's diff inside the race test, and exits 1 on a planted title edit of another test.

## Task Commits

1. **Task 1: the mutation base** - `24f31ef9` (docs)
2. **Task 2: the race loop** - `2b01cfa2` (test)
3. **Task 3: the evidence** - `97aa3f39` (docs)

**Plan metadata:** the `docs(67-01): summary` commit that holds this file.

## Files Created/Modified

- `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation.mjs` - the phase's mutation scorer (`record base|close`, `evidence`, `compare`, `--self-test`)
- `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-mutation-base.json` - the base counts, open mutants and ignored mutants
- `packages/core/test/DecisionCache.test.ts` - the race test's JSDoc paragraph, loop and timeout comment only
- `.planning/phases/QD-67-no-equivalent-mutants-no-magic-race-bound/67-RED-EVIDENCE.md` - green, iterations and time, red, cap, timeouts

## Decisions Made

- The patches, the scorer and `race-span.mjs` were applied verbatim from the plan, each against its stated SHA-256.
- The 30 000 ms vitest timeout stays: the green path is about 0.26 s and the cap's failure about 18 s.

## Deviations from Plan

None - plan executed exactly as written.

The plan-level scratch (`$TMPDIR/qd67`: logs, JSON reports, plants, the kept copy) is not committed. `.planning/config.json` carried the owner's uncommitted change throughout and was never staged.

## Issues Encountered

None. The host load average was 3.7 to 7.8 during the runs; nothing else ran beside Stryker or vitest.

## Flagged for the owner

- **The margin is not clipped by the cap.** A budget whose sides appear at gap 510 runs to gap 513. The cap bounds the search for both sides, not the margin after it.
- **The split's failing gaps** (38, 21, 12 at budgets 3, 4, 6) are at or one before the base's switch-over gaps (38, 22, 13); budget 5 did not fail in the one split run recorded. The evidence says only that the test goes red, not at which gaps it always does.
- **Two test texts are left as history** (the negative-capacity test and its comment), as the plan states; the test is unedited.

## Known Stubs

None.

## Threat Flags

None. No network endpoint, auth path or schema changed; the only source-adjacent edit is a test file.

## Next Phase Readiness

The base is recorded and the race test can fail. Plan 67-02 (the bench harness and the quiet-host check) can start. No blockers.

## Self-Check: PASSED

- `67-mutation.mjs`, `67-mutation-base.json`, `67-RED-EVIDENCE.md` and the modified test file exist; commits `24f31ef9`, `2b01cfa2` and `97aa3f39` are on `arch-wave-12`.
- The three task verifies exit 0; `git diff phase_base HEAD -- packages` names only `packages/core/test/DecisionCache.test.ts`.

---
*Phase: QD-67-no-equivalent-mutants-no-magic-race-bound*
*Completed: 2026-11-21*
