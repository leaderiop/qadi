---
phase: 31-a-reset-supersedes-its-claims
plan: 05
subsystem: verification
tags: [mutation, merge-gate, commit-order, gate-integrity]
requires: [31-04]
provides:
  - "31-mutation-after.json"
  - "a green `pnpm check:pr < /dev/null` on the final tree of the phase"
affects: []
plan_head_before: 795e38029f9bcc986e35564830035f34073b4e5c
plan_head_after: acd47892751a767fe7ea0e3e0c2ba23fcb4297f2
commits: 1
status: complete
actuals:
  tokens: 1500
  tasks: 3
  commits: 1
key-files:
  created:
    - .planning/phases/31-a-reset-supersedes-its-claims/31-mutation-after.json
  modified: []
key-decisions:
  - "No drop in either file, so no drop-closing test and no restructure were needed"
requirements-completed: [WX-01, WX-04, WX-05, WX-06]
duration: 10 min
completed: 2026-11-12
---

# Phase 31 Plan 05: Closing the phase Summary

History shows nothing that judges the phase was edited by it, no forbidden token added, D-09's commit order held with the races first; neither touched file scored below its baseline (DecisionCache.ts rose to 0.9762); and `pnpm check:pr < /dev/null` is green on the final tree.

## Task 1: integrity checks over the phase history (base 7d89747a)

| Check | Result |
|---|---|
| Gate integrity: no script, workflow, Stryker, vitest, oxlint, tsconfig, package.json, lockfile, CHANGELOG, AGENTS.md, CONTRIBUTING.md, spec/overview.md or upgrading.md changed since the base | exit 0 |
| WX-04 forbidden tokens and suppressions over added lines | exit 0 |
| WX-06 / D-09 order: baseline alone first, one RED commit touching only SharedComputation.test.ts, then standing (SharedComputation.ts), deletion (DecisionCache.ts alone, counter lines removed, none added, DecisionCache.test.ts byte-identical to the base), settle hook; DecisionCache.test.ts lost no line | exit 0 |

Re-run after the 31-05 commit: all three still exit 0.

Order observed: `4f22f6a7` chore(31-01) baseline, `f3cdf7a3` test(31-01) RED races, `f29466c4` feat(31-02) standing, `ce9d2a46` refactor(31-02) deletion, `22c33642` refactor(31-03) settle hook.

Trailer note (history fact, not a gate failure, not rewritten): `4f22f6a7` and `f3cdf7a3` carry a `Claude Sonnet 5.5` Co-Authored-By trailer (harness default at the time). Two SDK-made docs commits, `896addf1` and `56981394`, carry no trailer at all; every other commit since the base carries Opus. Neither is rewritten.

## Task 2: mutation scores

Fresh core Stryker run on the two files (44 s, log `.../scratchpad/stryker-after.log`), then the comparison (exit 0).

| File | Base | After | Detected/scored |
|---|---|---|---|
| `packages/core/src/SharedComputation.ts` | 0.9857 | 0.9859 | 70/71 |
| `packages/core/src/DecisionCache.ts` | 0.9583 | 0.9762 | 41/42 |

No DROP, so no drop-closing test and no equivalent-mutant restructure. `31-mutation-base.json` is in one commit (31-01), unchanged. `31-mutation-after.json` committed as `acd47892`.

Surviving mutants after the phase:

| File:line | Mutator | Disposition |
|---|---|---|
| `SharedComputation.ts:318` | StringLiteral (`"Claimed"` tag replaced by `""`) | The base's line-282 survivor, moved by the rewrite. The `_tag` is only read inside the module's own `claim` branch, so nothing observable distinguishes it; not chased. |
| `DecisionCache.ts:260` | ConditionalExpression on `Option.isSome(oldest)` in the FIFO eviction | The base's line-278 survivor, moved by the rewrite: `oldest` is always `Some` when the capacity loop runs, so the guard cannot be false. Not chased. |

The base's `generation -= 1` survivor (`DecisionCache.ts:300`) is gone with the counter's deletion, as 31-01 predicted.

## Task 3: merge gate on the final tree

- Ran on commit `acd47892751a767fe7ea0e3e0c2ba23fcb4297f2`, nothing uncommitted under packages, scripts, spec, apps, .changeset, AGENTS.md or CONTRIBUTING.md (only the tool-managed `.planning/config.json` and `.planning/state.json`, never staged).
- `pnpm check:pr < /dev/null`: exit 0, 118 seconds (16 of 17 steps; `pnpm mutation` skipped by design, run directly in Task 2).
- Unit tests: 182 files, 4711 tests passed; BDD: 34 files, 568 tests passed; examples: 7 files, 42 tests passed.
- Coverage (workspace merge; per-package thresholds held, core at least 95%): all files 99.74% lines, 99.44% statements, 98.02% branches, 99.21% functions.
- Constraint check (31-05 commits touch only the two src files, their tests and the phase directory; nothing uncommitted): exit 0.

## Commits

| Commit | Message |
|---|---|
| `acd47892` | chore(31-05): mutation scores after a reset that supersedes its claims |

## Deviations from Plan

None - plan executed exactly as written. Mechanical note only: the plan's inline `node -e` checks were run from files in the scratchpad, byte-for-byte the plan's text; the Task 2 comparison's `process.argv.slice(1)` was replaced with the plan's two literal file paths.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `31-mutation-after.json`: present; `acd47892`: ancestor of HEAD.
