---
phase: 09-sink-record-projection
verified: 2026-11-09T19:45:00Z
status: human_needed
score: 6/7 must-haves verified
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
covered_digest: "v4:sha256:5cf952525d01d02bccab8e590de7254232b8fd96cfe49b79edc71c260a1f1a0c"
behavior_unverified: 1
overrides_applied: 0
behavior_unverified_items:
  - truth: "The obligation row is pinned to the question the allow was decided for, so it cannot disagree with the decision row (BEH-QD-195, ADR-QD-105, changeset: 'No ... record byte ... changed')"
    test: "Enforce an allow with obligations and an onObligations handler that assigns resource.id (or a resource whose id getter throws after the handler ran); read the decision row and the Obligations row the sink received"
    expected: "Both rows carry the resourceId the allow was decided for; a throwing projection never replaces the handler's own failure and never runs after its side effects (as at 37fc452)"
    why_human: "Code reading shows obligationRecord is now evaluated lazily inside the tap/tapError callbacks (REVIEW WR-01); no test mutates the resource, so the pins cannot see it. A developer must choose: fix before merge or accept the edge-case drift and correct the changeset/CCR wording"
human_verification:
  - test: "Decide WR-01 (09-REVIEW.md, disposition still 'open')"
    expected: "Either apply the curried obligationRecordFor fix (project resourceId and obligationIds once, before the handler) with a mutate-resource.id test, or accept the narrow drift and soften the 'no record byte changed' claim in .changeset/sink-record-projection.md and the CCR-QD-393 row"
    why_human: "Judgment call on an edge case (caller-mutated resource, throwing id getter) that no must-have text covers literally but that the changeset and CCR claim to preserve"
  - test: "Confirm GitHub Actions run 42674934850 (arch-wave-5 @ 192bfe1, full pnpm check) finished green"
    expected: "Both matrix jobs (Node 22.12.0 and 26) succeed, including the example/Playwright step the local run could not execute"
    why_human: "XC-01's single-command proof was still in_progress when verified (Merge gate step running on both jobs); it cannot be asserted from the local checkout"
re_verification:
  previous_status: none
---

# Phase 9: Sink record projection Verification Report

**Phase Goal:** Each sink record is projected from its question in one module, and the port wire no longer depends on the sink wire.
**Verified:** 2026-11-09
**Status:** human_needed
**Re-verification:** No, initial verification

## Goal Achievement

The goal is achieved structurally. All three records (failed, decided, obligation) are built in `SinkEmit.ts`; the encode-refusal vocabulary lives in a leaf the port wire reads; nothing under the port modules imports `SinkWire.ts`. Two items stay open for a human: a real, narrow behaviour drift in the obligation projection (WR-01), and the unfinished CI proof of XC-01.

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | ROADMAP SC1: `Qadi.ts` builds no `ObligationRecord` literal | VERIFIED | `grep "new ObligationRecord" packages/core/src` hits only `SinkEmit.ts:115` and `SinkCodec.ts:283` (the decoder). `Qadi.ts` imports `ObligationRecord` as a type and `obligationRecord` from `SinkEmit.ts` (lines 27, 38, 146-147). |
| 2 | ROADMAP SC2: no `Port*` or port module imports `./SinkWire.ts` | VERIFIED | Only `SinkCodec.ts`, `Errors.ts` and `index.ts` import it (`grep "SinkWire.ts" packages/*/src`). `PortWireEncode`, `AttributeResolver`, `CustomPredicate`, `JsonHazard` and the other port modules import `JsonRefusal.ts` (the 09-02 diff covers all of them). |
| 3 | ROADMAP SC3: `pnpm circular` green | VERIFIED | Ran it: "No circular dependency found!". `JsonRefusal.ts` imports only `effect/Data` and `effect/Match`. |
| 4 | ROADMAP SC4: ADR-QD-116 (ADR-115 unused with stated reason), CCR-QD-393, changeset recorded | VERIFIED (check:pr portion pending, see XC-01) | `spec/decisions/116-the-json-refusal-vocabulary-is-a-leaf-of-its-own.md` exists and is indexed (`index.yaml:377`). The CCR-QD-393 row is at `spec/README.md:331`. `.changeset/sink-record-projection.md` exists. `spec/overview.md` Rev 1.77 names `JsonRefusal.ts`. |
| 5 | Moved vocabulary is unchanged, with describeEncodeRefusal's sentences identical and no re-export left in `SinkWire.ts` (D-06) | VERIFIED | Compared 37fc452's `SinkWire.ts` against HEAD's `JsonRefusal.ts` plus `SinkWire.ts`, comments stripped: the only difference is a second `import * as Data` line. `SinkWire.ts` declares only `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS`, `DecodeRefusal`. `index.ts:24` exports the leaf, so every moved name keeps its `@qadi/core` root export (863 exports, per the orchestrator's gate 13 run). |
| 6 | Whole-record pin was written green before the move and passes unmodified after (D-03) | VERIFIED | Pin `00eb826` precedes the move `aed62ca` in `git log`. `aed62ca`'s test diff only adds an import and one new case; the pin is untouched. Ran `DecisionSink`, `EncodeRefusalReport` and `SinkCodec` tests: 194 passed. |
| 7 | The obligation row stays pinned to the question the allow answered, with record bytes unchanged "for any caller" (09-01 objective, changeset claim) | PRESENT_BEHAVIOR_UNVERIFIED (WARNING) | For the pinned shapes the bytes are identical. But at 37fc452 `discharge` computed `obligationIds` and `resourceIdOf(question.resource)` once, before the handler. Now `record(outcome)` calls `obligationRecord(...)` on each emit (`Qadi.ts:146-147`, `SinkEmit.ts:114-123`), so it reads the caller's un-copied `question.resource` after the handler has run. See WR-01 below. |

