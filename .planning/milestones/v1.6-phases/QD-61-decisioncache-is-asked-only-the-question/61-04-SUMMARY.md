---
phase: QD-61-decisioncache-is-asked-only-the-question
plan: 04
subsystem: core
tags: [evidence, mutation, stryker, d-06, wx-05]
phase_base: 7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3
requires: [61-03]
provides:
  - 61-mutation-after.json, the three files' scores and mutant identities after the change
  - 61-mutation-static.json, the ignoreStatic:false evidence for the one new static-ignored mutant
  - WX-05 holds (D-06)
affects: [61-05, 61-06, 61-07]
actuals:
  tokens: 6000
  tasks: 3
  commits: 2
plan_head_before: 71734de794546838db0f570e82756f3cecb79da0
plan_head_after: 4661c111a1b10c5bd4aa030e798ef55a393690de
requirements-completed: []
completed: 2026-11-19
status: complete
---

# Phase QD-61 Plan 04: Mutation after-run

**No score fell and no survivor is new: DecisionCache 0.9762 to 0.9767, Lifecycle 1 to 1, SharedComputation 0.9859 to 0.9859; one new static-ignored mutant is Killed under `ignoreStatic:false`; `WX-05 holds (D-06)`; evidence committed as `chore(61-04)` 4661c111.**

## Commits

| Task | SHA | Subject |
| ---- | --- | ------- |
| 1-3 | 4661c111 | `chore(61-04): mutation after-run of DecisionCache, Lifecycle and SharedComputation` |

The commit holds exactly `61-mutation-after.json` and `61-mutation-static.json` and ends with the trailer. No src, test,
`61-mutation.mjs`, base JSON or `stryker.config.mjs` change. No `test(61-04)` commit was needed.

## Mutation after

