---
phase: QD-70-hydration-s-drop-events-come-from-its-buckets
fixed_at: 2026-11-22T00:00:00Z
review_path: .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
iteration: 3
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase QD-70: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-70-hydration-s-drop-events-come-from-its-buckets/70-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 5
- Fixed: 5
- Skipped: 0

## Fixed Issues

### IN-01: ADR-QD-183's last Consequences bullet is one 216-column line

**Files modified:** `spec/decisions/183-hydration-drop-events-are-derived-from-their-buckets.md`, `spec/invariants.md`, `spec/behaviors/19-hydration.md`
**Commit:** b82658c1
**Applied fix:** Reflowed the ADR bullet at about 118 columns, INV-QD-045's Source/Enforcement paragraph at 83, and BEH-QD-686's and BEH-QD-690's prose at 84, to match each file's own width. Wording unchanged.

### IN-02: The ADR-QD-183 row of the traceability table links INV-QD-045 twice

**Files modified:** `spec/traceability.md`
**Commit:** b82658c1
**Applied fix:** Removed the duplicate link.

### IN-03: The `HydrationDropEvents.test.ts` traceability row still says "written on the phase base"

**Files modified:** `spec/traceability.md`
**Commit:** b82658c1
**Applied fix:** Now reads "written against the engine before its drops were collected in records". The other "phase base" hits in `spec/` belong to other phases and were left alone.

Spec mechanics (shared by IN-01 to IN-03): bumped through `scripts/spec-revise.mjs --date 2026-11-22` to ADR-QD-183 Rev 1.3, invariants 1.173, behaviors/19 1.27, traceability 1.242 and README 1.285. The CCR-QD-462 row in `spec/README.md` cites each of those. ADR-QD-152 (1.3) and overview (1.132) are unchanged.

### IN-04: The `HydrationBuckets.ts` header claims more than the module does

**Files modified:** `packages/react/src/HydrationBuckets.ts`
**Commit:** 76c147d3
**Applied fix:** The header says the record is the only place an entry drop is collected and the only source of its event. It adds that a payload refused whole has no bucket: the engine reports it from `PAYLOAD_REASONS`, as one event carrying the entries it was handed.

### IN-05: The `PAYLOAD_PRODUCERS` doc comment reads as contradicting itself

**Files modified:** `packages/react/src/HydrationEngine.ts`
**Commit:** 318f9abb
**Applied fix:** The ADR-QD-183 / ADR-QD-152 citation now sits on the sentence about a `payload` row not compiling until its producer is stated. The later sentence says what compiles (a producer given a slot and never raised) and that the conformance test drives each row.

## Verification

All run in the main checkout, not a worktree (`workflow.use_worktrees` is false), after the edits:

- `npx vitest run --project react`: 578 passed
- `pnpm typecheck`: clean
- `pnpm test:tstyche`: 67 files passed
- `node scripts/check-house-style.mjs`: 566 files clean
- `node scripts/check-doc-examples.mjs`: 118 blocks compile
- `node scripts/check-api-surface.mjs`: 941 exports
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest history entry
- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
