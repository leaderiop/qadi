---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
plan: 04
subsystem: core
tags: [stored-record, envelope, data-class, breaking, decision-log, timeline, api-surface]
requires:
  - phase: QD-58
    provides: 58-02 and 58-03 characterisation rows and the RED rows N1..N4 and the type pins
provides:
  - StoredRecord as one Data.Class { environment, record } in core
  - sinkRecordOrder (new export) and storedRecordOrder over StoredRecord
  - the decision log without isolate; the codec without its re-stamp; devtools' timeline over the envelope
  - every shape-reaching test, the five features step files, gate 14's template and the overview rows rewritten
affects: [58-05, 58-06, 58-07, 58-08, 58-09]
actuals:
  tokens: 40000
  tasks: 3
  commits: 1
plan_head_before: 6b74e98e5a7670ef00e1960a6d41b7dc8fdeff02
plan_head_after: 73232d6ad24a2e56f8b7257f1cf970b49264b80e
tech-stack:
  added: []
  patterns: ["a stored record is the wire's { environment, record } in memory too, one Data.Class", "each reader orders what it holds: sinkRecordOrder on a record, storedRecordOrder = mapInput over stored.record"]
key-files:
  created: []
  modified:
    - packages/core/src/DecisionRecord.ts
    - packages/core/src/DecisionLog.ts
    - packages/core/src/SinkCodec.ts
    - packages/devtools/src/model/Timeline.ts
    - packages/devtools/test/helpers.ts
    - spec/overview.md
    - scripts/check-package-install.mjs
key-decisions:
  - "No alias of any deleted name; the break is recorded as Breaking (D-02)"
  - "The log's isolate catches are deleted; a defect propagates and the sink emitter reports it once (D-12)"
  - "TimelineStore.accept's parameter keeps its name record"
requirements-completed: [STOR-01, STOR-02, STOR-03, WX-01, WX-03, WX-04, WX-06]
duration: 7min
completed: 2026-11-19
status: complete
---

# Phase QD-58 Plan 04: a stored record is its envelope in memory too

**One atomic Breaking commit makes the in-memory stored record the wire's `{ environment, record }` as a single `Data.Class`, deletes `Stamped`, `StoredDecisionRecord`, `StoredObligationRecord`, `stampRecord` and the log's `isolate`, and leaves every gate green at 933 exports.**

## Performance

- **Duration:** about 7 min (02:13Z to 02:20Z)
- **Tasks:** 3 (one commit, by design, D-14)
- **Files modified:** 26 (4 src, 22 test, features, script, spec)

## Accomplishments

- `StoredRecord` is `Data.Class<{ environment: string; record: SinkRecord }>` with the `environment` doc moved onto its field; `sinkRecordOrder` holds INV-QD-039's body unchanged and `storedRecordOrder = Order.mapInput(sinkRecordOrder, stored => stored.record)`.
- `DecisionLog` builds `new StoredRecord({ environment, record })` at `append`; `accept` has no catch of its own.
- `SinkCodec` encodes `encodeSinkRecord(stored.record)` beside the environment and decodes to `new StoredRecord({ environment: read.success.environment, record })`; no refusal tag or message moved.
- devtools' `Timeline.ts` ingests the envelope, takes the environment beside the record, and orders with `Order.mapInput(sinkRecordOrder, recordOf)`.

## Tracer

Task 1 (no commit): `StoredEnvelope.test.ts` and `UntrustedSeams.test.ts` 92 passed (N1..N4, G1..G9, L, O, M, T unedited); devtools `StoredOrder.test.ts` 5 passed; http `StoredEnvelopeWire.test.ts` 2 passed; `tstyche StoredEnvelope.tst.ts` 1 test passed (2 assertions); `tsc -b tsconfig.build.json` exit 0. The four characterisation files and `UntrustedSeams.test.ts` were not edited.

## Rewrites

