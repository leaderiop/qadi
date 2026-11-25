---
phase: QD-85-the-dock-s-hydration-block-is-a-model-row
plan: 09
subsystem: spec
tags: [spec, adr, behaviours, invariants, traceability, hydration-view, derived-store]
requires:
  - phase: QD-85
    provides: "85-04: HydrationView.ts and its table (V1 to V17, 41 mutants all killed); 85-05: model.hydration and shownInputOf; 85-07: the panel reads its own store (NO_HYDRATION); 85-08: useDiagnosticsStatus and DockFrame.renders.test.tsx (R1 to R3)"
provides:
  - "spec/decisions/198-the-hydration-block-is-a-model-row.md: ADR-QD-198 at 1.0, eight decisions, fourteen rejected alternatives, enforcement by test file and row group"
  - "BEH-QD-761 to BEH-QD-765 and INV-QD-415, INV-QD-416, each Pinned by / Enforcement naming tests that exist (checked by 85-check.mjs records --close)"
  - "BEH-QD-699 renamed to five computed stores with its nine links moved; BEH-QD-700, 735, 741, 742, 743 and 218 and INV-QD-390 and 407 restated for eleven stores and five derived stores; dated notes on ADR-QD-185 and ADR-QD-168; BEH-QD-231 points to BEH-QD-761"
  - "traceability rows, the ADR-QD-198 index entry with amended statuses for 185 and 168, and the CCR-QD-477 row with every document's Rev"
affects: [85-10, 85-11]
tech-stack:
  added: []
  patterns:
    - "A pinned-by paragraph quotes only exact test titles and names rows by id after a path, which the records check reads"
    - "A renamed behaviour heading moves every link to its anchor in the same working tree, checked by a scan for the old anchor"
key-files:
  created:
    - spec/decisions/198-the-hydration-block-is-a-model-row.md
  modified:
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/19-hydration.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/index.yaml
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
    - spec/decisions/168-a-port-card-is-a-model-row.md
key-decisions:
  - "Decided autonomously: the plan names BEH-QD-742 for the 'ten stores' count and the DL pins, but those sit in BEH-QD-741 (requirement and Pinned by) and BEH-QD-743; all three are restated, and BEH-QD-742 gets the sentence that a hydration listener's throw lands in the seventh step's slot (DL22), because the count and the sweep rows live where they are written"
  - "Decided autonomously: BEH-QD-728's Pinned by also gains DL21 (it names DL1 to DL9 for every store a configure notifies), so the hydration store is not left out of that list"
  - "Decided autonomously: the ADR-QD-198 mutation consequence states only what was measured (the view alone: 41 mutants, all killed, no Ignored note owed); DockModel.ts is stated as a rule (measured before and after with one invocation, does not fall), because the close measurement belongs to the next plan"
  - "Decided autonomously: 'no React in src/model' is stated in INV-QD-415 as kept by the model's own tests and review, not by a merge gate, since the phase's no-react-in-model check is not a gate of pnpm check"
  - "Decided autonomously: the CCR-QD-477 row's Revs were written from each document's current Rev plus one and then confirmed against what spec-revise printed (1.81, 1.30, 1.230, 1.8, 1.3, 1.330, 1.411); none differed"
requirements-completed: []
status: complete
duration: 40min
completed: 2026-11-25
commits: 1
plan_head_before: a3eb9477aa5a55abd7d1457ba2782a896b8a5c2f
plan_head_after: 89fe3ca44ddaa51e79c21da70681dcb508fb99b2
actuals:
  tokens: 19000
  tasks: 3
  commits: 1
