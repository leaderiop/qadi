---
phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
plan: 09
subsystem: spec
tags: [spec, adr, behaviors, invariants, traceability, stop-ledger]

phase_base: 892c4d36bf0f639a5219c53e7c39563533ea8b7e
plan_head_before: 1b0e6d2960f50e10eaed287436b576836720f645
plan_head_after: 2c3f1565d92664b8cf22a982d56d911200144646
commits: 3
status: complete

requires:
  - phase: QD-88-stoppedbox-keys-itself-and-owns-the-announce-once-rule
    provides: the shipped StopLedger.ts, the keyed StoppedBox, the reducer hook, the born test files, the scratch variants and the mutation close (88-01 to 88-08)
provides:
  - ADR-QD-201 at Revision 1.0 with its six-row audit table and Tests removed: 0
  - BEH-QD-776 to BEH-QD-780 and INV-QD-421 and INV-QD-422, BEH-QD-759 restated, BEH-QD-509 linked
  - ADR-QD-197 at Revision 1.5 with the dated decision 4 amendment
  - the CCR-QD-480 row, the index entry and the traceability rows
affects: [QD-88 plan 10]

actuals:
  tokens: 60000
  tasks: 3
  commits: 3

key-files:
  created:
    - spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md
  modified:
    - spec/decisions/197-a-configurable-value-one-questions-path-for-the-lens-and-one-stop-ledger.md
    - spec/decisions/index.yaml
    - spec/behaviors/28-devtools-screens.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "Revisions were run on 2026-11-26, the real edit date, not 2026-11-25 (the plan's date applies when run on that day)"
  - "The ADR-QD-197 traceability row carries the amendment note in the first commit, with the ADR-QD-201 row, so every row naming the amendment was in place before the amendment itself was committed"

requirements-completed: []

duration: ~45min
completed: 2026-11-26
---

# Phase 88 Plan 09: the spec records for the stop box Summary

**ADR-QD-201 records the keyed box, the pure ledger module and the reducer per feed with its measured cost and a six-row audit (`Tests removed: 0`); five behaviors and two invariants state what the code holds; BEH-QD-759 is restated, BEH-QD-509 linked and ADR-QD-197 amended to 1.5, all on the reserved numbers only.**

## Records and revisions

| Record | Revision | What changed |
| ------ | -------- | ------------ |
| `spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md` | 1.0 (new, `QADI-ADR-201`) | eight decisions (state per feed, the module, the keyed wrapper and body, alert at mount and record at commit, key stable across the record, an unshown stop not announced, the cost, section 13 not engaged), the audit table (N9, N12, TN14, TN15, SB1, SB4, `Tests removed: 0.`), nine alternatives, consequences, what enforces it, related |
| `spec/decisions/197-...md` | 1.4 to 1.5 | dated amendment on decision 4, its evidence line and Related list; other decisions untouched |
| `spec/decisions/index.yaml` | entry added; ADR-QD-197 status extended | the ADR-QD-201 entry; "amended 2026-11-26 (ADR-QD-201: ...)" |
| `spec/behaviors/28-devtools-screens.md` | 1.82 to 1.83 | BEH-QD-776 to BEH-QD-780 new after BEH-QD-773; BEH-QD-759 restated (reducer sentence, Decision line, Pinned by adds the three born test files, closing line "amended by ADR-QD-201 (CCR-QD-480)"); BEH-QD-509 links BEH-QD-776 and BEH-QD-777 |
| `spec/invariants.md` | 1.232 to 1.233 | INV-QD-421 (Source `StopLedger.ts`) and INV-QD-422 (Source `StoppedBox.tsx`) after INV-QD-420 |
| `spec/traceability.md` | 1.332 to 1.333 | ADR-QD-201 row; ADR-QD-197 row amended; BEH-QD-776 to 780 rows in a new section 1 table and in line 70's file 28 list; INV-QD-421 and 422 rows; rows of the three born test files; the BEH-QD-759 row restated; the rows of `DiagnosticsNotice.test.tsx`, `TimelineNotice.test.tsx`, `Simulator.broke.test.tsx` and `surface.tst.ts` |
| `spec/README.md` | 1.413 to 1.414 | the CCR-QD-480 row (every touched document with its revision, the six edited rows and the audit table, the three born files, ARCH-135, `Unused: none`) |

