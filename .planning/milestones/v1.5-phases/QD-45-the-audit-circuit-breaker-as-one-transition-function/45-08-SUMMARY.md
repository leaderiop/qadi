---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 08
subsystem: audit
tags: [mutation, stryker, scope-check, merge-gate, close]
status: complete
plan_head_before: f03b078cb4d457baa18a8e0d55cad9fbd23c0c48
plan_head_after: 90f77914accb2fbddc86bc495d36aef2c264b265
commits: 1

requires:
  - phase: QD-45 plan 07
    provides: the spec records; the finished phase to be measured
provides:
  - "45-mutation-after.json: the four after-scores, committed once"
  - "evidence that CircuitBreaker.ts and AuditDecisionSinkLive.ts did not fall below their base scores"
  - "evidence that scope, forbidden constructs, commit order, ids and the Phase 48 lines hold over every commit since phase_base"
  - "pnpm check:pr green on the final HEAD"
affects: []

actuals:
  tokens: 6000
  tasks: 3
  commits: 1

key-files:
  created:
    - .planning/phases/QD-45-the-audit-circuit-breaker-as-one-transition-function/45-mutation-after.json

key-decisions:
  - "No survivor test was needed: both base files are at or above base, and the new files have no survivor, so no test(45-08) commit was made"

requirements-completed: [WX-01, WX-02, WX-04, WX-05, WX-06, WX-07]

duration: 10min
completed: 2026-11-15
---

# Phase 45 Plan 08: Close Summary

Mutation on the touched audit files did not fall (CircuitBreaker.ts 0.8051 to 0.8496, AuditDecisionSinkLive.ts 1 to 1, the two new files 1), every scope, construct, order and id check holds across the phase, and `pnpm check:pr < /dev/null` exits 0 on the final HEAD.

## Mutation (Task 1)

Two background Stryker runs, one at a time, using the base's exact invocation for the base files. Both exited 0 (the comparer found no stale report, each report holds exactly its two files, `source` equals disk).

| File | Base | After | (detected/scored) | Ignored |
|---|---|---|---|---|
| `packages/audit/src/AuditDecisionSinkLive.ts` | 1 | 1 | 58/58 | 1 |
| `packages/audit/src/CircuitBreaker.ts` | 0.8051282051282052 | 0.849624060150376 | 113/133 | 54 |
| `packages/audit/src/InvalidAuditSinkOption.ts` | none (new) | 1 | 2/2 | 5 |
| `packages/audit/src/SinkOptionChecks.ts` | none (new) | 1 | 21/21 | 1 |

Runs took 20 s (new files, 23 mutants) and 38 s (base files). `45-mutation-after.json` was written by the comparer and committed alone as `chore(45-08)` (`90f77914`); `45-mutation-base.json` still has its one commit.

CircuitBreaker.ts survivors (20, all above the base score, so no test round was required; none is excused as equivalent):

- `:457:21` ConditionalExpression -> `true` (`initialStatus === "HalfOpen"`)
- `:461:7` and `:461:25` and `:461:39`: the `initialStatus === "HalfOpen" && claimed === undefined` guard (ConditionalExpression x4, LogicalOperator, EqualityOperator x2, StringLiteral)
- `:480:32` StringLiteral, the `qadi.audit.circuitBreaker.withPermit` span name
- `:486:36` ObjectLiteral (the span attributes), `:488:31`/`:488:47` and `:491:9` (`permit._tag === "Admitted" && permit.probe` in the span attribute and the probe branch: ConditionalExpression, LogicalOperator, EqualityOperator, StringLiteral)

## Equivalent mutants

None. The new files have no survivor, and no base-file mutant is listed.

## Task 2 checks

- Scope and WX-04 scan: `36 files changed, all in scope; no forbidden construct added`.
- Order, ids, Phase 48 lines, test blob: `29 commits in order; ids reserved; Phase 48 lines intact; CircuitBreaker.test.ts unedited`.
- Both were green before the `chore(45-08)` commit (35 files, 28 commits) and again after it.

## Task 3 checks

- `pnpm check:pr < /dev/null`: exit 0. `run-check: ran 16 of 17 steps; "pnpm mutation" was skipped (release PRs run it).` Steps 1-16: typecheck, lint, circular, test:tstyche, coverage (214 files, 5252 tests passed), test:bdd (568 tests), spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website (45 pages), spec:publish (`9 package(s) and 6 document(s) agree on version (0.12.0)`).
- Release check: `nothing released, pushed or staged`. The index is empty and `.planning/config.json` is still the pre-existing uncommitted change.

## Deviations from Plan

None - plan executed exactly as written. The two plan-check anomalies the orchestrator flagged (a diff of `CircuitBreakerTable.test.ts` against `phase_base`, and the `AuditSinkDeadline.test.ts` title count) were not tripped by any 45-08 check.

## Known Stubs

None.

## Threat Flags

None.

## Commits

- `90f77914` chore(45-08): mutation after the breaker's rules became one transition function

## Self-Check: PASSED

`45-mutation-after.json` exists and holds the four scores; commit `90f77914` is an ancestor of HEAD; all six verify commands exit 0 on the final HEAD.
