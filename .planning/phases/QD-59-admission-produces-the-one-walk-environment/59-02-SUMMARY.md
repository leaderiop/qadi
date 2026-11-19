---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 02
subsystem: core
tags: [evidence, mutation, baseline, stryker, d-15]
requires: [59-01]
provides:
  - 59-mutation.mjs, D-15's comparison rule (SHA-256 b3d15270...37fc), fixed before the change
  - 59-mutation-base.json, the three files' base scores, killed-mutant ids, survivors and static-ignored mutants
affects: [59-06, 59-10]
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
plan_head_before: c98af563fe07338ddb9287c805e4f09496863e32
plan_head_after: 3a7613a48809c786417ef4cd0ffaf7ab476aa58e
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation.mjs
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-base.json
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-02-SUMMARY.md
  modified: []
key-decisions:
  - "The base is measured as found: Walk.ts is 265/279 (0.9498), one more detected mutant than plan time's 264/279; recorded, not adjusted"
requirements-completed: [WX-05, WX-06]
duration: 5min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 02: Mutation baseline

**The three files' mutation baseline (killed-mutant ids included) and D-15's comparison rule, committed together as `3a7613a4`, the first plan commit after `docs(59-01)`, before any test or source change.**

`commits: 1` counts the `chore(59-02)` task commit; the SUMMARY commit is separate and cannot name itself.

## Mutation base

One scoped core Stryker run on the untouched tree (HEAD packages equal `phase_base` `83cbd5c5`):
`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Admission.ts,packages/core/src/Predicate.ts,packages/core/src/Walk.ts' < /dev/null`
Exit 0 (score 97.54 above the break threshold 80). Wall time 97 s (Stryker: "Done in 1 minute and 30 seconds"); 4.39 tests per
mutant. Host 1-minute load at start 7.18. Nothing else ran beside it.

Stryker's table:

```
File          |  total | covered | # killed | # timeout | # survived | # no cov | # errors |
All files     |  97.54 |   98.06 |      554 |         1 |         11 |        3 |        0 |
 Admission.ts | 100.00 |  100.00 |        6 |         0 |          0 |        0 |        0 |
 Predicate.ts | 100.00 |  100.00 |      284 |         0 |          0 |        0 |        0 |
 Walk.ts      |  94.98 |   96.01 |      264 |         1 |         11 |        3 |        0 |
```

`59-mutation.mjs base` printed, verbatim:

```
packages/core/src/Admission.ts 1 (6/6) ignored 1
packages/core/src/Predicate.ts 1 (284/284) ignored 22
packages/core/src/Walk.ts 0.9498207885304659 (265/279) ignored 27
  survivor packages/core/src/Walk.ts:327:62 NoCoverage | ObjectLiteral | {} | { maxDepth } | if (depth > maxDepth) return Effect.fail(new PolicyTooDeep({ maxDepth }));
  survivor packages/core/src/Walk.ts:437:47 NoCoverage | StringLiteral | "" | "the obliged policy denied" | : deny("Obliged", child.reason ?? "the obliged policy denied", [child]),
  survivor packages/core/src/Walk.ts:489:42 NoCoverage | StringLiteral | "" | "a required policy denied" | return deny("AllOf", trace.reason ?? "a required policy denied", fold.children);
  survivor packages/core/src/Walk.ts:425:73 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:582:84 Survived | ArithmeticOperator | depth - 1 | depth + 1 | (child) => Effect.exit(evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth)),
  survivor packages/core/src/Walk.ts:443:73 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:410:73 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(policy.policy, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:714:7 Survived | ObjectLiteral | {} | { concurrency: request.concurrency } | { concurrency: request.concurrency },
  survivor packages/core/src/Walk.ts:713:84 Survived | ArithmeticOperator | depth - 1 | depth + 1 | (child) => Effect.exit(evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth)),
  survivor packages/core/src/Walk.ts:827:76 Survived | ArithmeticOperator | depth - 1 | depth + 1 | evaluateNode(rule.condition, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:831:7 Survived | ObjectLiteral | {} | { concurrency: request.concurrency } | { concurrency: request.concurrency },
  survivor packages/core/src/Walk.ts:562:70 Survived | ArithmeticOperator | depth - 1 | depth + 1 | yield* evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:699:70 Survived | ArithmeticOperator | depth - 1 | depth + 1 | yield* evaluateNode(child, subject, request, matcherContext, depth + 1, maxDepth),
  survivor packages/core/src/Walk.ts:802:9 Survived | ArithmeticOperator | depth - 1 | depth + 1 | depth + 1,
wrote .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-mutation-base.json
```

Counts held in the base JSON: `Admission.ts` killed 6, ignored 1; `Predicate.ts` killed 284, ignored 22; `Walk.ts` killed 264,
timeout 1, survived 11, noCoverage 3, ignored 27 (detected 265, 14 survivors).

Against plan time (264/279, 15 survivors): `Walk.ts` is 265/279 with 14 survivors. The nine `depth + 1` survivors, the two
`{ concurrency: request.concurrency }` survivors and the three uncovered literals are all present; plan time's `depth > maxDepth` survivor is not: its four mutants are in the base `detected` list (the Timeout is Stryker's, so
run-to-run variation in that one mutant is the likely source). Recorded as measured, as the plan says.

One commit, `chore(59-02)` `3a7613a4`, holds exactly `59-mutation.mjs` and `59-mutation-base.json`; both are never edited
again in this phase, and `stryker.config.mjs` is untouched.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Threat Flags

None. No source file was created or modified.

## Self-Check: PASSED

`59-mutation.mjs` hashes to `b3d1527020d63754e9f3f9cd6c661b01a76d8073b608e89aae02a51f2a5337fc`, passes `node --check` and exits 1 with
its usage line given no mode; the base JSON verify and the commit-shape verify are run against this file before it is committed.
