---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 05
subsystem: core
tags: [leaf-needs, toPredicate, readScoped, tracer, tdd]
plan_head_before: 7a945b6a2547264f8190fe42bf57d13f6e13e270
plan_head_after: 0595cc93241aad8762d1f956af909c9f82e9a606
commits: 3
requires: [50-04]
provides:
  - "toPredicate's absences read LeafNeeds' table (NeedAction carries an ActionAbsence)"
  - "toPredicate's HasRole, HasPermission and HasAction judge through holdsRole, holdsPermission, holdsAction"
  - "readScoped builds MissingResourceId through errorOf, after annotateQuestion"
affects: [50-06, 50-07, 50-08]
key-files:
  modified:
    - packages/core/test/Predicate.test.ts
    - packages/core/src/Predicate.ts
    - packages/core/src/PortAccess.ts
key-decisions:
  - "D-08a applied: toPredicate's MissingAction has no own expected key when no action was named, as evaluate's never had"
requirements-completed: []
metrics:
  tasks: 2
  files: 3
actuals:
  tokens: 3500
  tasks: 2
  commits: 3
status: complete
---

# Phase QD-50 Plan 05: toPredicate and readScoped read the leaf-needs statement Summary

`toPredicate` plans its absences from `absenceOf(p, supplied)` with `supplied: Supplied<true>` and fails through `errorOf(p.absence)`, its role, permission and action judgements are the shared `holds*` functions, and `readScoped` builds `MissingResourceId` through `errorOf({ _tag: "ResourceId", relation })` after `annotateQuestion`; both interpreters now build the same `MissingAction`.

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (RED) | `f071cea9` | test(50-05): D-08a, an action absence without an expected action has no expected key, RED |
| 1 (GREEN) | `ca165d48` | feat(50-05): toPredicate's absences read the table; MissingAction's expected unified (D-08a) |
| 2 | `0595cc93` | refactor(50-05): toPredicate's judgements and readScoped's error read LeafNeeds |

The RED commit carries only `Predicate.test.ts`, the `feat` commit only `Predicate.ts`, the `refactor` commit `Predicate.ts` and `PortAccess.ts`. `LeafMatrix.test.ts`, `LeafFixtures.ts`, `Policy.ts`, `Decision.ts`, `index.ts` and `scripts/check-house-style.mjs` are untouched.

## RED

`packages/core/test/Predicate.test.ts:456`: `assert.isFalse(Object.hasOwn(translated.failure, "expected"), \`toPredicate ${label}\`)` failed with `Expected false / Received true` (`Tests 1 failed | 102 skipped (103)`): at that commit `toPredicate` still built `expected: undefined`, an own key.

## D-08a reversibility

`MissingAction.expected` is `Schema.optional`, so an own `undefined` and an absent key encode the same on the wire; only an in-process `Object.hasOwn` sees the difference. Restoring the key is a one-line change in `errorOf`. The changeset (50-07) states it as a patch.

## Verification

- `pnpm exec vitest run --project core` on Predicate, PortAccess, PortSpan, Evaluate, LeafMatrix and LeafNeeds tests: 436 passed.
- `tsc -b tsconfig.json`, `tsc -p tsconfig.test.json`, `pnpm lint` and `pnpm circular`: clean. `RunError` is unchanged (the `Supplied<true>` overload is selected).
- `pnpm check:pr < /dev/null`: exit 0, "ran 16 of 17 steps; pnpm mutation was skipped" (run after the `refactor` commit, outside any gate window).

## Deviations from Plan

None - plan executed exactly as written. `LeafNeeds.ts` was not touched, so `Walk`'s hot path is as 50-04 left it.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

Created/modified files exist; commits `f071cea9`, `ca165d48` and `0595cc93` are ancestors of HEAD.
