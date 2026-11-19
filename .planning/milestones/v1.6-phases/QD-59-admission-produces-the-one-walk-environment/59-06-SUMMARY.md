---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 06
subsystem: core
tags: [evidence, mutation, stryker, d-15, wx-05]
requires: [59-02, 59-04, 59-05]
provides:
  - 59-mutation-after.json, the three files' committed-tree scores, killed-mutant ids, survivors and ignored mutants
  - 59-mutation-static.json, the ignoreStatic-off run proving the four new static-ignored mutants Killed
  - WalkDepthGuard.test.ts, a direct pin of the walk's own depth guard
affects: [59-10]
actuals:
  tokens: 71700
  tasks: 3
  commits: 2
plan_head_before: 62b62ece43233ed50ddbd1807ee8e5b8ff934ded
plan_head_after: 148cb81d8846ba05e7b31a861d61c7f0ee90110a
key-files:
  created:
    - packages/core/test/WalkDepthGuard.test.ts
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-after.json
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-static.json
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-06-SUMMARY.md
  modified: []
key-decisions:
  - "The one new survivor (Walk.ts `depth > maxDepth` replaced by `false`) is closed by a test that enters `evaluateNode` directly past the bound; src and the characterisation files are untouched"
requirements-completed: [WX-05]
duration: 7min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 06: Mutation after-run and D-15 verdict

**D-15's rule holds for the committed change: no new survivor, no detected mutant left a fallen file, and `Admission.ts` gained 9 detected mutants (+3 proven static) against the 6 `Walk.ts` and `Predicate.ts` lost; one gap test (`test(59-06)`) was needed and the evidence is committed last (`chore(59-06)`).**

`commits: 2` counts the `test(59-06)` gap test and the `chore(59-06)` evidence commit; the SUMMARY commit is separate and cannot name itself.

## After-run

Two Stryker runs of the scoped core config over the three files (`--mutate packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts`, stdin closed, nothing else running, gate config unedited), each followed by `59-mutation.mjs after`.

First run (tree at `62b62ece`, before the gap test): exit 0, score 97.36, "Done in 1 minute and 18 seconds". Walk.ts 258 killed, 12 survived, 3 no-coverage; Admission.ts 15 killed; Predicate.ts 280 killed. `compare` refused (see `## Compare`): one new survivor. Host 1-minute load at start 12.1 (the 5- and 15-minute averages 35 and 34 from the preceding bench); the run was made once at this load.

Second run (tree at `c518b5b8`, with the gap test; this is the recorded one): exit 0, score 97.71, "Done in 1 minute and 15 seconds", 5.09 tests per mutant.

```
File          |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
All files     |  97.71 |   98.06 |      555 |         0 |         11 |        2 |        0 |
 Admission.ts | 100.00 |  100.00 |       15 |         0 |          0 |        0 |        0 |
 Predicate.ts | 100.00 |  100.00 |      280 |         0 |          0 |        0 |        0 |
 Walk.ts      |  95.24 |   95.94 |      260 |         0 |         11 |        2 |        0 |
```

`59-mutation.mjs after` printed, verbatim:

```
packages/core/src/Admission.ts 1 (15/15) ignored 3
packages/core/src/Predicate.ts 1 (280/280) ignored 22
packages/core/src/Walk.ts 0.9523809523809523 (260/273) ignored 27
  survivor packages/core/src/Walk.ts:434:47 NoCoverage | StringLiteral | "" | "the obliged policy denied" | : deny("Obliged", child.reason ?? "the obliged policy denied", [child]),
  survivor packages/core/src/Walk.ts:486:42 NoCoverage | StringLiteral | "" | "a required policy denied" | return deny("AllOf", trace.reason ?? "a required policy denied", fold.children);
  survivor packages/core/src/Walk.ts:422:48 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, request, depth + 1),
  survivor packages/core/src/Walk.ts:576:59 Survived | ArithmeticOperator | depth - 1 | depth + 1 | (child) => Effect.exit(evaluateNode(child, request, depth + 1)),
  survivor packages/core/src/Walk.ts:440:48 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, request, depth + 1),
  survivor packages/core/src/Walk.ts:407:48 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, request, depth + 1),
  survivor packages/core/src/Walk.ts:704:59 Survived | ArithmeticOperator | depth - 1 | depth + 1 | (child) => Effect.exit(evaluateNode(child, request, depth + 1)),
  survivor packages/core/src/Walk.ts:705:7 Survived | ObjectLiteral | {} | { concurrency: request.concurrency } | { concurrency: request.concurrency },
  survivor packages/core/src/Walk.ts:808:51 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(rule.condition, request, depth + 1),
  survivor packages/core/src/Walk.ts:812:7 Survived | ObjectLiteral | {} | { concurrency: request.concurrency } | { concurrency: request.concurrency },
  survivor packages/core/src/Walk.ts:556:45 Survived | ArithmeticOperator | depth - 1 | depth + 1 | yield* evaluateNode(child, request, depth + 1),
  survivor packages/core/src/Walk.ts:690:45 Survived | ArithmeticOperator | depth - 1 | depth + 1 | yield* evaluateNode(child, request, depth + 1),
  survivor packages/core/src/Walk.ts:785:66 Survived | ArithmeticOperator | depth - 1 | depth + 1 | const trace = yield* evaluateNode(rule.condition, request, depth + 1);
wrote .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-after.json
```

The 13 survivors are the base's 14 minus the `{ maxDepth }` NoCoverage literal (now covered and killed by the gap test): nine moved `depth + 1`, two `{ concurrency: request.concurrency }`, two uncovered literals.

## Evidence

