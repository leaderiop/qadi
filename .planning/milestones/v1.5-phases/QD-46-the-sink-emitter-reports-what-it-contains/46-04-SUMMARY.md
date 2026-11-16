---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 04
subsystem: core/sinks
tags: [tracer, fan-out, forwarder, sink-names, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: e8d303e5ef5d3957ebff75ebd8b49ae992253714
plan_head_after: e649b0d65b96948d37d2c0813b553043a3764a9e
requires: ["46-03"]
provides:
  - "decisionSinkAll names the member that failed and keeps going whatever the member, its name getter or the logger does"
  - "decisionSinkForwarding treats a synchronous throw from send as a send failure and no longer contains a throwing onFailure"
  - "every shipped sink names itself: decisionSinkForwarding, decisionSinkAll, decisionLog, evaluationEnvironment.shadow, AuditDecisionSinkLive"
affects: [46-05, 46-06, 46-07]
tech-stack:
  added: []
  patterns: ["a member call suspended and caught, its report built from the guarded sinkName and contained by its own catchCause"]
key-files:
  created: []
  modified:
    - packages/core/src/DecisionSinkForwarding.ts
    - packages/core/src/DecisionLog.ts
    - packages/core/src/EvaluationEnvironment.ts
    - packages/audit/src/AuditDecisionSinkLive.ts
    - packages/core/test/EvaluationEnvironment.test.ts
key-decisions:
  - "The forwarder's outer catch (W4) is removed: a throwing onFailure on a send failure is reported once by the emitter, naming decisionSinkForwarding; the full forwarding message now appears once in source"
  - "DecisionLog's two isolate catches stay; the publish half is kept though no test reaches it, because without it the append half's catch would mislabel a publish defect"
requirements-completed: [EMIT-03]
duration: 12 min
completed: 2026-11-15
status: complete
commits: 3
actuals:
  tokens: 6000
  tasks: 3
  commits: 3
---

# Phase 46 Plan 04: Apply the classification to the shipped sinks Summary

The fan-out now reports a failed member once, naming it (`qadi.sink`), and the members after it still record even when the member throws before returning an effect, its `name` getter throws, or the logger throws; the forwarder stops containing what the emitter contains; every shipped sink names itself.

## Commits

- `491f4034` `feat(46-04): a fan-out names the member that failed and keeps going (tracer)` (`DecisionSinkForwarding.ts`)
- `c13e8eb5` `fix(46-04): the forwarder treats a throwing send as a send failure and leaves a throwing hook to the emitter` (`DecisionSinkForwarding.ts`)
- `e649b0d6` `feat(46-04): every shipped sink names itself` (`DecisionLog.ts`, `EvaluationEnvironment.ts`, `AuditDecisionSinkLive.ts`, `EvaluationEnvironment.test.ts`, comment lines only in the test)

## Counts

| Point | `ShippedSinkReports.test.ts` | Other |
| ----- | ---------------------------- | ----- |
| after 46-03 | `12 failed \| 4 passed` | audit name row red |
| after Task 1 | `5 failed \| 11 passed` (N1, N3, N4, F1, F2 red; A1-A6, N2, C1-C4 green) | forwarding, emitter, sink, log files `120 passed` |
| after Task 2 | `2 failed \| 14 passed` (N3, N4 red) | forwarding + emitter files `39 passed` |
| after Task 3 | `16 passed` | `AuditDecisionSinkLive.test.ts` `35 passed`; core project `71 files, 2360 passed`; audit project `25 files, 479 passed` |

Gates after Task 3 (exit codes): `pnpm typecheck` 0, `pnpm lint` 0 (house-style: 515 files clean, 3 declared switches), `pnpm circular` 0, `pnpm test:tstyche` 0, `pnpm check:fast` 0 (13 of 17 steps, as designed). The held `AuditDecisionSinkLive.ts` lines (`onRefused`, `commit`) are each present once, and the file differs from `phase_base` by the one `return` line.

## Deviations from Plan

None - plan executed exactly as written. One placement adjustment inside Task 2: the doc sentence on a throwing hook was added at the end of the delivery-failure paragraph rather than before the INV-QD-035 link, so the invariant citation stays attached to its sentence.

## Known Stubs

None.

## Threat Flags

None. T-46-10 (a fan-out member stopping later members) is mitigated by the suspended call, the guarded `sinkName` and the contained report; T-46-11 by C1/F2 and the forwarding message count dropping from two to one.

## Self-Check: PASSED

Files modified exist; `491f4034`, `c13e8eb5`, `e649b0d6` are ancestors of HEAD.
