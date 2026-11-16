---
phase: QD-51-policy-tag-arity-stated-once
plan: 03
subsystem: policy-arity
tags: [arity, POLICY_ARITY, childrenOf, LeafPolicy, traceShapeOf, tstyche, ARTY-01, ARTY-02, WX-04]
phase_base: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_before: 15bd992f35f3324fb17d7835d98d6223c4b1c959
plan_head_after: 886133944414cefd0cfa55bb11df5cf1d87f30f0
commits: 4
requires: [51-02]
provides:
  - "packages/core/src/PolicyArity.ts: Arity, POLICY_ARITY (16 keys), ChildrenOf, ChildArms; imports nothing, outside the barrel"
  - "Decision.ts traceShapeOf as the one-line record read; leafTags, TraceShape and the Match.whenOr chain deleted"
  - "Policy.ts childrenOf arms satisfies ChildArms<Policy, typeof POLICY_ARITY>; LeafPolicy derived from the record (type-only edits)"
  - "packages/core/test/PolicyArity.test.ts (50 runtime tests) and PolicyArity.tst.ts (tie and checked negatives)"
affects: [QD-51-04, QD-51-05]
key-files:
  created:
    - packages/core/src/PolicyArity.ts
    - packages/core/test/PolicyArity.test.ts
    - packages/core/test/PolicyArity.tst.ts
  modified:
    - packages/core/src/Decision.ts
    - packages/core/src/Policy.ts
decisions:
  - "The record lives in PolicyArity.ts (D-01a) and Policy.ts closes it over its own tag union with module-local ArityRecord and TagsOfArity"
  - "The Many type carries { readonly 0?: never } so a Wrapper arm left behind when its tag moves to Many is refused"
metrics:
  duration: ~10 min
  completed: 2026-11-16
  tasks: 2
  files: 5
status: complete
---

# Phase QD-51 Plan 03: Policy tag arity stated once Summary

One closed record (`POLICY_ARITY`) now states each policy tag's arity, `traceShapeOf` reads it, and `childrenOf`, `LeafPolicy`, `PolicyCases` and `TraceCases` are typed against or tied to it, so the base experiment's move (`Not` Wrapper to Many) no longer compiles.

## RED

`node_modules/.bin/vitest run --project core packages/core/test/PolicyArity.test.ts` before `PolicyArity.ts` existed: `Error: Cannot find module '../src/PolicyArity.ts' imported from /Users/mohammadalmechkor/Projects/Perso/qadi/packages/core/test/PolicyArity.test.ts` (Vite: `Failed to resolve import "../src/PolicyArity.ts"`), committed as 1168fdab with both test files and nothing else.

## Compile proofs

`node .planning/phases/QD-51-policy-tag-arity-stated-once/tools/proofs.mjs` on the committed tree, exit 0:

