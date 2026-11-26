---
phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
plan: 14
subsystem: spec
status: complete
tags: [spec, adr, behaviors, invariants, traceability]

phase_base: 46174873c60e85bcd0c6702867c602cad8460310
plan_head_before: 0f2e7407073b73b0b99fe70cfb83c6892cbe492d
plan_head_after: 3f441810f7b98e237e7518b7cf9fa794dae624cc

requires:
  - phase: QD-90-the-remaining-per-port-facts-live-on-the-port-description
    provides: the landed source (plans 09-12), the spike and bench records, the mutation and coverage closes (plan 13)
provides:
  - ADR-QD-203 with its spike table, bench gate of record, answers to CCR-QD-270 and CCR-QD-419, audit table and enforcement section
  - BEH-QD-786 to BEH-QD-790, INV-QD-425 and INV-QD-426, the restated BEH-QD-588 and the edited BEH-QD-445, INV-QD-288 and INV-QD-345
  - the dated amendments of ADR-QD-094, ADR-QD-163 and ADR-QD-134, the register rows and the CCR-QD-482 row
affects: [QD-90 plans 15-16 (overview rows, house rules, changeset, upgrade note, phase close)]

requirements-completed: []

actuals:
  tokens: 118777
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "a record that states what is enforced separates what `pnpm check` runs from what is kept with the change's planning"

key-files:
  created:
    - spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
    - spec/behaviors/30-port-calls.md
    - spec/invariants.md
    - spec/decisions/094-a-port-is-described-once.md
    - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
    - spec/decisions/134-a-resource-scoped-port-read-is-one-read.md

key-decisions:
  - "The audit count is `tests removed: 2`: the `it.effect` `Never / Always / ByScope` and the test `a description's span is its own port's, and no other`, each by title, plus one assertion row inside the second (decided autonomously)."
  - "The bench gate is recorded as the bench record states it (no workload more than 5% slower, a geometric mean no worse than +2%, `# gate: pass`), not the wider band the context named (decided autonomously: the record is the measurement)."

duration: 70min
completed: 2026-11-26
---

# Phase 90 Plan 14: The Port Facts Records Summary

**ADR-QD-203 states the decision with its spike table, its bench gate of record and its audit table; five behaviours and two invariants state what holds; BEH-QD-588 is restated, and ADR-QD-094, ADR-QD-163 and ADR-QD-134 each carry a dated amendment pointing at it, with ADR-QD-114 byte-identical.**

## Commits

| Task | Commit | Subject | Paths |
| ---- | ------ | ------- | ----- |
| 1 | `e953894f` | `docs(90-14): record the port facts decision` | ADR-QD-203 (new), `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/README.md` |
| 2 | `3fe91a59` | `docs(90-14): state the port facts in the behaviors and invariants` | `spec/behaviors/30-port-calls.md`, `spec/invariants.md`, `spec/traceability.md`, ADR-QD-203 |
| 3 | `3f441810` | `docs(90-14): amend the port description, leaf needs and scoped read decisions` | ADR-QD-094, ADR-QD-163, ADR-QD-134, `spec/decisions/index.yaml` |

## Records, with revisions

| Document | Revision | What |
| -------- | -------- | ---- |
| `spec/decisions/203-the-remaining-per-port-facts-live-on-the-port-description.md` | 1.0 (new) | the decision (seven sections), the spike table with each madge and `tsc` result, the bench gate of record (patch SHA-256 `fedbbea7...`, invocation, the `# gate: pass` analysis lines), CCR-QD-270 and CCR-QD-419 answered, the audit table ending `No property lost; tests removed: 2`, alternatives, consequences, `## What enforces it`, Related with the BEH and INV links |
| `spec/decisions/index.yaml` | n/a | the ADR-QD-203 entry; the amended statuses of ADR-QD-094, ADR-QD-163, ADR-QD-134 |
| `spec/README.md` | 1.415 to 1.416 | the `CCR-QD-482` row naming ARCH-137, every revised document with its revision, ending `Unused: none.` |
| `spec/traceability.md` | 1.334 to 1.335 | the ADR-QD-203 row (first commit); the BEH-QD-786 to 790 rows with the restated BEH-QD-588 row, the INV-QD-425 and 426 rows, the rows of `PortFacts.characterisation.test.ts` and `PortFacts.tst.ts`, the restated INV-QD-288, `LeafNeeds.test.ts` and `PortName.tst.ts` rows, the ADR-QD-163 row's anchor (second commit, in place) |
| `spec/behaviors/30-port-calls.md` | 1.25 to 1.26 | BEH-QD-786 to BEH-QD-790 new; BEH-QD-588 restated (heading, both REQUIREMENTs, the base sentence that `readScoped` does not read the column gone); BEH-QD-445's paragraph names `LEAF_NEEDS` and links BEH-QD-588 and BEH-QD-790, REQUIREMENTs unchanged |
| `spec/invariants.md` | 1.234 to 1.235 | INV-QD-425 and INV-QD-426 new; INV-QD-288's Source, Implication and Enforcement name the route through the row, `scopedCall` and `LeafNeeds.test.ts`; INV-QD-345 links INV-QD-426 and the new BEH-QD-588 anchor |
| `spec/decisions/094-a-port-is-described-once.md` | 1.12 to 1.13 | `## Amendment (2026-11-26, ADR-QD-203, CCR-QD-482)`, the two reversed rejections with their reasons, the new-port sentence; a dated `>` note under the span-names table |
| `spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md` | 1.10 to 1.11 | dated amendment on decision 3 (the table routes; `readScoped` stays the one place the check runs and its failure is built) |
| `spec/decisions/134-a-resource-scoped-port-read-is-one-read.md` | 1.1 to 1.2 | dated note before decision `D-02`'s section: `ScopedPort` derived, `readScoped` routes every scoped read |
| `spec/decisions/114-a-port-states-what-it-serves.md` | unchanged | byte-identical to `phase_base` |

