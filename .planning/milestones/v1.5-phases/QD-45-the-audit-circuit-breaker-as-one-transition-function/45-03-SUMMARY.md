---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 03
subsystem: audit
tags: [circuit-breaker, transition-function, refactor]
plan_head_before: a3333552a34c943a374b6f6153bb40fe2a388857
plan_head_after: 59fc4a7944426cea1b19d09a53a6174392782f0b
commits: 4

requires:
  - phase: QD-45 plan 02
    provides: step, run, Moved, the tracer (observe) and the three-suite oracle
provides:
  - "recordSuccess, recordFailure, claimProbe, releaseProbe as one-liners over run"
  - "the atomicity comment on run; the generation increment written once, in step"
affects: [45-08]

actuals:
  tokens: 3000
  tasks: 2
  commits: 4

tech-stack:
  added: []
  patterns:
    - "claim won exactly when Equal.equals(before, next) is false"

key-files:
  created: []
  modified:
    - packages/audit/src/CircuitBreaker.ts

key-decisions:
  - "The four helpers survive as one-liners over run, so admit, withPermit and the release finalizer are byte-identical to phase_base"

requirements-completed: [BRKR-01, BRKR-02, BRKR-05, WX-04]

duration: 6min
completed: 2026-11-15
status: complete
---

# Phase 45 Plan 03: Success, failure, claim and release through one step Summary

**Every breaker event now goes through `run` and `step`: the generation's increment is written once, there is one `Ref.modify` and one clock read, and each of the four conversions is its own commit, replayed green against the three breaker suites.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 | `ced81251` | `refactor(45-03): a success is one step` |
| 1 | `0bb2a761` | `refactor(45-03): a failure is one step` |
| 2 | `70b02048` | `refactor(45-03): a probe claim is one step` |
| 2 | `59fc4a79` | `refactor(45-03): a probe release is one step` |

Each carries only `packages/audit/src/CircuitBreaker.ts` and ends with the `Co-Authored-By: Claude Sonnet 5.5` trailer. `plan_head_before` is `a3333552` (the 45-02 docs commit).

## Counts per commit

[increment, `Ref.modify(`, `Match.value(`, clock reads], comments stripped for the last three:

| Commit | Counts |
|--------|--------|
| base (`d6f1aff7`) | 8, 5, 3, 3 |
| tracer `4576c7e6` | 5, 5, 2, 3 |
| success `ced81251` | 4, 4, 1, 3 |
| failure `0bb2a761` | 2, 3, 0, 2 |
| claim `70b02048` | 2, 2, 0, 2 |
| release `59fc4a79` | 1, 1, 0, 1 |

Lines added under packages/audit/src since `phase_base` carry the increment once. No matcher is built inside `makeCircuitBreaker`; the text from `const admit` to `satisfies CircuitBreaker;` equals `phase_base`'s; the atomicity comment is on `run`. `claimProbe` is `run(new Claim())` mapped to `next.generation` when `Equal.equals(before, next)` is false, `undefined` otherwise.

## Replay of the five converting commits (CircuitBreaker.test.ts, CircuitBreakerTable.test.ts, CircuitBreakerTransition.test.ts)

- `4576c7e6` tracer: Tests 66 passed (66)
- `ced81251` success: Tests 66 passed (66)
- `0bb2a761` failure: Tests 66 passed (66)
- `70b02048` claim: Tests 66 passed (66)
- `59fc4a79` release: Tests 66 passed (66)

`CircuitBreaker.ts` restored to HEAD afterwards. At each commit: `pnpm typecheck` exit 0, `pnpm lint` clean (`511 file(s) clean (3 declared switch(es))`), audit project minus `CircuitBreakerOptions.test.ts` `Test Files 24 passed`, `Tests 438 passed`; `pnpm circular` no cycle at the last.

## Flagged readings

- **BRKR-02:** taken as one `Ref.modify(` call site in the code, inside `run`, and no matcher constructed per call or inside `makeCircuitBreaker`. Confirmed by the final counts and the structural check.
- **BRKR-05:** `CircuitBreaker.test.ts` blob equals `6f2222f2…` (unchanged), and it passes against the CircuitBreaker.ts of every converting commit.

## Deviations from Plan

None - plan executed exactly as written. (The plan's own checks needed no change; the Table-test baseline note from 45-02 did not arise because no check here compares against `phase_base`.)

## Known Stubs

None.

## Threat Flags

None. T-45-05 and T-45-06 are mitigated as planned: one event per commit with counts pinned, one `Ref.modify` in `run`, the model property running at every commit.

## Next Phase Readiness

The breaker is fully on `step`/`run`. 45-04/45-05 add the option refusals (`CircuitBreakerOptions.test.ts` stays RED until then).

## Self-Check: PASSED

- FOUND: `packages/audit/src/CircuitBreaker.ts`
- FOUND: `ced81251`, `0bb2a761`, `70b02048`, `59fc4a79` (ancestors of HEAD)