`spec/overview.md`, `spec/devtools-spec/` and `AGENTS.md` equal `phase_base` (no export moves, section 13 not engaged). BEH-QD-781 and INV-QD-423 appear nowhere in the diff since `phase_base`.

## Check lines (as printed)

- `88-check.mjs records --close`: records: the pinned-by lists name tests that exist, and every reserved record is written
- `88-check.mjs scan-ids`: scan-ids: no id or phase wording in added lines
- `pnpm spec:verify:strict`: PASS: 21   FAIL: 0   SKIP: 0
- `pnpm spec:examples`: doc-examples: 122 block(s) compile
- `pnpm spec:claims`: devtools-claims: 8 claim(s) registered across 6 file(s)
- `pnpm spec:gates`: dod-table: 26 step(s) match pnpm check, 183 reference(s) resolve
- `pnpm spec:api`: api-surface: 942 export(s) documented across 9 package(s)
- Task 1, Task 2 and Task 3 verifies each passed as written (exit 0) after their commits; Task 3's included `88-check.mjs trailers` over every commit since `phase_base`.

## Commits

| Task | Commit | Subject |
| ---- | ------ | ------- |
| 1 | 22bf3081 | docs(88-09): record the stop box decision |
| 2 | 4480373e | docs(88-09): state the stop box rules in the behaviors and invariants |
| 3 | 2c3f1565 | docs(88-09): amend the stop ledger decision |

## Deviations from Plan

### Decisions

**1. [Run rules] Date.** The three revisions and the ADR-QD-197 amendment are dated 2026-11-26, the day they were made (the plan's `2026-11-25` is stated as "when run on it").

**2. [Run rules] The ADR-QD-197 traceability row.** Task 3's file list holds no `traceability.md`, so the row's amendment note was written in Task 1 beside the ADR-QD-201 row, where `traceability.md` is already touched.

**3. [Wording] The cost sentence.** The D-06a sentence is verbatim; a following sentence says the base is the ledger as a ref, because "the base" alone names no version in a normative record.

Total deviations: 0 plan defects, 3 decisions.

## State updates

- `node .claude/gsd-core/bin/gsd-tools.cjs query roadmap.update-plan-progress 88` ran: `updated: true`, 9 of 10 summaries, status In Progress; `.planning/ROADMAP.md` is committed with this summary.
- **Denied by the permission check and not retried, and STATE.md was not hand-edited** (it still reads `Plan: 9 of 10`). The one command that carried all five, as sent:
  `gt query state.advance-plan; gt query state.update-progress; gt query state.record-metric --phase 88 --plan 09 --duration "45min" --tasks 3 --files 7; gt query state.add-decision --phase 88 --summary "88-09: ADR-QD-201 records the keyed box, the pure ledger module and one reducer per feed with a six-row audit (Tests removed: 0); ADR-QD-197 amended to 1.5; BEH-QD-776..780 and INV-QD-421..422 written on the reserved numbers only"; gt query state.record-session --stopped-at "Completed 88-09-PLAN.md" --resume-file "None"`
  (`gt` is a shell function for `node .claude/gsd-core/bin/gsd-tools.cjs "$@" < /dev/null`.) `state.advance-plan` was therefore never invoked; the orchestrator must run it once.
- No requirement was marked complete (the run rules leave that to the orchestrator).

## Known Stubs

None.

## Threat Flags

None. Spec text only (T-88-16: `records --close` reads every reserved record and each revision against its base).

## Self-Check: PASSED

- FOUND: spec/decisions/201-a-stop-notices-box-keys-itself-and-owns-the-announce-once-rule.md
- FOUND commits: 22bf3081, 4480373e, 2c3f1565 (each an ancestor of HEAD)
