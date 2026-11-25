---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 07
subsystem: devtools
tags: [questions-panel, hydration-view, dock, exhaustive-match, seen-failing]
requires:
  - phase: QD-85
    provides: "85-04: HydrationView and HydrationDropsView; 85-05: model.hydration; 85-06: its identity pins; 85-03: the pinned-file check"
provides:
  - "QuestionsPanel reads hydration?: ReadableStore<HydrationView> through useStoreSnapshot, with a stable module-scope Unwired default store"
  - "hydrationBlock and dropsBlock: module-scope Match.type + Match.tagsExhaustive over the view and its drops; the panel decides nothing"
  - "The dock's questions tab passes props.model.hydration"
  - "Five render tests, one per tag, over literal views in a local store helper"
  - "85-RED-EVIDENCE.md: the 85-07 section, each new panel test and panel-decides-nothing seen failing"
affects: [85-08, 85-09, 85-10]
tech-stack:
  added: []
  patterns:
    - "A panel renders a model view by tag through a hoisted exhaustive match; fixed advice stays a panel constant selected by the tag"
key-files:
  created: []
  modified:
    - packages/devtools/src/react/QuestionsPanel.tsx
    - packages/devtools/src/react/DevtoolsDock.tsx
    - packages/devtools/test/react/QuestionsPanel.test.tsx
    - .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md
key-decisions:
  - "Decided autonomously: the new panel tests hand the drops as tagged literals ({ _tag: \"Raised\", rows } and { _tag: \"None\", text }) rather than HydrationDropsView constructors, because the declared import edit in the pinned check allows only the HydrationView import (and the optional ReadableStore type import); the literals are typed by HydrationView.Counts, so a wrong shape still fails to compile"
  - "Decided autonomously: the Counts component takes the counts arm through a local CountsView alias (Extract over the union), which also keeps the module-scope string-literal scan from reading a type literal in a component signature as a module-scope string"
  - "Decided autonomously: the panel keeps DevtoolsDock's shown prop untouched (only the hydration line changed), since the frame still subscribes to the whole reading until 85-08 narrows it"
requirements-completed: []
status: complete
duration: 12min
completed: 2026-11-25
commits: 2
plan_head_before: 923b45e7132fc87ab665f69ee6ca82a5c4fb7a00
plan_head_after: d92cdea98aadfb271f8b90ee75b0b711e013273a
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
coverage:
  - id: D1
    description: "The panel reads the model's hydration store through useStoreSnapshot and renders Pending, Unwired and Counts (with None or Raised drops) by tag through module-scope exhaustive matches; every data-testid and byte is unchanged"
    requirement: HYDV-04
    verification:
      - kind: test
        ref: "packages/devtools/test/react/QuestionsPanel.hydration.characterisation.test.tsx#H1-H13"
        status: pass
      - kind: test
        ref: "packages/devtools/test/react/QuestionsPanel.test.tsx#hydration, rendered from its view"
        status: pass
    human_judgment: false
  - id: D2
    description: "The panel decides nothing: it imports no status predicate, unaccounted-entries helper or activity type and holds no rate, plural, drop-filter or watched-count arithmetic"
    requirement: HYDV-04
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs panel-decides-nothing"
        status: pass
    human_judgment: false
  - id: D3
    description: "The two held QuestionsPanel characterisations, the hydration cells, Lens.questions.characterisation, DiagnosticsScreens and DevtoolsDock stay green and unedited; QuestionsPanel.test.tsx changes only inside its declared span"
    requirement: HYDV-01
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-pinned-check.mjs --all-applied"
        status: pass
    human_judgment: false
  - id: D4
    description: "Each new panel test and panel-decides-nothing were seen failing under a scratch edit of the panel"
    requirement: WX-06
    verification:
      - kind: other
        ref: ".planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-RED-EVIDENCE.md#85-07"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 07: The questions panel renders the hydration view Summary

`QuestionsPanel` now takes the dock model's hydration store, reads it with `useStoreSnapshot` and renders each tag of the
view through a hoisted `Match.type<HydrationView>()` with `Match.tagsExhaustive` (and the drops through a second one over
`HydrationDropsView`): it imports no status predicate, no unaccounted-entries helper and no activity type, and holds no rate,
plural, drop filter or watched count. The prop stays optional with a module-scope `Unwired` default store, so every panel
rendered alone still shows the unwired advice, byte for byte.

