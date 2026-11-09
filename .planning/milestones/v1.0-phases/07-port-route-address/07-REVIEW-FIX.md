---
phase: 07-port-route-address
fixed_at: 2026-11-08T00:00:00Z
review_path: /home/yopu/Project/Perso/qadi/.planning/phases/07-port-route-address/07-REVIEW.md
iteration: 1
findings_in_scope: 1
fixed: 1
skipped: 0
status: all_fixed
---

# Phase 07: Code Review Fix Report

**Fixed at:** 2026-11-08
**Source review:** /home/yopu/Project/Perso/qadi/.planning/phases/07-port-route-address/07-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 1
- Fixed: 1
- Skipped: 0

Scope was `critical_warning`: IN-01, IN-02 and IN-03 are out of scope and remain in REVIEW.md.

## Fixed Issues

### WR-01: `portPath` is the one place the address is built, but accepts prefixes its own docs forbid

**Files modified:** `packages/http/src/PortRouteAddress.ts`, `packages/http/test/PortRoutes.test.ts`, `spec/behaviors/23-http.md`
**Commit:** fc2c324
**Status:** fixed: requires human verification (logic change)
**Applied fix:** `portPath` now strips trailing slashes from the prefix. It builds the path from the prefix with its leading `/` removed, so `"/x/ports/"` and `"/x/ports//"` give `/x/ports/<Port>` and `"/"` gives `/<Port>`. It does not use the reviewer's `${trimmed}/${port}` form: that widens to `${string}/…`, which is not assignable to the `/${string}` return type, so the code branches on an empty remainder instead. A new test in the "address" describe block pins the three cases. A sentence was added to the BEH-QD-338 paragraph in `spec/behaviors/23-http.md` to keep the spec in step (AGENTS.md §11).

**Verification:** run in the main checkout, because `workflow.use_worktrees=false` meant no worktree was created.
- `pnpm vitest run --project http packages/http/test/PortRoutes.test.ts`: 61 passed.
- `pnpm typecheck`: clean.
- `node scripts/check-house-style.mjs`: clean.

**Spec follow-up:** none required beyond the one sentence added. The prefix option docs ("without a trailing slash") are now enforced by `portPath` rather than only stated.

---

_Fixed: 2026-11-08_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
