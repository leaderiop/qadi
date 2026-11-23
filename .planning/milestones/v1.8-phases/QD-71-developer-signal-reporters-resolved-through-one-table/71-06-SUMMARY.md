---
phase: QD-71-developer-signal-reporters-resolved-through-one-table
plan: 06
subsystem: spec-decision-records
tags: [adr-qd-184, ccr-qd-463, spec-revise, changeset, traceability]
phase_base: d147287a94a3bb3cad176e4f99bad7a0b76d8939
requires: ["71-05"]
provides:
  - "spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md: ADR-QD-184 at Revision 1.0, Status Accepted, extends ADR-QD-041 and ADR-QD-052"
  - "spec/decisions/index.yaml and spec/traceability.md (Revision 1.244): the ADR-QD-184 entry and section 3 row, and the two amendment notes"
  - "spec/README.md (Revision 1.286): the CCR-QD-463 row right after CCR-QD-462, citing every final revision of the phase"
  - "ADR-QD-041 Revision 1.6 and ADR-QD-052 Revision 1.5: amendments naming ADR-QD-184"
  - ".changeset/react-reporter-option-names.md: one @qadi/react patch changeset"
affects: [71-07, 71-08]
tech-stack:
  added: []
  patterns: ["a Consequences section split into what the compiler refuses (each with the pin seen failing) and what it does not (each with the test that holds it instead)"]
key-files:
  created:
    - spec/decisions/184-developer-signal-reporters-are-resolved-through-one-table.md
    - .changeset/react-reporter-option-names.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/decisions/041-a-mismatch-is-announced.md
    - spec/decisions/052-hydration-is-counted-where-both-ends-can-see-it.md
key-decisions:
  - "Decided autonomously: the ADR names the unenforced items (when each reporter is resolved, the sentences, each row's condition, that an entry point passes its own name) with the test that holds each instead, and says `resolved` is read by no code (checked by grep), so the table-facts test pins it against a written-out table."
  - "Decided autonomously: the ADR says only the five type pins that were gutted were seen failing; a row for no signal is attributed to the written-out-tags pin, which was not gutted, rather than claimed as seen failing."
  - "Decided autonomously: MODULE_STATE_BUDGET is described as reading a `let` or `var` at the start of a line, with the consequence that an indented module-scope declaration is outside its scan, exactly as implemented."
patterns-established:
  - "The CCR row is written with every final revision of the phase, including the ones 71-07 reaches, and re-checked at the end of 71-07."
requirements-completed: []
duration: 25 min
completed: 2026-11-22
status: complete
commits: 2
plan_head_before: e4abaedfacb1ed6128d008acf4635a85f3681b20
plan_head_after: 01450714537abcfae1d9138becc268976383c4dc
actuals:
  tokens: 4300
  tasks: 2
  commits: 2
---

# Phase 71 Plan 06: ADR-QD-184, its two parents amended, CCR-QD-463 and the react patch changeset Summary

ADR-QD-184 records the one signal table, the derived reporter name, the one resolver, the entry point naming its own option and the one budgeted piece of module-scope state, with the compiler's refusals separated from what only tests hold, and is traced through the index, the traceability table and the CCR-QD-463 row.

## Accomplishments

- Task 1 (tracer): the ADR (Context, seven numbered decisions, six rejected alternatives, Consequences, Related), its `index.yaml` entry, its traceability section 3 row (Revision 1.243) and the CCR-QD-463 row (README Revision 1.286). The row cites ADR-QD-184 1.0, ADR-QD-041 1.6, ADR-QD-052 1.5, `09-react.md` 3.11, `28-devtools-screens.md` 1.40, `19-hydration.md` 1.28, invariants 1.174, house-rules-evidence 1.4, traceability 1.246, README 1.286, AGENTS.md, the script, the five source files, the four test files and the changeset, and ends `Ids used: ADR-QD-184, BEH-QD-691 to BEH-QD-695, INV-QD-387, INV-QD-388. Unused: none.` No link to a section 71-07 adds.
- Task 2: ADR-QD-041 gained its last section, the 2026-11-22 amendment (a row per signal, the throw named by the option the caller passed, the latch as the one budgeted module-scope state, the confinement unchanged), at Revision 1.6; ADR-QD-052 gained a blockquote before Consequences (each end's default read from its signal's row, so the dehydrate default cannot be paired with the hydrate row) at Revision 1.5. Both statuses, both `index.yaml` statuses and both traceability rows note the amendment (traceability 1.244). `.changeset/react-reporter-option-names.md` is a `@qadi/react` patch naming both options.
- All register edits went through `scripts/spec-revise.mjs --date 2026-11-22`.

## Verification

- Task 1 verify (extracted verbatim from the plan, run after the commit): exit 0, `ADR-QD-184 and CCR-QD-463 are recorded`. It includes `verify-traceability.sh --strict`: `PASS: 21   FAIL: 0   SKIP: 0`, `141 ADR(s) traced`, `117 ADR(s) agree`, `all 158 invariant(s) traced`; `spec-revise --check` clean; `spec/overview.md` equal to `phase_base` (Revision 1.132).
- Task 2 verify (verbatim): exit 0, `ADR-QD-041 and ADR-QD-052 amended, changeset written`, including a second strict traceability run (21 passed) and a clean tree under `packages spec scripts AGENTS.md .changeset`.
- Before the first commit I also ran strict traceability once on the uncommitted registers (21 passed, the same counts).

## Deviations from Plan

None - plan executed exactly as written. Two verification-only notes: the two verify scripts were extracted from the plan and run after their commits (they check the commit they follow), and the commit trailer is the owner's standing `Claude Opus 5.5` line, as the run notes direct.

## Known Stubs

None.

## Threat Flags

None. T-71-15 is held by the ADR's Consequences splitting what the compiler refuses from what tests hold (and by saying which pins were seen failing and which were not); T-71-16 by the CCR row stating the phase's final revisions, to be re-checked against every header at the end of 71-07; T-71-17 by the changeset naming both options and saying nothing else changes.

## Commits

- `bd3c4c28` docs(71-06): ADR-QD-184, developer-signal reporters resolved through one table, and CCR-QD-463
- `01450714` docs(71-06): ADR-QD-041 and ADR-QD-052 amended by ADR-QD-184, and the react patch changeset

## Self-Check: PASSED

The ADR, the changeset and this summary exist, both commits are ancestors of HEAD, and both task verifies exit 0.
