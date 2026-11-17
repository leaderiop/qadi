---
phase: QD-50-what-a-leaf-needs-from-the-request-stated-once
plan: 01
subsystem: core
tags: [base-facts, reserved-ids, mutation-baseline, evidence]
phase_base: 5ab8d0c00075beb08f0206841f96e717a6571979
plan_head_before: 5ab8d0c00075beb08f0206841f96e717a6571979
plan_head_after: 75580ec068aa6cc5034d3e5d1f544edaf0e7dc1d
commits: 1
requires: []
provides:
  - "phase_base, the review's facts re-verified at it, and the ten reserved ids confirmed free"
  - "50-mutation-base.json, the Stryker baseline of Walk.ts, Predicate.ts and PortAccess.ts with survivor identities and Walk.ts's leaf-arm counts"
affects: [50-02, 50-03, 50-04, 50-05, 50-06, 50-07, 50-08]
key-files:
  created:
    - .planning/phases/QD-50-what-a-leaf-needs-from-the-request-stated-once/50-mutation-base.json
key-decisions:
  - "Survivor identity is textual (mutator, status, replacement, mutated text, line text), so 50-06 compares sorted lists, not counts or line numbers"
requirements-completed: [WX-02, WX-05, WX-06]
metrics:
  tasks: 2
  files: 2
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
status: complete
---

# Phase QD-50 Plan 01: Base facts, reserved ids and mutation baseline Summary

Evidence only, taken on the untouched phase base before any code: the review's facts re-verified, the ten reserved numbers confirmed free, and the Stryker baseline of the three source files this phase would touch, committed alone as the phase's first commit (`75580ec0`).

## Base facts

Read at `phase_base` (`5ab8d0c0`); lines are the source files' own.

- `packages/core/src/Walk.ts`: `action === undefined && referencesAction(policy.matcher)` twice (`:327` in `HasAttribute`, `:354` in `HasResourceAttribute`); `new MissingResource(` twice (`:340`, `:352`); `new MissingAction({ expected: policy.action })` once (`:384`, `HasAction`); one code `switch (policy._tag)` (`:309`; the `:167` hit is a doc comment).
- `packages/core/src/PortAccess.ts`: `new MissingResourceId({ relation })` once (`:289`, `readScoped`, after `annotateQuestion`).
- `packages/core/src/Predicate.ts`: `_tag: "NeedAction", expected: undefined` twice (`:416`, `:423`); `new MissingAction({ expected: p.expected })` once (`:597`, the `run` arm).

Check order each leaf arm uses today: `HasAttribute` checks action, then resource; `HasResourceAttribute` checks resource, then action; `HasAction` checks action only.

The task's recount verify exited 0 at `phase_base`: every count matches.

## Reserved ids

ARCH-97, ADR-QD-163, CCR-QD-441, BEH-QD-586..BEH-QD-590, INV-QD-345 and INV-QD-346 are all free at `phase_base` (whole-id fixed-string `git grep -lwF` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts prints nothing), and no `spec/decisions/163-*` exists there. `scripts/next-id.mjs` was not run.

## Mutation base

Invocation (50-06 repeats it with `,packages/core/src/LeafNeeds.ts` appended inside the quotes):
`pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Walk.ts,packages/core/src/Predicate.ts,packages/core/src/PortAccess.ts' < /dev/null`

- Wall time: 54 s (Stryker "Done in 53 seconds"), run in the background, exit 0, nothing else CPU-heavy alongside it.
- `uptime` before it: `13:39  up  2:11, 1 user, load averages: 1.71 2.45 2.50`.

| File | Score | (detected/scored) | Killed | Timeout | Survived | NoCoverage | Ignored |
|------|-------|-------------------|--------|---------|----------|------------|---------|
| `PortAccess.ts` | 1 | 46/46 | 46 | 0 | 0 | 0 | 17 |
| `Predicate.ts` | 1 | 298/298 | 298 | 0 | 0 | 0 | 22 |
| `Walk.ts` | 0.9504643962848297 | 307/323 | 307 | 0 | 13 | 3 | 16 |

Identical to RESEARCH Q7 (307 killed / 13 survived / 3 no coverage / 16 ignored).

Leaf arms in `Walk.ts` (`case "HasPermission"` up to, not including, `case "HasActed"`): lines 310-392, detected 64, survived 0. No survivor is inside a leaf arm.

Walk.ts survivors (16):

- `:305:62` ObjectLiteral, NoCoverage, `{}` for `{ maxDepth }` (`PolicyTooDeep`)
- `:442:47` StringLiteral, NoCoverage, `""` for `"the obliged policy denied"`
- `:494:42` StringLiteral, NoCoverage, `""` for `"a required policy denied"`
- `:243:15` StringLiteral, Survived, `""` for `"HasCustom"`
- `:305:7` ConditionalExpression, Survived, `false` for `depth > maxDepth`
- `:719:7`, `:836:7` ObjectLiteral, Survived, `{}` for `{ concurrency: request.concurrency }`
- nine ArithmeticOperator `depth - 1` for `depth + 1` at `:415`, `:430`, `:448`, `:567`, `:587`, `:704`, `:718`, `:807`, `:832`

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- `50-mutation-base.json` exists and is the only file in `75580ec0`; its parent is `phase_base`; the trailer is the last line.
- Both Task 1 verifies and both Task 2 verifies exit 0.
- No change under packages, spec, scripts, .changeset, apps, examples, features or AGENTS.md since `phase_base`.
