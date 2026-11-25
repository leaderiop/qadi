---
phase: QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime
fixed_at: 2026-11-25T04:30:00Z
review_path: .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-REVIEW.md
iteration: 2
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase QD-82: Code Review Fix Report

**Fixed at:** 2026-11-25
**Source review:** .planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-REVIEW.md
**Iteration:** 2

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, no worktree was created), on branch `arch-wave-15`. `pnpm exec vitest run --project react < /dev/null` passed (42 files, 678 tests). `pnpm exec tsc -p tsconfig.test.json --noEmit` and `pnpm exec oxlint` on the edited file were clean. `node scripts/check-house-style.mjs` was clean (610 files), and the phase's `scan-ids` and `scan-forbidden` were clean. Stryker was not run. `git diff --quiet HEAD -- packages/react/src` holds.

## Carried forward from iteration 1 (already applied, not touched here)

WR-01, WR-02, WR-03, IN-01, IN-02 and IN-03 of the first review were fixed in d8b30584, 80c70d55 and 6586fc0c, and iteration 2's review confirmed all six resolved. The first fix report is `82-REVIEW-FIX.iter2.md`.

## Fixed Issues

### IN-01: LT18 swaps the process's `uncaughtException` listeners; a `setTimeout` wrapper is narrower and also checks which error escaped

**Files modified:** `packages/react/test/QadiProvider.lifetime.test.tsx`, `.planning/phases/QD-82-qadiprovider-s-registry-has-one-owner-for-its-lifetime/82-RED-EVIDENCE.md`
**Commit:** 2042d271
**Applied fix:**
- LT18 now wraps the global `setTimeout` with `vi.spyOn(globalThis, "setTimeout").mockImplementation(...)`. The wrapper calls the real timer and catches whatever the callback throws into `thrown`.
- The lease resolves `setTimeout` from the global at call time (`RegistryLease.ts`), so the wrapper hears the recycle's error. The process's `uncaughtException` listeners, vitest's own included, are never touched. The existing `afterEach(() => vi.restoreAllMocks())` undoes the spy.
- The test now asserts `thrown[0]` matches `{ message: "a finalizer threw" }`, so it checks which error escaped.
- No `as`, `!`, `any` or `@ts-expect-error` was needed. The implementation `(run, ms) => realSetTimeout(() => { try { if (typeof run === "function") run(); } ... }, ms)` type-checks as written, so the review's `as unknown as typeof setTimeout` cast was not used.
- The `typeof run === "function"` narrowing is there because the DOM `TimerHandler` type also admits a string.
- Because no cast-free mechanism was missing, the fallback (an exact `rawListeners` restore of the process swap) was not needed.

**Red evidence:** with the `try`/`finally` around `registry.reset()` removed from `QadiProvider.tsx` (copy-backed scratch edit, restored with `cp`), LT18 was the only failure (`1 failed | 17 passed`): `AssertionError: expected [ 'none', 'u1' ] to not include 'none'`. `git diff --quiet HEAD -- packages/react/src` held afterwards. The run is appended to `82-RED-EVIDENCE.md`, under "review fixes, iteration 2".

**Status:** fixed

---

_Fixed: 2026-11-25_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2_
