---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
fixed_at: 2026-11-15T00:00:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/QD-43-one-handover-module-behind-the-enforcement-entry-points/43-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 43: Code Review Fix Report

**Fixed at:** 2026-11-15
**Source review:** 43-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

## Fixed Issues

### WR-01: `@qadi/promise` `filter`/`filterProjected` only refuse a literal `resource`

**Files modified:** `packages/promise/src/index.ts`, `packages/promise/test/Facade.tst.ts`, `spec/behaviors/22-promise-facade.md`, `spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md`, `apps/website/src/content/docs/docs/reference/upgrading.md`, `.changeset/promise-filter-refuses-resource.md`
**Commit:** 9c0bef1d
**Applied fix:** Added a non-exported `HandoverFacadeOptions = Omit<FacadeOptions, "resource"> & { readonly resource?: never }` and used it for `filter`, `filterProjected` and `projected` (all three forward to core entry points that decide on the handed-over value). No new export, so `spec/overview.md` is unchanged; the facade stays branch-free. Doc comments now say the resource is "refused (typed `never`)" rather than "Omitted". Added tstyche negatives passing a `FacadeOptions`-typed variable to all three methods, plus a `projected` positive control. RED before the fix (3 variable-form assertions failed: "callable with the given arguments"), GREEN after (10/10). Spec BEH-QD-552, ADR-QD-156, the 0.13 upgrade section and the changeset reword to match. The type change is a logic-level (type) fix, so it is flagged: fixed, requires human verification of the wording only.

Verification (run in the main checkout, no worktree): `tstyche Facade.tst.ts` pass, `vitest --project promise` 25/25, `tsc -p tsconfig.test.json` clean, `pnpm lint` (only pre-existing warnings; house-style 507 files clean), `spec:api`, `spec:examples`, `spec:website-examples` all pass.

## Skipped Issues

Out of scope for `fix_scope: critical_warning` (Info findings, no edit applied): IN-01 (Handover `Verdict`/`Admitted` name reuse), IN-02 (`Handover.test.ts` header contradicts file), IN-03 (`resourceFree` doc overstates monopoly), IN-04 (wall-clock ordering test, `guard` arrow formatting).

---

_Fixed: 2026-11-15_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_


## Iteration 2

The re-review (iteration 2, standard depth) confirmed WR-01 fixed against the source and found 0 critical and 0 warning findings. IN-01..IN-04 remain as Info, outside the critical_warning fix scope, so the loop stopped with no in-scope findings. The CCR-QD-434 row and BEH-QD-552 paragraph were aligned with the fix in 39faed5a.
