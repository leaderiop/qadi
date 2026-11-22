---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 06
subsystem: devtools
tags: [questions-view, join, failed-state, closed-union, gfed-05]
requires: ["56-05"]
provides:
  - QuestionsView.Failed{reason}, the fifth tag of the closed questions view
  - JoinInput.questionsFailed and the join's fixed order (questions read, failed, unsampled, absent)
  - the qadi-questions-failed paragraph in QuestionsPanel
affects: [56-07, 56-09, 56-10, 56-13]
actuals:
  tokens: 1800
  tasks: 2
  commits: 2
plan_head_before: b6fcc1155afcc8035608987fab4de8c20e2fcd35
plan_head_after: ba7101c0302328d192a99bba42cb1f22606cd0ff
tech-stack:
  added: []
  patterns: ["a failure view as a closed-union tag carrying only its reason, so no row can be claimed beside it"]
key-files:
  created: []
  modified:
    - packages/devtools/src/model/Gates.ts
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/Gates.test.ts
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
key-decisions:
  - "The join decides the questions view through one named function, questionsViewOf, in the stated order, instead of growing the nested ternary inside joinQuestions"
  - "DockModel states questionsFailed: undefined: no thunk failure reaches the model until 56-07 moves the thunk's read into the feed"
requirements-completed: [GFED-05, WX-04, WX-06]
duration: 6min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 06: The questions view states a thunk's failure

`QuestionsView` gains `Failed{reason}`, the join gains a `questionsFailed` input with a fixed precedence, and the panel gains one locked paragraph, so 56-07 only has to change where the join's inputs come from.

## RED

`pnpm exec vitest run --project devtools packages/devtools/test/model/Gates.test.ts packages/devtools/test/react/QuestionsPanel.gates.test.tsx` on the tree before `Gates.ts` changed:

```
Failed Tests 6
 FAIL test/model/Gates.test.ts > ... > a thunk's failure is stated when no questions are read, before unsampled and absent   (expected 'Absent' to equal 'Failed')
 FAIL test/model/Gates.test.ts > ... > questions read win over a thunk's failure                                           (expected 'Absent' to equal 'Failed')
 FAIL test/model/Gates.test.ts > ... > the two failures are independent                                                    (expected 'Absent' to equal 'Failed')
 FAIL test/react/QuestionsPanel.gates.test.tsx > questions that could not be read > questions that could not be read: the paragraph, alone, with the reason
 FAIL test/react/QuestionsPanel.gates.test.tsx > questions that could not be read > both failures are stated, the registry's first
 FAIL test/react/QuestionsPanel.gates.test.tsx > questions that could not be read > a reason is shown as text
 Tests  6 failed | 57 passed (63)
```

The three render cases fail because `QuestionsView.Failed` does not exist yet; the three join cases by assertion. Every existing case passed.

## Task Commits

1. Task 1 (RED): `999fa9bb` `test(56-06): the questions view states a thunk's failure, written RED` — `Gates.test.ts` and `QuestionsPanel.gates.test.tsx` alone.
2. Task 2 (GREEN): `ba7101c0` `feat(56-06): the questions view states a thunk's failure, as the gates view states the registry's` — `Gates.ts`, `QuestionsPanel.tsx`, `DockModel.ts`.

Both end with the trailer. `DockModel.ts` changed by +2 -0 (the key and its comment).

## Verification

- Whole devtools project with `--exclude '**/QuestionsPanel.thunk.test.tsx'` (RED by design until 56-07; nothing else excluded): 68 files, 1637 tests passed (1631 + the six new cases).
- `pnpm typecheck`, `pnpm lint` (`house-style: 555 file(s) clean (3 declared switch(es))`), `pnpm circular` exit 0.
- Both characterisations and the D-03 file have no commit since `phase_base` outside 56-02/56-03. `GatesView`, the registry sentence and the absent/empty copy are unchanged.
- Mutation was not run here: 56-09 checks that `Gates.ts`'s score does not fall.

## Deviations from Plan

**1. [Rule 1 - Bug] The plan's `questions read win over a thunk's failure` case passed on the unchanged tree**
- **Found during:** Task 1, first RED run.
- **Issue:** with only `questions: []` or one question plus `questionsFailed`, the current join ignores the new field and already answers `Empty`/`Rows`, so the case could not fail RED, which the task's verify requires ("a case that passes before the view exists pins nothing").
- **Fix:** the case first asserts the failure alone gives `Failed`, then that the questions win over it. This also pins the order (a join that put the failure first would fail the second pair).
- **Files modified:** `packages/devtools/test/model/Gates.test.ts`.
- **Committed in:** `999fa9bb`.

**2. [Rule 3 - Blocking] The src-diff pathspec in Task 1's precondition matches nothing as written**
- **Found during:** Task 1 start (the known defect from 56-04/56-05).
- **Issue:** `-- "packages/*/src"` matches no file below those directories, so the check is vacuous.
- **Fix:** I did not run the precondition as written; I checked the same fact with `':(glob)packages/*/src/**'`: before this plan the only src file changed since `phase_base` was `GatesFeed.ts` (56-05 records it), and after it the set is `DockModel.ts`, `Gates.ts`, `GatesFeed.ts`, `QuestionsPanel.tsx`. No gate, budget or test was weakened.

**Total deviations:** 2 (a case that could not be RED as drafted, and a vacuous verify pathspec). **Impact:** none on scope.

## Known Stubs

None. `questionsFailed: undefined` in `DockModel.ts` is a typed necessity, not a stub: the poll still owns the thunk until 56-07, which deletes `joinKeyNow`.

## Threat Flags

None. T-56-09 (reason as markup) is closed by the `a reason is shown as text` case; T-56-10 (a failure claiming rows) by `QuestionsView.Failed` carrying no rows and the `no qadi-question-block` assertion.

## Next

Ready for 56-07 (`DockModel.ts` composes the feed; `questions` becomes a dock input; the seam flips; `questions` leaves the poll).

## Self-Check: PASSED

- The five modified files exist; `999fa9bb` and `ba7101c0` are ancestors of HEAD, each ending with the trailer.