`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/DecisionCache.ts,packages/core/src/Lifecycle.ts,packages/core/src/SharedComputation.ts' < /dev/null`
(61-01's invocation, unchanged), run alone (`pgrep -fl 'stryker|vitest'` empty first). Exit 0, **"Done in 56 seconds"**,
final score 98.72 against break threshold 80.

| File | total | covered | killed | timeout | survived | no cov | errors |
| ---- | ----- | ------- | ------ | ------- | -------- | ------ | ------ |
| All files | 98.72 | 98.72 | 144 | 10 | 2 | 0 | 0 |
| `DecisionCache.ts` | 97.67 | 97.67 | 32 | 10 | 1 | 0 | 0 |
| `Lifecycle.ts` | 100.00 | 100.00 | 42 | 0 | 0 | 0 | 0 |
| `SharedComputation.ts` | 98.59 | 98.59 | 70 | 0 | 1 | 0 | 0 |

`node 61-mutation.mjs after`:

```
packages/core/src/DecisionCache.ts 0.9767441860465116 (42/43) ignored 2
  survivor packages/core/src/DecisionCache.ts:277:19 Survived | ConditionalExpression | true | Option.isSome(oldest) | if (Option.isSome(oldest)) entries = HashMap.remove(entries, oldest.value);
packages/core/src/Lifecycle.ts 1 (42/42) ignored 2
packages/core/src/SharedComputation.ts 0.9859154929577465 (70/71) ignored 8
  survivor packages/core/src/SharedComputation.ts:319:26 Survived | StringLiteral | "" | "Claimed" | return { _tag: "Claimed", entry };
wrote .../61-mutation-after.json
```

The two survivors are the base's two (the eviction line moved from 260:19 to 277:19 with the new code above it).

`node 61-mutation.mjs compare` (no evidence), exit 1 with the one static ask:

```
packages/core/src/DecisionCache.ts 0.9761904761904762 -> 0.9767441860465116 (detected 41 -> 42; lost 10, rewritten 7, deleted 3; survivors +0 -0, moved 0)
  deleted ArrowFunction | () => undefined | (found) => ({ trace: found.value, outcome: found.outcome }) | …
  deleted ArrowFunction | () => undefined | (key, compute) => Effect.map(shared.run(key, compute), …) | …
  deleted ObjectLiteral | {} | { trace: found.value, outcome: found.outcome } | …
packages/core/src/Lifecycle.ts 1 -> 1 (detected 42 -> 42; lost 4, rewritten 1, deleted 3; survivors +0 -0, moved 0)
  deleted ArrowFunction | () => undefined | (trace) => ({ trace, outcome: undefined }) | …
  deleted ObjectLiteral | {} | { trace, outcome: undefined } | …
  deleted OptionalChaining | options.concurrency | options?.concurrency | const answer = walk(question, options?.concurrency);
packages/core/src/SharedComputation.ts 0.9859154929577465 -> 0.9859154929577465 (detected 70 -> 70; lost 0, rewritten 0, deleted 0; survivors +0 -0, moved 0)
packages/core/src/DecisionCache.ts has 1 new static-ignored mutant(s) and no evidence was given: run the after tree with ignoreStatic:false and pass …/61-mutation-static.json
```

Every declared deletion happened (the `compute` parameter, `(key, compute) =>`, `const answer = walk(…)`,
`getOrCompute(question, answer)`: the deleted lines are all reported `deleted`).

## Static evidence

`X=/private/tmp/claude-502/-Users-mohammadalmechkor-Projects-Perso-qadi/4f5f4e94-daaa-4e42-b8b8-92e68d5bdffb/scratchpad/p61-static`,
outside the repository. `X/stryker61-static.mjs` imports the repo's `stryker.config.mjs` by absolute path as `base` and
exports `{ ...base, ignoreStatic: false, reporters: ["json", "clear-text"], jsonReporter: { fileName: "X/stryker61-static-report.json" } }`.
Run alone from the repo root on the same tree: exit 0, **"Done in 2 minutes and 28 seconds"**, score 98.81.

| File | total | killed | timeout | survived |
| ---- | ----- | ------ | ------- | -------- |
| `DecisionCache.ts` | 97.78 | 33 | 11 | 1 |
| `Lifecycle.ts` | 100.00 | 44 | 0 | 0 |
| `SharedComputation.ts` | 98.73 | 70 | 8 | 1 |

`node 61-mutation.mjs evidence X/stryker61-static-report.json`:

```
packages/core/src/DecisionCache.ts {"Killed":33,"Timeout":11,"Survived":1}
packages/core/src/Lifecycle.ts {"Killed":44}
packages/core/src/SharedComputation.ts {"Killed":70,"Survived":1,"Timeout":8}
wrote .../61-mutation-static.json
```

`node 61-mutation.mjs compare 61-mutation-static.json`: same per-file lines as above, then

```
  static: all 1 new ignored mutant(s) of packages/core/src/DecisionCache.ts are Killed in .../61-mutation-static.json
…
WX-05 holds (D-06)
```

exit 0. Nothing from `X` is inside the repository (`git status` shows only the two JSON files, then the commit).

## Gap tests

None. No fall, no new survivor, so no `test(61-04)` commit.

## Deviations from Plan

None - plan executed exactly as written. The Stryker report in `reports/mutation/` is now the after run's (it is not
tracked).

## Next plan must know

- `phase_base` is `7d2d281d3f395b04ea584cf55ae6be44e1f4aaf3`. The evidence commit 4661c111 is the newest commit touching
  either JSON file; any later src or test edit in the phase needs a redo (`chore(61)`), because 61-mutation.mjs refuses a
  report older than a core src or test file.
- The base survivors persist unchanged: `DecisionCache.ts` `Option.isSome(oldest)` (eviction line, now 277:19) and
  `SharedComputation.ts:319:26` `"Claimed"`.
- A scoped three-file Stryker run takes 56 s; the `ignoreStatic:false` run takes about 2.5 min.

## Known Stubs

None.

## Self-Check

PASSED. `61-mutation-after.json` and `61-mutation-static.json` found; commit 4661c111 is an ancestor of HEAD.