coverage:
  - id: D1
    description: "ADR-QD-198 exists with Document ID QADI-ADR-198 and the Context, Decision, Alternatives considered, Consequences, What enforces it and Related sections, stating the eight decisions and the rejected options"
    requirement: WX-02
    verification:
      - kind: command
        ref: "Task 1 automated verify (bash -c, exit 0, 'TASK1 OK')"
        status: pass
    human_judgment: false
  - id: D2
    description: "BEH-QD-761 to BEH-QD-765 and INV-QD-415, INV-QD-416 are written, linked to the ADR and traced; every Pinned by names a test file and titles or row ids that exist"
    requirement: HYDV-05
    verification:
      - kind: command
        ref: "node .planning/phases/QD-85-the-dock-s-hydration-block-is-a-model-row/85-check.mjs records --close"
        status: pass
    human_judgment: false
  - id: D3
    description: "The store behaviours, invariants and decisions say eleven stores and five derived stores and name hydration; BEH-QD-699's anchor moved in all nine links with none left to the old one"
    requirement: HYDV-05
    verification:
      - kind: command
        ref: "Task 2 automated verify (bash -c, exit 0, 'TASK2 OK'; 9 links reach the new anchor, 0 the old)"
        status: pass
    human_judgment: false
  - id: D4
    description: "Every touched header moved once through spec-revise with --date 2026-11-25, --check passes, strict traceability, the doc examples, gate 11, gate 12 and gate 13 (942) pass, the record scan finds no id or phase wording, and one commit holds every spec file"
    requirement: WX-02
    verification:
      - kind: command
        ref: "Task 3 automated verify (bash -c, exit 0, 'TASK3 OK'); node scripts/check-house-style.mjs: 621 files clean"
        status: pass
    human_judgment: false
---

# Phase QD-85 Plan 09: The Hydration Block as a Model Row, Recorded Summary

**ADR-QD-198, BEH-QD-761 to BEH-QD-765 and INV-QD-415 and INV-QD-416 recorded in one commit, with the store behaviours restated for
eleven stores and five derived stores, BEH-QD-699's heading renamed with its nine links, and every register moved through
`spec-revise`.**

## Performance

- **Duration:** about 40 min
- **Tasks:** 3 (one tracer, two auto) and one spec commit
- **Files:** 1 created, 8 modified, all under `spec/`

## Accomplishments

- **ADR-QD-198** (new at 1.0, Status `Accepted — extends ADR-QD-168, amends ADR-QD-185`): the context (the one dock view decided
  in React, the rate, drops and scope rules outside the mutation glob, the frame subscribing to a whole reading to pass one
  field), eight decisions (the pure package-private view and its closed unions; the eleventh and fifth-derived store with no
  `configure` step; the key `{ hydration, unsampled }` by identity through the one shared reader, with the three predicates kept
  distinct; the wording unchanged, `0 dehydrated entries` included; the panel reads the store and renders the tag through a
  hoisted match; the frame reads the status alone through `useDiagnosticsStatus`; the frame's saving proved by a commit count
  with a control; the view's own mutation bar), fourteen rejected alternatives, consequences (the equal-content republish on an
  unsampled flip stated as identity of the key's fields, the held panel-with-no-store case, the forced edit of the panel's tests,
  the store count, the 41-of-41 mutation probe) and enforcement by file and row group.
- **BEH-QD-761 to 765**: the three states by activity precedence with a status-by-reading table and "zero is never shown for no
  reporter"; the rate, drops and scope sentences with their plural rules; the hydration store as one moment keyed per field; the
  panel rendering the tag and keeping every test id; the frame following the poll's status alone. **INV-QD-415** (pure and total
  over two fields, closed unions) and **INV-QD-416** (key by identity per field, counts read and never copied, citing INV-QD-411).
