---
phase: QD-51-policy-tag-arity-stated-once
plan: 01
subsystem: mutation-evidence
tags: [stryker, baseline, reserved-ids, WX-02, WX-05, WX-06]
phase_base: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_before: 8d87d837beab28e8d0610eab8b6c274d45152374
plan_head_after: d7324ee496227e615f6ddec6def40250657cc76f
commits: 1
requires: []
provides:
  - "51-mutation-base.json: Stryker baseline of Policy.ts and Decision.ts at phase_base"
  - "phase_base and the base facts every later verify in the phase reads"
affects: [QD-51-02, QD-51-03, QD-51-04, QD-51-05]
key-files:
  created:
    - .planning/phases/QD-51-policy-tag-arity-stated-once/51-mutation-base.json
  modified: []
decisions:
  - "The baseline is measured once, on the untouched base, as the phase's first commit (D-11); never re-baselined"
metrics:
  duration: ~6 min
  completed: 2026-11-16
  tasks: 2
  files: 1
status: complete
---

# Phase QD-51 Plan 01: Baseline Summary

Stryker baseline of `Policy.ts` and `Decision.ts` committed alone as the phase's first commit, with the base facts and the ten reserved ids re-verified at `phase_base` 8d87d837beab28e8d0610eab8b6c274d45152374.

## Base facts

Verified at `phase_base` (all counts recomputed by Task 1's first verify, which exited 0).

`packages/core/src/Decision.ts`:
- `const leafTags = [` at :418 (ten tags, :419-428)
- `type TraceShape = "Leaf" | "Wrapper" | "Many";` at :432
- `const traceShapeOf` at :434, three `Match.whenOr(` lines at :437-439 (`...leafTags` -> Leaf; `"Not", "Obliged", "Labeled"` -> Wrapper; `"AllOf", "AnyOf", "Rules"` -> Many), `Match.exhaustive` :440
- `const traceChildrenOf` at :443
- `export const foldTrace` at :484

`packages/core/src/Policy.ts`:
- `export const childrenOf` at :1040
- `export type LeafPolicy = Exclude<` at :1123
- `export interface PolicyCases<R>` at :1144
- `export const leafCases` at :1170

`packages/core/src/index.ts`: `export * from "./Decision.ts";` at :6 and `export * from "./Policy.ts";` at :32; no `PolicyArity` anywhere.

Absent at the base: `packages/core/src/PolicyArity.ts`, `packages/core/test/TraceShape.test.ts`, `packages/core/test/PolicyArity.test.ts`, `packages/core/test/PolicyArity.tst.ts`.

## Reserved ids

ARCH-98, ADR-QD-164, CCR-QD-442, BEH-QD-591..595, INV-QD-347 and INV-QD-348: whole-id `git grep -lwF` at `phase_base` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts returned nothing for every id; no `spec/decisions/164-*` exists there. `node scripts/next-id.mjs` was not run. All ten are expected to be used by 51-04; any left unused is named "Unused" in the CCR-QD-442 row.

## Mutation base

Invocation (51-05 repeats it with `,packages/core/src/PolicyArity.ts` appended inside the quotes):
`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Policy.ts,packages/core/src/Decision.ts' < /dev/null` (exit 0, 56 s, nothing else running). Report written by `tools/mutation.mjs base` to `51-mutation-base.json`; commit d7324ee4.

| File | Score (unrounded) | (detected/scored) | Killed | Timeout | Survived | NoCoverage | Ignored |
|---|---|---|---|---|---|---|---|
| `Decision.ts` | 0.9585798816568047 | (162/169) | 160 | 2 | 6 | 1 | 25 |
| `Policy.ts` | 0.9864864864864865 | (146/148) | 146 | 0 | 2 | 0 | 141 |

`PolicyArity.ts` is new: recorded under `new`; `unmeasured` is empty.

Survivors (`Decision.ts`):
- `:104:72` BooleanLiteral NoCoverage `trace.allowed` -> `!trace.allowed` (`isDenyingTrace`)
- `:354:9` ConditionalExpression Survived `true` -> `isFieldOf(data, field)`
- `:439:61` StringLiteral Survived `""` -> `"Many"` (the `Match.whenOr("AllOf", "AnyOf", "Rules", …)` line, inside the deleted region)
- `:358:19` BooleanLiteral Survived `false` -> `true` (`writable: true`)
- `:359:23` BooleanLiteral Survived `false` -> `true` (`configurable: true`)
- `:581:18` ArithmeticOperator Survived `node.children.length + 1` -> `- 1`
- `:583:11` ConditionalExpression Survived `true` -> `child !== undefined`

Survivors (`Policy.ts`):
- `:815:65` StringLiteral Survived `""` -> `"AnyOf"` (`defaultFieldStrategy("AnyOf")`)
- `:1272:35` EqualityOperator Survived `value >= max` -> `value > max`

Deleted region (`Decision.ts:418-442`, `const leafTags = [` up to `const traceChildrenOf =`): detected 2, survived 1, ignored 9. The one survivor is the expected `:439` `"Many"` StringLiteral; no other survivor lies in the region.

## Deviations from Plan

None. The plan executed as written. One bookkeeping note: the plan-head ledger (`gsd-plan-head-before-QD-51-01`) was created after the first commit, seeded with `phase_base`, which is that commit's parent, so `commits: 1` is measured over the correct range.

## Verification

Task 1 verifies (base facts, reserved ids) exit 0; Task 2 verifies (JSON shape, first-commit-alone with `phase_base` parent and trailer) exit 0. No packages, spec, scripts or changeset change; `.planning/config.json` untouched and unstaged.

## Self-Check: PASSED

- FOUND: `.planning/phases/QD-51-policy-tag-arity-stated-once/51-mutation-base.json`
- FOUND: commit d7324ee4 (`chore(51-01): mutation baseline for Policy and Decision`), parent `phase_base`
