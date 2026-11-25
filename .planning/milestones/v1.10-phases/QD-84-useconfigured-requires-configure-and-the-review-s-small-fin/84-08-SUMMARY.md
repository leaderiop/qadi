---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 08
subsystem: devtools
tags: [lens, adapter, questions-store, spec]
requires: ["84-07"]
provides:
  - "useLens(lens, questions): UseLens, subscribing the questions store then the lens and returning both snapshots"
  - "the panel's one useLens call; the UseLens refusals under both entries"
  - "ADR-QD-193's amendment, BEH-QD-737, INV-QD-406, the adapter row, CCR-QD-476 begun"
affects: [84-09, 84-10, 84-11]
key-files:
  modified:
    - packages/devtools/src/react/useLens.ts
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/test/react/Lens.adapter.test.tsx
    - packages/devtools/test/surface.tst.ts
    - spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 1
plan_head_before: 99282a8d
plan_head_after: fde3a1d6
actuals:
  tokens: 6000
  tasks: 3
  commits: 1
requirements-completed: []
---

# Phase QD-84 Plan 08: the lens adapter takes the session and the questions store Summary

`useLens(lens, questions)` subscribes the questions store first and the lens second, holds no ref, draws over the guards
its own subscription read, keeps its handlers reading `questions.getSnapshot().instances` at event time, and returns
`{ lens, questions }` (`UseLens`, out of both barrels). `QuestionsPanel` makes the one call and no longer subscribes
to the questions store itself.

## Seen failing (84-RED-EVIDENCE.md)

Under a scratch `export type { UseLens }` added to each barrel (restored with `cp`, barrels equal HEAD), `surface.tst.ts`
failed both new refusals with `Unused '@ts-expect-error' directive. ts(2578)` (`refusal UseLens`, `refusal ReactUseLens`).

## Checks

Ten lens and panel test files green (117 tests); whole devtools project 94 files, 1966 tests green; `pnpm typecheck`
clean; `pnpm test:tstyche` both passes green (422 tests); `check-doc-examples` 119 blocks compile; house style clean;
oxlint clean on the changed files; strict traceability PASS 21, FAIL 0; `spec-revise --check` passes; `one-path`,
`records`, `scan-ids`, `scan-forbidden` pass; `84-pinned-check.mjs` reports 2 of 2 declared edits and 4 of 8 refusals;
`84-check.mjs commit` and `trailers` pass after the commit.

## Commits

- fde3a1d6: refactor(84-08): useLens takes the session and the questions store and returns both snapshots

## Deviations from Plan

- The Task 3 verify's `84-check.mjs commit` step ran after a manual `git add` and `git commit`, since that mode judges an
  existing commit; every other check ran before it. The clean-tree check passed after the commit.

## Known Stubs

None.
