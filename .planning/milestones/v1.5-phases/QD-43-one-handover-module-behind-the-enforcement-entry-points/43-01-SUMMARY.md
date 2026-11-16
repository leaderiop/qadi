---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 01
subsystem: testing
tags: [stryker, mutation-baseline, tstyche, type-tests, handover]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_after: 375ecb3e88b91a7f969e0546582dffb0d4677ee4
requires: []
provides:
  - "43-mutation-base.json: Qadi.ts baseline at the phase base, Handover.ts recorded as moved with its survivors"
  - "RED tstyche refusals of a second resource for guard, the four filter* entry points and the facade's filter/filterProjected"
affects: [43-03, 43-04, 43-08]
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["Parameters<typeof X>[2] refusal for Effect/Stream-returning functions (a callable form is vacuous under effect(floatingEffect))"]
key-files:
  created:
    - .planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-mutation-base.json
    - packages/promise/test/Facade.tst.ts
  modified:
    - packages/core/test/Qadi.tst.ts
key-decisions:
  - "Baseline measured with the close's exact invocation; the single moving survivor is recorded by mutator, replacement and original text"
requirements-completed: [HAND-02, WX-02, WX-05, WX-06]
status: complete
---

# Phase 43 Plan 01: Baseline and RED evidence Summary

Stryker baseline of `Qadi.ts` (0.9730) with `Handover.ts` recorded as moved, committed alone as the phase's first plan commit, then RED tstyche refusals showing a second `resource` is accepted today by `guard`, the four `filter*` entry points and the facade's `filter`/`filterProjected`.

## Commits

- `10824b9b` chore(43-01): mutation baseline for the handover module's move (the JSON alone; parent is `phase_base`)
- `375ecb3e` test(43-01): guard, filter* and the facade's collections accept a second resource (RED)

## Reserved numbers

ARCH-90, ADR-QD-156, CCR-QD-434, BEH-QD-551 to 555, INV-QD-331 and 332 are all free at `phase_base` (whole-id git grep over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples, scripts: no hit; no `spec/decisions/156-*`). `node scripts/next-id.mjs` was not run.

## Mutation base

Invocation (the close repeats it): `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Qadi.ts,packages/core/src/Handover.ts'` (Handover.ts matched no file, a warning only; 90 mutants, 53 s, exit 0).

- `packages/core/src/Qadi.ts`: 0.972972972972973 = 72/74 detected/scored, 16 Ignored (static, never scored)
- Survivors in Qadi.ts: `:448:26 ObjectLiteral Survived (moves)` and `:601:66 ObjectLiteral Survived` (not in a moving range: `Stream.mapEffect(..., { concurrency })` in filterStream, stays in Qadi.ts)
- Moved region (`Handover.ts`, from Qadi.ts): 38/39 = 0.9743589743589743
- The one moving survivor: `ObjectLiteral`, replacement `{}`, original `{ item, allowed: false }` (in `decideOne`)

Printed JSON: `{"measured":{"packages/core/src/Qadi.ts":0.972972972972973},"unmeasured":{},"new":[],"deleted":{},"moved":{"packages/core/src/Handover.ts":{"from":["packages/core/src/Qadi.ts"],"region":{"detected":38,"scored":39,"score":0.9743589743589743},"survivors":[{"from":"packages/core/src/Qadi.ts","line":448,"column":26,"mutatorName":"ObjectLiteral","replacement":"{}","original":"{ item, allowed: false }"}]}}}`

## Bench at the base

`pnpm exec vitest bench --run packages/core/bench/Evaluate.bench.ts --reporter=verbose` (a guard, not a gate; the plain run prints no table, so the verbose reporter was used):

| Row | hz | rme |
|---|---|---|
| filter - 500 items, hasPermission | 144.45 | +-19.79% |
| filter - 500 items, concurrency: unbounded | 193.75 | +-3.52% |
| filter - 500 items, concurrency: sequential (default) | 178.28 | +-5.05% |

## RED on the base

Each `--only` run exits 1; `Qadi.tst.ts --skip "a second resource in"` exits 0 (9 passed, 2 skipped).

- `tstyche packages/core/test/Qadi.tst.ts --only "guard refuses a second resource in"`: exit 1, `Assertions: 2 failed, 2 passed` (the callable refusal at `:165` and the `Parameters<typeof guard>[2]` refusal fail; the two controls pass)
- `tstyche packages/core/test/Qadi.tst.ts --only "the collection entry points refuse a second resource in"`: exit 1, `Assertions: 4 failed, 10 passed` (the four `SecondResource` refusals fail; the four `{ resource: undefined }` refusals and the six controls pass, because `exactOptionalPropertyTypes` already refuses `undefined`)
- `tstyche packages/promise/test/Facade.tst.ts --only "refuse a second resource in"`: exit 1, `Assertions: 2 failed, 4 passed` (the two `{ resource }` refusals fail; the four controls pass)
- `pnpm typecheck` exit 0 and `pnpm lint` exit 0 at the RED commit.

## Deviations from Plan

### Auto-fixed Issues

None.

### Notes

- The plan's second verify for Task 2 ends with `! grep -nE "@ts-expect-error|toRaiseError"` over both files. `Qadi.tst.ts` line 5 holds the words `@ts-expect-error` inside a pre-existing header doc comment (not code, untouched by this plan), so that literal grep prints that one line. The new tests contain neither token. Left as is rather than rewording an unrelated comment.
- The plan's bench command prints no table with the plain reporter; `--reporter=verbose` was used (nothing committed).

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 43-mutation-base.json, Facade.tst.ts, Qadi.tst.ts present; `10824b9b` and `375ecb3e` are ancestors of HEAD; the chore commit carries the JSON alone and its parent is `phase_base`.