The first `compare` named the new static-ignored mutants (`Admission.ts` 3, `Walk.ts` 1) and so asked for evidence. The evidence config lives in the session scratchpad (`stryker59-static.config.mjs`), outside the repository, and is not committed. Its text:

```js
// Evidence only, never a gate run: the core gate config with ignoreStatic off, reporting into the scratchpad.
import base from "/Users/mohammadalmechkor/Projects/Perso/qadi/stryker.config.mjs";

export default {
  ...base,
  ignoreStatic: false,
  reporters: ["json", "clear-text"],
  jsonReporter: {
    fileName: "<scratchpad>/stryker59-static-report.json",
  },
};
```

Run on the committed tree (`c518b5b8`, the same source and tests as the second after-run), `--mutate` the same three files: exit 0, score 97.90, "Done in 1 minute and 25 seconds", 10.02 tests per mutant.

`59-mutation.mjs evidence <scratchpad>/stryker59-static-report.json` printed, verbatim:

```
packages/core/src/Admission.ts {"Killed":18}
packages/core/src/Predicate.ts {"Killed":302}
packages/core/src/Walk.ts {"NoCoverage":2,"Killed":287,"Survived":11}
wrote .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-static.json
```

Admission.ts: all 18 mutants (15 detected plus 3 static) Killed. Walk.ts: the one static mutant (`walk`'s rewritten arrow) is among the 287 Killed.

## Compare

First `compare` (no argument), after the first after-run, before the gap test. It refused three ways, all traced to one mutant: `Walk.ts:323:7` `ConditionalExpression | false | depth > maxDepth`, which the base run had detected (as a Stryker Timeout) and the after-run reported Survived. Admission proves `policyDepth <= maxDepth` before a walk starts, so the walk's own guard is unreachable through `evaluate`; the base's detection was the one Timeout 59-02 recorded as run-to-run variation.

```
packages/core/src/Walk.ts: new survivor Survived | ConditionalExpression | false | depth > maxDepth | if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));
packages/core/src/Walk.ts: a killed mutant left but its line is still there: ConditionalExpression | false | depth > maxDepth | if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));
packages/core/src/Admission.ts has 3 new static-ignored mutant(s) and no evidence was given
packages/core/src/Walk.ts has 1 new static-ignored mutant(s) and no evidence was given
```

The plan's note called this mutant "in the base set either way"; the base JSON has it detected, so the rule does name it. The fix is Task 3 step 1: `packages/core/test/WalkDepthGuard.test.ts` (new, not a characterisation file) enters `evaluateNode` directly with an admitted environment one level past its bound and expects `PolicyTooDeep { maxDepth }`, and checks a leaf at exactly the bound still walks. Committed alone as `c518b5b8` `test(59-06)`; src untouched. The after-run and `compare` were then repeated once (a second `new survivor` would have been stop-and-report; none came).

Second `compare` (no argument): clean except the two `new static-ignored mutant(s) and no evidence was given` lines, which step 2 answered with the evidence run above.

Final `compare .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-static.json`, summary lines (the per-mutant `deleted`/`moved`/`gone` lines are the script's own and reproduce from the committed JSONs):

```
packages/core/src/Admission.ts 1 -> 1 (detected 6 -> 15; lost 5, rewritten 0, deleted 5; survivors +0 -0, moved 0)
  static: all 3 new ignored mutant(s) of packages/core/src/Admission.ts are Killed in .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-static.json
packages/core/src/Predicate.ts 1 -> 1 (detected 284 -> 280; lost 7, rewritten 1, deleted 6; survivors +0 -0, moved 0)
packages/core/src/Walk.ts 0.9498207885304659 -> 0.9523809523809523 (detected 265 -> 260; lost 40, rewritten 30, deleted 10; survivors +0 -1, moved 9)
  gone survivor NoCoverage | ObjectLiteral | {} | { maxDepth } | if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));
  static: all 1 new ignored mutant(s) of packages/core/src/Walk.ts are Killed in .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-static.json
packages/core/src/Admission.ts detects 6 -> 15 (+9, static +3); detected mutants that left the fallen files: 0
WX-05 holds (D-15)
```

Walk.ts's score rose 0.9498 to 0.9524; Predicate.ts and Admission.ts stay at 1. Plan-time numbers differed (Admission 6 -> 15, Predicate 284 -> 280, Walk 264 -> 258); the verdict is the same.

## Task Commits

1. **Task 1/2: after-run and static evidence** - no commit (evidence only, committed by Task 3)
2. **Task 3 step 1: gap test** - `c518b5b8` (test)
3. **Task 3 step 2: evidence** - `148cb81d` (chore)

The Task 3 verify printed `evidence committed last: 148cb81d after 1 gap test(s)`. `59-mutation-base.json` and `59-mutation.mjs` are byte-identical to the `chore(59-02)` commit; `stryker.config.mjs` is unmodified; no evidence config or report is inside the repository.

## Deviations from Plan

None - plan executed exactly as written. The plan's Task 3 step 1 path (a new survivor closed by a `test(59-06)` commit, then Task 1 and Task 2 repeated once) was taken; the plan's note that the `depth > maxDepth` mutant is in the base set "either way" was inaccurate (the base had it detected), recorded under `## Compare`.

## Known Stubs

None.

## Threat Flags

None. A test file and two evidence JSONs only.

## Self-Check: PASSED

`WalkDepthGuard.test.ts`, `59-mutation-after.json` and `59-mutation-static.json` exist; `c518b5b8` and `148cb81d` are ancestors of HEAD; the Task 1, Task 2 and Task 3 verifies exit 0; `house-style` clean (560 files); the new test file passes under vitest.
