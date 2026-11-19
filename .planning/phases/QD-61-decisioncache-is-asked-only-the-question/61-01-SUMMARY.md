---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 01
subsystem: core
tags: [evidence, mutation-baseline, reserved-ids, api-surface, phase-base]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: []
provides:
  - phase_base, the commit every later plan in the phase is measured against
  - the base facts the change removes, with their lines at phase_base
  - ten reserved ids (and ARCH-108) confirmed free at phase_base
  - the 939-export API surface baseline
  - 61-mutation.mjs and 61-mutation-base.json, the rule and the floor for D-06
affects: [61-02, 61-03, 61-04, 61-05, 61-06, 61-07]
actuals:
  tokens: 9000
  tasks: 3
  commits: 1
plan_head_before: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
plan_head_after: f1e690caa0f7b4d542f6515c95990255384f5368
requirements-completed: []
duration: 8min
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 01: Evidence on the untouched base

**phase_base `7d2d281d`, the base facts the change removes, ten reserved ids free, the 939-export surface baseline, and the three core files' mutation floor (DecisionCache 0.9762, Lifecycle 1, SharedComputation 0.9859, two pre-existing survivors) committed with D-06's rule as `chore(61-01)` f1e690ca.**

## Base facts

`pnpm exec vitest run --project core packages/core/test/DecisionCache.test.ts packages/core/test/Lifecycle.test.ts packages/core/test/SharedComputation.test.ts < /dev/null`
on `phase_base`: **3 test files passed (3), 59 tests passed (59)**, 716 ms. The coalescing, failure and interruption
tests the phase keeps are green on the base (D-04).

Each line is `git show 7d2d281d:<file> | /usr/bin/grep -nF '<text>'`.

| File | Fact | Line at base |
| ---- | ---- | ------------ |
| `packages/core/src/DecisionCache.ts` | `compute: Effect.Effect<Trace, EvaluationError, PortServices>,` | 75 |
| `packages/core/src/DecisionCache.ts` | `(key, compute) =>` | 267 |
| `packages/core/src/Lifecycle.ts` | `const answer = walk(question, options?.concurrency);` | 88 |
| `packages/core/src/Lifecycle.ts` | `getOrCompute(question, answer)` | 120 |
| `packages/core/test/Lifecycle.test.ts` | `Layer.succeed(DecisionCache, {` | 24 |
| `packages/core/test/Lifecycle.test.ts` | `outcome: "miss" as const` | 27 |
| `packages/core/test/DecisionCache.test.ts` | `const trace = (label: string): Trace => ({` | 1121 |
| `packages/core/test/DecisionCache.test.ts` | `for (let gap = 0; gap <= 12; gap++)` | 1131 |
| `packages/core/src/EvaluationMetrics.ts` | `description: "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss).",` | 186 |
| `packages/core/src/index.ts` | `Walk.ts`: no match (core's barrel does not name it) | none |
| `packages/core/test/DecisionCache.tst.ts` | does not exist at the base (`git cat-file -e` fatal) | none |

## Reserved numbers

Ids: ARCH-108, ADR-QD-174, CCR-QD-452, BEH-QD-641, BEH-QD-642, BEH-QD-643, BEH-QD-644, BEH-QD-645, INV-QD-367,
INV-QD-368 (ten ids).

- `git grep -lwF <id> 7d2d281d -- spec packages .changeset AGENTS.md CONTRIBUTING.md features apps/website/src examples scripts`:
  no hit for any of the ten (task 1's second verify).
- `spec/decisions/174-*`: absent.
- Reservation file (`$(git rev-parse --git-common-dir)/qadi-reserved-ids.json`):
  `{"CCR":452,"ADR":174,"BEH":645,"INV":368}` (stored pretty-printed over five lines).
- `node scripts/next-id.mjs` was not run.

## API surface base

`pnpm -s spec:api < /dev/null` prints:

```
api-surface: 939 export(s) documented across 9 package(s)
```

`ls .changeset | wc -l`: 40 (`config.json` included).

## Mutation base

`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionCache.ts,packages/core/src/Lifecycle.ts,packages/core/src/SharedComputation.ts' < /dev/null`
on the untouched tree (packages equal to `phase_base`): wall time **56 s** ("Done in 55 seconds"), exit 0, final score
98.71 against a break threshold of 80. The report was fresh against `packages/core/src` and `test`, held exactly the three
files and matched the disk, so `61-mutation.mjs base` accepted it.

Stryker's table:

| File | total | covered | killed | timeout | survived | no cov | errors |
| ---- | ----- | ------- | ------ | ------- | -------- | ------ | ------ |
| All files | 98.71 | 98.71 | 143 | 10 | 2 | 0 | 0 |
| `DecisionCache.ts` | 97.62 | 97.62 | 31 | 10 | 1 | 0 | 0 |
| `Lifecycle.ts` | 100.00 | 100.00 | 42 | 0 | 0 | 0 | 0 |
| `SharedComputation.ts` | 98.59 | 98.59 | 70 | 0 | 1 | 0 | 0 |

`node .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-mutation.mjs base` printed:

```
packages/core/src/DecisionCache.ts 0.9761904761904762 (41/42) ignored 2
  survivor packages/core/src/DecisionCache.ts:260:19 Survived | ConditionalExpression | true | Option.isSome(oldest) | if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);
packages/core/src/Lifecycle.ts 1 (42/42) ignored 2
packages/core/src/SharedComputation.ts 0.9859154929577465 (70/71) ignored 8
  survivor packages/core/src/SharedComputation.ts:319:26 Survived | StringLiteral | "" | "Claimed" | return { _tag: "Claimed", entry };
wrote .planning/phases/QD-61-decisioncache-is-asked-only-the-question/61-mutation-base.json
```

Base survivors (two, both pre-existing; 61-04 can tell a base survivor from a new one by these):

1. `DecisionCache.ts:260:19`, `ConditionalExpression` to `true` on `Option.isSome(oldest)` in the eviction line
   `if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);`.
2. `SharedComputation.ts:319:26`, `StringLiteral` to `""` on `"Claimed"` in `return { _tag: "Claimed", entry };`.

Ignored (static) mutants at base: DecisionCache 2, Lifecycle 2, SharedComputation 8.

The baseline is committed as `chore(61-01)` **f1e690ca**: exactly `61-mutation.mjs` and `61-mutation-base.json`, with
nothing outside `.planning/` changed before it and `stryker.config.mjs` untouched.

## Next plan must know

- `phase_base` is the front-matter line above (`7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3`). HEAD at plan start was
  `7d2d281d`, not the plan-time `ccc1d1d5`; only `.planning/` differs between them, so the source is the same.
- A scoped core Stryker run of the three files takes about one minute here, not 10 to 30.
- `61-mutation.mjs` hashes to `bd83a56e583eee8313e237b452350bf696e1ad5bc70316a4369fdb3bb468322f`; neither it nor the base
  JSON is to be edited again.
- The Stryker report in `reports/mutation/` is the base run's; `61-mutation.mjs` refuses it as stale once any file under
  `packages/core/src` or `test` changes, so the after run must be redone.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check

PASSED. `61-mutation.mjs`, `61-mutation-base.json` found; commit f1e690ca is an ancestor of HEAD; both Task 3 verifies exit 0.
