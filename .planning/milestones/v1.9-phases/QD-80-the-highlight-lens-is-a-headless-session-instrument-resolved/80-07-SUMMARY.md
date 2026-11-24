---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 07
subsystem: devtools-react-adapter
tags: [lens, useLens, questions-panel, document-adapter, characterisation-flips]
requires: [80-05, 80-06]
provides:
  - "useLens(lens, questions): void, the document adapter over the lens session, with no React state"
  - "QuestionsPanel's required lens prop, the dock passing the model's lens, the seam handing a fresh one"
affects: [80-08, 80-09, 80-10, 80-12]
key-files:
  modified:
    - packages/devtools/src/react/useLens.ts
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/react/questionsPanelInput.ts
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
    - packages/devtools/test/react/Lens.dock.characterisation.test.tsx
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "InstanceRow reveals only when session.takeReveal(instance.id) is true, so the held no-reveal-on-return line holds without an edit (decided autonomously)"
  - "highlighted is widened with a type annotation to ReadonlyArray<string>, not a cast, because includes on the readonly-empty-tuple arm of the snapshot is typed never"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 1
plan_head_before: dda25cffb300551b74b2811b3d10f872416515c0
plan_head_after: 36d087f73728d25145f83647fc3d30ff2515b9f2
actuals:
  tokens: 9000
  tasks: 2
  commits: 1
---

# Phase QD-80 Plan 07: useLens is the document adapter over the lens session Summary

`useLens` now reads the model's lens and the questions store and forwards what the document does; the rules are the
session's. The panel takes the lens as a required prop, the dock passes the model's, and the pick survives a tab round
trip with one reveal.

## Commit

- `36d087f7` feat(80-07): useLens is the document adapter over the lens session

## The adapter

`useLens(lens: LensSession, questions: ReadableStore<QuestionsSnapshot>): void`, no `useState`/`useCallback`. Three effects:

1. draw, deps `[highlighted, instances]`: clears when nothing is highlighted and in its cleanup.
2. listeners, deps `[picking, lens, questions]`: returns early unless picking; adds `pointermove`
   (`lens.hover`), a capture `click` (`if (lens.choose(guardAt(event))) { preventDefault; stopPropagation }`) and
   `keydown` (`Escape` calls `lens.cancel()`); handlers read `questions.getSnapshot().instances` at event time; the cleanup
   removes the same three.
3. exit, deps `[lens]`: cleanup calls `lens.cancel()`.

## Panel, dock, seam

- `QuestionsPanelProps.lens: LensSession` (required); `type Lens = ReturnType<typeof useLens>` is gone, replaced by a local
  `LensView { session, snapshot }`. `PickButton` uses `isPicking` and `session.toggle`; `Question` calls
  `session.highlight`; `InstanceRow` marks by `pickedOf(snapshot) === instance.id` and reveals only when
  `session.takeReveal(instance.id)`. Markup, copy, test ids and styles unchanged.
- `DevtoolsDock` passes `lens={props.model.lens}`; `questionsPanelInput` returns `{ questions, lens }` with a fresh
  `makeLensSession()` unless one is passed.

## Seen-failing evidence (80-RED-EVIDENCE.md, `## 80-07 the adapter`)

The characterisation, unflipped on the changed code: 3 failed, 7 passed (four flips sit on three titles):

- a pick, then a switch to the log and back
- the highlight button pressed while picking
- two pointer moves over one guard while picking

The held `scrolls() === 1` line and every other cell still passed.

## Flips and edits applied

- `80-characterisation-check.mjs flip packages/devtools/test/react/Lens.dock.characterisation.test.tsx` applied all four.
  `80-characterisation-check.mjs` prints `Lens.dock.characterisation.test.tsx ... 4 of 4 flips applied`; the react file is
  `0 of 1 flips applied` (80-08).
- Three declared panel edits applied text for text (a scratch node script using the strings of `80-pinned-check.mjs`);
  `80-pinned-check.mjs --all-applied`: `4 files hold their base text, 3 of 3 declared edits applied`.
- Phase 79's `79-pinned-check.mjs` and `79-characterisation-check.mjs` still pass.

## Verification

- Full devtools project: 1897 tests, 1897 passed, 0 failed (the two `Lens.dock.test.tsx` cells are green).
- `pnpm typecheck` clean; `scripts/check-house-style.mjs`: 602 files clean (3 declared switches, 76 type-test files);
  `oxlint packages/devtools/src/react` exit 0; `80-check.mjs scan-forbidden`, `scan-ids`, `commit`, `trailers` pass.

## Deviations from Plan

None. One typing note: `highlighted` is annotated `ReadonlyArray<string>` (a widening assignment, no `as`) because
`readonly [].includes` takes `never`.

## Known Stubs

None.

## Self-Check: PASSED

Commit `36d087f7` exists on `arch-wave-14` and holds exactly the seven planned files.
