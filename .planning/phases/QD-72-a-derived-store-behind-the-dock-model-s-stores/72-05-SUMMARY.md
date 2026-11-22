---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 05
subsystem: devtools
tags: [derived-store, dock-model, spec-amendment, invariants]

requires:
  - phase: 72-04
    provides: "makeDerivedStore, ReadableStore and the type pins"
  - phase: 72-03
    provides: "ADR-QD-185 and the CCR-QD-464 row predicting every revision"
provides:
  - "DockModel.ts on three makeDerivedStore calls (shownReading, questions, services), with MergeKey and the module-scope mergedOf"
  - "the closed-model regression green; the 15-row characterisation unchanged and green"
  - "INV-QD-314/343/355/357, their traceability rows and BEH-QD-616 on the derived stores"
  - "dated notes in ADR-QD-162, ADR-QD-168 and ADR-QD-169"
affects: [72-06, 72-07, 72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: f45fc6067b54ccc61df3f44382fbdd594a667457
plan_head_after: 9e4300cee00a4862888b78e42f6728d5dac2f24a

status: complete

actuals:
  tokens: 40000
  tasks: 3
  commits: 4

revisions-reached:
  "spec/invariants.md": "1.177"
  "spec/traceability.md": "1.249"
  "spec/behaviors/28-devtools-screens.md": "1.42"
  "spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md": "1.6"
  "spec/decisions/168-a-port-card-is-a-model-row.md": "1.1"
  "spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md": "1.2"

tech-stack:
  added: []
  patterns:
    - "a module-scope function declaration (mergedOf) for a compute whose mutants must stay live"
    - "a derived store's key thunk reads the inputs after configure assigns them, and configure refreshes the root derived store last"

key-files:
  created: []
  modified:
    - packages/devtools/src/model/DockModel.ts
    - packages/devtools/test/model/DockModel.test.ts
    - .planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/behaviors/28-devtools-screens.md
    - spec/decisions/162-gates-are-the-dock-models-eighth-store-and-their-states-are-stated-once.md
    - spec/decisions/168-a-port-card-is-a-model-row.md
    - spec/decisions/169-the-questions-panels-two-host-inputs-are-one-feed.md
    - spec/decisions/index.yaml

key-decisions:
  - "Wrapped the header's first line and every added comment line to the 90-column bound, since the plan's check refuses any added line over 90 columns; the content of the header line is the plan's."

requirements-completed: []

duration: 11 min
completed: 2026-11-22
---

# Phase 72 Plan 05: The dock model on three derived stores Summary

The dock model's three computed stores are `makeDerivedStore` calls, `DockModel.ts` holds no hand compare, last key, closed flag or manual subscription, and every invariant, row, requirement and decision that described the old mechanism carries a dated note.

## What changed

- `DockModel.ts`: `shownReading` (parents: the diagnostics feed; key `MergeKey`; compute `mergedOf`), `questions` (parents: gates feed and `shownReading`; key `JoinKey`; compute `joinQuestions(joinInputOf(key))`) and `services` (parent `shownReading`; key `ServicesInput`; compute `portCards`), built in that order. `configure` refreshes `shownReading` last, after both feeds are configured, so one `configure` publishes one join. The three hand triggers, both key readers, both last keys, the closed flag, the manual subscriptions and the finalizer are gone. The header points at BEH-QD-700 and ADR-QD-185 and no longer counts stores. The returned model is unchanged (`questions` and `services` stay `{ subscribe, getSnapshot }`).
- `DockModel.test.ts`: only M36's comment is reworded.
- Spec: INV-QD-314, INV-QD-343 and INV-QD-355 Source lines name the derived stores; INV-QD-343's Enforcement cites M36, M47 and `ExternalStore.test.ts`; INV-QD-357's statement says the model holds no gate-watch state, under an `Amended in CCR-QD-464 (ARCH-119)` blockquote; the three traceability rows match; BEH-QD-616's second REQUIREMENT reads `MUST hold no gate-watch state; its join MUST be a derived store.` under a dated amendment linking BEH-QD-699's anchor (the heading is written in 72-07, so the anchor does not resolve until then).
- ADR-QD-162 (three notes), ADR-QD-168 (three) and ADR-QD-169 (two, `Corrected`), each placed under the passage it qualifies, with passages kept as written; Status rows and `index.yaml` statuses record them.

## Verification

- Proving grep on `DockModel.ts`: empty, against 26 lines at `phase_base` (listed in `72-RED-EVIDENCE.md`, section "The closed-model regression green").
- Devtools project: 1705 passed, 0 failed; the regression test and the 15 characterisation rows pass; M47, J1 and J8 pass unchanged. `pnpm typecheck`, `pnpm test:tstyche`, house-style and oxlint pass.
- `spec-revise --check`, `check-doc-examples.mjs` and `verify-traceability.sh --strict` (PASS: 21, FAIL: 0, SKIP: 0) pass.
- The three plan `<verify>` scripts exit 0 (task 1 with the two verification-only adjustments below).

## Commits

| Commit | Message |
| ------ | ------- |
| c5171dd3 | refactor(72-05): build the dock model computed stores as derived stores |
| 0d368b82 | docs(72-05): record the closed-model regression green |
| 0e39b275 | docs(72-05): the invariants and BEH-QD-616 name the derived stores |
| 9e4300ce | docs(72-05): note the derived stores in the three decisions they amend |

## Deviations from Plan

Verification-only, no source or spec effect:

1. **[Verify misfire] Task 1's test-diff check compared against `phase_base`.** `DockModel.test.ts` gained tests in 72-01 and 72-02, so the "an expected value changed" check (a diff against `phase_base`) flagged earlier plans' assertions. Ran the equivalent check against this plan's start commit `f45fc606`: the only change to the file is M36's comment.
2. **[Verify conflict] The plan-mandated M36 comment is 93 columns.** The plan requires the exact line `// A changed gate list and a changed reading, both handed over after the scope closed.` (fixed-string grep) and also refuses any added line over 90 columns; at M36's indent the two cannot both hold. Kept the mandated line and excluded exactly that line from the width check. Every other added line in `DockModel.ts` is wrapped within the bound (including the header's first line, wrapped across two lines).

No Rule 1-3 deviations.

## Known Stubs

None.

## Threat Flags

None. T-72-11 (one join per `configure`) and T-72-12 (a closed model's reading) are held by M47, J1, J8, P2 and the regression test, all passing.

## Self-Check: PASSED

- `packages/devtools/src/model/DockModel.ts`, `.planning/phases/QD-72-a-derived-store-behind-the-dock-model-s-stores/72-RED-EVIDENCE.md`, the three spec documents and the three ADRs exist and carry the changes above.
- Commits c5171dd3, 0d368b82, 0e39b275, 9e4300ce are ancestors of HEAD.
