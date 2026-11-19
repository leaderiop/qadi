---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 03
subsystem: core
tags: [decision-cache, breaking-change, tracer, type-pins, cache-poisoning]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-02]
provides:
  - DecisionCacheShape.getOrCompute(question, options?) with no computation parameter
  - decisionCacheLayer walks the question it is given (claimant's concurrency governs)
  - the type pins GREEN (4 of 4, 9 of 9) and shown able to fail
affects: [61-04, 61-05, 61-06, 61-07]
actuals:
  tokens: 12000
  tasks: 3
  commits: 1
plan_head_before: 2b8d34fbc37b896f4dd0dc6a8180076f3f94949f
plan_head_after: 1e0900da4d648c73bd6dba174a31b2bb46d5115a
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 03: A DecisionCache is asked only the question

**`getOrCompute` takes `(question, options?: Pick<EvaluateOptions, "concurrency">)`, the layer walks its own key, and a host cache wraps `decisionCacheLayer()`: one `feat(61-03)!` commit 1e0900da, the phase's first src commit, with the type pins green and each negative shown to fail.**

## Commit

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1+2 | 1e0900da | `feat(61-03)!: a DecisionCache is asked only the question` |

Exactly five files: `DecisionCache.ts`, `Lifecycle.ts`, `Question.ts`, `Lifecycle.test.ts`, `DecisionCache.test.ts`
(79 insertions, 47 deletions). The body holds the `BREAKING CHANGE:` paragraph and the trailer is the last line.
Tasks 1 and 2 are one commit by the plan's design; Task 3 commits nothing.

## Verifies

- Task 1 quick run (DecisionCache, Lifecycle, SharedComputation): green, `Tests  62 passed (62)`.
- Type pins on `DecisionCache.tst.ts`:
  ```
  Tests:      4 passed, 4 total
  Assertions: 9 passed, 9 total
  Suppressed: 1 matched, 1 total
  ```
- `pnpm typecheck` exit 0; `pnpm -s circular`: `No circular dependency found!`.
- Task 1 pattern check and Task 2 doc check: both pass (`DecisionCache.ts` says no `compute`).
- Whole core project: `Test Files  82 passed (82)`, `Tests  2648 passed (2648)`.
- `pnpm test:tstyche`: `Test files: 65 passed`, `Tests: 343 passed`, `Assertions: 737 passed`, `Suppressed: 55 matched`.
- `pnpm -s lint`: `house-style: 560 file(s) clean (3 declared switch(es))`. Its only warnings are two pre-existing
  `unicorn/prefer-string-starts-ends-with` ones in `.planning/phases/QD-60-.../60-scan.mjs`.

## Negatives can fail

The loose alias (`options?: unknown, ...rest: ReadonlyArray<unknown>`) fails all three negatives:

```
  + the cache is asked the question, and how the walk runs
  × no caller can hand the cache a computation
  + the second parameter is evaluate's concurrency option, derived
  + the result is unchanged: a trace and how the cache came by it
Tests:      1 failed, 3 passed, 4 total
Assertions: 3 failed, 6 passed, 9 total
```

Exporting a `walk` from the barrel (`export { evaluate as walk } from "../src/index.ts"`) fails the directive:

```
Error: Unused '@ts-expect-error' directive. ts(2578)
  24 | // @ts-expect-error has no exported member 'walk'
```

Both copies were removed, `git status --short packages` is clean, and the real pins are green again (4 of 4, 9 of 9).

## Deviations from Plan

**1. [Plan error, check only] Task 2's third verify compared the frozen files against `phase_base`.**
`DecisionCache.tst.ts` is one of them but 61-02 created it after `phase_base`, so `git diff --name-only <phase_base> HEAD`
lists it and the check prints `a frozen file changed`. Every other clause of that verify passed (subject, five files,
first src commit, BREAKING CHANGE paragraph, trailer, clean `packages`). The intent, "no frozen file changed by this
plan", was checked against 61-02's RED commit `2b8d34fb` instead: `git diff --name-only 2b8d34fb HEAD` over the same six
paths prints nothing. For `SharedComputation.ts`, `Walk.ts`, `EvaluationMetrics.ts`, `index.ts` and the bench, `phase_base`
and `2b8d34fb` give the same answer (none changed). 61-07's scan should compare `DecisionCache.tst.ts` against
61-02's commit, not `phase_base`.

**2. [Orchestrator addition] One comment in Block R.** The orchestrator asked for the line
`// Measured coalesced→hit switch-over: gap 38/22/15/13 at budget 3/4/5/6; if an effect upgrade moves it, re-measure rather than retry.`
above the race test's sweep loop. None of 61-03's verifies forbids it (Block R's verbatim check was 61-02's, and 61-03's
code checks strip comments), so it is in the same commit, directly above `for (let gap = 0; gap <= 48; gap++)`.

Also: the unedited-tests rule held. Besides C8/C9 (the `walk` import and the `lookup` helper) and that one comment,
`DecisionCache.test.ts` is unchanged from 61-02.

## Test fix

None. No `test(61-03)` commit.

## Next plan must know

- `decisionCacheLayer`'s adapter is `shared.run(key, walk(key, options?.concurrency))`; `DecisionCache.ts` now imports
  `./Walk.ts`; `madge` is clean and the barrel still does not name `Walk.ts`.
- `pnpm test:tstyche` and so `pnpm check:pr` are no longer red on `DecisionCache.tst.ts`.
- The Stryker report in `reports/mutation/` is the base run's and is stale against the changed `packages/core/src`;
  61-04's after run must be redone.
- `DecisionCache.ts` is down to zero `compute` words; 61-06's spec edits can cite ADR-QD-174's wording from D1 in source.
- Edit-script note: zsh does not word-split an unquoted `$F`, so stage by listing paths.

## Known Stubs

None.

## Self-Check

PASSED. Commit 1e0900da is an ancestor of HEAD; the five files are in it; no `DecisionCache.loose.tst.ts` or
`DecisionCache.exported.tst.ts` remains.