**Score:** 6/7 truths verified (1 present, behavior-unverified)

### WR-01 judgement

I confirmed 09-REVIEW.md's finding by reading both versions of `discharge`. It is real. A handler that assigns `resource.id` now yields an obligation row whose `resourceId` differs from the decision row already emitted. A throwing `id` getter now fails after the duty's side effects, and inside `tapError` it replaces the handler's own failure with a defect. The old code failed before the handler ran.

It does not contradict any literal must-have in the four plans: every pinned shape stays byte-equal, and truth 2 of plan 09-01 ("equals `obligationRecord` applied to the handler's question") holds trivially. It does contradict the prose claims "the record's bytes do not change" (09-01 objective, CCR-QD-393 wording) and the changeset's "No ... record byte ... changed", which is stronger than what was tested. It also weakens INV-QD-035's "an observer must never change the outcome" for the obligation row relative to the decision row.

Severity is WARNING, not BLOCKER, because the trigger is narrow (a caller mutating its own resource, or a hostile getter). It routes to the human checkpoint. The fix is small: curry the stable parts, as the review suggests, and add a mutate-`resource.id` test (this also repairs IN-02, whose equality test cannot detect a divergent projection).

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `packages/core/src/SinkEmit.ts` | `obligationRecord` beside `failedRecord`/`decidedRecord` | VERIFIED | Exported, documented, conditional spreads for absent `action` / `resourceId`; wired into `Qadi.ts`. |
| `packages/core/src/Qadi.ts` | `discharge` delegates | VERIFIED | Four emit sites call the `record` closure, which calls `obligationRecord`; no record literal. |
| `packages/core/src/JsonRefusal.ts` | Leaf holding the vocabulary | VERIFIED | 153 lines; exports `WirePath`, `OpaqueKind`, `UnrepresentableKind`, `EncodeRefusal`, `encodeRefusalPath`, `encodeRefusalAnnotations`, `describeEncodeRefusal`. Imports only `effect/*`. |
| `packages/core/src/SinkWire.ts` | Record wire's own words only | VERIFIED | Declares only `SinkRecordTag`, `WireVersion`, `WIRE_VERSIONS`, `DecodeRefusal`. |
| `packages/core/src/index.ts` | Barrel line | VERIFIED | `export * from "./JsonRefusal.ts"` at line 24, alphabetical. |
| `scripts/check-house-style.mjs` | Exemption re-keyed | VERIFIED | `house-style: 408 file(s) clean (3 declared switch(es))` when run. |
| ADR-116, index, CCR-393, changeset, overview | Spec records | VERIFIED | Present, as in truth 4. Per the orchestrator, `spec:verify:strict`, `spec-revise --check` and `spec:api` exit 0 on HEAD; I did not re-run them. |

### Key Link Verification

