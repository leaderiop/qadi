---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 03
subsystem: core
tags: [tdd, red, characterisation, tstyche, wenv]
requires: [59-01, 59-02]
provides:
  - "describe(\"admit builds the walk environment\") E1..E6 in Admission.test.ts, RED by assertion on the base"
  - "WalkEnvironment.tst.ts, the depth/environment and row-source type pins, RED by TS2459 on the base"
  - "the characterisation (LeafMatrix, Predicate, RolesAndDepth, DecisionCache, Admission) shown green on the base with blob hashes"
affects: [59-04, 59-10]
actuals:
  tokens: 4000
  tasks: 3
  commits: 2
plan_head_before: d9bba161f6715cf6dad0e9672cb682f2a9a34a8b
plan_head_after: 64166cde75871cc62fc2d0316d3971f3863233a1
key-files:
  created:
    - packages/core/test/WalkEnvironment.tst.ts
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-03-SUMMARY.md
  modified:
    - packages/core/test/Admission.test.ts
key-decisions:
  - "Both RED files are the plan's verbatim blocks (SHA-256 pinned); no src file changed"
requirements-completed: [WENV-02, WENV-03, WX-06]
duration: 1min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 03: RED rows and type pins

**Six walk-environment rows and three type-pin tests committed failing for the right reason (assertion, and TS2459 only) on the untouched source, after the characterisation was shown green and its blob hashes recorded.**

`commits: 2` counts the two `test(59-03)` task commits; the SUMMARY commit is separate and cannot name itself.
Host 1-minute load average was about 40 throughout (shared host); nothing else of this project ran.

## Characterisation on the base

Run on `phase_base` `83cbd5c5` (HEAD `packages/` equal to it, none of vitest or Stryker running):
`pnpm exec vitest run --project core` over the five files, exit 0: `Test Files 5 passed (5)`, `Tests 193 passed (193)`.

| File | Tests |
|---|---|
| `Admission.test.ts` | 7 |
| `LeafMatrix.test.ts` | 5 |
| `RolesAndDepth.test.ts` | 37 |
| `Predicate.test.ts` | 105 |
| `DecisionCache.test.ts` | 39 |

The four named tests are present and passed: `RolesAndDepth` "agrees with the evaluator's bound exactly, in both directions",
`DecisionCache` "a cache hit never runs evaluateNode at all, not even the leaf-level synchronous work", `LeafMatrix`
`assert.isAtLeast(cells, 126)`, `Predicate` "HasAction's MissingAction carries the action it named".

Blob hashes at HEAD (`git rev-parse HEAD:<path>`), for 59-04 and 59-10 to compare. These four files are never edited:

| File | blob sha-1 |
|---|---|
| `packages/core/test/LeafMatrix.test.ts` | `e7c927b6ee2ae84a62df563183901a5e1647fcdc` |
| `packages/core/test/Predicate.test.ts` | `b73aff59dedb81b971d8a9d7abe93094320380d4` |
| `packages/core/test/RolesAndDepth.test.ts` | `6eedd345e76a589679e53e1064d0dabb9bc9ee81` |
| `packages/core/test/DecisionCache.test.ts` | `5b4a344fc48440c372cadd8cc6a106e1b5a4ea92` |

## RED

**Rows, commit `cd06315a`** `test(59-03): RED admit builds the walk environment (WENV-02)`: only `Admission.test.ts`, SHA-256
`8a53d8e7…67f7` (the base plus one blank line and the verbatim block). Vitest's JSON report: the six new rows failed, every
message starting `AssertionError`; the seven base rows passed.

```
E1 asked: ...resource and an action supplies both     AssertionError: expected undefined to deeply equal { action: true, resource: true }
E2 asked: ...only an action supplies the action alone  AssertionError: expected undefined to deeply equal { action: true, resource: false }
E3 asked: ...only a resource supplies the resource alone AssertionError: expected undefined to deeply equal { action: false, resource: true }
E4 asked: ...neither supplies neither                  AssertionError: expected undefined to deeply equal { action: false, resource: false }
E5 row: the row is always supplied, ...                AssertionError: expected undefined to deeply equal { action: false, resource: true }
E6 the environment holds the question's own subject... AssertionError: expected undefined to equal { id: 'u7', roles: Set{}, …(2) }
```

`tsc -b tsconfig.json` green; `tsc -p tsconfig.test.json` after this commit, 11 errors, all in `Admission.test.ts`:

```
Admission.test.ts(85,79): TS2554 Expected 1 arguments, but got 2.
Admission.test.ts(91,83) (98,73) (105,64) (112,54) (116,52) (117,81): TS2339 Property 'supplied' does not exist on type 'Admitted'.
Admission.test.ts(125,38): TS2554 Expected 1 arguments, but got 2.
Admission.test.ts(128,41): TS2339 Property 'subject' does not exist on type 'Admitted'.
Admission.test.ts(129,41) (130,48): TS2339 Property 'maxDepth' does not exist on type 'Admitted'.
```

**Type pins, commit `64166cde`** `test(59-03): RED the walk environment's type pins (WENV-03)`: adds only
`packages/core/test/WalkEnvironment.tst.ts`, SHA-256 `fbdda6ae…707b`. tstyche (7.2.5, TypeScript 6.0.3) fails on it with:
`Module '"../src/Walk.ts"' declares 'evaluateNode' locally, but it is not exported. ts(2459)`. The test typecheck's six errors in
this file (plus the 11 above):

```
WalkEnvironment.tst.ts(12,15): TS2459 Module '"../src/Walk.ts"' declares 'evaluateNode' locally, but it is not exported.
WalkEnvironment.tst.ts(28,19): TS2339 Property 'maxDepth' does not exist on type 'Admitted'.
WalkEnvironment.tst.ts(32,31): TS2554 Expected 1 arguments, but got 2.
WalkEnvironment.tst.ts(33,49): TS2339 Property 'supplied' does not exist on type 'Admitted'.
WalkEnvironment.tst.ts(34,33): TS2554 Expected 1 arguments, but got 2.
WalkEnvironment.tst.ts(35,53): TS2339 Property 'supplied' does not exist on type 'Admitted'.
```

No commit since `phase_base` touches `packages/*/src` (`git diff --name-only 83cbd5c5 HEAD -- ':(glob)packages/*/src/**'` is empty).
Both commits end with the trailer.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `packages/core/test/WalkEnvironment.tst.ts` exists; `Admission.test.ts` hashes to the pinned SHA-256.
- Commits `cd06315a` and `64166cde` are ancestors of HEAD.
- Every task `<verify>` exited 0 (Task 1: 2, Task 2: 3, Task 3: 3).
