---
phase: QD-69-one-total-thrown-value-to-message-module
fixed_at: 2026-11-22T12:10:00Z
review_path: .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-REVIEW.md
iteration: 3
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-69: Code Review Fix Report

**Fixed at:** 2026-11-22
**Source review:** .planning/phases/QD-69-one-total-thrown-value-to-message-module/69-REVIEW.md
**Iteration:** 3

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created).
After the last commit: `node scripts/check-house-style.mjs` (563 files clean), `node scripts/check-doc-examples.mjs`
(118 blocks compile), `node scripts/spec-revise.mjs --check` (clean), `pnpm typecheck` (passes), and vitest for
`PortConformance.test.ts` (core) and `Capture.test.ts` (devtools), 166 tests passing.

## Fixed Issues

### WR-01: Capture.test.ts shadows the imported `hostile` with a different, redundant fixture

**Files modified:** `packages/devtools/test/model/Capture.test.ts`
**Commit:** fcdc9f81
**Applied fix:** Deleted the test "a cause that cannot be stringified does not take the capture down" and its local
`hostile`. The next test runs the shared `hostile` and `hostileError` through the same `Broke`/placeholder assertion, and
`ThrownMessage.test.ts` pins the toString-only row, so nothing is left unpinned.

### IN-01: PortConformance.test.ts: a test subsumed by the one added directly below it

**Files modified:** `packages/core/test/PortConformance.test.ts`
**Commit:** 8bb2c90f
**Applied fix:** Deleted "is a placeholder for a value that cannot be rendered". The following test feeds `hostile` and
`hostileError` through the same `reasonFor` and asserts the same placeholder.

### IN-02: Capture's third read has no instantiation and no pin (necessity)

**Files modified:** `packages/devtools/src/model/Capture.ts`
**Commit:** 7e56ccaa
**Applied fix:** Kept the final arm (locked decision D-15). The `renderError` doc now says the third read exists for an
error class that sets its own `message`, that no shipped port error does (so it reads `""`), that a failure with no `cause`
and no `reason` records the empty string, and that a non-error value such as a plain object records what `thrownMessage`
makes of it (`"[object Object]"`). Comment only, no behaviour change. Status: fixed, requires human verification (necessity
finding; the doc claim about `"[object Object]"` was derived from `thrownMessage`'s `String` fallback, not run).

### IN-03: spec/behaviors/05-evaluator.md still says a custom predicate defect renders with `Cause.pretty`

**Files modified:** `spec/behaviors/05-evaluator.md`, `spec/README.md`
**Commit:** 2132f62b
**Applied fix:** BEH-QD-261 now names `causeMessage` (its `Cause.pretty` text, else the died value's own text). Bumped
`05-evaluator.md` 1.21 -> 1.22 with `scripts/spec-revise.mjs` (2026-11-22). CCR-QD-461's row in `spec/README.md` did not list
that document, so it now cites `spec/behaviors/05-evaluator.md` Rev 1.22 (BEH-QD-261 amended); README bumped 1.280 -> 1.281
through the same script and the row's own `spec/README.md` Rev updated to 1.281, so every cited revision equals its header.

---

_Fixed: 2026-11-22_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
