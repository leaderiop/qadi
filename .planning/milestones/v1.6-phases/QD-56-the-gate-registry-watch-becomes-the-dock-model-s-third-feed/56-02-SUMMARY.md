---
phase: QD-56-the-gate-registry-watch-becomes-the-dock-model-s-third-feed
plan: 02
subsystem: devtools
tags: [characterisation, questions-panel, golden, seam, gate-registry]
requires: ["56-01"]
provides:
  - questionsProp.ts, the one input seam for the questions thunk
  - QuestionsPanel.feed.characterisation.test.tsx, eighteen byte-for-byte cells written on the phase base
affects: [56-03, 56-07, 56-13]
actuals:
  tokens: 20200
  tasks: 2
  commits: 2
plan_head_before: 23dc31bc9802aaa421670055f0e81a626165330b
plan_head_after: eb4990e571fd7942e9e746b04d0e739f641cddd5
tech-stack:
  added: []
  patterns: ["goldens captured by running each cell on the base, capture done from a throwaway copy of the file that was deleted before the commit"]
key-files:
  created:
    - packages/devtools/test/react/questionsProp.ts
    - packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx
  modified: []
key-decisions:
  - "The two Stopped cells empty `qadi-diagnostics-reason`, not `qadi-diagnostics-region`: the stack trace lives in the notice's reason block, and the region is already empty"
requirements-completed: [GFED-04, WX-06]
duration: 3min
completed: 2026-11-18
status: complete
---

# Phase QD-56 Plan 02: The questions panel pinned on the base

Eighteen whole-`outerHTML` cells for the questions panel, driven through the public dock and written on the phase base, with the questions thunk reaching the dock only through one seam (`questionsProp`) that 56-07 will flip.

## What was built

- `packages/devtools/test/react/questionsProp.ts`: `questionsProp(props, questions)`, whose parameter type requires `diagnostics`; base body `{ ...props, diagnostics: { ...props.diagnostics, questions } }`.
- `packages/devtools/test/react/QuestionsPanel.feed.characterisation.test.tsx`: 18 cells, one `it` per `GOLDEN` key.
  - Task 1 (cells 1 to 10): thunk rows, empty list, poll starting with and without a thunk, no thunk on a live poll, stopped before and after a sample, a supplied list over the thunk, a thunk swapped and removed by a re-render.
  - Task 2 (cells 11 to 18): `instances` throwing at build and after mount, a silent mend read by a re-render, an announced mend, `subscribe` throwing at build and a re-render that subscribes again, a swapped registry, an undescribable throw.

## Counts vitest reports

Run with the existing `QuestionsPanel.characterisation.test.tsx` (12 cells, unedited), twice after each task, green every time.

| After | New file | Both files |
|---|---|---|
| Task 1 | 10 | 22 |
| Task 2 | 18 | 30 |

## Cells whose markup surprised

None surprised, and every cell was stable across two captures. Cell 17 (a swapped registry) holds one `qadi-question-unmounted`: registry B (`b`, `c`) has no guard for the unscoped `doc:read` question, which is the re-join to the new registry the cell is meant to show. Cells 13, 14 and 16 end identical (`qadi-pick`, two highlights, one unmounted), as expected for a mended registry over the same three guards.

## Task Commits

1. Task 1: `9270c5f2` `test(56-02): the questions panel's thunk and poll states, pinned on the base through one seam` (questionsProp.ts, the characterisation, cells 1 to 10).
2. Task 2: `eb4990e5` `test(56-02): the questions panel's registry failures, mends and swaps, pinned on the base` (the characterisation only, 132 insertions, 0 deletions).

## Deviations from Plan

**1. [Rule 1 - Bug] The Stopped cells empty the reason, not the region**
- **Found during:** Task 1, cells 6 and 7.
- **Issue:** the plan says to blank `qadi-diagnostics-region`, but that element is already empty in a stopped panel. The stack trace (checkout paths and the test file's own line number) sits in `qadi-diagnostics-reason`, a `<pre>` in `qadi-diagnostics-notice`; with only the region blanked, the golden named the throwaway capture file and failed when the real file ran.
- **Fix:** `withoutReason()` empties `qadi-diagnostics-reason` on the clone. The golden still ends the region as `data-testid="qadi-diagnostics-region"></div>`, which the plan's check reads. The header comment says what is emptied.
- **Files modified:** QuestionsPanel.feed.characterisation.test.tsx (before its first commit).
- **Commit:** `9270c5f2`.

**2. [Rule 3 - Blocking] The plan's "capture code remains" check matches golden text**
- **Found during:** Task 1, verify 2 (and Task 2, verify 2).
- **Issue:** `/console\.|writeFileSync|process\./` runs on the whole file, and the panel's own hydration sentence ("... no seeding counted in this process.") is inside seven goldens, so the check fails on correct goldens.
- **Fix:** nothing weakened in the file. The same check was run with the regex confined to the text outside the `GOLDEN` literal (everything else of the plan's verifies ran verbatim). No capture code exists: the capture ran from a throwaway sibling file, deleted before each commit.
- **Commit:** none (verification only). 56-13's phase scan should apply the same scoping if it repeats that regex on this file.

**Total deviations:** 2 auto-fixed (1 bug in the plan's description, 1 over-broad verify). **Impact:** none on scope; no src file, existing test, budget or gate touched.

## Verification

- Task 1: vitest green twice; verify 2 green (regex scoped, deviation 2); verify 3 prints `1 test(56-02) commit(s), no src change`.
- Task 2: vitest green twice; verify 2 green (same scoping); verify 3 prints `two test(56-02) commits, additive, no src change`.
- `pnpm lint` clean for both files (`house-style: 551 file(s) clean`), `/usr/bin/grep -nE '\bas\s+[A-Za-z_$([{]'` finds only `import * as`; `pnpm typecheck` exits 0.
- `QuestionsPanel.characterisation.test.tsx` unedited; no change under `packages/*/src`.

## Known Stubs

None.

## Next

Ready for 56-03 (the D-03 RED test).

## Self-Check: PASSED

- `questionsProp.ts` and `QuestionsPanel.feed.characterisation.test.tsx` exist; `9270c5f2` and `eb4990e5` are ancestors of HEAD.
- Both `test(56-02)` commits end with the trailer; `git diff <phase_base> HEAD -- packages/*/src` is empty.
