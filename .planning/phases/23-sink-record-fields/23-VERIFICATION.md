---
phase: 23-sink-record-fields
verified: 2026-11-11T07:00:00Z
status: passed
score: 12/12 must-haves verified
covered_files:
  - .planning/phases/23-sink-record-fields/23-01-PLAN.md
  - .planning/phases/23-sink-record-fields/23-01-SUMMARY.md
  - .planning/phases/23-sink-record-fields/23-02-PLAN.md
  - .planning/phases/23-sink-record-fields/23-02-SUMMARY.md
  - .planning/phases/23-sink-record-fields/23-03-PLAN.md
  - .planning/phases/23-sink-record-fields/23-03-SUMMARY.md
  - .planning/phases/23-sink-record-fields/23-04-PLAN.md
  - .planning/phases/23-sink-record-fields/23-04-SUMMARY.md
  - packages/core/src/DecisionRecord.ts
  - packages/core/src/EvaluationMetrics.ts
  - packages/core/src/Lifecycle.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/SinkEmit.ts
  - packages/core/src/SinkRecordFields.ts
  - packages/core/src/SinkWire.ts
  - packages/core/test/DecisionSink.test.ts
  - packages/core/test/SinkCodec.test.ts
  - packages/core/test/SinkRecord.tst.ts
covered_digest: "v4:sha256:9faf581b6b756193b8ff8d69fd40ccbadc2a3fe325e79b75c1c489313e39fffa"
behavior_unverified: 0
overrides_applied: 0
---

# Phase 23: Sink record fields stated once Verification Report

**Phase Goal:** Each sink record's fields are stated once, and a field dropped from projection or rebuild cannot compile or pass the round trip silently.
**Verified:** 2026-11-11
**Status:** passed (one open warning, WR-01, see Gaps Summary)
**Re-verification:** No, initial verification

## Goal Achievement

