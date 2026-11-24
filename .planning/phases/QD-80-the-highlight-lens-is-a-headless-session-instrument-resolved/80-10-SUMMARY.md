---
phase: QD-80-the-highlight-lens-is-a-headless-session-instrument-resolved
plan: 10
subsystem: spec-behaviours
tags: [spec, behaviours, invariants, traceability, devtools-spec, ccr]
requires: [80-09]
provides:
  - BEH-QD-736 to BEH-QD-739 (spec/behaviors/28-devtools-screens.md) and BEH-QD-740 (spec/behaviors/09-react.md), each naming the tests that hold it
  - INV-QD-405 and INV-QD-406 (spec/invariants.md)
  - BEH-QD-234, BEH-QD-700 and BEH-QD-735 restated, INV-QD-390 and INV-QD-107 amended
  - the decision index status of ADR-QD-047, ADR-QD-111 and ADR-QD-185 recording the ADR-QD-193 amendments
  - the two devtools-spec notes (01-shell 0.7, 02-screens 0.22)
affects: [80-11, 80-13]
key-files:
  modified:
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/09-react.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/decisions/193-the-highlight-lens-is-a-headless-session-the-dock-model-owns.md
    - spec/devtools-spec/01-shell.md
    - spec/devtools-spec/02-screens.md
    - spec/README.md
key-decisions:
  - "The decision index records each ADR-QD-193 amendment in the amended ADR's status string (orchestrator decision), in the style of ADR-QD-047's and ADR-QD-137's existing entries"
  - "BEH-QD-739 states the pick is held by id and keeps the useId evidence as two named halves (the react remount test and the dock cell); no retain command is claimed"
  - "INV-QD-405 says the closed union and tuple type are checked by pnpm typecheck and by no test of their own; the property tests are what hold the behaviour"
  - "The reveal for a row not rendered when the pick happened is left out of BEH-QD-739: no test pins it"
requirements-completed: []
metrics:
  duration: 15min
  completed: 2026-11-24
status: complete
commits: 4
plan_head_before: 4185806012481df203a6ae09aea20f96ef80bc39
plan_head_after: a0e0687391cb88d8a957afe5991472d279d00d34
actuals:
  tokens: 40000
  tasks: 3
  commits: 4
---

# Phase QD-80 Plan 10: The lens behaviours, invariants and trace Summary

Every behaviour ADR-QD-193 specifies now has a record that names the tests holding it, and every count the change moved
(ten stores, ten notification counts) is restated against the tests that pin it: BEH-QD-736 (the session, a no-op
publishes nothing), BEH-QD-737 (a click consumed only by a pick that found a guard), BEH-QD-738 (leaving the panel ends
picking and clears the highlight, the pick kept), BEH-QD-739 (one reveal per pick, a gone guard marks no row), BEH-QD-740
(`QadiContextValue` is `atoms`, `registry`, `gates`), INV-QD-405 and INV-QD-406.

## Commits

- `f72e9eb9` docs(80-10): the decision index records the ADR-QD-193 amendments (orchestrator-decided; `spec/decisions/index.yaml`)
- `79c69ae8` docs(80-10): BEH-QD-736 and INV-QD-405, the lens as a headless session (tracer; four files)
- `e7f9a601` docs(80-10): the lens exits, reveal and pick, and the context value, specified (six files)
- `a0e06873` docs(80-10): the devtools spec notes the lens exit and the kept pick (three files)

## Documents and revisions

| Document | Revision |
| -------- | -------- |
| `spec/behaviors/28-devtools-screens.md` | 1.59 to 1.61 (BEH-QD-736 to BEH-QD-739 new; BEH-QD-234, BEH-QD-700, BEH-QD-735 restated) |
| `spec/behaviors/09-react.md` | 3.17 to 3.18 (BEH-QD-740 new) |
| `spec/invariants.md` | 1.216 to 1.218 (INV-QD-405, INV-QD-406 new; INV-QD-390, INV-QD-107 amended) |
| `spec/traceability.md` | 1.302 to 1.304 |
| `spec/decisions/193-...md` | 1.0 to 1.1 (its records linked) |
| `spec/devtools-spec/01-shell.md` | 0.6 to 0.7 (draft, by hand) |
| `spec/devtools-spec/02-screens.md` | 0.21 to 0.22 (draft, by hand) |
| `spec/README.md` | 1.371 to 1.374 (the CCR-QD-472 row cites each of the above; `Rev 1.374 (this row)`) |

## Checks

- `pnpm spec:verify:strict`: PASS 21, FAIL 0, SKIP 0 (run after each task commit's content, last at README 1.374)
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry
- `node scripts/check-doc-examples.mjs`: 119 block(s) compile
- `pnpm spec:claims` (`scripts/check-devtools-claims.mjs`): 8 claim(s) registered across 6 file(s)
- `80-check.mjs scan-ids`: no id or phase wording in added lines; `80-check.mjs commit` passed for all four commits

## Deviations from Plan

### Orchestrator-decided

**1. [Orchestrator decision] The decision index records the ADR-QD-193 amendments**
- Appended `amended 2026-11-24 (ADR-QD-193: ...)` to the `status` of ADR-QD-047, ADR-QD-111 and ADR-QD-185 in `spec/decisions/index.yaml`, committed first as `f72e9eb9`. `pnpm spec:verify:strict` stayed green.

### Auto-fixed Issues

**2. [Rule 3 - Blocking] A pre-existing decision label in an edited traceability row**
- **Found during:** Task 2 (`scan-ids` read the whole edited `QuestionsPanel.gates.test.tsx` row as added)
- **Issue:** the row already read "(the gates-absent advice names `atoms.gates`, D-12a)", a bare decision number in spec text.
- **Fix:** dropped ", D-12a" from that row, which names no record anywhere in the spec.
- **Files modified:** spec/traceability.md. **Commit:** `e7f9a601`

**3. [Brief direction] ADR-QD-193 links its records in the Task 2 commit**
- The brief asked for the Related list to link BEH-QD-736..740 and INV-QD-405/406 and for a 1.1 revision once the anchors exist, so the Task 2 commit holds six files, not the plan's five. The CCR-QD-472 row cites ADR-QD-193 at 1.1.

None otherwise: the plan ran as written.

## Known Stubs

None.

## Self-Check: PASSED

- Records: `## BEH-QD-736` to `## BEH-QD-739` in 28-devtools-screens.md, `## BEH-QD-740` in 09-react.md, `## INV-QD-405` and `## INV-QD-406` in invariants.md: all found
- Commits `f72e9eb9`, `79c69ae8`, `e7f9a601`, `a0e06873`: all ancestors of HEAD
- The ten-count phrase "2, 2, 3, 3, 0, 1, 0, 2, 1 and 0" is in BEH-QD-735 and CR22's title; "nine of them" is gone
- Every new test file is mapped in traceability section 4
