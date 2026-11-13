---
phase: 31-a-reset-supersedes-its-claims
plan: 03
subsystem: core/SharedComputation
tags: [single-flight, hooks, property-test, fast-check, superseded-claims]
requires: [31-02]
provides:
  - "SharedComputationHooks.settle(key, exit) replacing the claim-time hook; the claim step calls no adapter"
  - "describe('PROPERTY: a reset supersedes its claims'): a model-based property, seed 3101, 300 runs"
affects: [31-04, 31-05]
tech-stack:
  added: []
  patterns: ["hand-rolled model-based step loop over fast-check asyncProperty, laws checked after every step"]
key-files:
  created: []
  modified:
    - packages/core/src/SharedComputation.ts
    - packages/core/src/DecisionCache.ts
    - packages/core/test/SharedComputation.test.ts
key-decisions:
  - "The hook receives the full Exit, so DecisionCache keeps its own successes-only policy and FIFO eviction unchanged inside settle"
  - "Non-vacuity is reached by weighting the command generator (Run 7, Reset 4, Settle 2, Leave 6, key a:b 3:1, pick 0..1), never by lowering a floor"
requirements-completed: [SUPR-01, SUPR-04]
duration: 20 min
completed: 2026-11-12
status: complete
actuals:
  tokens: 16000
  tasks: 2
  commits: 2
plan_head_before: 569813948cdb24e9bca1fb03d9125c06a4d8ced4
plan_head_after: 1d862f30c477e71894133138b19eb6e9f624f060
commits: 2
---

# Phase 31 Plan 03: The settle hook and a model-based property Summary

`SharedComputationHooks` now carries `settle(key, exit)` in place of the closure-returning claim hook; the compute's
`onExit` calls it for a Live claim only, before `forget` and `Deferred.done`. A fast-check model-based property then
drives run, reset, settle and leave against a reference model, checking three laws after every step.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1. settle hook | `22c33642` refactor(31-03): the settle hook replaces the claim hook | SharedComputation.ts, DecisionCache.ts, SharedComputation.test.ts |
| 2. property | `1d862f30` test(31-03): a model-based property for a reset that supersedes its claims | SharedComputation.test.ts |

## Task 1

The claim step no longer calls the adapter and `Claimed` carries only the entry. The header names the `cached` and
`settle` hooks. `DecisionCache`'s hook is `settle: (key, exit) => { ... }` with its body unchanged. Every harness in
`SharedComputation.test.ts` moved to `settle`; `abandonWhileParked` records each settle's exit and asserts
`[Exit.succeed(2)]`. `DecisionCache.test.ts` is byte-identical to the phase base. 56 tests across the two files pass;
typecheck, lint and circular are clean.

## Task 2: the property

Laws, checked after every step and after a final drain: (1) the settle log equals the model's, so no superseded or
abandoned exit is settled; (2) each waiter answered at most once with the model's answer, none left unanswered after
the drain; (3) the started and interrupted computes equal the model's.

- Run time: about 0.46 s for the 300 runs.
- Floors reached at seed 3101 (deterministic): superseded compute completed 81, superseded compute's last waiter left
  46, ask claimed beside a still-running superseded compute 35; each floor is 30.
- Weighting was needed. The first, uniform generator reached 16 for the last-leave counter. The final generator
  weights Run 7, Reset 4, Settle 2, Leave 6, key `a`:`b` 3:1 and `pick` in 0..1. No floor, run count or seed was
  changed.
- No counterexample was found: the module held every law on the first complete run; nothing was added as an example
  test.
- Sabotage check: weakening the Live guard to `entry.standing !== "Abandoned"` makes the property fail; the file was
  restored (`git status --porcelain -- packages/core/src/SharedComputation.ts` is empty).

## Deviations from Plan

None - plan executed exactly as written. (Task 2 is a test over existing behavior, so there is no separate RED commit;
the sabotage check is its evidence that the property can fail.)

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Both commits are ancestors of HEAD; the three files exist; both Task 1 and Task 2 verify scripts and the sabotage check
passed.
