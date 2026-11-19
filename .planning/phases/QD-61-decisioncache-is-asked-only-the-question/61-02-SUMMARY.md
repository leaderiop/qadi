---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 02
subsystem: core
tags: [tests, characterisation, race-test, tstyche, red]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-01]
provides:
  - three characterisation tests, green on the base (D-03, D-12)
  - the I5 race test asking each question alone, sweeping gap 0..48 and asserting both sides (D-15)
  - DecisionCache.tst.ts, the type pins RED on the base (D-01, D-05 step 3)
affects: [61-03]
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
plan_head_before: c67e1ebd7f00333e2dfe54abd3b03721ddf3a3b6
plan_head_after: 7a67c3d5779a7412439aca1b5107dfefd2bad557
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 02: Tests on the base

**Three characterisation tests green on the base, the I5 race test asking each question alone over a 0..48 sweep that lands on both sides at every budget, and the type pins RED (3 failed, 1 passed) as three `test(61-02)` commits.**

## Commits

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1 | 02b3c7a3 | `test(61-02): one question with two concurrencies is one entry, and the claimant's concurrency governs` |
| 2 | cc794ebf | `test(61-02): the I5 race test asks each question alone and races on both sides` |
| 3 | 7a67c3d5 | `test(61-02): RED the cache is asked the question alone` |

Each commit touches one test file and carries the trailer. No src file changed.

## D-04

The tests D-04 keeps are all through `evaluate`, unedited, and green with the quick run at 62 tests:

- "N concurrent identical asks coalesce into one compute — the resolver is invoked once"
- "a failed compute is not cached — the next ask, once nothing is in flight, retries"
- the shared-failure test
- "an interrupted claimant still resolves the shared claim…"
- "a coalesced waiter's interruption does not interrupt the shared compute…"
- "a clear mid-compute is not undone by that compute finishing last, with the stale answer" and the third-ask pin
- "never evicts a key with a compute still in flight"
- the `qadi_decision_cache_lookups_total` pair
- the issue #64 pins

`git diff 7d2d281d -- packages/core/test/DecisionCache.test.ts` has hunks at the three import lines
(`-15`, `+16`, `+25`), Block A (`+509,117`), and the race test (`1222..1307`) only. Nothing between them is touched.

## D-15 can fail

With `gap <= 48` changed to `gap <= 12`:
`pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts -t "a joiner racing" < /dev/null` fails on
`oneSided`, at `DecisionCache.test.ts:1305`:

```
AssertionError: expected [ 3, 4, 5, 6 ] to deeply equal []
```

Every budget is one-sided on the old sweep, so none reaches the `hit` side. The file was restored with
`git checkout -- packages/core/test/DecisionCache.test.ts`, and `git status --short packages` was then clean.

## RED

`NO_COLOR=1 pnpm exec tstyche packages/core/test/DecisionCache.tst.ts < /dev/null`:

```
  × the cache is asked the question, and how the walk runs
  × no caller can hand the cache a computation
  × the second parameter is evaluate's concurrency option, derived
  + the result is unchanged: a trace and how the cache came by it
Tests:      3 failed, 1 passed, 4 total
Assertions: 6 failed, 3 passed, 9 total
Suppressed: 1 matched, 1 total
```

The file hashes to `0b920f3ea142cc40d381a03b265da8ee8d8573bff16338221082986d5d1da686`. `pnpm typecheck` exits 0 and
lint is clean for the new files.

## Verifies

- Quick run, after Task 1 and after Task 2: `Test Files  3 passed (3)`, `Tests  62 passed (62)`.
- `pnpm exec tsc -p tsconfig.test.json --noEmit`: exit 0, after Tasks 1 and 2.
- `pnpm -s lint`: exit 0, `house-style: 560 file(s) clean (3 declared switch(es))`.
- Block A and Block R are in the file verbatim; `getOrCompute(` appears once in code (the `lookup` helper).

## Known red until 61-03

`pnpm test:tstyche` (the new file) and so `pnpm check:pr` are RED by design. 61-03 turns them green.

## Next plan must know

- The race test's `lookup` helper pairs each question with `walk(question, undefined)`. 61-03 changes that one line to
  `cache.getOrCompute(question)` and drops the `walk` import.
- The race test ran in well under a second here, not the plan-time 2 s. The 30 s timeout is in place.
- `phase_base` is `7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3`.

## Deviations from Plan

None to a check. One note: `<interfaces>` says Block R carries a one-line comment recording the measured switch-over
map (gap 38/22/15/13 at budget 3/4/5/6), but the verbatim Block R has no such line. The verify demands Block R verbatim,
so the comment was not added. The map is not re-measured here; the test passing shows both sides are reached at each
budget.

## Known Stubs

None.

## Self-Check

PASSED. Commits 02b3c7a3, cc794ebf and 7a67c3d5 are ancestors of HEAD; `DecisionCache.tst.ts` exists.
