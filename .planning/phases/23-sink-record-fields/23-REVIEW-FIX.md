---
phase: 23-sink-record-fields
fixed_at: 2026-11-11T07:00:00Z
review_path: .planning/phases/23-sink-record-fields/23-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 23: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/23-sink-record-fields/23-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created). After the last commit, `pnpm spec:verify:strict` (21 pass, 0 fail), `pnpm test:tstyche` (229 tests pass), `pnpm lint` (no errors, only pre-existing warnings) and `node scripts/check-house-style.mjs` (448 files clean) were green. `tsc -p packages/core/tsconfig.src.json --noEmit` and `SinkCodec.test.ts` (147 tests) passed after the IN-03 edit.

## Fixed Issues

### WR-01: The "undeclared field is refused" type test proves nothing about the shared struct

**Files modified:** `packages/core/test/SinkRecord.tst.ts`, `spec/invariants.md`, `spec/traceability.md`
**Commit:** 4b86203d
**Applied fix:** Deleted the vacuous `bogus` `@ts-expect-error` block. Removed "an undeclared field is refused" from INV-QD-290's Enforcement line and from the `SinkRecord.tst.ts` row in `traceability.md`, per the verifier's note that the claim was cited in normative text too. The `keyof` and mutual-assignability tests remain the real derivation pins.

### IN-01: `SinkRecord.tst.ts` header contradicts the file's own content and is stale

**Files modified:** `packages/core/test/SinkRecord.tst.ts`
**Commit:** 08bed3ff
**Applied fix:** Rewrote the header in the present tense, so the hand-written interfaces read as the independent expectation the leaf-derived types must equal. Dropped the "no deliberate compile error" sentence and the "today's input, written out from `DecisionRecord.ts`" labels. The `today's` wording in test titles is left as is.

### IN-03: Cosmetic wrapping and whitespace left in `SinkWire.ts` and `SinkCodec.ts`

**Files modified:** `packages/core/src/SinkWire.ts`, `packages/core/src/SinkCodec.ts`
**Commit:** 9232d0b8
**Applied fix:** Re-wrapped the `SinkWire.ts` header comment. In `SinkCodec.ts`, removed the doubled blank line before `encodeWire`'s doc comment (the one at 358, not the 292-293 the review cited) and wrapped the long `SinkRecordWire` union line. The `omitUndefined` line was within width, so it is unchanged.

### IN-02: `SinkRecord.bench.ts` restates the field list the phase exists to state once

**Files modified:** `packages/core/bench/SinkRecord.bench.ts`
**Commit:** db98ce9e
**Applied fix:** Took the review's second option: added a header paragraph saying the file is the frozen record of ADR-QD-135's measurement, that "today" and A now measure the same shape, and that the field copies are intentionally independent of `SinkRecordFields.ts`.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
