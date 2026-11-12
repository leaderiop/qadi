---
phase: 29-restated-facts
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/29-restated-facts/29-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/29-restated-facts/29-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: ADR-QD-123 still says `PortMetrics.ts` owns `PortName`

**Files modified:** `spec/decisions/123-a-metric-is-declared-once.md`, `spec/README.md`
**Commit:** 7bddf8fb
**Applied fix:** Corrected the live Decision sentence to past tense with a pointer to the amendment, and appended a dated `## Amendment (2026-11-12, CCR-QD-419)` section (same shape as ADR-QD-094's) stating `PortName`/`PortSpanName` live in `packages/core/src/PortName.ts` and why the original reason (no type-only cycle) still holds. Recorded with `spec-revise.mjs --date 2026-11-12`: ADR-QD-123 Rev 1.0 -> 1.1, `spec/README.md` Rev 1.155 -> 1.156. Added the ADR to the CCR-QD-419 row's files cell only; the row's other text is untouched (IN-02 stays open, and the row's "spec/README.md Rev 1.155" mention is now one revision behind). `spec/decisions/index.yaml` carries no revision metadata for ADR-123, so it was not changed.

Status: fixed (docs-only; no logic).

**Verification** (run in the main checkout; `workflow.use_worktrees` is `false`): `node scripts/spec-revise.mjs --check`, `pnpm spec:verify:strict` (21 PASS), `pnpm spec:examples` (108 blocks), `pnpm lint:style` all exit 0. The `PortMetrics.ts owns PortName` grep now matches only the amendment's own history sentence.

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