Each of the eight bumped documents moved exactly one minor over `phase_base`; `spec/overview.md` was already at 1.147 and is plan 15's.

## Facts the records state

- Bench: gate passed, geometric mean +0.75%, worst +3.0% on a workload that reads no scoped port, the two scoped-heavy workloads +1.0% and +2.4%.
- Sixth port: 57 errors in 25 groups (53 in 22 for a sixth `PortSpans` row at the base), `PortMetrics.ts` out of the set.
- Mutation: `PortAccess.ts` at 54 of 57 detected; the three open mutants are equivalent (the `Always` arm of `readScoped`'s matcher is unreachable today because the only `Always` leaf's port has no id-free call, and a mutant of the `bare !== undefined` guard changes no outcome). The ADR says so and claims no full score for that file.
- Coverage: 99.86 lines, 99.70 functions, 98.33 branches, 99.58 statements.
- Serving: kept hand-written (the spike's candidate (e): 16 cycles, five compile errors), so ADR-QD-114 is cited and not amended.

## Checks run

| Check | Result |
| ----- | ------ |
| `pnpm spec:verify:strict` (before the first commit and after each task) | 21 PASS, 0 FAIL, 0 SKIP |
| `node scripts/spec-revise.mjs --check` | every Revision matches its newest Change History entry, after each task |
| `node scripts/check-doc-examples.mjs` | 122 blocks compile (after task 2) |
| `90-check.mjs commit <subject> <paths>` | pass for each of the three subjects, with exactly the paths the plan names |
| `90-check.mjs scan-ids` | pass after each task (no id or phase wording in added lines) |
| `90-check.mjs records` | pass (the pinned-by lists name tests that exist, and the quoted titles exist in their files) |
| `90-check.mjs records --close` | after task 3 the only open items are plan 15's: the changeset, AGENTS.md section 3 and the upgrade heading |
| `90-check.mjs trailers` | 47 commits since `phase_base`, each with the one trailer |
| `90-earlier-checks.mjs` | exit 0 after each of the three commits, the reports equal to the ledger (README to 1.416 after the first, invariants to 1.235 after the second); the measured moves equal the prediction |
| `90-pinned-check.mjs` | 408 files hold their base text, 3 of 3 born files held, 5 of 5 declared edits applied (exit 0) |

## Deviations from Plan

### Plan defects

1. **Quoted test titles with a decision number cannot appear in an added line.** INV-QD-288's Enforcement names the `PortAccess.test.ts` describes by title, and two of those titles end in a decision number and an invariant id (`... on the span (D-07)`). Editing the line makes it an added line, and `scan-ids` refuses `D-07`. Before: the exact titles with their suffixes. After: the titles' text without the suffix, which a reader finds by prefix. The ADR-QD-203 audit table also names the removed `it.effect`'s describe without its trailing decision number, saying only that the title ended in one.
2. **BEH-QD-789's heading does not carry the `LEAF_NEEDS` identifier.** An identifier with an underscore keeps it in a heading anchor, so the heading reads "Every read of a scoped port is routed by its leaf's row in the leaf-needs table" and the requirement text names `LEAF_NEEDS`. BEH-QD-445's paragraph and the records judge still read `LEAF_NEEDS`.
3. **The plan's Task 1 truth lists the three amended statuses in the first commit's `index.yaml`, while its Task 3 and its commit path list put them in the third.** The first commit holds the ADR-QD-203 entry only; the three statuses land in the third. The `commit` check of each task passes with the paths it names.

### Choices the plan left open

- **Audit count.** `No property lost; tests removed: 2`: two test blocks whose title is gone (the `LeafNeeds.test.ts` `it.effect` replaced by three tests, and the `PortName.tst.ts` test retitled and reduced), plus one assertion row inside the second. The ADR states the one row and the count.
- **Bench band.** The ADR copies the bench record's gate (5% per workload, +2% geometric mean) and not the 10% band the context first named.
- **The note under ADR-QD-094's table sits after the table's last row**, since a note cannot sit inside a markdown table.
- **ADR-QD-203's decision text** is written as seven numbered decisions, each stating what it replaces, with the spike table separate.
- **Overview rows.** `spec/overview.md` still holds stale rows for the moved types (`PortName`, `PortSpanName` and `PortSpanOf` as `PortName.ts` exports, the `PortDescription` parameter list, the fixture rows). They are plan 15's, in place, and this plan's commit paths exclude the file.

## Known Stubs

None.

## Threat Flags

None. T-90-28 holds: `## What enforces it` names commands, says which run in `pnpm check` (the type pins, the characterisation through `pnpm coverage`, `pnpm circular`, `pnpm lint`, `pnpm spec:api`, `pnpm mutation`) and which are kept with the planning (the phase judges, the sixth-port scratch run, the bench of record), and holds no `gate <number>` text. T-90-29: every document is exactly one minor above `phase_base` and `scan-ids` passes.

## Self-Check: PASSED

Files found: ADR-QD-203, `spec/decisions/index.yaml`, `spec/traceability.md`, `spec/README.md`, `spec/behaviors/30-port-calls.md`, `spec/invariants.md`, ADR-QD-094, ADR-QD-163, ADR-QD-134. Commits `e953894f`, `3fe91a59`, `3f441810` are ancestors of HEAD.
