---
phase: 23-sink-record-fields
reviewed: 2026-11-11T08:00:00Z
depth: standard
iteration: 2
files_reviewed: 6
files_reviewed_list:
  - packages/core/bench/SinkRecord.bench.ts
  - packages/core/src/SinkCodec.ts
  - packages/core/src/SinkWire.ts
  - packages/core/test/SinkRecord.tst.ts
  - spec/invariants.md
  - spec/traceability.md
findings:
  critical: 0
  warning: 0
  info: 2
  total: 2
  necessity: 0
status: issues_found
---

# Phase 23: Code Review Report

**Reviewed:** 2026-11-11
**Depth:** standard
**Iteration:** 2 (incremental re-review after the fix iteration; scope is `git diff be06f495..HEAD` over the six files above)
**Files Reviewed:** 6
**Status:** issues_found

## Summary

This is iteration 2, a re-review after the fix iteration. All four iteration-1 findings (WR-01, IN-01, IN-02, IN-03) are fixed, and the fixes introduce no regression, bug or security issue. Two new Info-level documentation defects remain in the changed regions: stale "today's" wording in test titles (IN-04) and a bench header bullet that contradicts the paragraph added to it (IN-05). I did not run tsc or tstyche; the checks were a diff read, `git diff -w` and grep.

## Prior findings status

| ID | Status | Evidence |
| -- | ------ | -------- |
| WR-01 | Fixed | The `bogus` / `@ts-expect-error` block and `declare const validDecision` are gone from `SinkRecord.tst.ts`. The INV-QD-290 Enforcement text (`spec/invariants.md:3519`) and the `SinkRecord.tst.ts` row (`spec/traceability.md:304`) no longer claim "an undeclared field is refused". What they still claim is proven by the remaining tests: constructor input equals the leaf struct's `Type` plus `outcome` (`SinkRecord.tst.ts:143-152`), and the `ObligationOutcome`, `CacheOutcome` and `SinkRecordJson` per-tag key pins. The `Errors.tst.ts` and `SinkCodec.test.ts` clauses are untouched. |
| IN-01 | Fixed | The header at `SinkRecord.tst.ts:1-15` is in present tense and describes the file: hand-written interfaces as the independent expectation, derivation from `SinkRecordFields.ts`, mutual assignability plus `keyof` pinning. The "no deliberate compile error" sentence is removed and no deliberate error remains. The two `Input` interface doc comments are corrected. Leftover test-title wording is tracked as IN-04. |
| IN-02 | Fixed | The new paragraph at `SinkRecord.bench.ts:20-24` states the file is the frozen record of ADR-QD-135's measurement and that the field copies are intentionally independent of `SinkRecordFields.ts`. This matches the file: `decisionFields` and `obligationFields` are still bench-local. One contradiction with the older first bullet remains, tracked as IN-05. |
| IN-03 | Fixed | `git diff -w` shows `SinkWire.ts` changed only in comment re-wrapping; its "two from `SinkRecordFields.ts`" claim matches the imports (`DECISION_RECORD_TAG`, `OBLIGATION_RECORD_TAG`, plus `DecisionDisagreement` from `Decision.ts`). `SinkCodec.ts` changed by one removed blank line and the `SinkRecordWire` union split across lines with the same expression. Both are behavior-neutral. Other over-100-column lines in `SinkCodec.ts` (for example 38, 250, 271, 371) pre-date this phase and are out of scope. |

## Info

### IN-04: Stale "today's" wording in `SinkRecord.tst.ts` test titles

**File:** `packages/core/test/SinkRecord.tst.ts:52, 77, 115, 124`
**Issue:** Four test titles still say "today's": "DecisionRecord's constructor takes exactly today's input" (52), "ObligationRecord's constructor takes exactly today's input" (77), "the Decision member of SinkRecordJson has exactly today's keys" (115) and "the Obligations member of SinkRecordJson has exactly today's keys" (124). IN-01 rewrote the header to drop the pre-refactor framing, but these titles kept it, and "today" no longer has a referent. This is wording only.
**Fix:** Reword to "takes exactly the documented input" / "has exactly the documented keys", or drop "today's".

### IN-05: Bench header's first bullet contradicts the paragraph added in IN-02

**File:** `packages/core/bench/SinkRecord.bench.ts:6` against `:20-24`
**Issue:** Line 6 still describes "today's `DecisionRecord` / `ObligationRecord`" as a `Data.TaggedClass` "whose field type is written by hand". After this phase the real classes derive from `SinkRecordFields.ts`, and the paragraph added at lines 20-24 says "today" and A now measure the same shape. The two passages disagree, and the bench's `TodayDecision = DecisionRecord` binding now measures the leaf-derived class.
**Fix:** Edit the bullet to say "(pre-ARCH-71) `DecisionRecord` / `ObligationRecord` with a hand-written field type", or mark it as describing the baseline as it stood when measured.

---

_Reviewed: 2026-11-11_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
