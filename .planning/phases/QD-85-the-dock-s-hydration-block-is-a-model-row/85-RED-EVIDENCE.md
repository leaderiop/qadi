# Phase 85 RED evidence

Every line below was written when the check it names was seen failing. A line is one of `- failed: <title>` (a test or
cell seen failing under a scratch edit), `- failed (<tag>): <title>` (the same, with the kind of edit in the tag),
`- red on the base: <title>` (a test red on the unchanged base, before the change that turns it green), or `- check
failed: <mode>: <first stderr line>` (a phase script's mode seen refusing); the rest of a run's stderr, when kept, is
indented under its line. A scratch edit is restored from a copy before anything is committed.

## 85-01 the hydration cells

Each cell was seen failing under one scratch edit of `packages/devtools/src/react/QuestionsPanel.tsx` (H13: of
`Diagnostics.ts`) that changes only what it pins; the edit follows its cell, and the other cells the same edit also
moved are not listed.

- failed: H1 rechecked 1, mismatched 1: the singular rate
  (scratch edit: the rate's singular rule dropped (always the plural s); 1 cell(s) failed under it)
- failed: H2 rechecked 4, mismatched 1: the plural rate
  (scratch edit: the rate's plural s dropped; 10 cell(s) failed under it)
- failed: H3 rechecked 0 with seeded 3: no rate
  (scratch edit: the rate rendered at rechecked 0; 2 cell(s) failed under it)
- failed: H4 dehydrated equals seeded: 0 dehydrated entries
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H5 a shortfall of 1: 1 dehydrated entry
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H6 a shortfall of 6: 6 dehydrated entries
  (scratch edit: the y/ies rule swapped; 12 cell(s) failed under it)
- failed: H7 seeded more than dehydrated: a client reading payloads
  (scratch edit: the seeded-more sentence shortened; 1 cell(s) failed under it)
- failed: H8 a raised drop beside a zero one: one row, no all-clear
  (scratch edit: zero drops no longer filtered out; 1 cell(s) failed under it)
- failed: H9 a foreign reason holding markup is text
  (scratch edit: the drop reason rendered inside a code element; 2 cell(s) failed under it)
- failed: H10 no drops, all counts zero: All 0 reasons
  (scratch edit: the all-reasons count printed as a fixed 9; 11 cell(s) failed under it)
- failed: H11 supplied counts while the poll is Starting
  (scratch edit: a Starting or unsampled status wins over supplied counts; 2 cell(s) failed under it)
- failed: H12 supplied counts while the poll stopped unsampled
  (scratch edit: a Starting or unsampled status wins over supplied counts; 2 cell(s) failed under it)
- failed: H13 supplied counts win over a live poll's
  (scratch edit: the sampled counts win over the supplied ones (scratch edit of Diagnostics.ts mergeReading, where the panel's one reading is merged; the panel is handed that single reading); 1 cell(s) failed under it)
