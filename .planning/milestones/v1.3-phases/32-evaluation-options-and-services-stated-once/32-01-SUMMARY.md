---
phase: 32-evaluation-options-and-services-stated-once
plan: 01
subsystem: testing
tags: [mutation-baseline, tstyche, characterisation-pin, evaluation-options]
requires: []
provides:
  - "32-mutation-base.json: per-file Stryker scores of six touched core src files on the untouched phase base"
  - "packages/core/test/EvaluationShapes.tst.ts: barrel-only shape pin of EvaluateOptions, EvaluationServices, StandingEvaluationServices, evaluate and EvaluationServicesNone"
affects: [32-02, 32-04]
tech-stack:
  added: []
  patterns: ["baseline JSON committed alone before any change", "type-identity pin through the barrel"]
key-files:
  created:
    - .planning/phases/32-evaluation-options-and-services-stated-once/32-mutation-base.json
    - packages/core/test/EvaluationShapes.tst.ts
  modified: []
key-decisions:
  - "Pin reads only ../src/index.ts and spells each union out to the five port services, so it does not move with the declarations it checks"
requirements-completed: [WX-05, WX-06]
phase_base: 4a53454577f080ad0dd5d9a7bb6e9e14254e8977
commits: 2
plan_head_before: 4a53454577f080ad0dd5d9a7bb6e9e14254e8977
plan_head_after: 459ad540ae8d6d290889fa1d650658deb57eed7c
actuals:
  tokens: 1500
  tasks: 2
  commits: 2
duration: 10 min
completed: 2026-11-12
status: complete
---

# Phase 32 Plan 01: Baseline and characterisation pin Summary

The phase's mutation baseline for six evaluation-pipeline files and a barrel-only tstyche pin of the evaluation option and service shapes, both committed on the untouched base before any src change.

## Reserved numbers

All ten (ARCH-80, ADR-QD-145, CCR-QD-423, BEH-QD-496..500, INV-QD-309..310) were free: no hit in spec, packages, .changeset, AGENTS.md, apps/website/src, and no `spec/decisions/145-*` file.

## Mutation baseline (fresh core report on 4a534545, Stryker exit 0, overall 97.58)

| File | Score | Detected/scored |
|---|---|---|
| packages/core/src/Lifecycle.ts | 1.0000 | 42/42 |
| packages/core/src/Evaluate.ts | 1.0000 | 1/1 |
| packages/core/src/Question.ts | 1.0000 | 5/5 |
| packages/core/src/Qadi.ts | 0.9730 | 72/74 |
| packages/core/src/SubjectSet.ts | 1.0000 | 34/34 |
| packages/core/src/GuardHealthCheck.ts | 0.7778 | 7/9 |

Base survivors (already there; 32-04 must not count these as regressions):

- `packages/core/src/Qadi.ts:448:26 ObjectLiteral Survived`
- `packages/core/src/Qadi.ts:601:66 ObjectLiteral Survived`
- `packages/core/src/GuardHealthCheck.ts:105:27 BooleanLiteral Survived`
- `packages/core/src/GuardHealthCheck.ts:105:9 ObjectLiteral Survived`

`packages/core/src/EvaluationServicesNone.ts` had no report entry (no mutant); the writer's absent-file check passed.

## Pin result

`pnpm exec tstyche packages/core/test/EvaluationShapes.tst.ts` on the base: `Tests: 5 passed, 5 total`, `Assertions: 6 passed, 6 total`. `pnpm typecheck` clean; `pnpm lint` house-style clean (465 files); the lint warnings printed are pre-existing and in unrelated files.

## Commits

- e88d9f23: chore(32-01): mutation baseline for the evaluation pipeline files (carries 32-mutation-base.json alone)
- 459ad540: test(32-01): pin the evaluation option and service shapes through the barrel (carries EvaluationShapes.tst.ts alone)

No `packages/*/src` file changed. Both commits end with the `Co-Authored-By: Claude Opus 5.5` trailer.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Both created files exist; both commits are ancestors of HEAD; the first plan commit is the `chore(32-01)` baseline and the second the `test(32-01)` pin, each carrying only its own file.
