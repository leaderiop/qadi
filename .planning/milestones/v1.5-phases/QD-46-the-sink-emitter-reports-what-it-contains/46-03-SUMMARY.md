---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 03
subsystem: core/sink-emitter
tags: [tracer, emitter, containment, report, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: f5125489c591b9af635f17913439505754d75055
plan_head_after: 8b10d23d04785f9b962096b436c97c71b2f46713
requires: ["46-02"]
provides:
  - "sinkEmitter contains every cause of a sink's record and reports it once, naming the sink"
  - "DecisionSinkShape.name (optional, a display label)"
  - "package-private sinkName, for 46-04's fan-out member report"
affects: [46-04, 46-05, 46-06, 46-07]
tech-stack:
  added: []
  patterns: ["a plain, untraced report function built under Effect.suspend and contained by its own catchCause", "a name read lazily and guarded, never on the success path"]
key-files:
  created: []
  modified:
    - packages/core/src/SinkEmit.ts
    - packages/core/src/DecisionSink.ts
    - packages/core/test/DecisionSink.tst.ts
    - packages/core/test/DecisionSink.test.ts
key-decisions:
  - "reportSinkFailure is a plain function, not Effect.fn: it runs only on a failure and a span-name literal would be a mutant no row can kill"
  - "sinkName uses ?? not ||, so an empty name is a name the sink chose"
requirements-completed: [EMIT-01, EMIT-02, EMIT-04]
duration: 10 min
completed: 2026-11-15
status: complete
commits: 2
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 46 Plan 03: The emitter reports what it contains Summary

`sinkEmitter` now suspends the sink's call and turns every contained cause (defect, synchronous throw, self-interruption, type-escaped failure) into one `Warn` line, `qadi: a decision sink failed; the record was not delivered`, annotated with exactly `qadi.sink` (name or `unnamed`), `qadi.record_tag`, `evaluationId` and `qadi.cause`, inside a containment of its own; `DecisionSinkShape` gains an optional `name`.

## Commits

- `2efb6f47` `feat(46-03): the sink emitter reports what it contains (tracer)` (`SinkEmit.ts`, `DecisionSink.ts`; the first `packages/*/src` commit since `phase_base`)
- `8b10d23d` `test(46-03): pin the sink's optional name and the type escape a failing sink needs` (`DecisionSink.tst.ts`, `DecisionSink.test.ts`, comment lines only in the latter)

## Counts, before and after

| File | Before (after 46-02) | After |
| ---- | -------------------- | ----- |
| `SinkEmitReport.test.ts` | `14 failed \| 2 passed` | `16 passed` |
| `ShippedSinkReports.test.ts` | `12 failed \| 4 passed` | `12 failed \| 4 passed` (C1-C4 green: nothing reported twice; N, A, F rows are 46-04's) |
| every other core test file (70 files) | green | `2344 passed` |
| `DecisionSink.test.ts` | `52 passed` | `52 passed` |
| audit project | 1 failed (name row) | `1 failed \| 478 passed`: only `AuditDecisionSinkLive names itself`, 46-04's |
| `pnpm test:tstyche` | n/a | exit 0 (new `a sink may name itself, and need not`, renamed escape test) |

Structure check output: `structure ok` (one sink-read line, no `Effect.fn`, no `Metric.`, the fixed message once, keys `evaluationId,qadi.cause,qadi.record_tag,qadi.sink`, `Effect.suspend(() => sink.value.record(record))`, exported `sinkName`, `"unnamed"`, the `Cause` type import, optional `name`). Task 2's check: `ok; first src commit: feat(46-03): … (tracer)`.

Gates, exit codes: `pnpm typecheck` 0, `pnpm lint` 0 (house-style: 515 files clean), `pnpm circular` 0, `pnpm test:tstyche` 0. Tracer verify re-run end to end before expansion: passed.

## Still RED, by design (46-04)

`ShippedSinkReports.test.ts` N1-N4, A1-A6, F1-F2 (shipped sinks' names, the fan-out member report, the forwarder's own failures) and the audit `AuditDecisionSinkLive names itself` row. No RED row from 46-01/46-02 was edited.

## Deviations from Plan

None - plan executed exactly as written. One process slip: the Task 2 commit ran after a mistyped project-root-pin path (exit 127); the guard was re-run immediately after and exited 0, on `arch-wave-10`, with the commit holding exactly the two planned files.

## Known Stubs

None.

## Threat Flags

None. T-46-06/07 mitigated as planned (containment around the report and the name read; four annotation keys, no subject, resource, policy or action); T-46-08/09 accepted.

## Self-Check: PASSED

Files and both commits exist; `git rev-list --count f5125489..HEAD` is 2.
