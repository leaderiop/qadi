---
phase: QD-42-a-seeded-question-builds-its-own-computing-atom
reviewed: 2026-11-14T20:20:00Z
depth: standard
iteration: 2
files_reviewed: 9
files_reviewed_list:
  - packages/react/src/SeededQuestion.ts
  - packages/react/src/HydrationEngine.ts
  - packages/react/src/QadiAtoms.ts
  - packages/react/test/SeededQuestion.test.ts
  - packages/react/test/QadiAtoms.test.ts
  - packages/react/test/HydrationEngine.test.ts
  - spec/decisions/093-a-decision-is-read-once.md
  - spec/decisions/041-a-mismatch-is-announced.md
  - spec/behaviors/19-hydration.md
findings:
  critical: 0
  warning: 0
  info: 1
  total: 1
status: issues_found
---

# Phase QD-42: Code Review Report (iteration 2)

**Reviewed:** 2026-11-14
**Depth:** standard
**Files Reviewed:** 9
**Status:** issues_found

## Summary

The four iteration-1 fixes are correct and complete. One typo remains, introduced by the IN-01 fix.

- **WR-01 (ccf659e6).** ADR-093, ADR-041 and BEH-QD-151 now carry dated amendments naming `SeededQuestion.ts`. The earlier text is kept as history, as the scope note requires.
  - The ADR-093 amendment says the budget is `DecisionOutcome.ts` 2 and `SeededQuestion.ts` 2. That matches `DECISION_READ_BUDGET` in `scripts/check-house-style.mjs`.
  - `SeededQuestion.ts` contains exactly one `isInitial` and one `isSuccess`, as the amendment says.
  - Revision and change-history rows were bumped. BEH-19 reads 1.21, with the 1.20 row already present.
  - A grep for stale `seededDecision`, `computedFor` and `HydrationEngine.ts` placement claims finds only history (ADR-155 context, ADR-041 and ADR-093 bodies) and the new amendments.
- **WR-02 (74067e6e).** The late-seed test now asserts `pairs.length > 0` and `Atom.isWritable(grantAtom)` before it sets the grant. It can no longer pass without delivering the late seed.
- **IN-01 (3dd1c88e).** `isMismatch` is no longer exported. Its only use is `SeededQuestion.ts:228`. The remaining grep hits are prose in `spec/`, `CHANGELOG.md` and a doc comment in `TraceDiff.ts`.
- **IN-02 (187354ea).** The test now imports `HydrationMismatch` from `DeveloperSignals.ts`, which declares it at line 51.

I checked the rest of the diff against `diff_base` 7e5dafdb (`QadiAtoms.ts`, `HydrationEngine.ts`, `QuestionBook.ts`, `HydrationEvent.ts`, `Hydration.ts`, `SeededDecision.ts`, the house-style budget and AGENTS.md). I found no new defects.

- The `HydrationEngine.ts` removals leave no unused imports.
- `SeededQuestion.ts` imports nothing from the engine or atom set, so no cycle forms.
- The move keeps the reader's first statement as `get.addFinalizer(live())`.

Checks run:

- `vitest --project react` on `SeededQuestion`, `QadiAtoms` and `HydrationEngine`: 56 passed.
- `node scripts/check-house-style.mjs`: clean, 505 files.

## Info

### IN-01: Missing space after `=` in `isMismatch`, introduced by the IN-01 fix

**File:** `packages/react/src/SeededQuestion.ts:50`
**Issue:** The fix to drop `export` also deleted the space before the parenthesis. The line reads `const isMismatch =(seeded: SeededDecision, decided: Decision): boolean =>`. Every other declaration in the file, and the original `export const isMismatch = (…`, has the space. This is a typo in code added by the fix, not a style preference. `oxfmt` is not a gate (AGENTS.md §17), so nothing catches it.
**Fix:**
```ts
const isMismatch = (seeded: SeededDecision, decided: Decision): boolean =>
  permits(seeded) !== isAllowed(decided);
```

---

_Reviewed: 2026-11-14_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
