---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
fixed_at: 2026-11-24T00:00:00Z
review_path: .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-REVIEW.md
iteration: 3
findings_in_scope: 2
fixed: 2
skipped: 0
status: all_fixed
---

# Phase QD-80: Code Review Fix Report

**Fixed at:** 2026-11-24
**Source review:** 80-REVIEW.md (iteration 3)
**Iteration:** 3

**Summary:**
- Findings in scope: 2 (scope all)
- Fixed: 2
- Skipped: 0

Verification ran in the main checkout (no worktree; sequential mode).

## Fixed Issues

### WR-01: ADR-QD-193 and BEH-QD-740 quote a test title that no longer exists

**Files modified:** `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md`,
`spec/behaviors/09-react.md`, `spec/README.md`
**Commit:** 82dbac3f
**Applied fix:** Both documents quote "a memoised consumer of the context does not render again when instrument is
toggled" and the render-count glosses are gone. A repo-wide `git grep` found no other spec, website, changeset or package
quote of the old title (the remaining hits are plan, summary, red-evidence and check-script text that record the
declared flip). ADR-QD-193 1.7 -> 1.8, 09-react 3.18 -> 3.19, README 1.382 -> 1.383; the CCR-QD-472 row reads
`Rev 1.383 (this row)` and cites ADR-QD-193 1.8 and 09-react 3.19.

### IN-01: The "a hover can arrive in `Idle` with the reveal armed" claim is not supported by React's flush order

**Files modified:** `spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md`,
`spec/behaviors/28-devtools-screens.md`, `spec/README.md`, `packages/devtools/src/model/LensSession.ts` (doc comments
only), `packages/devtools/test/model/LensSession.test.ts` (one comment line)
**Commit:** 55e84771
**Applied fix:** ADR-QD-193 decisions 2 and 8, BEH-QD-736 and BEH-QD-739 and the two `LensSession.ts` doc comments now say
that `hover` and `choose` from `Idle` are reached only headlessly, or by a script that dispatches a second event in the
click's task. The rule and its test line are kept. A stray test comment that repeated the old claim ("Idle between the
pick and the listeners coming off") was reworded; no assertion changed. ADR-QD-193 1.8 -> 1.9, 28-devtools-screens
1.65 -> 1.66, README 1.383 -> 1.384; the CCR-QD-472 row reads `Rev 1.384 (this row)` and cites ADR-QD-193 1.9 and
28-devtools-screens 1.66.

## Verification

`pnpm typecheck`, `node scripts/check-house-style.mjs` (604 files clean), `oxlint` on `LensSession.ts`,
`pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `80-check.mjs scan-forbidden`,
`80-pinned-check.mjs --all-applied` (4 of 4) and `80-characterisation-check.mjs --all-flipped` (4 of 4, 1 of 1) pass;
`LensSession.test.ts` 15 of 15. `80-check.mjs scan-ids` reports only the untracked `80-REVIEW.iter3.md` copy.

---

_Fixed: 2026-11-24_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 3_
