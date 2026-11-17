---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 04
subsystem: core
tags: [leaf-needs, evaluate, walk, tracer, tdd]
plan_head_before: 83b7feee769536c489584f9ee0a7dd2cf9d10db8
plan_head_after: c25a7ce827785078bcf98774ce9deea38dd04c0b
commits: 3
requires: [50-03]
provides:
  - "packages/core/src/LeafNeeds.ts: LEAF_NEEDS, Absence, absenceOf, errorOf and the port-free judgements, package-private"
  - "Walk.ts reading one table for its absences and three shared judgements"
affects: [50-05, 50-06, 50-07, 50-08]
tech-stack:
  patterns: ["as const satisfies keyed table (ADR-QD-152)"]
key-files:
  created:
    - packages/core/src/LeafNeeds.ts
    - packages/core/test/LeafNeeds.test.ts
  modified:
    - packages/core/src/Walk.ts
key-decisions:
  - "LeafNeeds.ts is the measured P1 module, kept as the gate measured it (D-01); only doc comments were added"
requirements-completed: []
metrics:
  tasks: 2
  files: 3
actuals:
  tokens: 5400
  tasks: 2
  commits: 3
status: complete
---

# Phase QD-50 Plan 04: One table for what a leaf needs from the request Summary

`packages/core/src/LeafNeeds.ts` (the gate-measured P1 module) now states each leaf's needs once, and `Walk.ts`'s `HasAttribute`, `HasResourceAttribute` and `HasAction` arms read it, with `HasRole`, `HasPermission` and `HasAction` judging through the shared `holds*` functions. `Walk.ts` ends byte-identical to the prototype's `Walk.ts` (blob `03f592a1`).

## Commits

| Task | Hash | Message |
|------|------|---------|
| 1 (RED) | `64927340` | test(50-04): the leaf-needs table, RED |
| 1 (GREEN) | `ede4b5a4` | feat(50-04): what a leaf needs from the request, stated once; HasAttribute reads it |
| 2 | `c25a7ce8` | refactor(50-04): Walk's leaf arms read the table and the port-free judgements |

The RED commit carries only `LeafNeeds.test.ts`; the `feat` commit carries `LeafNeeds.ts` and `Walk.ts`; the `refactor` commit carries `Walk.ts`. `LeafMatrix.test.ts` and `LeafFixtures.ts` have no change since 50-02.

## RED

`Error: Cannot find module '../src/LeafNeeds.ts' imported from /Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/test/LeafNeeds.test.ts` (vitest 5.1.0 words the unresolved import this way, not "Failed to resolve import"); `Test Files 1 failed (1)`, `Tests no tests`.

## Compile proof

With the `HasCustom` row deleted from `LEAF_NEEDS` (after the `feat` commit; restored with `git checkout -- packages/core/src/LeafNeeds.ts`, `git status --porcelain -- packages` printed nothing):

`packages/core/src/LeafNeeds.ts(62,12): error TS2741: Property 'HasCustom' is missing in type '{ readonly HasPermission: …; readonly HasSignature: …; }' but required in type '{ readonly HasActed: LeafNeed; … readonly HasCustom: LeafNeed; … }'.`

(Two or three TS7053 errors followed, from the `LEAF_NEEDS[leaf._tag]` reads that can no longer index the table.)

## Negative control

Not committed; the tree was restored (`git checkout -- packages/core/src/LeafNeeds.ts`, `git status --porcelain -- packages` empty). In `absenceOf`, the `need.own === "Resource" && !supplied.resource` check was moved below `!supplied.action && referencesAction(leaf.matcher)`. `uptime` before: `14:08 up 2:40, load averages: 4.15 3.04 3.09`. Five tests failed, 233 passed:

- `LeafMatrix.test.ts > every leaf's absences, INV-QD-011 and D-05 > evaluate gives the oracle's outcome in every cell`: `HasResourceAttribute[ref action] action=- resource=none: expected 'Action:-' to equal 'Resource:owner'`.
- `LeafMatrix.test.ts > … > a request with neither input reports the leaf's own input first`: `expected 'Action:-' to equal 'Resource:owner'`.
- `Evaluate.test.ts > the action dimension > a missing resource wins over a missing action on HasResourceAttribute`: `expected 'MissingAction' to equal 'MissingResource'`.
- `LeafNeeds.test.ts > absenceOf > says what the oracle says for every leaf, action and resource`: `HasResourceAttribute[ref action] action=false resource=false: expected 'Action:-' to equal 'Resource:owner'`.
- `LeafNeeds.test.ts > absenceOf > reports the leaf's own input before what its matcher references`: `expected { _tag: 'Action' } to deeply equal { Object (_tag, attribute) }`.

