---
phase: QD-89-one-admission-step-for-a-host-s-audit-batch
plan: 10
subsystem: spec
tags: [spec, adr, behaviors, invariants, traceability, audit]

phase_base: 8ee14f6f703f3121d44d15a1515d02eff62ca63f
plan_head_before: 744969a0e4c99fc2b65f72ddd076a80c272474b5
plan_head_after: 147c6dade55d9b47c098921f1c3aa68c8ef714c1
commits: 3
status: complete

requires:
  - phase: QD-89-one-admission-step-for-a-host-s-audit-batch
    provides: HostBatch.ts and the four entry points admitting through it, the test files, the mutation close and the changeset (plans 01 to 09), 89-check.mjs records and 89-earlier-checks.mjs
provides:
  - ADR-QD-202 at Revision 1.0, with its audit table of six removed rows and Tests removed 6
  - BEH-QD-781 to BEH-QD-785 after BEH-QD-722, which is restated; BEH-QD-253 and BEH-QD-254 link BEH-QD-781
  - INV-QD-423 and INV-QD-424, and the Source lines of INV-QD-399 and INV-QD-400 naming HostBatch.ts
  - ADR-QD-190 at 1.7 (fourth amendment, notes under decisions 2 and 3) and ADR-QD-110 at 1.4 (notes on the span and on who refuses the rows)
  - the index entry, the traceability rows and the CCR-QD-481 row
affects: [QD-89 plan 11, the phase close]

requirements-completed: []

actuals:
  tokens: 59000
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "an ADR audit table whose every row names an id that opens an audit test title, so records --close reads it"
    - "an amendment to an earlier decision as a dated note inside the item it makes false, and a dated section at the end"

key-files:
  created:
    - spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md
    - .planning/phases/QD-89-one-admission-step-for-a-host-s-audit-batch/89-10-SUMMARY.md
  modified:
    - spec/decisions/190-an-audit-row-is-a-value-only-its-codec-makes.md
    - spec/decisions/110-an-archives-facts-are-computed-once.md
    - spec/decisions/index.yaml
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md

key-decisions:
  - "The span rule is the ADR's own decision 7, with a table of every call and outcome, so the two refusal trace flips and the unchanged traces sit in one place."
  - "BEH-QD-722 keeps its sentences and gains links to BEH-QD-781, a ts listing of the two fragments, one REQUIREMENT for the rows read once and a Pinned-by paragraph that names the four new files."
---

# Phase 89 Plan 10: The records Summary

**ADR-QD-202 records the one admission step for a host's audit batch with its audit table (`Tests removed: 6`), BEH-QD-781 to BEH-QD-785 and INV-QD-423 and INV-QD-424 state its rules, BEH-QD-722, BEH-QD-253, BEH-QD-254, INV-QD-399 and INV-QD-400 and the two archive decisions are restated or amended where the step makes them false, and the index, traceability and CCR-QD-481 rows carry every document at its revision.**

## Performance

- **Started:** 2026-11-26T03:53Z; **Completed:** about 04:10Z (roughly 17 minutes)
- **Tasks:** 3 (one tracer, two auto); three plan commits plus the summary commit
- **Files:** 1 spec document created, 7 spec documents edited; nothing under `packages`, `.changeset` or `spec/overview.md` changed, and `AGENTS.md` did not move

## Accomplishments

- **Tracer (Task 1, `bca3d091`):** ADR-QD-202 at Revision 1.0 with Context, nine decisions (the package-private module and its imports, the plain `Result` with the two closed batch shapes, the one order, `AdmittedRows` minted only by the step, the read-once rule and the null-policy refusal, `NowRefusalCases` stated once, the span rule with a table of every call and outcome, each entry point admitting first, the order tested once), the audit table, Alternatives considered (eleven, each with its reason), Consequences, What enforces it (commands and test files, no gate numbers, no script path) and Related. The index entry, the ADR-QD-202 row of traceability section 3 and the CCR-QD-481 row (every touched document at its final revision, `Unused: none`) are in the same commit. The audit table has one row for each of the six removed titles, verbatim, naming the `HostBatch.test.ts` rows that hold it (H7 and H8; H6, H9 and H10; H7 and H9; H6 and H10; H5; H6) and the `ForeignRows.test.ts` comparison row that proves the entry point calls the step, followed by `Tests removed: 6.`
- **Behaviors and invariants (Task 2, `eba5d3ac`):** BEH-QD-781 (the one order and the entry points admitting first, with the `ts` fence of `admitBatch` and `admitRows`), BEH-QD-782 (each entry point refuses what the step refuses, pinned by the four comparison rows), BEH-QD-783 (the sequence span opens only for admitted rows, with the success traces unchanged), BEH-QD-784 (`NowNotFinite` shared by both enums, with the `ts` fence of the fragments and both enums) and BEH-QD-785 (`maxAgeMs` read once and a policy that is not an object refused), each with a Pinned-by paragraph naming files and row ids that exist. BEH-QD-722's order REQUIREMENTs point to BEH-QD-781, its `ts` listing shows `NowRefusalCases` and `RowsRefusalCases`, it gains a REQUIREMENT for the rows read once, and its Pinned-by names `AdmissionOrder.characterisation.test.ts`, `HostBatch.test.ts`, `HostBatch.tst.ts` and `ForeignRows.test.ts`. BEH-QD-253 and BEH-QD-254 each link BEH-QD-781. INV-QD-423 and INV-QD-424 follow INV-QD-422 in the house format, and the Source lines of INV-QD-399 and INV-QD-400 name `HostBatch.ts`. Traceability gained the section 1 block for the five behaviors and the restated BEH-QD-722 row, the line-75 range, the section 2 rows, the section 4 rows for the four born test files and the restated `ForeignRows.test.ts`, `Retention.test.ts` and `AuditArchive.test.ts` rows.
- **Amendments (Task 3, `147c6dad`):** ADR-QD-190 at 1.7 with a dated Fourth amendment (`NowNotFinite` joins the discipline of `RowsRefusalCases` as `NowRefusalCases`; the rows are asked once, by the step; decision 5 still stands) and dated notes under decisions 2 and 3; ADR-QD-110 at 1.4 with the dated note on the span keeping its name and a second under the amendment of 2026-11-24; both index statuses and both Document Control statuses name ADR-QD-202.

