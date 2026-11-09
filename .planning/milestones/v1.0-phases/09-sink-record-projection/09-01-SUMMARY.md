---
phase: 09-sink-record-projection
plan: 01
subsystem: core
tags: [sink, obligation-record, projection, ARCH-54, ADR-QD-100, ADR-QD-105]
requires: []
provides:
  - "obligationRecord(question, decision, at, outcome) in SinkEmit.ts, the third record projection"
affects: [09-02, 09-03, 09-04]
tech-stack:
  added: []
  patterns: ["one module projects every sink record from its question"]
key-files:
  created: []
  modified:
    - packages/core/src/SinkEmit.ts
    - packages/core/src/Qadi.ts
    - packages/core/test/DecisionSink.test.ts
key-decisions:
  - "obligationRecord keeps the conditional spreads for action and resourceId, so an absent value is an absent key (BEH-QD-195)"
  - "The caller reads the clock and passes `at`, so an allow with no duties still reads no clock"
requirements-completed: [SINK-01, XC-04]
status: complete
duration: 5 min
completed: 2026-11-09
commits: 3
plan_head_before: 37fc452492594427ad8e62f8faf578b79dc7df72
plan_head_after: e71f756896e6f521fb461d7441c94c70be050ea5
actuals:
  tokens: 12000
  tasks: 2
  commits: 3
coverage:
  - deliverable: "obligationRecord projects the obligation record from its question in SinkEmit.ts; discharge builds no record"
    verification:
      - kind: test
        ref: "packages/core/test/DecisionSink.test.ts#obligationRecord projects the question (SinkEmit.ts)"
        status: pass
      - kind: command
        ref: "grep -c 'new ObligationRecord' packages/core/src/Qadi.ts (0) and SinkEmit.ts (1)"
        status: pass
    human_judgment: false
  - deliverable: "Whole-record pin proves the record's bytes did not change"
    verification:
      - kind: test
        ref: "packages/core/test/DecisionSink.test.ts#the whole obligation record is pinned for every question shape and outcome"
        status: pass
    human_judgment: false
---

# Phase 9 Plan 01: Obligation record projection Summary

`ObligationRecord` is now projected by `obligationRecord(question, decision, at, outcome)` in `SinkEmit.ts` beside `failedRecord` and `decidedRecord`, and `discharge` in `Qadi.ts` calls it; the record's bytes are unchanged, proven by a whole-record pin committed before the move.

## Commits

| Commit | Message |
| ------ | ------- |
| 00eb826 | test(09-01): pin the obligation record before moving its projection |
| aed62ca | refactor(09-01): project the obligation record from SinkEmit |
| e71f756 | test(09-01): obligationRecord unit table over outcomes and question shapes |

**Pin commit: `00eb826`.** The pin (deep equality plus sorted `Object.keys`, over five question shapes and four outcomes) was written and run green on the unmodified source tree (c3ce9d2 behaviour, HEAD 37fc452) before any source file was touched, and passes unmodified after the move in `aed62ca`. A mutation check (replacing the `resourceId` conditional spread with an unconditional key) made the pin fail, so it does discriminate an absent key from an `undefined`-valued one. Plan 09-03 can cite `00eb826` in the CCR row.

## Accomplishments

- `SinkEmit.ts` exports `obligationRecord` and its module doc now names the three projections (`failedRecord`, `decidedRecord`, `obligationRecord`) as the one place a record is projected from its question (ARCH-54).
- `Qadi.ts` `discharge` keeps a local `record(outcome)` closure delegating to `obligationRecord`; the four emit sites, the early return, `sinkEmitter` and `Clock` are unchanged. The `ObligationRecord` value import and `resourceIdOf` import are gone.
- Tests added to `DecisionSink.test.ts`: the whole-record pin, a handler-question equality case (the emitted record deep-equals `obligationRecord` applied to the handler's own `ObligationDischarge`, with no `resource` or `title` key), and a unit table for every outcome, duty order, absent keys and no resource content on the row.

## Verification

- `pnpm vitest run --project core` (57 files, 1917 tests) and `pnpm vitest run --project audit` (307 tests) green.
- `pnpm typecheck`, `node scripts/check-house-style.mjs`, `pnpm circular` green.
- `grep -c 'new ObligationRecord'`: `Qadi.ts` 0, `SinkEmit.ts` 1 (baseline 1 and 0). `Qadi.ts` contains `obligationRecord(question, decision, at`.
- Tracer gate: `<verify>` is automated-only, re-run end to end after the tracer commit and passed; expansion continued.

## Deviations from Plan

None - plan executed exactly as written. The module doc update that Task 2 step 2 describes landed in the Task 1 source commit (`aed62ca`) because it edits the same file; Task 2's commit therefore holds only the unit table.

## Known Stubs

None.

## Threat Flags

None. T-09-01 (pin), T-09-02 (identity-only projection, asserted by the unit table) and T-09-03 (emit sites and `sinkEmitter` untouched, existing INV-QD-035 cases pass unchanged) are mitigated as planned.

## Self-Check: PASSED

- FOUND: packages/core/src/SinkEmit.ts (`export const obligationRecord`)
- FOUND: packages/core/src/Qadi.ts, packages/core/test/DecisionSink.test.ts
- FOUND commits: 00eb826, aed62ca, e71f756 (ancestors of HEAD)
