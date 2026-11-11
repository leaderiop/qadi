---
phase: 23-sink-record-fields
plan: 03
subsystem: core
tags: [sink-record, projection, tdd, absent-keys, seam-tests]

requires:
  - phase: 23-sink-record-fields
    provides: "23-01's d02_keys: absent; 23-02's record type derived from the leaf struct"
provides:
  - "decisionRecordFor: the one projection of a question into a Decision row, leaving an absent resource, action and cache absent"
  - "a RED-first test that a record evaluate emits has no own resource, action or cache key when the question has none"
  - "seam tests over every outcome, question shape and cache answer"
affects: [23-04]

actuals:
  tokens: 3600
  tasks: 2
  commits: 4
plan_head_before: ebcc1606ba7f71cd3e42d21a2371558241c1cd58
plan_head_after: 3a9bca43f8dc3d4ca7accf8d1dacda76ea074612

tech-stack:
  added: []
  patterns:
    - "an optional record key is built with one conditional spread, so absent stays absent, in every projection"

key-files:
  created: []
  modified:
    - packages/core/src/SinkEmit.ts
    - packages/core/src/Lifecycle.ts
    - packages/core/test/DecisionSink.test.ts

key-decisions:
  - "decisionRecordFor takes cache as an optional last parameter; a Failed outcome passes none"
  - "Three conditional spreads in the one function (resource, action, cache), no shared helper: a keyed helper needs a computed key, which TypeScript only types with a cast"

requirements-completed: [SREC-04, WX-04, WX-05, WX-06]

coverage:
  - id: D1
    description: "failedRecord and decidedRecord are one function and Lifecycle's two emit sites call it"
    requirement: SREC-04
    verification:
      - kind: other
        ref: "grep -rnwE 'failedRecord|decidedRecord' packages/core/src is empty; grep -c 'decisionRecordFor(' packages/core/src/Lifecycle.ts is 2"
        status: pass
    human_judgment: false
  - id: D2
    description: "A record evaluate emits has no own resource, action or cache key for a bare question, decided and failed"
    requirement: WX-06
    verification:
      - kind: unit
        ref: "packages/core/test/DecisionSink.test.ts#a record evaluate emits is its own round trip (ARCH-71)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The projection has its own seam tests over every outcome, question shape and cache answer"
    requirement: WX-05
    verification:
      - kind: unit
        ref: "packages/core/test/DecisionSink.test.ts#decisionRecordFor projects the question (SinkEmit.ts)"
        status: pass
    human_judgment: false
  - id: D4
    description: "No forbidden construct is added; obligationRecordFor and the sink-cannot-change-a-decision tests pass unedited"
    requirement: WX-04
    verification:
      - kind: unit
        ref: "pnpm vitest run --project core --project audit --project devtools (3616 passed); pnpm typecheck; pnpm lint (house-style clean)"
        status: pass
    human_judgment: false

duration: 8min
completed: 2026-11-11
status: complete
---

# Phase 23 Plan 03: One decision-record projection Summary

**`failedRecord` and `decidedRecord` are now one `decisionRecordFor` that leaves an absent `resource`, `action` and `cache` absent, so a record `evaluate` emits is `Equal` to its own round trip.**

## Performance

