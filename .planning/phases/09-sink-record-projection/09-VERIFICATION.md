---
phase: 09-sink-record-projection
verified: 2026-11-09T20:40:00Z
status: passed
score: 7/7 must-haves verified
covered_files:
  - ".planning/phases/09-sink-record-projection/09-01-PLAN.md"
  - ".planning/phases/09-sink-record-projection/09-01-SUMMARY.md"
  - ".planning/phases/09-sink-record-projection/09-02-PLAN.md"
  - ".planning/phases/09-sink-record-projection/09-02-SUMMARY.md"
  - ".planning/phases/09-sink-record-projection/09-03-PLAN.md"
  - ".planning/phases/09-sink-record-projection/09-03-SUMMARY.md"
  - ".planning/phases/09-sink-record-projection/09-04-PLAN.md"
  - ".planning/phases/09-sink-record-projection/09-04-SUMMARY.md"
  - "packages/core/src/AttributeResolver.ts"
  - "packages/core/src/CustomPredicate.ts"
  - "packages/core/src/JsonHazard.ts"
  - "packages/core/src/JsonRefusal.ts"
  - "packages/core/src/PortWireEncode.ts"
  - "packages/core/src/Qadi.ts"
  - "packages/core/src/SinkEmit.ts"
  - "packages/core/src/SinkWire.ts"
  - "packages/core/src/index.ts"
  - "packages/core/test/DecisionSink.test.ts"
covered_digest: "v4:sha256:824d43ecfa4c1e8d450ef272971bd7aaaf4944c597140993babac4c111eb030a"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: human_needed
  previous_score: 6/7
  gaps_closed:
    - "Truth 7: obligation row pinned to the question the allow answered (WR-01 fixed in dafe9e1, now behaviorally tested)"
    - "XC-01 CI proof (UAT test 2, GitHub Actions run 42676403473 at 127d6fa)"
  gaps_remaining: []
  regressions: []
---

# Phase 9: Sink record projection Verification Report

**Phase Goal:** Each sink record is projected from its question in one module, and the port wire no longer depends on the sink wire.
**Verified:** 2026-11-09
**Status:** passed
**Re-verification:** Yes, after the previous report (human_needed). WR-01 was fixed in dafe9e1 and both human items were run as UAT (09-UAT.md, complete, 2/2).

## Goal Achievement

The goal is achieved. `failedRecord`, `decidedRecord` and `obligationRecordFor` all live in `SinkEmit.ts`, and `Qadi.ts` builds no record literal. The encode-refusal vocabulary lives in the leaf `JsonRefusal.ts`, which imports only `effect/Data` and `effect/Match`. No port module imports `SinkWire.ts`. The WR-01 timing drift flagged last time is fixed and has behavioural tests.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | SC1: `Qadi.ts` builds no `ObligationRecord` literal | VERIFIED | `grep "new ObligationRecord" packages/*/src` hits only `SinkEmit.ts:124` and `SinkCodec.ts:283` (the decoder). `Qadi.ts:37` imports `obligationRecordFor`; line 147 calls it. |
| 2 | SC2: no `Port*` or port module imports `./SinkWire.ts` | VERIFIED | Files importing `SinkWire.ts` are `Errors.ts` (type import of `DecodeRefusal`/`SinkRecordTag`, record-side), `SinkCodec.ts` and `index.ts`. A grep of `Port*.ts`, `AttributeResolver.ts`, `CustomPredicate.ts`, `DecisionHistory.ts`, `RelationshipResolver.ts`, `SignatureHistory.ts` and `JsonHazard.ts` for `SinkWire` returns nothing. `JsonRefusal.ts` mentions it only in a comment. |
| 3 | SC3: `pnpm circular` green | VERIFIED | Re-ran: "No circular dependency found!" |
| 4 | SC4: ADR-QD-116 (ADR-115 unused, reason stated), CCR-QD-393, changeset recorded | VERIFIED | `spec/decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md` exists. The CCR-QD-393 row is at `spec/README.md:331` (and now states the obligation projection is made once before the handler, matching the code). `.changeset/sink-record-projection.md` exists. The `check:pr` portion is covered under XC-01. |
| 5 | Moved vocabulary unchanged; `SinkWire.ts` keeps only `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS`, `DecodeRefusal` with no re-export | VERIFIED | `SinkWire.ts` exports exactly those four (grep). `JsonRefusal.ts` exports `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal`, `encodeRefusalPath`, `encodeRefusalAnnotations`, `EncodeRefusalAnnotations`, `describeEncodeRefusal`. `index.ts:24` exports the leaf, so names keep their `@qadi/core` root export. |
| 6 | Whole-record pin written green before the move and passes unmodified after (D-03) | VERIFIED | Pin `00eb826` precedes the move `aed62ca` in history; the pin was untouched by the move. Core tests `DecisionSink`, `EncodeRefusalReport`, `SinkCodec` (+2 related files): 232 passed on HEAD. |
| 7 | The obligation row stays pinned to the question the allow answered, so it cannot disagree with the decision row (BEH-QD-195, ADR-QD-105) | VERIFIED | Previously PRESENT_BEHAVIOR_UNVERIFIED. `SinkEmit.ts:obligationRecordFor` now reads `resourceIdOf(question.resource)` and `decision.obligations.map(id)` eagerly, then returns an outcome-stamping closure. `Qadi.ts:147` calls it before the handler runs (lines 145-147), and the four emit sites call `record(outcome)`. `DecisionSink.test.ts` (dafe9e1) adds three behavioural tests that exercise the invariant: a handler reassigning `resource.id` leaves the row unchanged; a failing handler after reassignment still reports the original id; a throwing `id` getter neither fails the success nor masks the handler's error. Ran `-t resource`: 11 passed. |

