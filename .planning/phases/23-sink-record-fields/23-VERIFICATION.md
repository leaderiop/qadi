---
phase: 23-sink-record-fields
verified: 2026-11-11T09:00:00Z
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
  - packages/core/bench/SinkRecord.bench.ts
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
  - spec/invariants.md
  - spec/traceability.md
covered_digest: "v4:sha256:44c97bee0153e304f85a928ca0e5f0290280a9ec5390f19d2fc1b1ef3e7cc532"
behavior_unverified: 0
overrides_applied: 0
re_verification:
  previous_status: passed
  previous_score: 12/12
  gaps_closed:
    - "IN-04 (stale \"today's\" wording in SinkRecord.tst.ts test titles) fixed in cec815ae"
    - "IN-05 (bench header's first bullet contradicting the IN-02 paragraph) fixed in 964d9d2c"
  gaps_remaining: []
  regressions: []
---

# Phase 23: Sink record fields stated once Verification Report

**Phase Goal:** Each sink record's fields are stated once, and a field dropped from projection or rebuild cannot compile or pass the round trip silently.
**Verified:** 2026-11-11T09:00:00Z
**Status:** passed
**Re-verification:** Yes. The previous report (passed, 12/12, written at 0881e681) went stale when the second code-review fix pass edited two covered files (cec815ae, 964d9d2c). This report was regenerated against the current tree.

## Goal Achievement

### What changed since the last report, and whether any must-have depended on it

`git diff 0881e681 HEAD --stat -- packages spec .changeset scripts` touches exactly two files:

- `packages/core/test/SinkRecord.tst.ts`: four test titles renamed ("today's input/keys" to "the documented input/keys"). The diff shows no assertion line changed.
- `packages/core/bench/SinkRecord.bench.ts`: the first header bullet reworded to say the "today" baseline is the pre-ARCH-71 measurement. Comment only.

No must-have depended on a test title or a bench header comment. Truth 1 (bench recorded) rests on `23-01-SUMMARY.md` and the bench file's existence; the file still exists and labels itself the frozen measurement. The wire-key pin in `SinkCodec.test.ts` ("ARCH-71: the encoded value keeps today's keys") is a different file and untouched. `grep today` over `SinkRecord.tst.ts` now finds nothing. The tstyche file still passes (11 tests, 42 assertions). Since the last report the orchestrator reports the full suite green again (173 files, 4518 tests), and the iteration-3 review (`23-REVIEW.md`) is clean; `23-REVIEW-DISPOSITION.md` records all 6 findings (IN-01 to IN-05, WR-01) as `fixed`, `open: 0`.

### Observable Truths (ROADMAP success criteria first, then plan must-haves)

