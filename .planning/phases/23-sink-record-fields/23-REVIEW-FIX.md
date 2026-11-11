---
phase: 23
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/23-sink-record-fields/23-REVIEW.md
iteration: 2
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/23-sink-record-fields/23-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 2 (IN-04, IN-05; WR-01, IN-01, IN-02, IN-03 were fixed in iteration 1 and not touched)
- Fixed: 2
- Skipped: 0

## Fixed Issues

### IN-04: Stale "today's" wording in `SinkRecord.tst.ts` test titles

**Files modified:** `packages/core/test/SinkRecord.tst.ts`
**Commit:** cec815ae
**Applied fix:** Reworded the four titles (lines 52, 77, 115, 124) from "exactly today's input/keys" to "exactly the documented input/keys". A repo-wide grep (excluding `.planning`, `node_modules`, `lib`) found no other quotation of the old titles, so `spec/traceability.md` needed no change.

### IN-05: Bench header's first bullet contradicts the IN-02 paragraph

**Files modified:** `packages/core/bench/SinkRecord.bench.ts`
**Commit:** 964d9d2c
**Applied fix:** The first bullet now reads `"today" (the baseline as measured, pre-ARCH-71): DecisionRecord / ObligationRecord, a Data.TaggedClass whose field type was written by hand`. The measurement and the frozen-record paragraph are unchanged.

## Verification

Run in the main checkout (`workflow.use_worktrees` is `false`; no worktree was created).

- `pnpm test:tstyche packages/core/test/SinkRecord.tst.ts`: 1 test file passed, 11 tests passed, 42 assertions passed.
- `node scripts/check-house-style.mjs`: 448 files clean (3 declared switches).
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
