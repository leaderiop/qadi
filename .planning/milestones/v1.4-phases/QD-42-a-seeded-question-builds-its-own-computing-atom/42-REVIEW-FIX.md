---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
fixed_at: 2026-11-14T20:10:00Z
review_path: .planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-REVIEW.md
iteration: 1
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase QD-42: Code Review Fix Report

**Fixed at:** 2026-11-14
**Source review:** .planning/phases/QD-42-a-seeded-question-builds-its-own-computing-atom/42-REVIEW.md
**Iteration:** 1

**Summary:**
- Findings in scope: 4
- Fixed: 4
- Skipped: 0

Verification ran in the main checkout (`workflow.use_worktrees` is `false`, so no worktree was created).

## Fixed Issues

### WR-01: Normative spec still places `makeSeededQuestion` and the `announced` guard in `HydrationEngine.ts`

**Files modified:** `spec/decisions/093-a-decision-is-read-once.md`, `spec/decisions/041-a-mismatch-is-announced.md`, `spec/behaviors/19-hydration.md`
**Commit:** ccf659e6
**Applied fix:** Change history was not rewritten. Only Document Control (revision and history row) changed above the new text.
- ADR-QD-093: appended a dated amendment section. It says the seed precedence and its `DECISION_READ_BUDGET` key are now `SeededQuestion.ts` 2 (`makeSeededQuestion`), alongside `DecisionOutcome.ts` 2. Revision 1.0 to 1.1.
- BEH-QD-151: added a `> **Amended 2026-11-14 (CCR-QD-433).**` blockquote directly after the 2026-11-12 one. Revision 1.20 to 1.21.
- ADR-QD-149:43: no change needed. Its existing 2026-11-14 amendment already says to read `SeededQuestion.ts`.
- ADR-QD-041:61 (found by the grep): "a closure flag in `seededDecision`" is a live line, and `seededDecision` is deleted. Added a dated amendment section. Revision 1.4 to 1.5.
- Left as history: ADR-039:96 and ADR-052:134 (both `>` blockquotes) and ADR-155's context prose.
- `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` pass (21 PASS, 0 FAIL).

### WR-02: The late-seed test can pass without ever delivering the late seed

**Files modified:** `packages/react/test/QadiAtoms.test.ts`
**Commit:** 74067e6e
**Applied fix:** The test now asserts `pairs.length > 0` and, for each pair, `Atom.isWritable(grantAtom)` is `true` before the set. `QadiAtoms.test.ts` and `SeededQuestion.test.ts` pass (44 tests).

### IN-01: `isMismatch` exported with no consumer

**Files modified:** `packages/react/src/SeededQuestion.ts`
**Commit:** 3dd1c88e
**Applied fix:** Dropped `export` from `isMismatch`. It is still used in-file at line 228 and has no importer in `packages`, `features` or `examples`. `pnpm spec:api` stays at 927 exports and `node scripts/check-house-style.mjs` is clean.

### IN-02: Test imports `HydrationMismatch` from `HydrationEngine.ts`

**Files modified:** `packages/react/test/SeededQuestion.test.ts`
**Commit:** 187354ea
**Applied fix:** `import type { HydrationMismatch } from "../src/DeveloperSignals.ts"`.

## Final checks (repo root)

- `pnpm typecheck`: clean.
- `pnpm circular`: no circular dependency.
- `pnpm exec vitest run --project react`: 510 tests passed.

---

_Fixed: 2026-11-14_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 1_