| #  | Truth | Status | Evidence |
| -- | ----- | ------ | -------- |
| 1 | SC1: bench numbers for both record shapes recorded, human GO/NO-GO in 23-01's SUMMARY | VERIFIED | `23-01-SUMMARY.md` frontmatter: `d01_outcome: A`, `d01_date`, `d01_reason`, `d02_keys: absent`, `phase_base: f40bbfb2…`, four `bench_verdict` rows (one node, allOf x8, allOf x64, obligation record; B is 5.3x to 140x slower than A and not within noise). `packages/core/bench/SinkRecord.bench.ts` exists. Caveat carried from the first report: the choice was read from the pre-recorded `_DECISIONS-v1.2.md`, not asked with the numbers on screen. The numbers confirm it and ADR-QD-135 records both. |
| 2 | SC2: round trip covers both record types and every optional field | VERIFIED | `SinkCodec.test.ts:1570` "every record shape round-trips (ARCH-71)". Re-ran `SinkCodec.test.ts` and `DecisionSink.test.ts` on the current tree: 2 files, 199 tests passed. |
| 3 | SC3: wire goldens unchanged, encoded value has no `undefined`-valued keys | VERIFIED | `git diff f40bbfb2 HEAD --stat -- packages/core/test/fixtures` is empty. `SinkCodec.test.ts:2200` "ARCH-71: the encoded value keeps today's keys" pins ordered keys. `project` in `SinkCodec.ts` is `omitUndefined({ ...record, version: 2 })`. |
| 4 | SREC-02: fields stated once; class type and v2 wire derive from it | VERIFIED | `SinkRecordFields.ts` holds `decisionRecordFields` and `obligationRecordFields` as `Schema.Struct`. `DecisionRecord.ts:71,98` types both classes by `typeof …Fields.Type`. `SinkCodec.ts` `decisionV2Fields` and `obligationsV2Fields` are `{ _tag, version, ...leaf.fields }`. `CacheOutcome` and `ObligationOutcome` derive from `CacheOutcomeSchema` and `ObligationOutcomeSchema` in the leaf (`EvaluationMetrics.ts:49` type-imports it). |
| 5 | SREC-03: leaving an optional field out of project/rebuild is a compile error or a failing round trip | VERIFIED | `project` and `rebuild` name no envelope field: `project` spreads the record plus `version`/`outcome`, `rebuild` is `Struct.omit(wire, ["version"])` and `{ ...fields, outcome }`. `grep -c '? {}' SinkCodec.ts` is 0. Dropping a field from the struct is caught by the `keyof` pins in `SinkRecord.tst.ts` and by the generated round trip. 23-01 recorded the round trip failing under scratch mutations m1, m2 and m3 on the base. |
| 6 | SREC-04: failedRecord/decidedRecord are one projection; SinkWire's restated tag gone | VERIFIED | `SinkEmit.ts:71` `decisionRecordFor`; `Lifecycle.ts:142` and `:188` are its only callers; no other definition of the old names in `packages/*/src` (one history sentence in a doc comment). `SinkWire.ts:19,31` `SinkRecordTag = typeof DECISION_RECORD_TAG \| typeof OBLIGATION_RECORD_TAG` via a type-only import from the leaf. `pnpm circular` clean. |
| 7 | SREC-05: v2 wire byte-identical | VERIFIED | Fixtures and goldens untouched since the phase base; codec and sink tests pass. The leaf's declaration order is the wire's key order (documented in the leaf, pinned by the key-order test). |
| 8 | 23-03: absent optional is an absent key, test RED first on the base (WX-06) | VERIFIED | Commit order `3e014f96` (test RED) then `0c68689c` (feat) then `3a9bca43` (refactor). `decisionRecordFor` uses three conditional spreads. `DecisionSink.test.ts:540` "a record evaluate emits is its own round trip (ARCH-71)". |
| 9 | 23-04: records (ADR-QD-135, ADR-095 amendment, AGENTS.md §7, BEH-QD-450/451, INV-QD-290, CCR-QD-413, changeset) | VERIFIED | `spec/decisions/135-sink-record-fields-stated-once.md` (Status: Accepted), `spec/README.md:351` CCR-QD-413 row, BEH-QD-450 in `25-inspection.md`, BEH-QD-451 at `24-decision-sink.md:160`, INV-QD-290 in `invariants.md`, `.changeset/sink-record-fields.md` (`@qadi/core` patch). INV-QD-290 now cites only enforcement that exists. `pnpm spec:verify:strict`: 21 PASS, 0 FAIL. |
| 10 | WX-03/WX-04: no export change, no new forbidden construct, budgets unchanged | VERIFIED | `SinkRecordFields` is not in the barrel (`grep` of `index.ts` empty). `spec/overview.md` not in the diff since base; `pnpm spec:api` passes (900 exports). `node scripts/check-house-style.mjs`: 448 files clean. `git diff f40bbfb2 HEAD --stat -- scripts .oxlintrc.json` is empty. A filtered scan of added non-comment `packages/*/src` lines finds no `as` assertion (other than `as const`), `any`, `!`, `switch`, `fnUntraced`, `async`/`await`, `console` or `process.env`. |
| 11 | WX-05: coverage and per-file Stryker scores do not fall | VERIFIED | `23-mutation-base.json` vs `23-mutation-after.json`: `SinkCodec.ts` 0.9132 to 0.9278, every other touched file 1.0 to 1.0, new `SinkRecordFields.ts` 1.0. The post-review edit to `SinkCodec.ts` is whitespace only, so the score is unaffected. The orchestrator reports the full suite green (173 files, 4518 tests) after the review fixes. |
| 12 | WX-01/WX-02/WX-06 as phase-wide gates | VERIFIED | 23-04 reports `pnpm check:pr` green (mutation skipped by design). I re-ran `pnpm typecheck` (tsc -b plus the test project): no errors. Reserved numbers only (ADR-QD-135, CCR-QD-413, BEH-QD-450/451, INV-QD-290). The one defect fix (absent keys) was RED first (truth 8). |

**Score:** 12/12 truths verified (0 present, behavior-unverified)

### Required Artifacts

| Artifact | Expected | Status | Details |
| -------- | -------- | ------ | ------- |
| `packages/core/src/SinkRecordFields.ts` | one statement of each record's fields | VERIFIED | two `Schema.Struct`s, the two tags, two literal schemas; imported by `DecisionRecord.ts`, `SinkCodec.ts`, `SinkWire.ts` (type-only), `EvaluationMetrics.ts` (type-only) |
| `packages/core/src/SinkCodec.ts` | v2 structs spread the leaf; no field lists | VERIFIED | `...decisionRecordFields.fields`, `...obligationRecordFields.fields` |
| `packages/core/src/SinkEmit.ts` | `decisionRecordFor` | VERIFIED | one function, called at both emit sites |
| `packages/core/test/SinkRecord.tst.ts`, `SinkCodec.test.ts`, `DecisionSink.test.ts` | pins and round trip | VERIFIED | tstyche 11 tests / 42 assertions (SinkRecord.tst.ts); vitest 199 |
| `packages/core/bench/SinkRecord.bench.ts` | A vs B construction bench | VERIFIED | exists, labelled as the frozen record of ADR-QD-135's measurement |
| spec, ADR, changeset set | records | VERIFIED | truth 9 |

### Key Link Verification

