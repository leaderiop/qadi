---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 05
subsystem: audit
tags: [match, tagged-enum, exhaustive, stage-result, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-04]
provides:
  - "StageResult: closed, unexported Data.TaggedEnum (NotWired, StageFailed, Staged); only Staged carries commit"
  - "module-scope writtenStaging (Match.tagsExhaustive) and unwrittenOf (UnwrittenStaging[self._tag]())"
  - "hoisted exhaustive evaluationIdOf and outcomePath; logLine; emitWriteOutcome dispatches with Match.value"
affects: [48-06, 48-07, 48-08]
key-files:
  created: []
  modified:
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/audit/src/AuditWriteReport.ts
decisions:
  - "D-09: the stage result is a closed tagged union; the optional-commit check and the tag ternary in writtenStaging are gone"
  - "D-10/D-10a: evaluationIdOf, outcomePath and the refusal dispatch are exhaustive; no hand-written _tag comparison remains in the audit report or sink"
status: complete
plan_head_before: 932b69134e6b9b86749b7a86546e9bbcd8e24562
plan_head_after: c86fd966eda758c8d937bfedc3119e5a70f4fea6
commits: 2
actuals:
  tokens: 4000
  tasks: 2
  commits: 2
---

# Phase QD-48 Plan 05: Exhaustive stage result and report Summary

`StageResult` is now a closed `Data.TaggedEnum` in which only `Staged` carries `commit`, `writtenStaging` matches it exhaustively at module scope, and the audit report's `evaluationIdOf`, `outcomePath` and refusal dispatch are exhaustive matches, so a new staging or outcome variant is a compile error instead of a silent pass.

## Commits

- `1a516884` refactor(48-05): the stage result is a closed union and writtenStaging matches it (tracer)
- `c86fd966` refactor(48-05): evaluationIdOf, outcomePath and the refusal branch are exhaustive matches

## Results

- Task 1: the seven characterisation/exits/agreement/deadline/sink/metrics files `Tests 123 passed (123)`, `packages/audit/test` unedited; source check printed `ok`; `pnpm typecheck`, `lint`, `circular`, `spec:api`, `test:tstyche` (57 files, 289 tests, 606 assertions) and the audit project (28 files, 525 tests) exit 0.
- Task 2: the six outcome/exits/sink/metrics files `Tests 143 passed (143)`, `packages/audit/test` unedited; source check printed `ok`; the same chain plus the core project (72 files, 2412 tests) exit 0.
- `observeLeaf.ts`, `AuditWriteOutput.test.ts` and `AuditLostAgreement.test.ts` pass unedited; `SWITCH_BUDGET`, `UNTRACED_BUDGET` and gate 13 unchanged (nothing exported).

## Deviations from Plan

None - plan executed as written. One deliberate omission: the `StageResult` doc does not cite ADR-QD-161, which does not exist until 48-06; it states the why without the id.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: packages/audit/src/AuditDecisionSinkLive.ts, packages/audit/src/AuditWriteReport.ts
- FOUND commits: 1a516884, c86fd966 (both ancestors of HEAD, trailer present)
