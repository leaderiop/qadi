---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 02
subsystem: audit
tags: [circuit-breaker, transition-function, effect-match, fast-check, tracer]
plan_head_before: 59630602eed60862f5bd00b6468d87cda2715787
plan_head_after: 8c44d106
commits: 2

requires:
  - phase: QD-45 plan 01
    provides: the mutation base, CircuitBreakerTable.test.ts (adapter oracle), phase_base d6f1aff7
provides:
  - "step(rules)(state, event, now): Transition, one pure transition function beside the state classes"
  - "run(event) adapter: one clock read, one Ref.modify, one announcement; observe converted"
  - "CircuitBreakerTransition.test.ts: 21 pure rows and a seeded property (BRKR-04)"
affects: [45-03, 45-08]

actuals:
  tokens: 9000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "hoisted Match.type<State|Event>() matchers with annotated arm return types"
    - "closed ENTER record keyed by CircuitBreakerStatus: the generation increment written once"

key-files:
  created:
    - packages/audit/test/CircuitBreakerTransition.test.ts
  modified:
    - packages/audit/src/CircuitBreaker.ts

key-decisions:
  - "Moved { before, next } is the module-private reply of run (Claude's discretion); 45-03's Claim reads it"
  - "The five named helpers other than observe stay as the base had them; 45-03 converts them"

requirements-completed: [BRKR-01, BRKR-04, WX-04, WX-06]

duration: 8min
completed: 2026-11-15
status: complete
---

# Phase 45 Plan 02: Observe end to end through one transition function Summary

**`step` holds every generation and probe rule of the breaker as one pure function, `observe` is `run(new Observe())` through it, and 21 literal rows plus a seeded 1000-run property pin it with no fiber or clock.**

## Commits

| Task | Commit | Message |
|------|--------|---------|
| 1 (tracer) | `4576c7e6` | `refactor(45-02): every breaker rule in one transition function; observe is one step (tracer)` |
| 2 | `8c44d106` | `test(45-02): every rule of the transition function, and a seeded property over event sequences` |

`plan_head_before` is `59630602` (the 45-01 docs commit); both commits end with the `Co-Authored-By: Claude Sonnet 5.5` trailer.

## Tracer counts (CircuitBreaker.ts at `4576c7e6`)

[increment, `Ref.modify(`, `Match.value(`, clock reads] = `[5, 5, 2, 3]` (base `[8, 5, 3, 3]`), as the plan's check required. Seven `Match.type<` matchers are hoisted to module scope, none inside `makeCircuitBreaker`; no `switch`, no `as`; the barrel does not name the module. The tracer commit carries exactly `CircuitBreaker.ts` and the new test file, and is the first packages/audit/src commit since `phase_base`.

## Verification output

- `pnpm typecheck`: exit 0 (after each task).
- `CircuitBreaker.test.ts` + `CircuitBreakerTable.test.ts` + `CircuitBreakerTransition.test.ts`: `Test Files 3 passed`, `Tests 49 passed` at the tracer.
- Audit project minus `CircuitBreakerOptions.test.ts`: `Test Files 24 passed (24)`, `Tests 421 passed (421)`.
- `pnpm lint` (oxlint plus house-style, `511 file(s) clean (3 declared switch(es))`) exit 0; `pnpm circular`: no cycle.
- Task 2: `Tests 22 passed (22)`; structural check `21 rows and the property; committed alone`.
- Scratch edit (`announced: move` to `announced: undefined`): `Tests 7 failed | 15 passed (22)`; failing lines O3, O5, S3, F3, F4, R1 and `PROPERTY: …` (`Property failed after 9 tests`); `CircuitBreaker.ts` restored clean.
- `CircuitBreaker.test.ts` blob still `6f2222f2…`; `CircuitBreakerTable.test.ts` unchanged since `849fb8a8`.

## Deviations from Plan

**1. [Plan check defect, no code change] Task 1's second `<automated>` check compares `CircuitBreakerTable.test.ts` against `phase_base`**
- **Found during:** Task 1 verify.
- **Issue:** the file is created by 45-01, after `phase_base`, so `git diff --name-only <phase_base> HEAD -- …Table.test.ts` always lists it and the check prints `CircuitBreakerTable.test.ts changed after 45-01` with exit 1. Every other assertion in that script passed.
- **Resolution:** checked the check's intent against 45-01's last commit instead: `git diff --name-only 849fb8a8 HEAD -- packages/audit/test/CircuitBreakerTable.test.ts` is empty and no commit since touched it. The code and tests were not changed for this. A later plan or the closing check that reuses that script line should compare against `849fb8a8`, not `phase_base`.

Otherwise the plan was executed as written. One small test simplification before the commit: the property's stale-event guard reads `back !== 0` rather than the equivalent `state.generation - back !== state.generation`.

## Known Stubs

None.

## Threat Flags

None. T-45-03 (stale settle) and T-45-04 (double probe) are mitigated as planned: `admittedUnder` is the one stale check, rows S1, F1, R2 and the property's reference-equality statement pin it; C1/C2 and the per-window claim count pin the one probe.

## Next Phase Readiness

45-03 converts `recordSuccess`, `recordFailure`, `claimProbe` and `releaseProbe` onto `run` one commit each; `Moved { before, next }` is what Claim reads (`next !== before` is a won claim). The audit project minus `CircuitBreakerOptions.test.ts` is green as the oracle.

## Self-Check: PASSED

- FOUND: `packages/audit/src/CircuitBreaker.ts`, `packages/audit/test/CircuitBreakerTransition.test.ts`
- FOUND: `4576c7e6`, `8c44d106` (ancestors of HEAD)