- **Restated, dated, older notes untouched:** BEH-QD-700 (eleven members, `hydration` after `services`, Restated line under the
  `Noted 2026-11-22` block), BEH-QD-699 (heading five; requirement, prose and Pinned by name `hydration` and M57 to M60; all
  nine anchor links moved, none left to the old anchor), BEH-QD-735 (counts `2, 2, 2, 2, 0, 1, 0, 2, 1, 1 and 0` and `2, 3, 2 and
  2`, CR22 sentence at eleven stores), BEH-QD-741 (eleven stores, DL21), BEH-QD-742 (the hydration listener's throw in the seventh
  step's slot, DL22), BEH-QD-743 and BEH-QD-728 (store counts and DL21), BEH-QD-218 (a `Questions: hydration` row), INV-QD-390 and
  INV-QD-407, ADR-QD-185 (`Amended 2026-11-25` note and status) and ADR-QD-168 (`Noted 2026-11-25` and status), BEH-QD-231
  (one cross-reference).
- **Registers:** `spec/traceability.md` (the BEH 761 to 765 table, two INV rows, the ADR row, four new test-file rows, the changed
  rows of `ConfigureRule`, `DockModel`, `DockModel.listeners` and `QuestionsPanel` tests, the summary row for file 28),
  `spec/decisions/index.yaml` (the 198 entry and amended statuses for 185 and 168) and the `spec/README.md` CCR-QD-477 row
  naming ARCH-132, every document with its Rev, and that every reserved id is used (`Unused: none`).
- Every document header moved through `node scripts/spec-revise.mjs <doc> "<change> (CCR-QD-477)" --date 2026-11-25`: file 28
  1.80 to 1.81, `19-hydration` 1.29 to 1.30, `invariants` 1.229 to 1.230, ADR-QD-185 1.7 to 1.8, ADR-QD-168 1.2 to 1.3,
  `traceability` 1.329 to 1.330, `README` 1.410 to 1.411.

## Task Commits

1. **Tasks 1 to 3: the records, the restated store behaviours and the registers** (one commit by plan design, no spec text edited
   in any other): `89fe3ca4` `docs(85-09): record the hydration block as a model row`

## Gate facts (last lines)

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `bash spec/scripts/verify-traceability.sh --strict`: `PASS: 21   FAIL: 0   SKIP: 0`.
- `85-check.mjs records --close`: the pinned-by lists name tests that exist, and every reserved record is written.
- `85-check.mjs scan-ids`: no id or phase wording in added lines.
- `pnpm spec:examples`: 122 blocks compile; `pnpm spec:gates`: 26 steps match `pnpm check`, 179 references resolve;
  `pnpm spec:claims`: 8 claims registered; `pnpm spec:api`: 942 exports documented across 9 packages.
- `node scripts/check-house-style.mjs`: 621 files clean (3 declared switches, 79 type-test files).

## Deviations from Plan

None - plan executed exactly as written.

The plan's wording put the "ten stores" count and the DL pins under BEH-QD-742; they are in BEH-QD-741 and BEH-QD-743, and BEH-QD-742
carries the new hydration-listener sentence. That is recorded under key-decisions as decided autonomously, not as a deviation: the
plan's intent (every place that counts or lists the stores says eleven) is met.

## Auth Gates

None.

## Known Stubs

None.

## Threat Flags

None. T-85-16 holds (`records --close` found every reserved id written and traced) and T-85-17 holds (every header moved through
`spec-revise`, whose `--check` passes).

## Issues Encountered

None. Two first drafts of the in-place edits asserted text that wrapped differently from the file (BEH-QD-699's Pinned by and
BEH-QD-741's); the edit script asserts each replacement matches exactly once and wrote nothing until the text was right.

## Next Phase Readiness

Ready for 85-10 (the mutation close and the changeset). The CCR-QD-477 row does not name a changeset: it does not exist yet, and
85-10 owns it.

## Self-Check: PASSED

- `spec/decisions/198-the-hydration-block-is-a-model-row.md` exists; the spec folder is clean.
- Commit `89fe3ca4` is an ancestor of HEAD and holds the nine spec files; the message ends with exactly one trailer line.
- All three task verifies exit 0; `pnpm spec:verify:strict` equivalent (`verify-traceability.sh --strict`) is green.
