---
phase: QD-74-the-simulation-session-s-policy-choice-split-from-its-runs
plan: 02
subsystem: spec
tags: [adr, spec, seeded-choice, simulation-session, amendments]
phase_base: b22d97f9af293734787b3f771400d6f5f6e87065
plan_head_before: 900dca08d8a9dc10cf041342b621812f8b6948fc
plan_head_after: ceb195e41e82e2e18613d057d8c85110e273b6b8

requires: ["74-01"]
provides:
  - "ADR-QD-187 at Rev 1.0 with the five rule sentences and the reference rule verbatim"
  - "its decisions/index.yaml entry, its traceability section 3 row and the CCR-QD-466 row"
  - "dated amendments to BEH-QD-466, BEH-QD-460 and INV-QD-107"
affects: [74-03, 74-04, 74-05, 74-06, 74-07]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

tech-stack:
  added: []
  patterns:
    - "a decision written before the code, with the rule sentences later plans copy word for word"

key-files:
  created:
    - spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/behaviors/28-devtools-screens.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/invariants.md

key-decisions:
  - "The CCR-QD-466 row lists only the files that exist at this plan's end (ADR, the three amended documents, traceability, README, the index); 74-06 adds the code and test files, so the row never names a file that does not exist yet"
  - "The INV-QD-107 note sits between its Related line and the section's closing rule, with a blank line on each side; the closing rule had no blank line above it before"

requirements-completed: []  # CHSE-05, WX-02, WX-07 are held by this plan but stay Pending: only 74-07 marks CHSE rows, and no plan marks a WX row

duration: 10 min
completed: 2026-11-23
status: complete
---

# Phase 74 Plan 02: ADR-QD-187 and the three dated amendments Summary

ADR-QD-187 records the simulation session's policy choice as a pure seeded choice, carrying the five rule sentences and the
reference rule verbatim, and the registers and three stale records point at it. No `packages/` file changed.

## Revisions reached

| Document | Revision | Change |
| -------- | -------- | ------ |
| `spec/decisions/187-the-simulation-sessions-policy-choice-is-a-pure-seeded-choice.md` | 1.0 | new |
| `spec/traceability.md` | 1.261 (from 1.260) | the ADR-QD-187 row, right after ADR-QD-186's |
| `spec/README.md` | 1.315 (from 1.314) | the CCR-QD-466 row, right after CCR-QD-465's |
| `spec/decisions/index.yaml` | no header | the ADR-QD-187 entry at the end |
| `spec/behaviors/28-devtools-screens.md` | 1.52 (from 1.51) | BEH-QD-466 amendment |
| `spec/behaviors/29-devtools-simulator.md` | 1.24 (from 1.23) | BEH-QD-460 amendment |
| `spec/invariants.md` | 1.187 (from 1.186) | INV-QD-107 amendment |

ADR-QD-047, ADR-QD-137 and ADR-QD-150 equal `phase_base`; `spec/overview.md`, AGENTS.md and the DoD table are unchanged.

## Task Commits

1. Task 1 (tracer): `d309c619` `docs(74-02): record the seeded choice decision and its change` (the ADR, the index, section 3 and the CCR row)
2. Task 2: `ceb195e4` `docs(74-02): amend the held choice, simulator and screen records for the seeded choice`

## Verification

- Task 1 verify: `decision recorded` (see the verification-only deviation below). It checked the ADR's literals, the six
  rule sentences folded with backticks dropped, Rev 1.0, no compiled fence or forbidden token, the three adjacency
  placements, README 1.315 and traceability 1.261, `spec-revise --check`, `doc-examples: 118 block(s) compile`,
  verify-traceability `PASS: 21   FAIL: 0   SKIP: 0` with `144 ADR(s) traced` and `120 ADR(s) agree`, ADR-QD-047/137/150
  equal to `phase_base`, and the commit's exact four files and one trailer.
- Task 2 verify: `BEH-QD-466, BEH-QD-460 and INV-QD-107 amended` (see the deviation below). Exactly one note per section
  and none outside, no removed or changed line outside Document Control, no forbidden token in an added line, revisions
  1.52, 1.24 and 1.187, `spec-revise --check`, verify-traceability `PASS: 21`, and the commit's exact three files and
  trailer.
- The tracer gate: the Task 1 verify was run end to end after the commit and passed before Task 2 began.
- `git diff 900dca08 -- packages` is empty; `git status --porcelain -- packages scripts spec .changeset` is empty.

## Deviations from Plan

### Verification-only deviations

**1. Both verifies end with `git diff --quiet "$B" -- … packages`, which compares `packages` with `phase_base`**
- Plan 74-01 legitimately changed three test files and added one under `packages/devtools/test`, so that comparison
  fails (`a packages file changed in this plan`) for a plan that changed no package file.
- I ran the same scripts with the `packages` comparison made against the commit this plan started from
  (`900dca08`, `plan_head_before`); both end with their success line, and `git diff 900dca08 -- packages` is empty.
  Every other check ran unchanged. Nothing a gate checks was weakened.

**Total deviations:** 0 auto-fixed, 1 verification-only. **Impact:** none.

## Decided autonomously

- ADR-QD-187's Decision lists ten numbered points, as the plan's outline does, and says in its closing paragraph that it
  was decided under the owner's instruction to take the most complete, clean option.
- The ADR links the BEH and INV anchors that 74-06 will write; they are dead links until then, and no gate checks them.
- The section 3 row carries `—` in its third column for the same reason: its anchors do not exist yet, and 74-06 fills it.

## Known Stubs

None.

## Threat Flags

None: documentation only.

## Self-Check: PASSED

- ADR-QD-187's file found; commits `d309c619` and `ceb195e4` are ancestors of HEAD.
- `git rev-list --count 900dca08..HEAD` read 2 before this file.
