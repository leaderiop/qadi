---
phase: 32-evaluation-options-and-services-stated-once
plan: 02
subsystem: core
tags: [type-move, evaluate-options, evaluation-services, lifecycle, tstyche]
requires: [32-01]
provides:
  - "EvaluateOptions declared once, in Question.ts beside QuestionOptions"
  - "EvaluationServices.ts: type-only leaf declaring EvaluationServices and StandingEvaluationServices"
  - "Evaluate.ts declaring only evaluate; Lifecycle.ts reading the declared types"
affects: [32-03, 32-04]
tech-stack:
  added: []
  patterns: ["type-only leaf below both Evaluate.ts and Lifecycle.ts", "derived options via Omit"]
key-files:
  created:
    - packages/core/src/EvaluationServices.ts
  modified:
    - packages/core/src/Question.ts
    - packages/core/src/Evaluate.ts
    - packages/core/src/Lifecycle.ts
    - packages/core/src/index.ts
    - packages/core/src/Qadi.ts
    - packages/core/src/GuardHealthCheck.ts
    - packages/core/src/SubjectSet.ts
    - packages/core/src/EvaluationServicesNone.ts
    - packages/core/test/helpers.ts
    - packages/core/test/Qadi.tst.ts
    - packages/core/test/Errors.tst.ts
    - packages/core/test/DecisionSink.tst.ts
    - packages/core/test/Question.test.ts
    - packages/core/test/Ports.tst.ts
    - packages/core/test/Lifecycle.tst.ts
key-decisions:
  - "The evaluationId doc's pointer to 'where the cache is read below' now names decideQuestion in Lifecycle.ts; everything else moved word for word"
requirements-completed: [EOPT-01, EOPT-02, EOPT-03, EOPT-04]
phase_base: 4a53454577f080ad0dd5d9a7bb6e9e14254e8977
commits: 2
plan_head_before: e9ede4ea8e4b71279576ecbb954c5e9fc76df22c
plan_head_after: a7323863cdb56e741c787d363a358d9ea3e76efc
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
duration: 12 min
completed: 2026-11-12
status: complete
---

# Phase 32 Plan 02: Evaluation options and services stated once Summary

`EvaluateOptions` now lives beside `QuestionOptions`, the two service aliases live in a type-only leaf, `Evaluate.ts` declares only `evaluate`, and `Lifecycle.ts` derives its options by `Omit` instead of restating them.

## Tracer (Task 1, e6302d32)

Fifteen files in one commit: `Question.ts` (gains `EvaluateOptions` and one `effect/Types` type import), new `EvaluationServices.ts` (three `import type`, two aliases), `Evaluate.ts` (one export), `index.ts` (barrel line between `EvaluationMetrics` and `EvaluationServicesNone`), four src importers (`Qadi.ts`, `GuardHealthCheck.ts`, `SubjectSet.ts`, `EvaluationServicesNone.ts`) and seven test files (`helpers.ts`, `Qadi.tst.ts`, `Errors.tst.ts`, `DecisionSink.tst.ts`, `Question.test.ts`, `Ports.tst.ts`, `Lifecycle.tst.ts`; import lines only).

## Lifecycle (Task 2, a7323863)

The restated options interface and the `effect/Types` import are gone; `decideQuestion(question, options?: Omit<EvaluateOptions, keyof QuestionOptions>)`; `ask(policy, options?: EvaluateOptions): Effect.Effect<Asked, EvaluationError, EvaluationServices>`.

Characterisation, run before the `Lifecycle.ts` change (as the plan predicted, identity ignores how the old types were written):
`pnpm exec tstyche packages/core/test/Lifecycle.tst.ts` -> `Tests: 3 passed, 3 total`, `Assertions: 4 passed, 4 total`. It stayed identical after.

## Results

- TS2883: did not appear; `pnpm typecheck` (declaration emit) exits 0. No re-export was added to `Evaluate.ts`.
- `pnpm circular`: no circular dependency, after both commits.
- `pnpm spec:api`: 911 exports documented, no drift.
- `pnpm lint`: house-style 466 files clean (barrel order accepted); only pre-existing warnings elsewhere.
- tstyche: `EvaluationShapes.tst.ts` byte-identical to its 32-01 commit and green after each commit; six type-pin files 39 tests, 72 assertions after Task 1.
- vitest `--project core`: 64 files, 2155 tests pass after Task 1; six named files, 353 tests pass after Task 2.
- Both plan source-check scripts exit 0.

## Commits

- e6302d32: refactor(32-02): EvaluateOptions beside QuestionOptions, the services in a type-only leaf
- a7323863: refactor(32-02): Lifecycle reads EvaluateOptions and EvaluationServices; the restated options are deleted

Both end with the `Co-Authored-By: Claude Opus 5.5` trailer.

## Deviations from Plan

None - plan executed exactly as written. (Import lines were placed in alphabetical order within each file; `EvaluationServices.ts` imports sort after `Evaluate.ts`.)

## Known Stubs

None.

## Self-Check: PASSED

`EvaluationServices.ts` exists; both commits are ancestors of HEAD; the pin is unchanged.