| Edit | tsc exit | Error (the expected one, else the first) | As expected |
|---|---|---|---|
| the base experiment's patch (Not under Many in Decision.ts) | - | git apply --check exit 1: error: patch failed: packages/core/src/Decision.ts:435 | yes |
| control: no edit | 0 |  | yes |
| record: Not Wrapper -> Many (the base experiment's move) | 1 | packages/core/src/Policy.ts(1060,18): error TS2322: Type 'Policy' is not assignable to type 'never'. | yes |
| record: Obliged Wrapper -> Many | 1 | packages/core/src/Policy.ts(1061,22): error TS2322: Type 'Policy' is not assignable to type 'never'. | yes |
| record: AllOf Many -> Wrapper | 1 | packages/core/src/Policy.ts(1057,19): error TS2322: Type 'readonly Policy[]' is not assignable to type 'readonly [Policy]'. | yes |
| record: Rules Many -> Wrapper | 1 | packages/core/src/Policy.ts(1059,19): error TS2322: Type 'Policy[]' is not assignable to type 'readonly [Policy]'. | yes |
| record: Not Wrapper -> Leaf | 1 | packages/core/src/Policy.ts(1060,17): error TS2322: Type '[Policy]' is not assignable to type 'readonly []'. | yes |
| record: HasRole Leaf -> Wrapper | 1 | packages/core/src/Policy.ts(1048,20): error TS2322: Type '[]' is not assignable to type 'readonly [Policy]'. | yes |
| record: HasRole Leaf -> Many (childrenOf's gap; LeafPolicy and its readers refuse it) | 1 | packages/core/test/Policy.test.ts(1045,52): error TS2741: Property 'HasRole' is missing in type '{ HasPermission: ... | yes |
| record: HasRole removed | 1 | packages/core/src/Decision.ts(413,58): error TS7053: Element implicitly has an 'any' type ... | yes |
| record: an unknown tag added | 1 | packages/core/src/Policy.ts(1137,5): error TS2344: Type '{ readonly HasPermission: "Leaf"; ... | yes |
| record: an unknown arity word | 1 | packages/core/src/Decision.ts(413,58): error TS2322: Type '"Leaf" \| "Many" \| "Wrap" \| "Wrapper"' is not assignable to type 'Arity'. | yes |
| childrenOf arm: Not returns none | 1 | packages/core/src/Policy.ts(1060,16): error TS2322: Type '[]' is not assignable to type 'readonly [Policy]'. | yes |
| childrenOf arm: Not returns two | 1 | packages/core/src/Policy.ts(1060,17): error TS2322: Type '[Policy, Policy]' is not assignable to type 'readonly [Policy]'. | yes |
| childrenOf arm: AllOf returns none (a Many may be empty; Policy.test.ts's lockstep refuses it) | 0 |  | yes |

every proof as expected

The base experiment's edit cannot be re-applied: its list (`leafTags` and the `Match.whenOr` chain) is gone and `git apply --check not-to-many.patch` is refused (`patch failed: packages/core/src/Decision.ts:435`). The same move made where the arity now lives (`Not: "Wrapper"` to `"Many"` in `POLICY_ARITY`) fails with `Policy.ts(1060,18): error TS2322: Type 'Policy' is not assignable to type 'never'`, where on the base it compiled (51-02). `proofs.mjs` restored `packages/core/src` (clean afterwards).

## Results

- Task 1 verify: TraceShape, PolicyArity, Decision, Policy and Explanation tests 222 of 222 green; tstyche on PolicyArity, Policy and LeafNeeds `.tst.ts` 31 tests, 62 assertions, 3 suppressed (the three checked `@ts-expect-error` directives matched); `tsc -p tsconfig.test.json` exit 0; `pnpm circular` no cycle; `pnpm lint` exit 0; `check-api-surface.mjs` 932 exports, the base's figure.
- `pnpm check:pr < /dev/null`: exit 0, 16 of 16 steps run (`pnpm mutation` skipped by design). Includes `house-style: 539 file(s) clean (3 declared switch(es))`, `No circular dependency found!`, the full vitest run (228 files, 5575 tests; 34 files, 568 tests in the second project), tstyche (60 files, 313 tests), `api-surface: 932 export(s)`, `package-install: 9 package(s) pack, resolve and authorize (522 runtime export(s))` (gate 14, A1 did not trip: no fallback, no `## Gate 14`), `publish-status`. Output: scratchpad `checkpr.txt`.
- Budgets: `git diff phase_base -- scripts/check-house-style.mjs AGENTS.md packages/*/package.json pnpm-lock.yaml` is empty. No `switch`, `as <Type>`, `!`, `any`, `Effect.fnUntraced` added.

## Commits

- 1168fdab: `test(51-03): the arity record and its readers, RED`
- 74917a4d: `test(51-03): the diff expectation names the optional keys diffTraces sets`
- 80062b1c: `feat(51-03): one record states each policy tag's arity; the trace shape reads it`
- 88613394: `refactor(51-03): childrenOf and LeafPolicy read the arity record`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The RED test's `diffTraces` expectation omitted the optional keys the diff sets**
- **Found during:** Task 1 GREEN (16 failures in `diffTraces reports the child ... at [0]`).
- **Issue:** `diffTraces` emits `label`, `beforeReason` and `afterReason` as explicit `undefined` keys, and `deepStrictEqual` distinguishes them; the plan's expected object listed five keys. The failure was in the test, not the source (the same 16 hold on the base: uniform over all tags).
- **Fix:** the expectation names the three `undefined` keys. Committed as its own `test(51-03)` commit between RED and GREEN so the RED commit stays tests-only and the `feat(51-03)` commit carries exactly `PolicyArity.ts` and `Decision.ts`.
- **Files modified:** packages/core/test/PolicyArity.test.ts
- **Commit:** 74917a4d

**2. [Rule 3 - Ordering] `proofs.mjs` requires a clean `packages/core/src`, so it ran after the `refactor(51-03)` commit rather than before it**
- The tool exits 2 on a dirty `src` (it did, once, with `Policy.ts` uncommitted); the Task 2 pre-commit gates (tests, tstyche, tsc, circular, lint, API surface) ran on the uncommitted edit and the proofs and `check:pr` on the committed tree. Same tree either way.

Total deviations: 2, no scope change.

## Known Stubs

None.

## Threat Flags

None. `PolicyArity.ts` is outside `index.ts` (barrel pin test, `check-api-surface.mjs` 932 unchanged); T-51-09 (a foreign `policyTag`) accepted as planned.

## Self-Check: PASSED

- FOUND: packages/core/src/PolicyArity.ts, packages/core/test/PolicyArity.test.ts, packages/core/test/PolicyArity.tst.ts
- FOUND commits: 1168fdab, 74917a4d, 80062b1c, 88613394