- **Duration:** about 8 min (the start time was not captured at the first command)
- **Completed:** 2026-11-11T04:56Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- RED first (`3e014f96`): "a record evaluate emits is its own round trip (ARCH-71)" has two tests, a bare decided and a bare failed record. Both failed on the base's `SinkEmit.ts` on `Object.hasOwn(record, "resource")` being true (the `undefined`-valued own key), with the other 47 tests in the file green. That is the planned assertion, not an import or fixture fault. The decided test also asserts `Equal.equals(roundTrip(record), record)`; the failed test compares the key sets and the outcome tag, because a `Failed` cause crosses the wire as a defect.
- GREEN (`0c68689c`): `decisionRecordFor(question, stamp, outcome: DecisionOutcome, cache?: CacheOutcome)` in `SinkEmit.ts`, `Lifecycle.ts`'s two emit sites switched, and the seam tests added. Both RED tests passed, and the whole file passed (52).
- REFACTOR (`3a9bca43`): the dead `failedRecord` and `decidedRecord` deleted after the seam tests existed (WX-05); the module comment names the two remaining projections.
- The seam tests (beside the `obligationRecordFor` describe) check, across 2 decided outcomes x 4 question shapes x 4 cache answers and the failed outcome x 4 shapes, that `evaluationId`, `at`, `subjectId`, `policy` and `outcome` come from the stamp, question and outcome, and that `resource`, `action` and `cache` are own keys exactly when defined.

## Choices the plan left open

- **Helper vs spreads:** three plain conditional spreads in `decisionRecordFor`, no generic helper. A keyed helper needs a computed key, whose type TypeScript widens to an index signature unless cast, and the house rules forbid `as`.
- **Conditional spreads in `SinkEmit.ts`:** 2 before (both in `obligationRecordFor`), 5 after (two there, three in `decisionRecordFor`). Count of record projections went from 3 to 2.
- **Cache parameter:** optional last parameter rather than an overload; a `Failed` call omits it.

## Task Commits

1. **Task 1 (RED):** `3e014f96` (test)
2. **Task 2 (GREEN):** `0c68689c` (feat), `5e8229a3` (test: type fix, below), `3a9bca43` (refactor)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The first seam tests did not typecheck under `tsconfig.test.json`**
- **Found during:** Task 2 verification (`pnpm typecheck`)
- **Issue:** `tsc -b packages/core` does not include tests, so the feat commit passed that and vitest but its hand-built traces lacked `obligations` and its shape type was wider than `QuestionOptions`.
- **Fix:** `obligations: []` on both traces; the shapes use `QuestionOptions`.
- **Files modified:** `packages/core/test/DecisionSink.test.ts`
- **Commit:** `5e8229a3`

### Plan shape

- The plan describes one `refactor` commit for Task 2. It is three (`feat`, `test`, `refactor`) so the TDD gate sees RED, then GREEN, then REFACTOR, and so the old functions were deleted only after the seam tests existed.

**Total deviations:** 1 auto-fixed (a test type error). **Impact on plan:** none.

## TDD Gate Compliance

RED `3e014f96` (test), GREEN `0c68689c` (feat, descends from RED), REFACTOR `3a9bca43`. The RED run was by vitest on the target file (2 failed, 47 passed). `gsd_run check tdd-red-evidence` was not run; the semantic assessment is the paragraph above: the target tests executed and failed on the planned `Object.hasOwn` assertion.

## Known Stubs

None.

## Threat Flags

None. No new network, auth or file surface. T-23-10: `sinkEmitter` is untouched and the "a sink cannot change a decision" tests pass unedited.

## Next Phase Readiness

23-04 records the absent convention in ADR-QD-135 and a changeset: a sink now receives a `DecisionRecord` without own `resource`, `action` and (when no cache is wired or the outcome is `Failed`) `cache` keys where it used to receive `undefined`-valued ones. `spec/behaviors/24-decision-sink.md:106`, `25-inspection.md:535` and `spec/decisions/100-*.md` still name `failedRecord`/`decidedRecord`.

## Self-Check: PASSED

Checked: `3e014f96`, `0c68689c`, `5e8229a3`, `3a9bca43` are ancestors of HEAD; no `failedRecord`/`decidedRecord` in `packages/core/src`; `decisionRecordFor(` appears twice in `Lifecycle.ts`; `pnpm vitest run --project core --project audit --project devtools` (3616 passed), `pnpm typecheck` and `pnpm lint` green.

---
*Phase: 23-sink-record-fields*
*Completed: 2026-11-11*