A swapped check order is caught by the matrix, by the pre-existing `Evaluate.test.ts` test and by the new table test (T-50-11).

## Walk.ts hunks since `phase_base` (`git diff 83b7feee HEAD -U0`)

All inside the imports (`:20`, `:25`), `Evaluation` (`+supplied`), `NO_RESOURCE` beside `NO_OBLIGATIONS`, the leaf arms (`HasPermission`, `HasRole`, `HasAttribute`, `HasResourceAttribute`, `HasAction`) and `walk()`'s request (`:885`). `switch (policy._tag)` and its arm order are unchanged; `Policy.ts`, `Decision.ts`, `index.ts` and `scripts/check-house-style.mjs` have no change since the base.

## Verification

- `LeafNeeds`, `LeafMatrix` and `Evaluate` tests: 3 files, 238 tests pass. `tsc -b tsconfig.json` and `tsc -p tsconfig.test.json` clean; `pnpm lint` and house-style (3 declared switches) clean for `packages/core`; `pnpm circular` finds no cycle.
- `pnpm check:pr < /dev/null`: exit 0, 16 of 17 steps (typecheck, lint, circular, tstyche, coverage, bdd, spec:examples, spec:verify:strict, spec:gates, spec:claims, spec:api, spec:package, example, spec:website-examples, website, spec:publish); `pnpm mutation` skipped by design (50-06 runs Stryker).
- Budgets: no `switch`, `Effect.fnUntraced`, `as`, `!` or `any` added; `LeafNeeds.ts` is not named in `index.ts` and the test asserts none of its exports is on the barrel.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] `referencesResource` import removed in Task 1, not Task 2**
- **Found during:** Task 1, step 4 (`tsc -b`)
- **Issue:** the plan said "the old imports stay until Task 2", but once the `HasAttribute` arm stopped calling `referencesResource` the import was unused, and `noUnusedLocals` fails `tsc` with TS6133.
- **Fix:** dropped `referencesResource` from the `./Matcher.ts` import in the `feat` commit; `referencesAction` stayed (still used by `HasResourceAttribute`) until the `refactor` commit.
- **Files modified:** `packages/core/src/Walk.ts`
- **Commit:** `ede4b5a4`

**2. [Test shape] The `resourceId` tie skips cells an earlier absence refuses**
- **Issue:** the behaviour block asks for `MissingResourceId` exactly when (`Always`, or `ByScope` and `f.scoped`) and the shape is not `id`. A fixture such as `HasResourceAttribute` never reaches a port read, and a leaf whose own input is absent fails earlier; the test therefore compares only cells where `absenceOf(f.policy, { action: true, resource })` is undefined.
- **Files modified:** `packages/core/test/LeafNeeds.test.ts` (before its commit).

Nothing else differs from the plan. The module is the P1 source with two doc-comment additions (the ADR-QD-163/ADR-QD-152 citation in the module comment, and a doc comment on `LEAF_NEEDS` naming TS2741 and TS2353); the code and the order of its checks are as measured (D-01).

## Known Stubs

None.

## Threat Flags

None. `LeafNeeds.ts` adds no endpoint, auth path or file access.

## Issues Encountered

None. The `isActionLeaf` equivalent mutant noted in the plan is left for 50-06.

## Next Phase Readiness

50-05 can route `Predicate.ts` and `readScoped` through `absenceOf`/`errorOf`; both are in place, and the `holdsPermission`, `holdsRole` and `holdsAction` it needs are exported from the module.

## Self-Check: PASSED

- `packages/core/src/LeafNeeds.ts`, `packages/core/test/LeafNeeds.test.ts`: present.
- Commits `64927340`, `ede4b5a4` and `c25a7ce8`: ancestors of `HEAD`.
