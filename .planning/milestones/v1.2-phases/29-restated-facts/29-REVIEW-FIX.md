---
phase: 29-restated-facts
fixed_at: 2026-11-12T00:00:00Z
review_path: .planning/phases/29-restated-facts/29-REVIEW.md
iteration: 2
findings_in_scope: 0
fixed: 0
skipped: 0
status: all_fixed
---

# Phase 29: Code Review Fix Report

**Fixed at:** 2026-11-12
**Source review:** .planning/phases/29-restated-facts/29-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 0
- Fixed: 0
- Skipped: 0

Iteration 2 had no finding in scope. The re-review reports 0 Critical and 0 Warning findings. The three Info findings are out of scope for `critical_warning`, so no code changed and nothing was committed. They stay open in REVIEW.md:
- IN-01, carried forward: `HydrationEngine.ts:96` `DENY_WITHHELD` restates the two fields it shares with `ALLOW_WITHHELD`.
- IN-02, carried forward and widened: the CCR-QD-419 row in `spec/README.md:357` says both "six" and "seven" re-pointed src modules, and cites `spec/README.md` Rev 1.155 although the README is now at 1.156.
- IN-03, new: ADR-QD-123's amendment (:129) says `PortMetrics.ts` "still imports the leaf"; the leaf is new this phase, so "now imports".

## Earlier iterations

### Iteration 1

Iteration 1 had 1 finding in scope (WR-01). It was fixed, none skipped, status `all_fixed`. **Verification ran in the main checkout**, since `workflow.use_worktrees` is `false`. All gates were green:
- `node scripts/spec-revise.mjs --check`
- `pnpm spec:verify:strict`: 21 PASS, 0 FAIL.
- `pnpm spec:examples`: 108 blocks.
- `pnpm lint:style`: 457 files.

The iteration-2 re-review checked the fix against `git show 7bddf8fb` and found it correct, with no regression; its one wording slip is IN-03.

#### Fixed

##### WR-01: ADR-QD-123 still says `PortMetrics.ts` owns `PortName`

**Files modified:** `spec/decisions/123-a-metric-is-declared-once.md`, `spec/README.md`
**Commit:** 7bddf8fb
**Applied fix:** The live Decision sentence is past tense with a pointer to a new dated `## Amendment (2026-11-12, CCR-QD-419)` stating `PortName`/`PortSpanName` live in `packages/core/src/PortName.ts`. Revisions: ADR-QD-123 1.0 → 1.1, `spec/README.md` 1.155 → 1.156. The CCR-QD-419 row's files cell lists the ADR; the row's other text is untouched.
**Status:** fixed

---

_Fixed: 2026-11-12_
_Fixer: Claude (gsd-code-fixer, iteration 1; orchestrator, iteration 2)_
_Iteration: 2_