| From | To | Via | Status |
|------|----|-----|--------|
| `Qadi.ts` | `SinkEmit.ts` | `obligationRecord(question, decision, at, outcome)` | WIRED |
| `PortWireEncode.ts`, `JsonHazard.ts`, `AttributeResolver.ts`, `CustomPredicate.ts` | `JsonRefusal.ts` | named imports from the leaf | WIRED |
| `index.ts` | `JsonRefusal.ts` | `export *` | WIRED |
| `DecisionSink.test.ts` | `SinkEmit.ts` | pin, equality case, unit table | WIRED (the equality case is tautological, IN-02) |

### Data-Flow Trace (Level 4)

Not applicable: no rendered dynamic data. The data flow that matters is question to record; see truth 7 for its timing.

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Obligation, refusal-report and codec tests | `pnpm vitest run --project core DecisionSink EncodeRefusalReport SinkCodec` | 3 files, 194 tests passed | PASS |
| No import cycle | `pnpm circular` | no cycle found | PASS |
| House style | `node scripts/check-house-style.mjs` | 408 files clean | PASS |
| Resource-mutation edge (truth 7) | none exists | no test mutates the resource | SKIP, routed to human |

### Probe Execution

Step 7c: SKIPPED. No phase-declared probes.

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| SINK-01 | 09-01 | SinkEmit owns all three projections; `discharge` builds no record | SATISFIED | Truth 1. Caveat: WR-01 timing drift. |
| SINK-02 | 09-02 | Vocabulary moves to a leaf; `SinkWire.ts` keeps `WireVersion`, `DecodeRefusal`, `SinkRecordTag` | SATISFIED | Truth 5 |
| SINK-03 | 09-02 | Port wire and port modules no longer import `SinkWire.ts`; circular green | SATISFIED | Truths 2 and 3 |
| XC-01 | 09-04 | `pnpm check:pr` green at phase end | PENDING CI | Local run exited 1 at step 13 (`pnpm example`) solely because `playwright install --with-deps` needs sudo; steps 1-12 passed and later steps passed individually. CI run 42674934850 was `in_progress` on both Node jobs when checked. Not asserted as satisfied. |
| XC-02 | 09-03, 09-04 | ADR or justification, CCR, README line, traceability, changeset | SATISFIED | Truth 4 |
| XC-03 | 09-02, 09-04 | Overview names every export | SATISFIED | No export added or removed; overview Rev 1.77 updated; gate 13 green per orchestrator |
| XC-04 | 09-01, 09-02 | No new `as`/`!`/`any`/`switch`/`fnUntraced`/async/console | SATISFIED | House-style gate clean with the same 3 switches; a grep over the added `src` lines found only the two new effect imports |
| XC-05 | 09-04 | Coverage thresholds hold | SATISFIED (from orchestrator) | Reported green in the 09-04 run (steps 1-12); not independently re-run here. No config or threshold files changed in the diff. |

All eight IDs in the phase's PLAN frontmatter are accounted for, and each maps to REQUIREMENTS.md. There are no orphaned requirements. The XC traceability table in REQUIREMENTS.md still reads "Pending", while the checkboxes are ticked. That is consistent with XC being cross-phase, but XC-01 should not be treated as proven for this phase until CI is green.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `packages/core/src/Qadi.ts` / `SinkEmit.ts` | 146 / 114 | Projection evaluated lazily after the handler (WR-01) | WARNING | Edge-case drift from 37fc452; see truth 7 |
| `packages/core/src/JsonRefusal.ts` | 20-23, 82, 132, 151 | Docs speak only of "records" (IN-01) | INFO | Cosmetic |
| `packages/core/test/DecisionSink.test.ts` | 710-730 | Equality test tautological (IN-02) | INFO | Does not guard the projection |

No TBD, FIXME or XXX markers were introduced (the grep over added lines printed nothing).

### Human Verification Required

1. **WR-01 decision.** `09-REVIEW-DISPOSITION.md` still lists it as `open`. Either apply the review's curried fix and add a mutate-`resource.id` test, or accept the drift and correct the "no record byte changed" wording in the changeset and CCR-QD-393.
2. **CI confirmation.** Confirm run 42674934850 (full `pnpm check`) finished green. Until then XC-01 is unproven.

### Gaps Summary

There are no structural gaps. SINK-01..03 and the ROADMAP success criteria are met in the code. The one substantive concern is WR-01, a narrow behaviour change that the phase's "no byte changed" claim overstates; it needs a developer's fix-or-accept decision. XC-01 depends on the in-progress CI run.

---

_Verified: 2026-11-09_
_Verifier: Claude (gsd-verifier)_
