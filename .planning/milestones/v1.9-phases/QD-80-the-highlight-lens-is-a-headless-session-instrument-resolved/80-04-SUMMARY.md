---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 04
subsystem: devtools-lens-regressions
tags: [red-tests, lens, listeners, strictmode, pinned-check]
requires: [80-03]
provides:
  - Lens.dock.test.tsx, two regressions through the dock, red on the phase base
  - 80-pinned-check.mjs, the hold on the existing panel and lens tests with three declared edits
affects: [80-05, 80-07, 80-12]
key-files:
  created:
    - packages/devtools/test/react/Lens.dock.test.tsx
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-pinned-check.mjs
  modified:
    - .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-RED-EVIDENCE.md
key-decisions:
  - "The unreadable-lens declared edit is the object wrapped over three lines (questions member, then lens), not one 113-column line, to keep the house wrap; 80-07 applies it text for text"
  - "The pinned check reads phase_base by running `80-check.mjs base`, so the two checks cannot disagree on the base"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 5ed6442d56870bb115b480286c0b03503154850f
plan_head_after: 8c5477f25797dcfe18088222022f507f808468ec
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
coverage:
  - deliverable: "both regressions red on the phase base, each on its own assertion, committed before any source change"
    verification:
      - kind: command
        ref: "the plan's Task 1 verify one-liner (2 total, 2 failed; seen-failing, commit and unchanged checks)"
        status: pass
    human_judgment: false
  - deliverable: "the pinned check holds four files, three declared edits, seen failing once"
    verification:
      - kind: command
        ref: "the plan's Task 2 verify one-liner"
        status: pass
    human_judgment: false
---

# Phase QD-80 Plan 04: the adapter regressions and the pinned check Summary

Two regressions through `DevtoolsDock`, red on the phase base with no source change, and `80-pinned-check.mjs`, which
holds the existing panel and lens tests to the base with only three declared edits above the lens cells.

## Commits

- `91de12e8` test(80-04): pin the lens listener and reveal regressions (`Lens.dock.test.tsx`, the evidence)
- `8c5477f2` chore(80-04): hold the panel and lens tests to the phase base (`80-pinned-check.mjs`, the evidence)

## The red cells, and how each fails on the base

Base `55c79a96db057952465918e410c529b85dc3e4e7`; each title has a `- failed:` line in `80-RED-EVIDENCE.md`.

- "entering picking adds three document listeners, and a change in the listed guards while picking adds none":
  entering picking passes (click, keydown, pointermove added once, none removed); after a guard is added the added types
  are six (`added again by the change: expected [ 'click', 'click', 'keydown', …(3) ] to deeply equal [ 'click',
  'keydown', 'pointermove' ]`). That is the listener churn of the `[picking, instances]` effect. Spies on
  `document.addEventListener`/`removeEventListener` are restored by `vi.restoreAllMocks()` in `afterEach`.
- "under StrictMode a pick reveals its row once, and after a switch to the log and back the row is still marked with no
  second reveal": the pick marks one row and reveals once, then `the row still marked on the return: expected +0 to equal
  1`, the pick lost on the tab round trip.

## The pinned check

`80-pinned-check.mjs` holds `Lens.test.ts`, `QuestionsPanel.test.tsx` and `VerdictTreatment.test.tsx` byte for byte and
`QuestionsPanel.gates.test.tsx` with three declared edits (`import-lens`, `unreadable-lens`, `failed-questions-lens`),
all above `describe("highlight — the panel points at the page", …)`, which `heldFrom` names. Modes:

- default: prints `pinned: 4 files hold their base text, 0 of 3 declared edits applied` (measured now);
- `--all-applied`: also requires all three edits (on the base it fails: `0 of 3 declared edits are applied, not all`);
- `--self-test`: `self-test: 7 passed` (equal; edit applied; held byte changed names the file and line; change beside an
  applied edit; edit lying in the held region refused; edit not found once refused; one missing is not all).

Seen failing once: one assertion in a lens cell of the gates test turned into `notStrictEqual` in a `cp`-backed copy →
`packages/devtools/test/react/QuestionsPanel.gates.test.tsx: differs from its base text at line 223`; restored with
`cp`, `git status --short -- packages` printed nothing. oxlint is clean. The Phase 79 `79-pinned-check.mjs` (15 tests)
and `79-characterisation-check.mjs`, and the 80-02/80-03 characterisation check (0 of 4, 0 of 1 flips) still pass.

## Deviations from Plan

None in what was executed. Two choices recorded: the `unreadable-lens` after text is wrapped over three lines (see
key-decisions), and the `- base:` line of this plan's evidence is `phase_base` as the plan states (the 80-02 and 80-03
sections name their own first commits).

## For the next plans

- 80-07 applies the three edits text for text: after line 18 add `import { makeLensSession } from
  "../../src/model/LensSession.ts";`; `unreadable` becomes the three-line object with `lens: makeLensSession(),`; the
  `failedQuestions` render gets `        lens={makeLensSession()}` after its `questions` prop. Then
  `node <D>80-pinned-check.mjs --all-applied` passes. Nothing under the `highlight` describe may change.
- `Lens.dock.test.tsx` must turn green with exactly three adds on entering picking and none on a guard change (so the
  adapter's listener effect cannot depend on the guard list), and the StrictMode cell needs the pick kept across a tab
  switch with one reveal (the one-shot `takeReveal`). Run it by name only while it is red.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND: packages/devtools/test/react/Lens.dock.test.tsx
- FOUND: .planning/phases/QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved/80-pinned-check.mjs
- FOUND: 91de12e8, 8c5477f2 (ancestors of HEAD)
