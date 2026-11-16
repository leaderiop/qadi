---
phase: QD-49-gates-as-the-dock-model-s-eighth-store-one-gate-state-vocabulary
plan: 02
subsystem: devtools
tags: [characterisation, golden-markup, test-seam]
phase_base: 76330fbd24b7aadcfc65bc78e5053f9690cc6227
plan_head_before: 93559fd4bb43fd5c88d342c232497f8135b1f792
plan_head_after: a5cb2a10dba87905539ae4a46e7c11699f46c252
commits: 3
requires: [49-01]
provides:
  - "QuestionsPanel.characterisation.test.tsx: twelve byte-exact cells of the Questions panel through the public DevtoolsDock, captured twice on the phase base"
  - "gatesProp: the characterisation's one input seam (identity on the base)"
  - "panelInput: the three existing panel tests' one input seam (identity on the base)"
affects: [49-05, 49-09]
key-files:
  created:
    - packages/devtools/test/react/gatesProp.ts
    - packages/devtools/test/react/QuestionsPanel.characterisation.test.tsx
    - packages/devtools/test/react/questionsPanelInput.ts
  modified:
    - packages/devtools/test/react/QuestionsPanel.gates.test.tsx
    - packages/devtools/test/react/QuestionsPanel.test.tsx
    - packages/devtools/test/react/VerdictTreatment.test.tsx
key-decisions:
  - "The characterisation hands guards through `gatesProp` in a `panelMarkup(props, guards?)` helper, so a dock given no `gates` stays distinct from one given an empty list and 49-05 flips one line"
metrics:
  tasks: 3
  files: 6
actuals:
  tokens: 15000
  tasks: 3
  commits: 3
status: complete
---

# Phase QD-49 Plan 02: Characterisation of the Questions panel Summary

Twelve byte-exact cells of the Questions panel's markup, rendered through the public `DevtoolsDock` and captured on the untouched phase base, plus one input seam for the characterisation (`gatesProp`) and one for the three existing panel tests (`panelInput`), so 49-05 changes inputs and nothing else.

## Characterisation

Every literal is the whole `outerHTML` of the `qadi-questions` root after opening the React tab. Each was captured on the base (no `packages/*/src` file touched at any point), twice, into two scratch JSON files; `cmp` printed nothing, so the two captures were byte-identical. The capture scaffolding (the `node:fs` write, an `afterAll`) lived in an untracked copy of the test and was deleted before any commit.

| # | Cell | Literal length (chars) |
|---|------|------------------------|
| 1 | absent gates | 1600 (equals RESEARCH Q5's base capture) |
| 2 | empty gates | 1556 |
| 3 | two guards one row | 2828 |
| 4 | deny vs failure | 2824 |
| 5 | asked but unmounted | 2918 |
| 6 | unrecognised and toString | 3208 |
| 7 | highlight 1 and a hook | 2966 |
| 8 | only hooks (disabled title) | 3193 |
| 9 | questions absent, gates absent | 1322 |
| 10 | questions absent, unsampled | 1531 |
| 11 | questions empty | 1495 |
| 12 | scoped and unscoped | 4030 |

- The gates-absent sentence `No live guards were handed to the dock. Pass gates — usually useGateInstances(), or atoms.gates.instances() — to list who is asking.` appears in exactly two literals (`absent gates`, `questions absent, gates absent`): the two cells D-12a changes in 49-05. The em dashes are the characters themselves; no `\u` escape is used.
- `unrecognised and toString` pins `Suspended` and `toString` each rendered as itself with `data-treatment="Unrecognised"`, in registry order, with `highlight 0` disabled and its `title`.
- `questions absent, unsampled` uses a diagnostics layer that never builds (`Layer.effectDiscard(Effect.never)`, status `Starting`): the questions block renders nothing and the pick button shows.
- The file imports `DevtoolsDock` from `src/react/index.ts`, `gatesProp`, and `@qadi/core` builders; it names nothing under `src/model/` and none of `displayOfGateState`, `joinQuestions`, `gateGroups`, `instancesAsking`, `GATE_STATES`.

## Routing

`panelInput` takes `{ questions, gates? }` and returns `{ questions, gates }` on the base. 39 `QuestionsPanel` renders now spread it: 21 in `QuestionsPanel.gates.test.tsx`, 17 in `QuestionsPanel.test.tsx`, 1 in `VerdictTreatment.test.tsx`. None passes `questions=` or `gates=` directly. No line holding `assert`, `expect(`, `it(` or `describe(` changed. The four panel/characterisation files pass: 58 tests.

## Commits

| Task | Commit | Files |
|------|--------|-------|
| 1 | `79a18dd5` (absent-gates cell, through the dock) | `gatesProp.ts`, `QuestionsPanel.characterisation.test.tsx` |
| 2 | `e4a5359d` (twelve cells, pinned on the base) | `QuestionsPanel.characterisation.test.tsx` |
| 3 | `a5cb2a10` (panel tests read input through one seam) | `questionsPanelInput.ts`, the three panel test files |

## Verification

- `pnpm check:pr < /dev/null`: exit 0, "ran 16 of 17 steps; `pnpm mutation` was skipped (release PRs run it)", ending at `spec:publish` (9 packages and 6 documents agree on 0.12.0).
- `git diff 76330fbd -- 'packages/*/src' scripts/check-house-style.mjs` is empty; the only non-`.planning` files changed since `phase_base` are the six test files above.
- Each task's two automated verifies exit 0.

## Deviations from Plan

**1. [Rule 3 - Blocking] A comment named `QuestionsPanel.tsx`.** The characterisation's first doc comment named the panel file, which Task 1's own verify refuses (the file must name nothing under change). Reworded to "the panel and the dock's React files" and the Task 1 commit amended before moving on. No behaviour change.

**2. Helper shape.** The plan's `gates: gatesProp(...)` per cell is a `panelMarkup(props, guards?)` helper that calls `gatesProp(guards)` only when guards are given, so "no `gates` prop" and "empty `gates`" stay distinct inputs. Tasks' `gatesProp(` check is satisfied.

**3. Requirements not marked complete.** The plan's frontmatter lists GATE-02, GATE-03, GATE-05 and WX-06; `requirements.mark-complete` ticked GATE-02/03/05, which this plan only pins by characterisation (the registry is not yet a dock-model store and the vocabulary is not yet one). I reverted the REQUIREMENTS.md change so no checkbox claims work not yet done; 49-03 to 49-05 and 49-09 complete them.

Otherwise the plan executed as written.

## Known Stubs

None.

## Threat Flags

None. Only test files changed.

## Self-Check: PASSED

- FOUND: `gatesProp.ts`, `QuestionsPanel.characterisation.test.tsx`, `questionsPanelInput.ts`
- FOUND commits: `79a18dd5`, `e4a5359d`, `a5cb2a10` (all ancestors of HEAD)
