---
phase: QD-59-admission-produces-the-one-walk-environment
plan: 07
subsystem: spec
tags: [adr, records, benchmark, mutation, wenv]
requires: [59-01, 59-04, 59-05, 59-06]
provides:
  - "ADR-QD-172 with the gate-of-record and after-run benchmark tables (70 rows copied from 59-BENCH.md) and the mutation table computed from the JSONs"
  - "ADR-QD-100 Rev 1.4, ADR-QD-163 Rev 1.9 and ADR-QD-024 amended for the walk environment"
affects: [59-08, 59-09, 59-10]
actuals:
  tokens: 21000
  tasks: 2
  commits: 2
plan_head_before: 1d0c5a07fec69364af9c28e77d0782ce1c450892
plan_head_after: f176abbc
key-files:
  created:
    - spec/decisions/172-admission-produces-the-one-walk-environment.md
    - .planning/phases/QD-59-admission-produces-the-one-walk-environment/59-07-SUMMARY.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/100-a-question-is-asked-once.md
    - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
    - spec/decisions/024-predicate-output.md
key-decisions:
  - "The benchmark and mutation tables were produced by script from 59-BENCH.md and the two JSONs, never typed"
  - "The ADR records the walk's own depth guard as kept defence in depth, pinned by WalkDepthGuard.test.ts (c518b5b8), per the 59-06 finding"
requirements-completed: [WENV-01, WX-02]
duration: 8min
completed: 2026-11-19
status: complete
---

# Phase QD-59 Plan 07: ADR-QD-172 and the three amendments

**ADR-QD-172 records the walk-environment decision with the gate's and the after-run's 35-row benchmark tables and the three-file mutation table, and ADR-QD-100, ADR-QD-163 and ADR-QD-024 are amended to point at it with no body line removed.**

`commits: 2` are the two `docs(59-07)` task commits; the SUMMARY commit is separate and cannot name itself. Started about 04:58Z, finished 2026-11-19T05:07Z.

## ADR-QD-172

Commit `1a7f49f4` `docs(59-07): ADR-QD-172, admission produces the one walk environment`: exactly `spec/decisions/172-admission-produces-the-one-walk-environment.md` and `spec/decisions/index.yaml` (the entry directly after ADR-QD-171's), trailer last.

- Document Control as ADR-QD-171's shape: `QADI-ADR-172`, Rev 1.0, 2026-11-19, `Accepted — amends ADR-QD-024, ADR-QD-100, ADR-QD-163`, change history `1.0 (2026-11-19): Initial release (ARCH-106, CCR-QD-450)`.
- Sections Context, Decision (D-01, D-02, D-03, D-12, D-13, D-14, D-15, D-16 cited), Benchmark, Alternatives rejected, Mutation, Consequences, Related.
- Benchmark: the method (D-04), the gate of record's result line and 35-row table, the 5 + 5 confirmation's summary, the statement that D-05's rejection path was not taken (D-11), then the after-run's host and load summary, result line and 35-row table. Both tables were inserted by script from `59-BENCH.md`; the verify found all 70 rows byte for byte.
- Mutation table (computed from `59-mutation-base.json` and `59-mutation-after.json`):

| File | Base | After |
| ---- | ---- | ----- |
| `Admission.ts` | 1 (6/6) | 1 (15/15) |
| `Predicate.ts` | 1 (284/284) | 1 (280/280) |
| `Walk.ts` | 0.9498 (265/279) | 0.9524 (260/273) |

  The section records the 59-06 finding the orchestrator named: the walk's own `depth > maxDepth` guard is unreachable through `evaluate` since admission proves the bound, it is kept as defence in depth, and `WalkDepthGuard.test.ts` (`c518b5b8`) pins it. It ends with the sentence `The comparison printed \`WX-05 holds (D-15)\`.`
- It links no anchor of BEH-QD-631..635 or INV-QD-363..364 (59-08 writes them); every relative link resolves.

## Amendments

Commit `f176abbc` `docs(59-07): ADR-QD-100, ADR-QD-163 and ADR-QD-024 amended for the walk environment`: exactly the three files, trailer last.

- ADR-QD-100: Rev 1.3 to **1.4** through `spec-revise --date 2026-11-19`; Status cell gains `; amended 2026-11-19 (ADR-QD-172)`; `## Amendment (2026-11-19, ADR-QD-172, CCR-QD-450)` at the end states that `Admitted` is the walk environment and `admit` takes the row source (`"asked"`, `"row"`).
- ADR-QD-163: Rev 1.8 to **1.9** the same way; Status cell amended; the amendment states that the two hand-built `supplied` literals are gone (`RESOURCE_SUPPLIED`), their killed mutants moved to `Admission.ts`, and `absenceOf` and Decision 2 are unchanged (`Admitted<true>`).
- ADR-QD-024 (no Document Control): the same-headed amendment with `[ADR-QD-172](./172-admission-produces-the-one-walk-environment.md): the two walks stay two`; Status line untouched; no `spec-revise`.
- Task 2's verify: no body line of the three removed against the ADR-QD-172 commit; `spec-revise --check` passes.

## Deviations from Plan

None - plan executed exactly as written. The ADR was written with table placeholders and the three tables were filled by a script reading `59-BENCH.md` and the JSONs, so no number was typed.

## Known Stubs

None.

## Threat Flags

None. Documents only.

## Next Phase Readiness

59-08 writes BEH-QD-631..635, INV-QD-363..364, the INV-QD-037 update and the traceability rows, which ADR-QD-172 names as plain ids. `.planning/config.json` carries its pre-existing unrelated modification and was never staged.

## Self-Check: PASSED

`spec/decisions/172-admission-produces-the-one-walk-environment.md` exists; `1a7f49f4` and `f176abbc` are ancestors of HEAD; Task 1's and Task 2's verifies exit 0; `node scripts/spec-revise.mjs --check` passes.