| From | To | Via | Status |
| ---- | -- | --- | ------ |
| `DecisionRecord.ts` | `SinkRecordFields.ts` | class field types are the structs' `Type` | WIRED |
| `SinkCodec.ts` | `SinkRecordFields.ts` | wire structs spread `.fields` | WIRED |
| `Lifecycle.ts` | `SinkEmit.ts` | `decisionRecordFor(` at both emit sites | WIRED |
| `SinkWire.ts` | `SinkRecordFields.ts` | type-only tag import, no cycle | WIRED |
| `spec/traceability.md` | `SinkCodec.test.ts` / `SinkRecord.tst.ts` | INV-QD-096, BEH-QD-450, INV-QD-290 rows | WIRED |

### Data-Flow Trace (Level 4)

`Question` to `decisionRecordFor` to `DecisionRecord` to `project` to `encodeWire` and back through `decodeWire` to `rebuild`. The generated round trip exercises this chain end to end with generated data; no static or hollow link found.

### Behavioral Spot-Checks (run by me, against the current tree)

| Behavior | Command | Result | Status |
| -------- | ------- | ------ | ------ |
| Codec and sink behavior | `pnpm vitest run --project core packages/core/test/SinkCodec.test.ts packages/core/test/DecisionSink.test.ts` | 2 files, 199 passed | PASS |
| Type pins | `pnpm test:tstyche packages/core/test/SinkRecord.tst.ts` | 11 tests, 42 assertions passed | PASS |
| Whole-repo typecheck | `pnpm typecheck` | no errors | PASS |
| No cycle | `pnpm circular` | no circular dependency | PASS |
| House style / budgets | `node scripts/check-house-style.mjs` | 448 files clean | PASS |

### Probe Execution

No probes declared. Step 7c skipped.

### Requirements Coverage

| Requirement | Source Plan | Status | Evidence |
| ----------- | ----------- | ------ | -------- |
| SREC-01 | 23-01, 23-04 | SATISFIED | truth 1 |
| SREC-02 | 23-02, 23-04 | SATISFIED | truth 4 |
| SREC-03 | 23-01, 23-02, 23-04 | SATISFIED | truth 5 |
| SREC-04 | 23-02, 23-03, 23-04 | SATISFIED | truth 6 |
| SREC-05 | 23-01, 23-02, 23-04 | SATISFIED | truths 3, 7 |
| WX-01 | 23-04 | SATISFIED | truth 12 |
| WX-02 | 23-01, 23-03, 23-04 | SATISFIED | truths 9, 12 |
| WX-03 | 23-02, 23-04 | SATISFIED | truth 10 |
| WX-04 | 23-02, 23-03, 23-04 | SATISFIED | truth 10 |
| WX-05 | 23-01, 23-02, 23-03, 23-04 | SATISFIED | truth 11 |
| WX-06 | 23-01, 23-03, 23-04 | SATISFIED | truths 8, 12 |

Requirement-ID accounting: the union of the four plans' `requirements:` frontmatter equals the eleven IDs the orchestrator listed (SREC-01..05, WX-01..06). No orphans. `REQUIREMENTS.md` lines 157 to 161 and 199 to 204 have all eleven checked `[x]`. Bookkeeping only: the Traceability table rows at lines 218 and 225 still read "Pending" (one grouped SREC row, one cross-cutting WX row), so the SREC row can be flipped to Complete by the orchestrator. Not a goal gap.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
| ---- | ---- | ------- | -------- | ------ |
None. IN-04 and IN-05, open in the previous report, are fixed (cec815ae, 964d9d2c) and recorded `fixed` in `23-REVIEW-DISPOSITION.md`. A `grep` for `TBD|FIXME|XXX` over the phase's modified source, bench and tst files finds nothing. Iteration-3 review: clean.

### Human Verification Required

None outstanding. The two human judgments (shape A with absent keys; the 5 to 10 percent small-record encode cost) are recorded as accepted in `23-01-SUMMARY.md` and ADR-QD-135.

### Gaps Summary

No gaps. Each record's fields have one statement (`SinkRecordFields.ts`). The class type and the v2 wire derive from it, so `project` and `rebuild` name no envelope field and a dropped field cannot exist there. The `keyof` pins in `SinkRecord.tst.ts` and the generated every-shape round trip fail if the derivation or the codec drifts.

Notes carried from the first report, still true:
- The "old suite misses at least one scratch mutation" half of 23-01's SREC-03 criterion was not met (the old suite caught all three). 23-01 and INV-QD-290 say so honestly. The roadmap criterion that matters (round trip covers every optional field) is met.
- The by-hand optional-key lists in the round trip (`DECISION_OPTIONAL`, `OBLIGATION_OPTIONAL`) do not auto-extend to a newly added field. The single struct and the `keyof` pins are what catch that.
- I did not re-run `pnpm check:pr` or the full suite myself; I relied on the orchestrator's report of the full regression run (173 files, 4518 tests). On this pass I re-ran only the targeted checks above (tstyche, codec and sink vitest, typecheck, house style). Spec gates (`spec:api`, `spec:verify:strict`) were not re-run: no spec, script or src file changed since the previous report, which recorded them passing.

---

_Verified: 2026-11-11_
_Verifier: Claude (gsd-verifier)_
