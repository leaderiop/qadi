---
phase: QD-46-the-sink-emitter-reports-what-it-contains
plan: 02
subsystem: core/sink-emitter
tags: [evidence, characterisation, red-tests, classification, ARCH-93]
phase_base: 76e589e07ddfbfebb68eb759ef775881656b8164
plan_head_before: 7c8c3b70521e22e7cdb9779473c311300ccda8e5
plan_head_after: bddfbdf48f6756897b40830a58f5218398657905
requires: ["46-01"]
provides:
  - "ShippedSinkReports.test.ts: C1-C4 green on the base (the count of reports per failure), N1-N4, A1-A6, F1-F2 RED on the base"
  - "AuditDecisionSinkLive.test.ts: the audit sink's name row, RED on the base"
  - "46-classification.md: W0-W10, W3b and R0 with the row that pins each, for ADR-QD-159"
affects: [46-03, 46-04, 46-05, 46-07]
tech-stack:
  added: []
  patterns: ["characterisation rows committed green before the RED rows", "names read through `yield* DecisionSink`, never the type, so the RED commit compiles on the base"]
key-files:
  created:
    - packages/core/test/ShippedSinkReports.test.ts
    - .planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-classification.md
  modified:
    - packages/audit/test/AuditDecisionSinkLive.test.ts
key-decisions:
  - "N4 reads the shadow sink with `Effect.serviceOption(DecisionSink)`: `evaluationEnvironment`'s declared outputs (`StandingEvaluationServices`) do not list `DecisionSink`, so `yield* DecisionSink` under it does not typecheck"
requirements-completed: [EMIT-03, WX-06]
duration: 12 min
completed: 2026-11-15
status: complete
actuals:
  tokens: 11000
  tasks: 2
  commits: 2
---

# Phase 46 Plan 02: Evidence for the shipped sinks Summary

On the untouched base, each shipped sink's failure is reported exactly once (four characterisation rows, green, committed alone); 12 further rows and the audit name row are RED for the names, the fan-out member report and the forwarder's own failures; and the per-warning classification table D-12 requires is committed with them.

## Commits

- `2c1a15a5` `test(46-02): one report per shipped-sink failure, characterised green on the base` (only `ShippedSinkReports.test.ts`)
- `bddfbdf4` `test(46-02): shipped sinks name themselves and a fan-out names its failed member (RED)` (exactly `ShippedSinkReports.test.ts`, `AuditDecisionSinkLive.test.ts`, `46-classification.md`)

No `packages/*/src` change; `git diff 76e589e0 -- packages/core/src packages/audit/src` is empty. The audit file only gained lines (no removed line against the base).

## Base behaviour

`pnpm exec vitest run --project core packages/core/test/ShippedSinkReports.test.ts`, first commit: `Tests  4 passed (4)`. Every prediction held; no row needed correcting.

- C1 (a send failure whose `onFailure` throws): one `Warn`, `qadi.cause` includes `onFailure exploded`, the allow unchanged. No message asserted: the message moves with D-09.
- C2 (a `send` that throws before returning an effect): one line, "could not be forwarded", cause `send threw`, allow.
- C3 (a refusal whose `onFailure` throws): one line, exactly "qadi: an encode-refusal hook threw", cause `hook exploded`, allow.
- C4 (a log append that dies through an enumerable throwing getter): one line, exactly "qadi: a decision log's append half failed", cause `append trap`, snapshot empty; the next `ingest` adds no line and the snapshot holds one record.

## RED on the base

```
 Test Files  1 failed (1)
      Tests  12 failed | 4 passed (16)        (ShippedSinkReports.test.ts)

 Test Files  1 failed (1)
      Tests  1 failed | 34 passed (35)        (AuditDecisionSinkLive.test.ts)
```

Per row, what the base did: N1-N4 `expected { record: [Function record] } to have property 'name'`; A1, A3 `expected undefined to equal 'unnamed'`; A2, A5 `expected undefined to equal 'billing-audit'`; A4 and A6 `expected +0 to equal 1` (the member after a throwing member, or after a throwing logger, never records); F1 `expected +0 to equal 1` (the hook is never called: the forwarder's outer catch logs it instead); F2 the message is W4's, not the emitter's. The audit row fails the same way as N1. Both counts equal the plan's prediction.

## Classification

`46-classification.md` has 13 table rows (W0-W10, W3b, R0), the per-sink section (five shipped sinks and a caller's own), `Found while planning`, `Kept but unreachable` (W7) and `Packages with no sink` (devtools, react, http; grep recorded). W7 is the one row no test pins, and it says so.

## Verification

- Task 1: the three-part verify exits 0 (`Tests  4 passed`, `packages/*/src` equals `phase_base`, `C1-C4 committed alone, green`).
- Task 2: ShippedSinkReports `12 failed | 4 passed`, audit file `1 failed | 34 passed`; the title and content check prints `12 RED rows, the audit row and the classification table, committed together`; no removed line in the audit file; `pnpm typecheck` and `pnpm lint` exit 0 (house-style: 515 files clean; the only warnings are in untracked `.codex/` and existing files).

## Deviations from Plan

**1. [Rule 3 - Blocking] N4 reads the sink with `serviceOption`**
- **Found during:** Task 2, `pnpm typecheck`
- **Issue:** `evaluationEnvironment` returns `Layer.Layer<StandingEvaluationServices>`, which does not list `DecisionSink`, so `DecisionSink.pipe(Effect.provide(shadow))` left `DecisionSink` as an unmet requirement (TS2375, TS377004).
- **Fix:** `Effect.serviceOption(DecisionSink).pipe(Effect.provide(shadow))`, then `Option.isSome` and `propertyVal(Option.getOrUndefined(...), "name", ...)`. Still read through the service, never the type; still RED on the base.
- **Files modified:** `packages/core/test/ShippedSinkReports.test.ts`
- **Commit:** `bddfbdf4`

**Total deviations:** 1 auto-fixed (1 blocking). **Impact:** none on counts or the RED set.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- `packages/core/test/ShippedSinkReports.test.ts`: found
- `.planning/phases/QD-46-the-sink-emitter-reports-what-it-contains/46-classification.md`: found
- `2c1a15a5` and `bddfbdf4` are ancestors of `HEAD`; `git rev-list --count 7c8c3b70..HEAD` is 2