## Accomplishments

- **Panel** (tracer, `4c9fa45f`): `hydration?: ReadableStore<HydrationView>`, `UNWIRED` and `NO_HYDRATION` at module scope,
  `Hydration` taking `view`, `hydrationBlock` (`Pending` and `Unwired` arms return the base's spans with their comments,
  `Counts` renders `Counts`), `dropsBlock` (`None` renders the all-clear text, `Raised` one row per entry keyed by reason),
  and `Counts` reading the view's numbers, optional rate and scope. Every style object, test id and explanatory comment kept.
- **Dock**: the questions tab passes `hydration={props.model.hydration}`; nothing else in the file changed.
- **Tests**: `QuestionsPanel.test.tsx` changes only inside its declared span (the view import, plus the `ReadableStore` type
  import, and the hydration region). `describe("hydration, with nothing read")` is kept as it was; the second describe is now
  `hydration, rendered from its view` with a local `storeOf` and five render tests (Pending, Unwired from a store, Counts with
  a rate and a raised drop, Counts with no rate and nothing dropped, a reason holding markup rendered as text). None calls
  `hydrationView`.
- **Seen failing** (each restored with `cp`): the Pending and Unwired test ids swapped fails the two state tests (and the held
  absent-gates cells); the rate div dropped fails the counts test and H1, H2, H4 to H7; the raised rows rendered as the no-drops
  div fails the counts test and H8, H9; the reason rendered as inner HTML fails the reason test and H9; a rate div rendered
  without a rate fails the no-rate test; an import and call of the status predicate fails `panel-decides-nothing`.
- Verified: the eleven listed test files (184 tests) and the whole `packages/devtools/test/react` folder pass;
  `panel-decides-nothing`, `scan-forbidden`, `scan-ids` pass; `85-pinned-check.mjs --all-applied` prints `18 files hold their
  base text, 1 of 1 born files held, 1 of 1 declared edits applied`; `tsc -p tsconfig.test.json`, `pnpm lint` (house style clean,
  620 files) and `pnpm circular` pass.

## Task Commits

1. **Task 1 (tracer): the panel, the dock line and the declared test edit** - `refactor(85-07): the questions panel renders the hydration view` (`4c9fa45f`)
2. **Task 2: the panel's tests and check seen failing** - `docs(85-07): record the panel's tests seen failing` (`d92cdea9`)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The drops in the panel tests are tagged literals, not constructors**
- **Found during:** Task 1
- **Issue:** Importing `HydrationDropsView` beside `HydrationView` changed the import line to something the declared edit in
  `85-pinned-check.mjs` does not accept, so `--all-applied` would have failed.
- **Fix:** The tests write `{ _tag: "Raised", rows: [...] }` and `{ _tag: "None", text }` inside `HydrationView.Counts({...})`,
  where the view's type checks them; a comment in the helper says why.
- **Files modified:** `packages/devtools/test/react/QuestionsPanel.test.tsx`
- **Commit:** `4c9fa45f`

**2. [Rule 3 - Blocking] A `CountsView` alias for the counts component's prop**
- **Found during:** Task 1
- **Issue:** `scan-forbidden` read the `"Counts"` type literal in the component's inline prop type as a module-scope string
  literal.
- **Fix:** `type CountsView = Extract<HydrationView, { readonly _tag: "Counts" }>;` (a type declaration, which the scan skips).
- **Files modified:** `packages/devtools/src/react/QuestionsPanel.tsx`
- **Commit:** `4c9fa45f`

**Total deviations:** 2 auto-fixed (blocking). **Impact:** none on the plan's shape or on any byte rendered.

The tracer feedback gate re-ran the task's `<verify>` end to end and passed: tracer verified, expanding.

## Auth Gates

None.

## Known Stubs

None. The `NO_HYDRATION` default store is intentional: a panel rendered outside the dock has no hydration store and shows the
unwired advice, which is what it showed on the base.

## Threat Flags

None. T-85-12 is pinned by the reason test and H9 (a reason holding markup renders as text; failing under an inner-HTML
scratch edit); T-85-13 by the held characterisations, which pin every byte the block shows.

## Issues Encountered

None.

## Next Phase Readiness

Ready for 85-08: the panel reads `model.hydration`, so the dock frame no longer needs the whole shown reading for it and can
narrow its subscription to the poll's status. `frame-reads-status` is expected to fail until then (the frame still names
`shown`).
