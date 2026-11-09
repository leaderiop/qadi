---
phase: 09-sink-record-projection
fixed_at: 2026-11-09T00:00:00Z
review_path: .planning/phases/09-sink-record-projection/09-REVIEW.md
iteration: 1
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase 09: Code Review Fix Report

**Fixed at:** 2026-11-09
**Source review:** .planning/phases/09-sink-record-projection/09-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 2 (WR-01, and IN-02 as its companion test fix; IN-01 left untouched by instruction)
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`), so the
numbers are reproducible from the tree: `pnpm vitest run --project core` (1921 passed),
`--project audit` (307 passed), `pnpm typecheck`, `node scripts/check-house-style.mjs`,
`pnpm circular`, `pnpm spec:api`, `node scripts/spec-revise.mjs --check` and
`pnpm spec:verify:strict` (21 pass, 0 fail) all green.

## Fixed Issues

### WR-01: obligation projection is now evaluated lazily, after the handler, instead of once before it

**Files modified:** `packages/core/src/SinkEmit.ts`, `packages/core/src/Qadi.ts`, `packages/core/test/DecisionSink.test.ts`, `spec/behaviors/25-inspection.md`, `spec/decisions/100-a-question-is-asked-once.md`, `spec/traceability.md`, `spec/README.md`, `.changeset/sink-record-projection.md`
**Commit:** dafe9e1
**Status:** fixed: requires human verification (timing/logic fix; the new tests were confirmed to fail against a lazy implementation, then pass against the fix)
**Applied fix:** `obligationRecord` became the curried `obligationRecordFor(question, decision, at)`, which reads `resourceIdOf(question.resource)` and the obligation ids once, eagerly, and returns the `(outcome) => ObligationRecord` stamper. `discharge` calls it once, before the handler runs, where the `record` closure was. The function is internal (not in the barrel), so no `spec/overview.md` change was needed (`pnpm spec:api` green). The whole-record pin from `00eb826` passes unmodified. Spec prose that named `obligationRecord` (BEH-QD-195 note, ADR-QD-100 amendment, traceability row, CCR-QD-393 row, changeset) now names `obligationRecordFor` and records the once-before-handler timing; revisions bumped with `scripts/spec-revise.mjs`. The changeset's "no record byte changed" claim is true again, so only the function name changed in it.

### IN-02: the "projection is the question's" test cannot catch a divergent projection

**Files modified:** `packages/core/test/DecisionSink.test.ts`
**Commit:** dafe9e1
**Applied fix:** The tautological test (which called the function under test on the same inputs) now builds the expected `ObligationRecord` field by field from the `ObligationDischarge` the handler received and checks `evaluationId` against the decision row. Added tests: a handler that reassigns `resource.id` leaves the row on the original id; a handler that fails after reassigning it still reports `HandlerFailed` with the original id; a resource whose `id` getter throws once the handler has run neither fails a successful enforce nor masks the handler's `"down"` failure; and a unit test that `obligationRecordFor` fixes every key but the outcome when it is called. The existing unit tests were updated to the curried signature.

## Skipped Issues

None. IN-01 (`JsonRefusal.ts` doc wording) was out of scope by instruction and remains in REVIEW.md.

---

_Fixed: 2026-11-09_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