## Task Commits

1. Task 1 (tracer): `bca3d091980bd335045c9f14f2dc2df8aa101957` `docs(89-10): record the admission step decision` (ADR-QD-202, `index.yaml`, `traceability.md`, `README.md`)
2. Task 2: `eba5d3ac9b6d5b81509ad30c72149355be2a3f45` `docs(89-10): state the admission rules in the behaviors and invariants` (`33-audit-pipeline.md`, `invariants.md`, `traceability.md`)
3. Task 3: `147c6dade55d9b47c098921f1c3aa68c8ef714c1` `docs(89-10): amend the archive decisions` (ADR-QD-190, ADR-QD-110, `index.yaml`)

## Revisions at the end of the plan

`spec/README.md` 1.415, `spec/traceability.md` 1.334, `spec/invariants.md` 1.234, `spec/behaviors/33-audit-pipeline.md` 1.33, ADR-QD-190 1.7, ADR-QD-110 1.4, ADR-QD-202 1.0; each is exactly one above `phase_base` (new for ADR-QD-202).

## Deviations from Plan

### Auto-fixed Issues

None.

### Plan notes (choices the plan left open, taken as the most complete and clean)

- **The Task 1 commit was amended once, before any later commit existed.** After writing the invariants I found two sentences of ADR-QD-202 that misstated the base read count of `maxAgeMs` (one read to check it, one to name a refused value and one per row; the count on a valid policy is one plus one per row, and two for a refused one). The two sentences were corrected and the commit amended with `git commit --amend --no-edit` (hash `57f1642b` became `bca3d091`), nothing else staged; nothing had been pushed and no later commit was based on it. The Task 1 verify was run again after the amend, against the amended commit, and passes.
- **The CCR-QD-481 row says ADR-QD-110 gets "a dated note"; it holds two** (the span note under its decision and one under its amendment of 2026-11-24, the place D-22a names). The row is in the Task 1 commit and the plan limits Task 3 to three paths, so the count in the row stays as written; the two notes are both dated and both point to ADR-QD-202.
- **INV-QD-399's statement and its Enforcement line were edited as well as its Source line.** The statement gained one sentence (the rows archived are the rows checked, a list read once) and the Enforcement line lost the words "with the order `now`, `keyMaterial`, `entries`", since `ForeignRows.test.ts` no longer asserts the order, and gained `BatchReadOnce.test.ts` B6. INV-QD-400's Source names the step as the reader of `rowsRefusal`. Both were false otherwise.
- **The traceability rows of ADR-QD-190 and ADR-QD-110 (section 3) say "amended again by ADR-QD-202"**, in the Task 2 commit, since the Task 3 commit is limited to three paths.
- **The `<automated>` blocks were extracted from the plan by a script and run as files** (`bash <file>`), verbatim; none contains `rm`. The plan commit ledger (protocol 0c) was written before the first commit.
- **The state updates were run after this summary was written**, once each; see the list of denied commands below.

### Auth gates

None.

## Issues Encountered

None.

## Next Phase Readiness

- Plan 11 closes the phase: every reserved record is written once and named in the CCR-QD-481 row, `records --close`, the five spec gates, `scan-ids`, `trailers` and the earlier-phase ledger pass, and no record past the reservation appears in the diff since `phase_base`.

## Known Stubs

None.

## Threat Flags

None. T-89-28 is mitigated by `records --close` (each heading, link, Source line, revision and the audit table) and `pnpm spec:verify:strict`; T-89-29 by the diff check for BEH-QD-786, INV-QD-425, ADR-QD-203, CCR-QD-482 and ARCH-137 and because `next-id.mjs` was never run.

## Denied commands

None.

## Self-Check: PASSED

- `spec/decisions/202-one-admission-step-for-a-hosts-audit-batch.md` and this summary exist; `bca3d091`, `eba5d3ac` and `147c6dad` are ancestors of HEAD, each ending with exactly one `Co-Authored-By: Claude Opus 5.5` trailer; `git rev-list --count 744969a0..HEAD` is 3 before the metadata commit.
- Task 1 verify (`v89-10-t1.sh`, run again after the amend): exit 0. Task 2 verify (`v89-10-t2.sh`): exit 0. Task 3 verify (`v89-10-t3.sh`): exit 0 (`records --close`, the five spec gates, `scan-ids`, `trailers`, the diff check for records past the reservation, `AGENTS.md` and `spec/overview.md` unchanged, the earlier-phase ledger).
- `node 89-earlier-checks.mjs` exits 0 with Phase 88's `records --close` row computed from the three fixed subjects; `89-check.mjs trailers`: 31 commits since `phase_base`, each with the one trailer; no `.vitest/` is left.
