---
phase: QD-58-a-stored-record-is-its-envelope-in-memory-too
reviewed: 2026-11-19T00:00:00Z
depth: standard
files_reviewed: 31
files_reviewed_list:
  - features/features/decision-log/decision-log.steps.test.ts
  - features/features/devtools-screens/devtools-screens.steps.test.ts
  - features/features/devtools-simulator/devtools-simulator.steps.test.ts
  - features/features/devtools/devtools.steps.test.ts
  - features/features/merged-sources/merged-sources.steps.test.ts
  - packages/audit/src/AuditArchive.ts
  - packages/core/src/DecisionLog.ts
  - packages/core/src/DecisionRecord.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/test/DecisionLog.test.ts
  - packages/core/test/DecisionRecord.test.ts
  - packages/core/test/DecisionSink.tst.ts
  - packages/core/test/DecisionSinkForwarding.test.ts
  - packages/core/test/DecisionStream.test.ts
  - packages/core/test/EvaluationEnvironment.test.ts
  - packages/core/test/ShippedSinkReports.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/StoredEnvelope.test.ts
  - packages/core/test/StoredEnvelope.tst.ts
  - packages/devtools/src/model/Source.ts
  - packages/devtools/src/model/Timeline.ts
  - packages/devtools/test/helpers.ts
  - packages/devtools/test/model/Source.test.ts
  - packages/devtools/test/model/StoredOrder.test.ts
  - packages/http/test/DecisionLogHttp.test.ts
  - packages/http/test/StoredEnvelopeWire.test.ts
  - packages/http/test/decisionBacklog.test.ts
  - packages/http/test/decisionStream.test.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/testing/test/QadiReviewLayer.test.ts
  - scripts/check-package-install.mjs
findings:
  critical: 0
  warning: 0
  info: 3
  total: 3
  necessity: 0
status: issues_found
iteration: 1
---

# Phase 58: Code Review Report

**Depth:** standard. Diff base `b6326514`. Necessity assessed per `necessity-review.md`; no necessity findings.

## Summary

Every `src` diff was read in full, along with the test diffs and the four new test files (`StoredEnvelope.test.ts`, `StoredEnvelope.tst.ts`, `StoredOrder.test.ts`, `StoredEnvelopeWire.test.ts`). `oxlint` over the touched `src` files and the new tests is clean.

Correctness checks, all clean:
- **Environment source.** The label comes only from the producer: `DecisionLog.append` from `record`/`ingest`, `fromEnvelope` from `read.success.environment`, `encodeStoredRecord` from `stored.environment`. No path takes it from a reader.
- **Order call sites.** `DecisionLog.byRecord`, `DecisionStream` and `Source.mergeSources` use `storedRecordOrder` on envelopes; `Timeline.isAfter` is `Order.mapInput(sinkRecordOrder, recordOf)`; `AuditArchive`'s doc correctly names `sinkRecordOrder` for bare records.
- **`recordOf`.** Covers `TimelineDecision` (`entry.decision`) and `TimelineOrphan` (`entry.obligations`); `StoredOrder.test.ts` T1/T2 exercise both arms with differing and `NaN` times.
- **`Equal`/`Hash`/`.pipe`.** Pinned by L4/L5, N3 and `StoredEnvelope.tst.ts`.
- **Weakened assertions.** None. Rewritten tests still assert environment, `_tag` and evaluation id through `stored.record.*`; instance checks strengthened to both classes; C4's removal is D-12 and N4 pins the new behaviour.
- **House rules.** No `as` (beyond pre-existing `as const`), `!`, `any`, `switch` or `Record<string, unknown>`; namespace `effect` imports; correct `import type` splits.
- **Stale vocabulary.** No deleted symbol or `isolate` left in `packages/*/src`; old catch text in `24-decision-sink.md` only inside an amended-history blockquote (§15).

## Info

### IN-01: DecisionLog module doc has a mangled, over-long line where the "stamp" sentence was replaced

**File:** `packages/core/src/DecisionLog.ts:20`
**Issue:** "The envelope built at `append`: the producer's environment beside the record." was appended to the `Chunk` head-eviction line (~130 columns), running two points together; the paragraph wraps at ~90 (AGENTS.md §17).
**Fix:** Re-wrap it as its own sentence.

### IN-02: Leftover "stamp" wording in test comments and titles, and over-width lines

**Files:** `packages/react/test/QadiAtoms.test.ts:570` ("Stamped by the sink, not by core"); `packages/devtools/test/model/Source.test.ts:291` (title "never stamped"); single over-width lines at `packages/core/src/DecisionLog.ts:215`, `packages/core/src/SinkCodec.ts:616`, `features/features/decision-log/decision-log.steps.test.ts:197`.
**Fix:** Reword to "Supplied by the sink as the envelope's environment, not by core" and "never given a label"; hand-wrap the three long lines.

### IN-03: `StoredEnvelope.test.ts` header and titles describe the phase's process; `DecisionLog.ingest`'s doc is silent on the new contract

**Files:** `packages/core/test/StoredEnvelope.test.ts:1-14` and the N1-N4 `describe` title ("RED on the base"); `packages/core/src/DecisionLog.ts:116-124` (`ingest` doc).
**Issue:** The header claims no row reads the in-memory shape, while N1-N4 do; "RED on the base" is history. After D-12 a defect on the record path propagates to a direct caller of `ingest`, which has no emitter in front of it; only ADR-QD-171 says so, not the public `DecisionLogShape.ingest` doc.
**Fix:** Trim the header and the title; add one sentence to `ingest`'s doc naming the uncontained defect path (ADR-QD-171).

---

_Reviewed: 2026-11-19_
_Reviewer: Claude (gsd-code-reviewer); file written by the orchestrator from the reviewer's report_
_Depth: standard_