- core: `SinkCodec.test.ts` (envelope builders, `stored.record` reads, `instanceOf StoredRecord` plus the record class); `DecisionRecord.test.ts` (law grid rebuilt on `ObligationRecord`s under `sinkRecordOrder`, plus rows that `storedRecordOrder` agrees with it, including equal records in different environments); `DecisionLog.test.ts`, `DecisionStream.test.ts`, `EvaluationEnvironment.test.ts`, `DecisionSinkForwarding.test.ts` (`encodeSinkRecord(stored.record)`); `DecisionSink.tst.ts` (pin retitled, narrows on `stored.record._tag`, `StoredRecord["record"]` is `SinkRecord`); `ShippedSinkReports.test.ts` (C4 deleted, header cites D-12 and N4).
- devtools: `test/helpers.ts` builds `new StoredRecord`, signatures unchanged; `Source.test.ts` (`got[0]?.record.evaluationId`; `log.ingest(...record)` and `encodeSinkRecordString(...record)` where a bare record is meant).
- http: `decisionStream.test.ts`, `DecisionLogHttp.test.ts`, `decisionBacklog.test.ts`; react `QadiAtoms.test.ts`; testing `QadiReviewLayer.test.ts`.
- features: the five step files (`decision-log`, `merged-sources`, `devtools`, `devtools-screens`, `devtools-simulator`).
- `scripts/check-package-install.mjs` template builds `new StoredRecord({ environment: "Server", record: new DecisionRecord(...) })`; `spec/overview.md` rows (`StoredRecord` value class, `sinkRecordOrder`/`storedRecordOrder`), revision 1.126.

## Files beyond the plan's list

None.

## Gates

At `73232d6a`: `pnpm -s typecheck` exit 0; vitest projects core (81 files, 2637 tests), devtools, http, react, testing, audit all pass; `pnpm -s test:tstyche` passes; `pnpm -s test:bdd` 34 files, 568 tests pass (after `tsc -b`); `pnpm -s lint` (house style: 559 files clean, 3 declared switches) passes with only pre-existing warnings in files this plan did not touch; `pnpm -s circular` clean; `pnpm -s spec:examples` pass; `pnpm -s spec:api` prints `api-surface: 933 export(s) documented across 9 package(s)`; `pnpm -s spec:package` passes. The Task 3 commit-shape check prints `one atomic feat(58-04)! 73232d6a`.

Task commit: `feat(58-04)!` is `73232d6ad24a2e56f8b7257f1cf970b49264b80e` (parent `6b74e98e`), the first commit since `phase_base` to touch `packages/*/src`, carrying exactly the four src files.

## Decisions Made

None beyond the plan: D-01..D-04, D-06, D-12..D-14 applied as written.

## Deviations from Plan

### Orchestrator-authorised and tooling notes

**1. [Tooling] `scripts/spec-revise.mjs` needs `--date`**
- **Found during:** Task 3 (overview revision)
- **Issue:** without `--date` its positional filter drops the first positional (`index !== dateFlag + 1` with `dateFlag = -1` excludes index 0), so the doc argument vanishes and it prints usage.
- **Fix:** ran it with `--date 2026-11-19`; the script itself was not edited (out of scope).
- **Commit:** `73232d6a`

**Total deviations:** 0 auto-fixed code deviations, 1 tooling note. **Impact on plan:** none.

## Issues Encountered

None. No characterisation, RED or Phase 57 row had to change; no stop-and-report condition arose.

## Known Stubs

None.

## Threat Flags

None. No new endpoint, auth path or trust-boundary schema was added; T-58-07 holds (the decode arm reads only `read.success.environment`), T-58-08 holds (G, W and UntrustedSeams rows pass unedited), T-58-11 holds (no deleted name under packages, features, scripts or examples).

## Self-Check: PASSED

- `73232d6ad24a2e56f8b7257f1cf970b49264b80e` is an ancestor of HEAD; its src set is exactly `DecisionLog.ts`, `DecisionRecord.ts`, `SinkCodec.ts` and devtools `Timeline.ts`.
- All Task 1, 2 and 3 verifies exit 0.
- `.planning/config.json` not staged; nothing pushed or released.
