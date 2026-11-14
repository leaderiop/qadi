---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
fixed_at: 2026-11-14T07:30:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-39-each-hydration-drop-reason-stated-once-with-its-kind/39-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 2
skipped: 1
status: partial
---

# Phase QD-39: Code Review Fix Report

**Fixed at:** 2026-11-14T07:30:00Z
**Source review:** 39-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3
- Fixed: 2
- Skipped: 1 (no_change_needed)

Edits and commits were made in the main checkout (`workflow.use_worktrees` is false). Verification ran in the main checkout: vitest `HydrationMetrics.test.ts` 25/25, tstyche `HydrationMetrics.tst` and `Hydration.tst` 41 assertions, `pnpm typecheck` clean, `pnpm lint` reports no errors in tracked files (warnings only in untracked `.codex/`) and house-style is clean.

## Fixed Issues

### IN-01: Two table lines exceed the hand-wrapped width

**Files modified:** `packages/core/src/HydrationMetrics.ts`
**Commit:** cd7046ff
**Applied fix:** Split the `UnencodablePolicy` and `PayloadTooDeep` summaries with `+` continuation. The string values are byte-identical, so the pinned tests still pass. Metric declarations are untouched.

### IN-02: The type test imports from two different modules

**Files modified:** `packages/core/test/HydrationMetrics.tst.ts`
**Commit:** a6e30c38
**Applied fix:** Merged `HydrationDropReasonOf` and `HydrationDropRow` into the single `../src/HydrationMetrics.ts` type import (both are exported there). The written-out lists are unchanged.

## Skipped Issues

### IN-03: `hydrationDropMeaning` returns the shared table row

**File:** `packages/core/src/HydrationMetrics.ts:255-256`
**Reason:** no_change_needed. The reviewer states no fix is required. Returning the row is the behaviour recorded in the changeset and ADR-QD-152, and the old `MEANINGS` map shared its rows the same way. Copying out a new object would change the function's observable shape, and no consumer serializes the result.
**Original issue:** The function returns the shared table row, so `kind` is present at runtime and the row is mutable.

---

_Fixed: 2026-11-14T07:30:00Z_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
