---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 02
subsystem: core-tests
tags: [characterisation, leaf-verdict, evaluate, toPredicate]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: bf847aae5741f3dd6c1a8b044d95743fe68606ad
plan_head_after: 688f3a4225108c0fed1d7ce123bc9eaabd34b2dd
requires: ["54-01"]
provides:
  - "packages/core/test/LeafVerdict.test.ts: every leaf's answer-to-verdict step pinned through evaluate and toPredicate, green on the base"
affects: [54-03, 54-04, 54-08]
tech-stack:
  added: []
  patterns: ["characterisation written green on the base, public API only, scripted ports"]
key-files:
  created:
    - packages/core/test/LeafVerdict.test.ts
  modified: []
key-decisions:
  - "The file imports only barrel-re-exported modules and ./helpers.ts, so it cannot agree with the code 54-03 and 54-04 move"
requirements-completed: [VERD-03, WX-06]
duration: 14 min
completed: 2026-11-18
status: complete
commits: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 54 Plan 02: Leaf-verdict characterisation on the base Summary

One new test file pins what every leaf's answer-to-verdict step decides today, through public `evaluate` (allow/deny, `trace.policyTag`, exact deny reason) and through `toPredicate`/`evaluatePredicate` for every leaf that folds, green on the untouched base so 54-03 and 54-04 can prove the move changed no decision and no sentence.

## Case counts (vitest, `--project core LeafVerdict`: 15 passed)

Each `it.effect` loops over several cells, and every assertion carries its cell name.

| describe | vitest cases |
|---|---|
| `every leaf's answer through evaluate` | 9 (HasActed/HasNotActed Resource and Any, HasRelationship, HasCustom, HasSignature, role+permission, action, subject attributes, resource attributes) |
| `every leaf that folds, through toPredicate` | 6 (role+permission, action, subject attribute, scope-Any history, refusals, resource-attribute row filter) |

The evaluate half covers 12 acted cells, 3 relationship, 2 custom, 6 signature (matched, matched with signer role, none on file with and without a role, none matching with and without a role), 4 role/permission, 2 action, 6 subject-attribute and 6 resource-attribute verdict cells (Held, NotHeld, Neq NotHeld, ValueAbsent, ReferenceAbsent, Incomparable). The custom allow asserts `trace.policyTag === "HasCustom"`, the survivor 54-01's `KILLED` names. The fold half pins role/permission/action True/False (agreeing with `evaluate`), subject HasAttribute True only for Held, scope-Any acted/not-acted folds, the four refusals with their exact `policyTag` and `reason`, and the HasResourceAttribute row filter over `{state:"open"}`, `{state:"closed"}`, `{}`.

## Commits

- `d3dc00ba` `test(54-02): pin every leaf's answer through evaluate on the base`
- `688f3a42` `test(54-02): pin every leaf that folds through toPredicate on the base`

Both touch only `LeafVerdict.test.ts`, end with the trailer, follow `chore(54-01)` and sit before any `packages/core/src` commit (none exists since `phase_base`). Task 2 added lines only (145 insertions, 0 deletions), including the two `Predicate.ts` imports.

## Verification

- `pnpm exec vitest run --project core LeafVerdict`: 15 passed.
- `pnpm exec vitest run --project core Predicate -t "INV-QD-018"`: passes, unedited.
- `tsc -p tsconfig.test.json --noEmit`: clean.
- Task verifies (barrel-import, 17 reasons, 4 refusals, commit-scope scripts): all exit 0.
- Scan of the file: no `as` (other than `as const`), `!`, `any`, `Record<string, unknown>`, `switch`, `async`, `fnUntraced`, console or clock read; no hand-built port layer (scriptedPort and the public signature fixture only).

## Deviations from Plan

None - plan executed exactly as written. No expected reason had to be corrected: every cell passed on first run against the base reasons in the plan's `<interfaces>`.

## Known Stubs

None.

## Self-Check: PASSED

- `packages/core/test/LeafVerdict.test.ts` present on disk.
- `d3dc00ba` and `688f3a42` are ancestors of HEAD; `git rev-list --count` from `plan_head_before` is 2.
- No `packages/*/src` file and no existing test file changed since `phase_base`.
