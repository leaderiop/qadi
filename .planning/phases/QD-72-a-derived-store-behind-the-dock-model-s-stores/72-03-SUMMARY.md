---
phase: QD-72-a-derived-store-behind-the-dock-model-s-stores
plan: 03
subsystem: spec
tags: [adr, ccr, spec-registers, derived-store, dock-model]

requires:
  - phase: 72-02
    provides: "the REDs: the regression, the derived store's rules, the type pins"
provides:
  - "ADR-QD-185 at Rev 1.0, with its index entry and traceability row"
  - "the CCR-QD-464 row, citing every revision the later plans reach"
  - "ADR-QD-047's 2026-11-22 amendment pointing the store list at BEH-QD-700"
affects: [72-04, 72-05, 72-06, 72-07, 72-08]

phase_base: 74f631ada0e04a6003e4dbf959db93ca161f6136
plan_head_before: 18f05661ce5bda38d8d096154a7147d4a4f7ee77
plan_head_after: 1a671cfd17901853292a7c8f963cb0d282a18cbf

actuals:
  tokens: 9500
  tasks: 2
  commits: 2

revisions-reached:
  "spec/README.md": "1.290"
  "spec/traceability.md": "1.248"
  "spec/decisions/047-a-headless-devtools-model.md": "1.20"
  "spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md": "1.0"

tech-stack:
  added: []
  patterns:
    - "the CCR row lands in the same commit as the first spec text that cites it"

key-files:
  created:
    - spec/decisions/185-the-dock-models-computed-stores-are-derived-stores.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/047-a-headless-devtools-model.md

key-decisions:
  - "ADR-QD-185 records the eleven decisions of the derived store and the dock model on it, with seven rejected options"
  - "The CCR-QD-464 row sits right after CCR-QD-463's and names every final revision the later plans reach"

requirements-completed: []  # DERV-05 and WX-02 stay Pending by instruction; only 72-08 marks requirements

duration: ~15min
completed: 2026-11-22
status: complete
---

# Phase 72 Plan 03: The derived store decision and its change Summary

**ADR-QD-185 (the dock model's computed stores are derived stores), its index entry, traceability row, the CCR-QD-464 row and ADR-QD-047's amendment, all registered before any code or later spec text cites them.**

## Accomplishments

- Task 1 (tracer): one commit holds ADR-QD-185 at Rev 1.0, the last `index.yaml` entry, the section 3 row right after
  ADR-QD-184's and the CCR-QD-464 row right after CCR-QD-463's, so no tree cites an unregistered id. The ADR states the
  compiler / test / neither split exactly, keeps ADR-QD-177 (pointed at) and ADR-QD-137, restates ADR-QD-168's note
  that the model is the home of a computed view, and lists seven rejected options. It has no compiled fence and no
  forbidden token.
- Task 2: ADR-QD-047 gets one dated amendment linking ADR-QD-185 and BEH-QD-700's anchor; its Status row and its index
  status list the date. No line outside its Document Control header was removed or changed.

## Task Commits

1. `76900cdd` docs(72-03): record the derived store decision and its change
2. `1a671cfd` docs(72-03): amend the headless model decision to list the stores once

## Verification

- Task 1 verify: exit 0 (`decision recorded`) after the sort-order correction in the deviation below.
- Task 2 verify: exit 0 (`ADR-QD-047 amended`).
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `node scripts/check-doc-examples.mjs`: `118 block(s) compile`.
- `bash spec/scripts/verify-traceability.sh --strict`: `PASS: 21 FAIL: 0 SKIP: 0`, `142 ADR(s) traced`,
  `118 ADR(s) agree`, run after each task.
- `git diff phase_base -- packages/devtools/src` is empty; `git status --porcelain -- packages scripts spec .changeset`
  is empty.

## Deviations from Plan

**1. [Verification-only] Task 1's file-set comparison misfired on sort order**
- **Found during:** Task 1 verify
- **Issue:** the verify compares `LC_ALL=C sort` of the commit's files with a string that lists the ADR path first;
  in C order `spec/README.md` sorts before `spec/decisions/...`, so the comparison fails for the right four files.
- **Fix:** the verify copy lists the four files in C order (`spec/README.md`, the ADR, `index.yaml`, `traceability.md`);
  nothing else in it changed and the gate checks the same exact set.
- **Files modified:** none (a scratch copy of the verify script).

Note, not a deviation: ADR-QD-047's Status row did not list its 2026-11-19 amendment before this plan; the plan says to
append only the 2026-11-22 date, so the earlier omission is left as written.

## Known Stubs

None.

## Threat Flags

None. Spec text and registers only; no endpoint, auth path or trust-boundary schema.

## Next Phase Readiness

Ready for 72-04. The CCR-QD-464 row predicts `28-devtools-screens.md` 1.44, `invariants.md` 1.178, `traceability.md`
1.251, `README.md` 1.290, ADR-QD-047 1.20, ADR-QD-162 1.6, ADR-QD-168 1.1, ADR-QD-169 1.2 and ADR-QD-185 1.0: 72-07 and
72-08 compare each with its document. README and ADR-QD-047 and ADR-QD-185 are already at their final revisions;
traceability is at 1.248 and needs three more bumps.

## Self-Check: PASSED

- Files exist: ADR-QD-185, and the four edited registers.
- Commits `76900cdd` and `1a671cfd` are on `arch-wave-13`; `git rev-list --count 18f05661..HEAD` was 2 before this
  summary's commit.
