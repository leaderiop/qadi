---
phase: QD-84-useconfigured-requires-configure-and-the-review-s-small-fin
plan: 03
subsystem: devtools
tags: [characterisation, lens, red-evidence]
requires: ["84-02"]
provides:
  - "Lens.questions.characterisation.test.tsx: LQ1 to LQ4, the lens through the panel over a questions store that republishes, held from its commit"
  - "the arm-before-publish pin seen failing on the base under an arm-after-publish swap"
affects: [84-07, 84-08]
key-files:
  created:
    - packages/devtools/test/react/Lens.questions.characterisation.test.tsx
  modified:
    - .planning/phases/QD-84-useconfigured-requires-configure-and-the-review-s-small-fin/84-RED-EVIDENCE.md
status: complete
completed: 2026-11-25
commits: 2
plan_head_before: 3fa8957b2c6dae6c98b152f42ddabd301fe9a540
plan_head_after: 92832d5f98bb45ea04dd0b4d23af57b1f5bf2ba2
actuals:
  tokens: 14000
  tasks: 3
  commits: 2
requirements-completed: []
---

# Phase QD-84 Plan 03: The lens over the questions store, characterised Summary

Four rows pin what the lens does over a republishing questions store, through `QuestionsPanel` whose props do not change;
each was seen failing under a recorded, reverted scratch edit of `useLens.ts`, and the arm-before-publish pin was seen
failing on the base. No source file changed.

## What was built

- `Lens.questions.characterisation.test.tsx` (4 tests, green on the base): the Range stubbed per `startContainer` so the
  overlay's `top` names the drawn element; the store is `makeExternalStore(joinQuestions(...))`, republished with `set`.
  LQ1 highlight follows a republished guard; LQ2 pointer move and click resolve against the store's current list; LQ3 a
  dropped guard leaves no overlay; LQ4 one subscription to the lens and one to the store across the publishes, none after
  unmount.
- Held by `84-pinned-check.mjs` from its commit: `1 of 3 born files held`.

## Seen failing (84-RED-EVIDENCE.md)

- `stale-draw` (draw effect keyed `[highlighted]`): LQ1 `moved to the element the store now lists: expected [ '100' ] to deeply equal [ '300' ]`; LQ3 `gone once the store lists no guard: expected [ 'g1' ] to deeply equal []`
- `captured-guards` (handlers read the `instances` argument): LQ2 `the guard registered while picking is hovered: expected [] to deeply equal [ 'g2' ]`
- `second-subscription` (a second `useStoreSnapshot(questions)`): LQ4 `after mount: expected [ 1, 2 ] to deeply equal [ 1, 1 ]`
- `arm-after-publish` (publish before the arming in `choose`, on the base): `a listener told of a pick can take its reveal`, `expected [ false ] to deeply equal [ true ]` (1 failed, 14 passed)

Each scratch edit was restored with `cp` (or `git checkout` for `LensSession.ts`) and `git diff --quiet HEAD -- packages scripts spec` / `git status --porcelain` checked afterwards.

## Commits

- b625c7d1: test(84-03): characterise the lens over the questions store
- 92832d5f: docs(84-03): the arm-before-publish pin seen failing on the base

## Deviations from Plan

- The plan's interface notes cite `Lens.adapter.test.tsx` line numbers (25-31, 33-37, 42-49, 58-62, 64-68, 138-180); the file's
  lines are 27-39, 42-58, 60-64, 66-70, 137-181. The helpers were copied by shape, not by line. No effect.
- LQ2 reads "picking ended" through `isPicking(lens.getSnapshot())` (the snapshot has no `mode` field); the first draft
  with `.mode` failed to compile and was fixed before the first run counted.

## Known Stubs

None.

## Self-Check: PASSED

- FOUND: the characterisation file, 4 tests green; `84-check.mjs` `seen-failing`, `scan-ids`, `scan-forbidden`, `commit` x2 and `trailers` pass.
- FOUND: b625c7d1 and 92832d5f on `arch-wave-15`; `packages/devtools/src` equals `phase_base`; tsc and oxlint clean; `check-house-style` clean.
