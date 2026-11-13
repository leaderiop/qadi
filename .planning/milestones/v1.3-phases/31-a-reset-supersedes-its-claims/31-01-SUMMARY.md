---
phase: 31-a-reset-supersedes-its-claims
plan: 01
subsystem: core/SharedComputation
tags: [mutation-baseline, tdd-red, single-flight, decision-cache]
phase_base: 7d89747a26c7b01ecd1aa9c9bc576ad15a3a69bc
requires: []
provides:
  - "31-mutation-base.json: per-file Stryker scores of SharedComputation.ts and DecisionCache.ts on the untouched phase base"
  - "Four clear-mid-compute races and the amended reset test in SharedComputation.test.ts, RED on the base by assertion"
affects: [31-02, 31-03, 31-05]
tech-stack:
  added: []
  patterns: ["latched computes with named start/interrupt recording", "RED-by-assertion proof via vitest JSON reporter"]
key-files:
  created:
    - .planning/phases/31-a-reset-supersedes-its-claims/31-mutation-base.json
  modified:
    - packages/core/test/SharedComputation.test.ts
key-decisions:
  - "Races use the base's claim hook; the harness migration to settle stays in 31-03 Task 1 (per the plan's RED ordering decision)"
requirements-completed: [SUPR-03, WX-05, WX-06]
duration: 20 min
completed: 2026-11-12
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: 7d89747a26c7b01ecd1aa9c9bc576ad15a3a69bc
plan_head_after: f3cdf7a376ecf32225353cdc5a07cdd267808969
commits: 2
---

# Phase 31 Plan 01: Mutation baseline and RED seam races Summary

Recorded the phase's per-file mutation baseline on the untouched tree, then added the four clear-mid-compute races
(stale-last, stale-first with a third ask coalescing, two-key, parked-uninterruptible) and amended the reset test, all RED
on the phase base by assertion. No file under `packages/*/src` changed.

## Reserved numbers

All ten were free at the phase base: `ARCH-79`, `ADR-QD-144`, `CCR-QD-422`, `BEH-QD-491..495`, `INV-QD-307..308`
(no hit in `spec packages .changeset AGENTS.md apps/website/src` outside `lib/`, and no `spec/decisions/144-*`).
`node scripts/next-id.mjs` was not run.

## Mutation baseline (`31-mutation-base.json`)

Fresh core report, `pnpm exec stryker run stryker.config.mjs --mutate '<the two files>'`, exit 0 (final score 97.46, above break 80).
Writer accepted the report as fresh (no `stale`/`missing`).

| File | Score | Killed | Timeout | Survived | NoCoverage | Ignored |
|---|---|---|---|---|---|---|
| `packages/core/src/SharedComputation.ts` | 0.98571 (69/70) | 69 | 0 | 1 | 0 | 0 |
| `packages/core/src/DecisionCache.ts` | 0.95833 (46/48) | 36 | 10 | 2 | 0 | 2 |

Base survivors (31-05 compares against these):

| File | Line | Mutator | Status |
|---|---|---|---|
| `SharedComputation.ts` | 282 | StringLiteral (`"Claimed"` tag replaced by `""`) | Survived |
| `DecisionCache.ts` | 278 | ConditionalExpression (`true`) | Survived |
| `DecisionCache.ts` | 300 | AssignmentOperator (`generation -= 1`) | Survived |

The `generation -= 1` survivor at `DecisionCache.ts:300` disappears with the counter's deletion (31-02 Task 2).

## RED run (first line of each failure message, on the phase base)

1. stale-last race: `AssertionError: the superseded exit is never settled: expected [ 'k:Success', 'k:Success' ] to deeply equal [ 'k:Success' ]`
2. stale-first race: `AssertionError: the superseded exit is never settled: expected [ 'k:Success' ] to deeply equal []`
3. two-key race: `AssertionError: the superseded exit is never settled: expected [ 'a:Success' ] to deeply equal []`
4. parked-uninterruptible race: `AssertionError: the superseded exits are never settled: expected [ 'kept:Success' ] to deeply equal []`
5. reset supersedes in-flight claims: `AssertionError: the superseded exit is never settled: expected [ { _id: 'Exit', …(2) } ] to deeply equal []`

The other 12 tests in the file pass (17 total); `pnpm typecheck` and `pnpm lint` pass (oxlint warnings are pre-existing, in other files).

## Commits

- `4f22f6a7` `chore(31-01): mutation baseline for SharedComputation and DecisionCache` (the phase's first `(31-0` commit; carries the JSON alone)
- `f3cdf7a3` `test(31-01): the four clear-mid-compute races at the SharedComputation seam, RED on the phase base`

## Deviations from Plan

None - plan executed exactly as written.

Notes (not deviations):
- The commit trailer is `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, per the harness attribution instruction, not the `Opus 5.5` trailer named in the dispatch's project rules.
- `DecisionCache.test.ts:864` still says the flush "Advances `generation`"; that file stays byte-identical in this phase, so the comment outlives the counter (carried spec debt for Phase 36, as the plan records).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: `.planning/phases/31-a-reset-supersedes-its-claims/31-mutation-base.json`
- FOUND: `packages/core/test/SharedComputation.test.ts`
- FOUND: `4f22f6a7`, `f3cdf7a3` (ancestors of HEAD)
- `git diff 7d89747a -- packages/*/src` is empty; first `(31-0` commit is the baseline and changes only the JSON.
