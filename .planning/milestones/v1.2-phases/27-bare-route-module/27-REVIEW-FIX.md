---
phase: 27-bare-route-module
fixed_at: 2026-11-11T00:00:00Z
review_path: .planning/phases/27-bare-route-module/27-REVIEW.md
iteration: 2
findings_in_scope: 0
fixed: 0
skipped: 0
status: all_fixed
---

# Phase 27: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** .planning/phases/27-bare-route-module/27-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 0
- Fixed: 0
- Skipped: 0

Iteration 2 had no finding in scope. The re-review reports 0 Critical and 0 Warning findings. The two Info findings are out of scope for `critical_warning`, so no code changed and nothing was committed. They stay open in REVIEW.md:
- IN-01, carried forward: `GuardRoute.ts:83-84` "the one the module accepts" is ambiguous after the move.
- IN-02, new: `GuardRoute.ts:73-75` "lost ARCH-57's probe", moved verbatim from `PermissionRegistry.ts`.

## Earlier iterations

### Iteration 1

Iteration 1 had 3 findings in scope (WR-01..WR-03). All 3 were fixed, none skipped, status `all_fixed`. Every edit renamed `guardRoute` to `addGuardedRoute` in a comment or in spec prose. No behaviour or test assertion changed. **Verification ran in the main checkout**, since `workflow.use_worktrees` is `false`. All gates were green:
- `pnpm typecheck`
- `pnpm lint:style`: 455 files.
- `pnpm lint`
- `node scripts/spec-revise.mjs --check`
- `pnpm spec:verify:strict`: 21 PASS, 0 FAIL.
- `pnpm spec:examples`: 108 blocks.
- `pnpm vitest run --project core --project http`: 2388 tests.

The iteration-2 re-review checked each fix against its `git show` and found it correct, with no regression and no new false statement.

#### Fixed

##### WR-01: ADR-QD-037's live test table names `guardRoute` as the thing `GuardRoute.tst.ts` pins

**Files modified:** `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`
**Commit:** 82895714
**Applied fix:** The row names `addGuardedRoute` and notes that ARCH-75 absorbed `guardRoute`. Revision 1.3 → 1.4.
**Status:** fixed

##### WR-02: Source comments in `@qadi/core` describe `guardRoute` as a live function

**Files modified:** `packages/core/src/Errors.ts`, `packages/core/test/Qadi.tst.ts`, `packages/core/test/Policy.tst.ts`
**Commit:** f304bbc0
**Applied fix:** One-word rename in the three comments (`Errors.ts:539`, `Qadi.tst.ts:11`, `Policy.tst.ts:8`).
**Status:** fixed

##### WR-03: ADR-QD-046 and ADR-QD-043 body text names `guardRoute` as the live guard

**Files modified:** `spec/decisions/043-a-decision-is-computed-from-its-inputs.md`, `spec/decisions/046-a-decision-feed-is-sse-and-guarded.md`
**Commit:** a4be4995
**Applied fix:** Five renames: ADR-043 at lines 35 and 126, ADR-046 at lines 48, 54 and 93. Revisions: ADR-043 1.1 → 1.2, ADR-046 1.4 → 1.5. Change History entries name the removed function on purpose.
**Status:** fixed

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer, iteration 1; orchestrator, iteration 2)_
_Iteration: 2_
