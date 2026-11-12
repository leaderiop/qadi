---
phase: 27-bare-route-module
fixed_at: 2026-11-11T00:00:00Z
review_path: /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/27-bare-route-module/27-REVIEW.md
iteration: 1
findings_in_scope: 3
fixed: 3
skipped: 0
status: all_fixed
---

# Phase 27: Code Review Fix Report

**Fixed at:** 2026-11-11
**Source review:** /Users/mohammadalmechkor/Projects/Perso/qadi/.planning/phases/27-bare-route-module/27-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 3 (0 critical, 3 warning; IN-01 is out of scope)
- Fixed: 3
- Skipped: 0

Edits ran in the main checkout (`workflow.use_worktrees` is `false`). No behaviour or test assertion changed; every edit is a comment or spec-prose rename.

## Fixed Issues

### WR-01: ADR-QD-037's live test table names `guardRoute` as the thing `GuardRoute.tst.ts` pins

**Files modified:** `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md`
**Commit:** 82895714
**Applied fix:** The `GuardRoute.tst.ts` table row now reads "`addGuardedRoute` (ARCH-75 absorbed its predecessor, `guardRoute`) discharges ...". Revision bumped 1.3 to 1.4 via `spec-revise.mjs --date 2026-11-11`. The historical prose at the other `guardRoute` mentions in this ADR was left as is, as the review accepted.
**Status:** fixed

### WR-02: Source comments in `@qadi/core` describe `guardRoute` as a live function

**Files modified:** `packages/core/src/Errors.ts`, `packages/core/test/Qadi.tst.ts`, `packages/core/test/Policy.tst.ts`
**Commit:** f304bbc0
**Applied fix:** One-word rename `guardRoute` to `addGuardedRoute` in the three comments (`Errors.ts:539`, `Qadi.tst.ts:11`, `Policy.tst.ts:8`). The `Errors.ts` line is 80 columns, within the hand-wrap style.
**Status:** fixed

### WR-03: ADR-QD-046 and ADR-QD-043 body text names `guardRoute` as the live guard

**Files modified:** `spec/decisions/043-a-decision-is-computed-from-its-inputs.md`, `spec/decisions/046-a-decision-feed-is-sse-and-guarded.md`
**Commit:** a4be4995
**Applied fix:** Renamed to `addGuardedRoute` at ADR-043 lines 35 and 126 and ADR-046 lines 48, 54 and 93. Revisions bumped: ADR-043 1.1 to 1.2, ADR-046 1.4 to 1.5, each via `spec-revise.mjs --date 2026-11-11`. The only remaining `guardRoute` mentions in these two files are in the new Change History entries, which name the removed function on purpose.
**Status:** fixed

## Verification

All gates ran in the main checkout (no worktree), after all three commits:

| Command | Result |
| ------- | ------ |
| `pnpm typecheck` | exit 0 |
| `pnpm lint:style` | exit 0, 455 files clean (3 declared switches) |
| `pnpm lint` | exit 0 (only pre-existing warnings, none in edited files) |
| `node scripts/spec-revise.mjs --check` | exit 0, every Revision matches |
| `pnpm spec:verify:strict` | PASS 21, FAIL 0, SKIP 0 |
| `pnpm spec:examples` | exit 0, 108 blocks compile |
| `pnpm vitest run --project core --project http` | 76 files, 2388 tests passed |

Not staged or committed: `.planning/config.json` (pre-existing modification), `.planning/state.json`, the `*-REVIEW*.iter*.md` backups, `27-REVIEW.md` and this file.

---

_Fixed: 2026-11-11_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
