---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 04
subsystem: core
tags: [refactor, admission, walk-environment, tracer, wenv]
requires: [59-01, 59-03]
provides:
  - "Admitted<Resource> holding subject, supplied, matcherContext and maxDepth; admit(question, rowSource) with two overloads; RESOURCE_SUPPLIED closed table"
  - "Walk.ts: Evaluation { admitted, concurrency }, exported evaluateNode(policy, request, depth), walk admitting with \"asked\""
  - "Predicate.ts: compileTree(policy, admitted: Admitted<true>), toPredicate admitting with \"row\""
affects: [59-05, 59-06, 59-07, 59-08, 59-10]
actuals:
  tokens: 5600
  tasks: 2
  commits: 1
plan_head_before: b9ccde011864efefdac158d44d42da4489b0de19
plan_head_after: ef4c403540bfb3506e6ae8d15c1aa699aa89255f
key-files:
  created:
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-04-SUMMARY.md
  modified:
    - packages/core/src/Admission.ts
    - packages/core/src/Walk.ts
    - packages/core/src/Predicate.ts
    - packages/core/test/Admission.test.ts
key-decisions:
  - "The plan's verbatim patch was applied mechanically (patch SHA-256 5f17125a... matched) and the five files hash to the planned after-state; no hand edit"
  - "evaluateNode is exported from the package-private Walk.ts for the type pins only; gate 13 stays 933, no changeset (D-14)"
requirements-completed: [WENV-02, WENV-03, WENV-04, WX-03, WX-04, WX-07]
duration: 2min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 04: Admission produces the one walk environment

**`admit(question, rowSource)` now builds the one walk environment (`Admitted<Resource>`: subject, supplied, matcherContext, maxDepth) that `walk` and `toPredicate` both read, and recursion passes `(policy, request, depth)`; the six RED rows and three type pins went green and the four characterisation files pass unedited.**

`commits: 1` is the one `refactor(59-04)` task commit; the SUMMARY commit is separate and cannot name itself.
Host 1-minute load average was about 26 during the checks (shared host); nothing else of this project ran.
Started 2026-11-19T04:47:27Z, finished 2026-11-19T04:48:48Z.

## The change

Commit `ef4c4035` `refactor(59-04): admission produces the one walk environment (WENV-02, WENV-03)`: exactly
`packages/core/src/Admission.ts`, `Walk.ts`, `Predicate.ts` and `packages/core/test/Admission.test.ts`, the only src commit
since `phase_base` `83cbd5c5`, ending with the trailer. Applied with `git apply` from the plan's extracted block
(patch SHA-256 `5f17125a...27d3`, as planned); no hand edit.

What it does:
- `Admitted` loses `question` and holds `subject`, `supplied`, `matcherContext` and `maxDepth`; `admit` takes the row
  source, and `RESOURCE_SUPPLIED` is the one place `supplied.resource` is decided (`asked`: the question has a resource;
  `row`: always). `admit("row")` is `Admitted<true>` by overload, no `as`.
- `walk` and `compileTree` drop their own `supplied` literals.
- Recursion passes `(policy, request, depth)`; the 9 recursive calls, 3 hand-offs and the root use the new shape;
  `evaluateNode` is exported.
- The four base rows of `Admission.test.ts` pass `"asked"`, and the one that read `admitted.success.question` reads
  `.supplied` instead. Every RED line stays.

Verifies (all exit 0):

```
the five files are the planned after-state
pnpm -s typecheck                                   rc=0
vitest (Admission, LeafMatrix, RolesAndDepth, Predicate, DecisionCache):
  Test Files  5 passed (5)   Tests  199 passed (199)
tstyche WalkEnvironment.tst.ts:
  Tests: 3 passed, 3 total   Assertions: 11 passed, 11 total
refactor(59-04) ef4c4035 is the one src commit
```

## Whole-core checks

No commit; nothing edited outside this SUMMARY.

```
pnpm exec vitest run --project core:  Test Files 81 passed (81)   Tests 2643 passed (2643)
pnpm -s lint:      house-style: 559 file(s) clean (3 declared switch(es))
pnpm -s circular:  No circular dependency found!
pnpm -s spec:api:  api-surface: 933 export(s) documented across 9 package(s)
public surface:    no index.ts, package.json, CHANGELOG.md, overview.md, .changeset, lockfile change since phase_base
switch \(:                4 -> 4
Effect\.fnUntraced:       7 -> 7
new PolicyTooDeep\(:      2 -> 2
```

The lint run's oxlint warnings (e.g. `prefer-as-const` in `packages/devtools/test/model/HeldChoice.test.ts`) are
pre-existing and outside this plan's files.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `packages/core/src/Admission.ts`, `Walk.ts`, `Predicate.ts` and `packages/core/test/Admission.test.ts` exist and hash to the planned after-state.
- Commit `ef4c4035` is an ancestor of HEAD.
- Every task `<verify>` exited 0 (Task 1: 5, Task 2: 4).
