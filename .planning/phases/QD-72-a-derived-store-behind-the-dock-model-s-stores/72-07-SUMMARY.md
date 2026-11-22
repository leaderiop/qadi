---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 07
subsystem: spec
tags: [spec, behaviours, invariants, traceability, derived-store, dock-model]

requires:
  - phase: 72-06
    provides: "the per-store tests, the store-list test and BEH-QD-615 without its ordinal"
provides:
  - "BEH-QD-696 to BEH-QD-699 after BEH-QD-692 and BEH-QD-700 after BEH-QD-465 in 28-devtools-screens.md"
  - "dated amendments on BEH-QD-465, BEH-QD-583 and BEH-QD-656 (BEH-QD-615 and BEH-QD-616 already carried theirs)"
  - "INV-QD-389 and INV-QD-390 after INV-QD-388"
  - "traceability rows in sections 1 to 4 for every new id and the two new test files"
  - "the CCR-QD-464 row checked against every cited document, both directions: exact, no correction"
affects: [72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: d34c5eb1cb4038705bc818aa2c241ca0235d24b6
plan_head_after: 06331506bebfd5a77d32f3bc0d5e4a69750f86c0

status: complete

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

revisions-reached:
  "spec/behaviors/28-devtools-screens.md": "1.44"
  "spec/invariants.md": "1.178"
  "spec/traceability.md": "1.251"
  "spec/README.md": "1.290 (untouched; the CCR-QD-464 row needed no correction)"

tech-stack:
  added: []
  patterns:
    - "an Enforcement line names the run-time test titles, the compile-error pins, and what no test or gate checks"

key-files:
  created: []
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md

key-decisions:
  - "BEH-QD-699 states the keys as the code builds them (questions: the gates feed's snapshot, the supplied questions and the unsampled flag; services: wiring, activity, call log and the unsampled flag), read from DockModel.ts and not from the plan's shorthand."
  - "The DockModel.test.ts traceability row also cites BEH-QD-699, BEH-QD-700, INV-QD-390 and ADR-QD-185, and its diagnostics-store clause cites BEH-QD-699 where 72-06 had written BEH-QD-700."

requirements-completed: []  # DERV-05 and WX-02 stay Pending by instruction; only 72-08 marks requirements

duration: ~25min
completed: 2026-11-22
---

# Phase 72 Plan 07: The derived store specified and the change register checked Summary

The dock's specification now states the derived store (key equality, notify once, stop after close), the dock model's three computed stores and the list of the model's nine stores once, with INV-QD-389 and INV-QD-390 and their traceability, and the CCR-QD-464 row matches every cited revision and every changed file exactly.

## Accomplishments

- Task 1 (tracer): BEH-QD-696 to BEH-QD-699 follow BEH-QD-692; BEH-QD-700 sits between BEH-QD-465 and BEH-QD-466 and names the nine stores, `sightings` as a thunk, the ordinal history the `DockModel.ts` header used to carry, and the store-list test. BEH-QD-465, BEH-QD-583 (ordinal sentence reworded in place) and BEH-QD-656 (requirement names every derived store) each got one dated amendment; BEH-QD-615 and BEH-QD-616 already carried theirs and the BEH-QD-699 anchor 72-05 linked now resolves. No earlier amendment or history cell changed.
- Task 2: INV-QD-389 and INV-QD-390 with Enforcement lines that claim only what tests and the compiler check (INV-QD-389: the compute-reads-outside-its-key case is checked by neither; INV-QD-390: that `DockModel.ts` keeps no last key or closed state is `checked by no test or gate`). Traceability: `BEH-QD-696–700` in section 1, both invariants in section 2, both on ADR-QD-185's section 3 row, the `ExternalStore.test.ts` row extended, new rows for `ExternalStore.tst.ts` and `DockModel.characterisation.test.ts`.
- WX-02: every reserved id is used (ADR-QD-185, CCR-QD-464, BEH-QD-696 to BEH-QD-700, INV-QD-389, INV-QD-390), so `Unused: none.` holds. The CCR-QD-464 row's cited revisions equal each document's Revision, and its file list equals `git diff --name-only phase_base -- packages spec` in both directions. README was not changed.

## Task Commits

1. `6cfca79e` docs(72-07): specify the derived store and list the dock model stores once
2. `06331506` docs(72-07): the derived store invariants and their traceability

## Verification

- Task 1 verify: exit 0 (`behaviours specified`). Task 2 verify: exit 0 (`invariants traced and the change register exact`). Both run from the plan's `<automated>` bodies unchanged.
- `spec-revise --check`: every Revision matches. `check-doc-examples.mjs`: 118 blocks compile.
- `verify-traceability.sh --strict`: `PASS: 21 FAIL: 0 SKIP: 0`, `all 162 invariant(s) traced`, `142 ADR(s) traced`, run before each commit and again inside each verify.
- `git status --porcelain -- packages scripts spec .changeset` empty after each commit; no `packages/*` file changed in this plan.
- `store count` appears in invariants.md nowhere and in traceability.md only on ADR-QD-185's existing decision row.

## Deviations from Plan

None. The plan executed as written. Two choices beyond its text, recorded under key-decisions: the keys of `questions` and `services` follow the code, and the `DockModel.test.ts` row was corrected where 72-06 cited BEH-QD-700 for the diagnostics per-store test (BEH-QD-699 pins it).

## Known Stubs

None.

## Threat Flags

None. Spec text only; no endpoint, auth path or trust-boundary schema. T-72-15 is held by INV-QD-390's `checked by no test or gate` sentence (the verify requires it) and T-72-16 by the verify's two-way comparison.

## Self-Check: PASSED

- `spec/behaviors/28-devtools-screens.md`, `spec/invariants.md`, `spec/traceability.md` carry the changes above; revisions 1.44, 1.178 and 1.251.
- Commits 6cfca79e and 06331506 are ancestors of HEAD.