### Observable Truths (ROADMAP success criteria first, then plan must-haves)

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1 | SC1: Bench numbers for both record shapes are recorded and the human's GO/NO-GO is in 23-01's SUMMARY | VERIFIED | `23-01-SUMMARY.md` frontmatter has `d01_outcome: A`, `d01_date`, `d01_reason` (owner's words), `d02_keys: absent` and `bench_verdict` rows for one-node, allOf x8, allOf x64 and the obligation record; `packages/core/bench/SinkRecord.bench.ts` exists. Caveat: the choice was read from the pre-recorded `_DECISIONS-v1.2.md`, not asked at the checkpoint with the numbers on screen; the numbers confirm it (B is 5.3x to 140x slower), and ADR-QD-135 records both. |
| 2 | SC2: The round trip covers both record types and every optional field | VERIFIED | `SinkCodec.test.ts:1570` "every record shape round-trips (ARCH-71)": `decisionRecords` and `obligationRecords` arbitraries, each optional key (`resource/action/cache`, `subjectId/action/resourceId`) is a three-state slot (absent, present, present-undefined). Passes (199 tests across SinkCodec and DecisionSink, run by me). 23-01 saw it fail under three scratch mutations on the base. |
| 3 | SC3: Wire goldens unchanged and the encoded value has no `undefined`-valued keys | VERIFIED | `git diff f40bbfb2 HEAD -- packages/core/test/fixtures` is empty; the only line removed from `SinkCodec.test.ts` is an `import type` (it was re-added elsewhere). `SinkCodec.test.ts:2200` "ARCH-71: the encoded value keeps today's keys" pins ordered keys with no undefined-valued own key; `omitUndefined` in `project` enforces it. |
| 4 | SREC-02: fields stated once; class type and v2 wire derive from it | VERIFIED | `SinkRecordFields.ts` holds `decisionRecordFields` / `obligationRecordFields` as `Schema.Struct`. `DecisionRecord.ts` types both classes by `typeof …Fields.Type`; `SinkCodec.ts` `decisionV2Fields` / `obligationsV2Fields` are `{ _tag, version, ...leaf.fields }`. No other statement of the field list in `src`. |
| 5 | SREC-03: leaving an optional field out of project/rebuild is a compile error or a failing round trip | VERIFIED | `project` is `omitUndefined({ ...record, version: 2 })`, `rebuild` is `Struct.omit(wire, ["version"])`; neither names an envelope field, so there is no list to leave a field out of. Residual risk is covered by the round trip (RED under m1/m2/m3 on the base per 23-01) and by `SinkRecord.tst.ts` mutual-assignability and `keyof` pins. `grep '? {}'` in `SinkCodec.ts` is 0. |
| 6 | SREC-04: `failedRecord`/`decidedRecord` are one projection; `SinkWire.ts`'s restated tag gone | VERIFIED | `SinkEmit.ts` exports `decisionRecordFor`; `Lifecycle.ts:142,188` are its only callers; no `failedRecord`/`decidedRecord` definition or caller remains in `packages/*/src` (only a history sentence in a doc comment). `SinkWire.ts:30` `SinkRecordTag = typeof DECISION_RECORD_TAG \| typeof OBLIGATION_RECORD_TAG` (type-only import); `pnpm circular` clean (run by me). |
| 7 | SREC-05: v2 wire byte-identical | VERIFIED | Fixtures and goldens untouched (above); `SinkCodec.test.ts` + `DecisionSink.test.ts` pass; 23-02 reports audit, devtools and http projects green and the orchestrator's full run was 4518 tests green. |
| 8 | 23-03: absent optional is an absent key, test RED first on the base (WX-06) | VERIFIED | `3e014f96` (test, two RED failures on `Object.hasOwn(record, "resource")`) precedes `0c68689c` (feat) which precedes the `3a9bca43` refactor. `decisionRecordFor` uses three conditional spreads. |
| 9 | 23-04: records (ADR-QD-135, ADR-095 amendment, AGENTS.md §7, BEH-QD-450/451, INV-QD-290, CCR-QD-413, changeset) | VERIFIED | All present in the diff: `spec/decisions/135-…md` (Accepted, records the 5 to 10 percent encode cost as accepted), `index.yaml`, ADR-095 amended, `AGENTS.md` +11 lines (§7 only, no budget table touched), BEH-QD-450 in 25-inspection and 451 in 24-decision-sink, INV-QD-290 in `invariants.md:3511`, traceability rows, CCR-QD-413 in `spec/README.md`, `.changeset/sink-record-fields.md`. |
| 10 | WX-03/WX-04: no export change, no new forbidden construct, budgets unchanged | VERIFIED | `SinkRecordFields` not in the barrel; `spec/overview.md` not in the diff; `pnpm spec:api` passes (900 exports); `node scripts/check-house-style.mjs` clean (448 files, 3 declared switches). Diff of `scripts/`, vitest/stryker config, `.oxlintrc.json` since base is empty. Only `as const` additions in src (not an assertion). |
| 11 | WX-05: coverage and per-file Stryker scores do not fall | VERIFIED | I compared `23-mutation-base.json` to `23-mutation-after.json`: SinkCodec 0.9132 to 0.9278, every other touched file 1.0 to 1.0, new `SinkRecordFields.ts` 1.0. 23-04 reports core coverage 99.46 / 97.59 percent against the 95 percent floor. |
| 12 | WX-01/WX-02/WX-06 as phase-wide gates | VERIFIED | 23-04 reports `pnpm check:pr` 16 of 17 steps green (mutation skipped by design, replaced by the per-file comparison above); records use only reserved numbers (ADR-QD-135, CCR-QD-413, BEH-QD-450/451, INV-QD-290); the single defect fix (absent keys) was RED first. I did not re-run `pnpm check:pr`; I re-ran the targeted checks listed below. |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/SinkRecordFields.ts` | one statement of each record's fields | VERIFIED | 143 lines, two `Schema.Struct`s, tags, outcome schemas; imported by `DecisionRecord.ts`, `SinkCodec.ts`, `SinkWire.ts` (type-only), `EvaluationMetrics.ts` |
| `packages/core/src/SinkCodec.ts` | v2 structs spread the leaf; no field lists | VERIFIED | `...decisionRecordFields.fields`, `...obligationRecordFields.fields` |
| `packages/core/src/SinkEmit.ts` | `decisionRecordFor` | VERIFIED | one function, wired in `Lifecycle.ts` twice |
| `packages/core/test/SinkRecord.tst.ts`, `SinkCodec.test.ts`, `DecisionSink.test.ts` | pins and round trip | VERIFIED | tstyche 20 tests / 60 assertions pass; vitest 199 pass |
| `packages/core/bench/SinkRecord.bench.ts` | A vs B construction bench | VERIFIED (see IN-02) | exists, feeds the ADR |
| spec/ADR/changeset set | records | VERIFIED | see truth 9 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `DecisionRecord.ts` | `SinkRecordFields.ts` | class field types = struct `Type` | WIRED |
| `SinkCodec.ts` | `SinkRecordFields.ts` | wire structs spread `.fields` | WIRED |
| `Lifecycle.ts` | `SinkEmit.ts` | `decisionRecordFor(` at both emit sites | WIRED |
| `SinkWire.ts` | `SinkRecordFields.ts` | type-only tag import, no cycle | WIRED |
| `spec/traceability.md` | `SinkCodec.test.ts` | INV-QD-096, BEH-QD-450, INV-QD-290 rows | WIRED |

### Data-Flow Trace (Level 4)

Not applicable beyond the codec: values flow `Question` to `decisionRecordFor` to `DecisionRecord` to `project` to `encodeWire`, and the round-trip property exercises the full chain with generated data.

### Behavioral Spot-Checks (run by me)

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Codec and sink behavior | `pnpm vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSink.test.ts` | 2 files, 199 passed | PASS |
| Type pins | `pnpm test:tstyche packages/core/test/SinkRecord.tst.ts packages/core/test/Errors.tst.ts` | 20 tests, 60 assertions passed | PASS |
| No cycle | `pnpm circular` | no circular dependency | PASS |
| House style / budgets | `node scripts/check-house-style.mjs` | 448 files clean | PASS |
| Public API doc gate | `pnpm spec:api` | 900 exports documented | PASS |

### Probe Execution

No probes declared. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SREC-01 | 23-01 | SATISFIED | bench + recorded decision (truth 1) |
| SREC-02 | 23-02 | SATISFIED | truth 4 |
| SREC-03 | 23-01, 23-02 | SATISFIED | truth 5 |
| SREC-04 | 23-02, 23-03 | SATISFIED | truth 6 |
| SREC-05 | 23-01, 23-02 | SATISFIED | truths 3, 7 |
| WX-01..WX-06 | 23-04 (and 23-01..03 partial) | SATISFIED for this phase | truths 8 to 12 |

Requirement-ID accounting: the union of the four plans' `requirements:` is exactly the roadmap's eleven IDs (SREC-01..05, WX-01..06); no orphans. REQUIREMENTS.md: SREC-01..05 and WX-01..06 all have rows and are checked `[x]` in `REQUIREMENTS.md` (lines 157 to 161 and 199 to 204). The 23-04 `table_unmatched` report refers to the Traceability table: it has one grouped row for `SREC-01..05 | Phase 23 | Pending` and one for `WX-01..06 | All v1.2 phases | Pending`, so the tool found no per-ID row. The WX rows are cross-cutting (every v1.2 phase), so they stay "Pending" until the milestone closes; the SREC row still says "Pending" and could be flipped to Complete by the orchestrator. This is bookkeeping, not a goal gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
| `packages/core/test/SinkRecord.tst.ts` | 158-161 | vacuous `@ts-expect-error` excess-property check (`bogus`) | Warning | see WR-01; cited by INV-QD-290's Enforcement and the traceability row |
| `packages/core/test/SinkRecord.tst.ts` | 1-15 | header describes the pre-refactor state (IN-01) | Info | stale comment |
| `packages/core/bench/SinkRecord.bench.ts` | 31-62 | hand-copied field lists; "today" row now equals A (IN-02) | Info | frozen decision evidence, drift risk |
| `SinkWire.ts` / `SinkCodec.ts` | 8-9 / 292 | wrapping, blank line (IN-03) | Info | cosmetic |
| `spec/behaviors/*` | 24:106, 25:535 | still name `failedRecord`/`decidedRecord` | Info | inside dated change notes that say what replaced them (24) or history (25); acceptable |

No TBD/FIXME/XXX markers in phase-modified source were found by the debt gate (grep of the diff).

### Human Verification Required

None outstanding. The two human judgments (shape decision A with absent keys; the 5 to 10 percent small-record encode cost) are both recorded as accepted in `23-01-SUMMARY.md` and ADR-QD-135.

### Gaps Summary

No gaps. Goal achieved: each record's fields have one statement (`SinkRecordFields.ts`), the class type and the wire derive from it, `project`/`rebuild` name no envelope field so a dropped field cannot exist, and the generated every-shape round trip plus type-equality pins fail if the derivation or the codec drifts.

**WR-01 weighed (does the vacuous `@ts-expect-error` undermine a must-have?).** No. `{ ...validDecision, bogus: 1 }` is rejected by any object type, so that test would pass for a hand-written class too; it proves nothing about derivation. But the derivation is independently pinned by the mutual-assignability and `keyof` tests directly above it (`SinkRecord.tst.ts:144-155`), by the round trip, and by construction in `SinkCodec.ts`. What is wrong is the claim: INV-QD-290's Enforcement and the `traceability.md` row state "an undeclared field is refused" as if this test enforced it. That is a documentation overclaim in a normative `spec/` file (AGENTS.md §11: spec is normative). Recommend, before merge: delete the `bogus` block, drop that clause from `invariants.md` (INV-QD-290 Enforcement) and `traceability.md` (SinkRecord.tst.ts row), and refresh the IN-01 header. This is a WARNING, not a BLOCKER; `23-REVIEW-DISPOSITION.md` currently lists it `open`.

**Other notes:**
- The "old suite misses at least one scratch mutation" half of the planned SREC-03 criterion was not met (the old suite caught all three); 23-01 and INV-QD-290 state this honestly. The roadmap criterion that matters (round trip covers every optional field) is met.
- The by-hand optional-key lists in the round trip (`DECISION_OPTIONAL`, `OBLIGATION_OPTIONAL`) and the three-slot arbitraries do not auto-extend to a newly added field; the type-level pins and the single struct are what catch that, as 23-01 notes.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