**Score:** 7/7 truths verified (0 behaviour-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/SinkEmit.ts` | `obligationRecordFor` beside `failedRecord`/`decidedRecord` | VERIFIED | Exported and documented; conditional spreads for absent `action`/`resourceId`; wired into `Qadi.ts`. |
| `packages/core/src/Qadi.ts` | `discharge` delegates | VERIFIED | Projects once before the handler; no record literal. |
| `packages/core/src/JsonRefusal.ts` | Leaf holding the vocabulary | VERIFIED | Imports only `effect/Data`, `effect/Match`. |
| `packages/core/src/SinkWire.ts` | Record wire's own words only | VERIFIED | Four exports, no re-export. |
| `packages/core/src/index.ts` | Barrel line | VERIFIED | `export * from "./JsonRefusal.ts"` at line 24. |
| `scripts/check-house-style.mjs` | Exemption re-keyed | VERIFIED | Ran: `house-style: 408 file(s) clean (3 declared switch(es))`. |
| ADR-116, CCR-393, changeset | Spec records | VERIFIED | Present, as in truth 4. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `Qadi.ts` | `SinkEmit.ts` | `obligationRecordFor(question, decision, at)` then `record(outcome)` | WIRED |
| `PortWireEncode.ts`, `JsonHazard.ts`, `AttributeResolver.ts`, `CustomPredicate.ts` | `JsonRefusal.ts` | named imports from the leaf | WIRED |
| `Errors.ts`, `SinkCodec.ts`, `EncodeRefusalReport.ts` | `JsonRefusal.ts` / `SinkWire.ts` | retargeted in 24e10af | WIRED |
| `index.ts` | `JsonRefusal.ts` | `export *` | WIRED |
| `DecisionSink.test.ts` | `SinkEmit.ts` | pin, mutation/failure/throwing-getter cases, unit table | WIRED |

### Data-Flow Trace (Level 4)

Not applicable (no rendered data). The data flow that matters, question to record, is now fixed at projection time (truth 7).

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Sink/refusal/codec tests | `pnpm vitest run --project core DecisionSink EncodeRefusalReport SinkCodec` | 5 files, 232 tests passed | PASS |
| Resource-mutation invariant | `pnpm vitest run --project core DecisionSink -t resource` | 11 passed | PASS |
| No import cycle | `pnpm circular` | no cycle found | PASS |
| House style | `node scripts/check-house-style.mjs` | 408 files clean | PASS |

### Probe Execution

Step 7c: SKIPPED. No phase-declared probes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SINK-01 | 09-01 | SinkEmit owns all three projections; `discharge` builds no record | SATISFIED | Truths 1 and 7 |
| SINK-02 | 09-02 | Vocabulary moves to a leaf; `SinkWire.ts` keeps `WireVersion`, `DecodeRefusal`, `SinkRecordTag` | SATISFIED | Truth 5 |
| SINK-03 | 09-02 | Port wire and port modules no longer import `SinkWire.ts`; circular green | SATISFIED | Truths 2 and 3 |
| XC-01 | 09-04 | `pnpm check:pr` green at phase end | SATISFIED (with note) | UAT test 2: run 42676403473 at 127d6fa, Node 22.12.0 leg passed the full `pnpm check`, mutation (94.79 and 95.00 against 80) and the example/Playwright step included. The Node 26 leg hit the job's 60-minute timeout during mutation with no failing step; this predates the phase (baseline run 42662291585 at c807b64 timed out on both legs). I could not independently inspect the CI run; I rely on 09-UAT.md and confirmed no non-`.planning` file differs from 127d6fa (`git diff 127d6fa --stat` touches only `.planning` files). |
| XC-02 | 09-03, 09-04 | ADR or justification, CCR, README line, traceability, changeset | SATISFIED | Truth 4 |
| XC-03 | 09-04 | Overview names every export | SATISFIED | No export added or removed; `spec/overview.md` Rev 1.77 updated; gate 13 green in the CI run per UAT |
| XC-04 | 09-01, 09-02 | No new `as`/`!`/`any`/`switch`/`fnUntraced`/async/console | SATISFIED | House-style gate clean with the same 3 switches; no TBD/FIXME/XXX in `SinkEmit.ts` or `JsonRefusal.ts` |
| XC-05 | 09-04 | Coverage thresholds hold | SATISFIED | Full `pnpm check` green on the Node 22.12.0 leg per UAT; no threshold or config files changed |

All eight IDs in the PLAN frontmatter map to REQUIREMENTS.md (lines 118-134, all ticked; SINK-01..03 "Complete" at line 161). No orphaned requirements. The XC traceability row (line 162) reads "Pending" because XC is cross-phase.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/JsonRefusal.ts` | 20-23, 82, 132, 151 | Docs speak only of "records" (IN-01, disposition still `open`) | INFO | Cosmetic; not a goal gap |

WR-01 and IN-02 are `fixed` per `09-REVIEW-DISPOSITION.md` and the fix is verified in code and tests above.

### Human Verification Required

None. The previous report's two items were discharged: WR-01 by the fix in dafe9e1 (truth 7 is now behaviourally proven) and CI confirmation by UAT test 2.

### Gaps Summary

No gaps. Residual notes, none blocking: the Node 26 CI leg times out during mutation, which predates this phase and is outside its scope; IN-01 is an open cosmetic documentation finding.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
