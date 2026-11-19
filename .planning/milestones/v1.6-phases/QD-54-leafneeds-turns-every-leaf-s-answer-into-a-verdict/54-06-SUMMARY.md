---
phase: QD-54-leafneeds-turns-every-leaf-s-answer-into-a-verdict
plan: 06
subsystem: spec
tags: [adr-qd-167, beh-qd-606, beh-qd-610, spec-revise]
phase_base: afdd8d9cd9701405d426089a19dda17fbc921c90
plan_head_before: 6ce648526f8026a917b5b56d6697bd9dd5465f85
plan_head_after: 6be4d7a65bc21fe20fe4de31b881f813849d559a
requires: ["54-05"]
provides:
  - "ADR-QD-167 with the mutation numbers, the static-ignored credit ruling and the bench"
  - "BEH-QD-606..610"
affects: [54-07, 54-08]
key-files:
  created:
    - spec/decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md
    - spec/decisions/020-decision-history-port.md
    - spec/decisions/024-predicate-output.md
    - spec/behaviors/05-evaluator.md
    - spec/behaviors/12-history.md
    - spec/behaviors/16-predicates.md
    - spec/behaviors/06-services.md
    - spec/behaviors/04-matchers.md
key-decisions:
  - "ADR-QD-167 records the orchestrator-authorised D-10 refinement (static-ignored credit) as its own section, open to user review"
requirements-completed: [VERD-04, WX-02]
duration: 14 min
completed: 2026-11-18
status: complete
commits: 2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase 54 Plan 06: ADR-QD-167 and BEH-QD-606..610 Summary

ADR-QD-167 records one closed verdict row per leaf tag, the D-10 mutation numbers with the orchestrator's static-credit ruling, and the informational bench; BEH-QD-606..610 put the behaviour in five documents, each revised once.

## Records written

| Document | Revision | Change |
|---|---|---|
| `spec/decisions/167-each-leafs-answer-becomes-a-verdict-in-one-row.md` | 1.0 | new (ADR-QD-167, Status "Accepted — extends ADR-QD-163; keeps ADR-QD-020, ADR-QD-024") |
| `spec/decisions/index.yaml` | n/a | ends with the ADR-QD-167 entry |
| `spec/decisions/163-…` | 1.7 -> 1.8 | amendment heading, spec-revise |
| `spec/decisions/020-…`, `024-…` | no revision (old headers) | amendment heading and link |
| `spec/behaviors/05-evaluator.md` | 1.15 -> 1.16 | BEH-QD-606 |
| `spec/behaviors/12-history.md` | 1.1 -> 1.2 | BEH-QD-607 (links INV-QD-354) |
| `spec/behaviors/16-predicates.md` | 1.7 -> 1.8 | BEH-QD-608 |
| `spec/behaviors/06-services.md` | 1.14 -> 1.15 | BEH-QD-609 |
| `spec/behaviors/04-matchers.md` | 1.8 -> 1.9 | BEH-QD-610 |

ADR-QD-167's `## Mutation` carries each file's base and after `(detected/scored)` from the committed JSONs: LeafNeeds 52/53 -> 78/79, Predicate 293/293 -> 284/284, Walk 292/308 -> 264/279. Its `## Bench` copies 54-05's p50 table (1.02x to 1.09x, information only). Its `### The static-ignored credit` section records the orchestrator ruling: the 26 gained against 28 left, the ignored deltas (Walk +11, LeafNeeds +16, Predicate +0), the static-run kills (LeafNeeds 23/23, Predicate 22/22, Walk 27/27), and that `stryker.config.mjs` and the base JSON were untouched. It is marked an orchestrator-authorised refinement of D-10, open to user review, not a re-baseline.

## Reserved numbers used so far

ADR-QD-167; BEH-QD-606, 607, 608, 609, 610; citations ARCH-101 and CCR-QD-445. INV-QD-353 and INV-QD-354 are cited (anchors only) and land in 54-07, so BEH links to them resolve after that plan. `next-id` was never run.

## Commits

- `39b89bd5` `docs(54-06): ADR-QD-167, each leaf's answer becomes a verdict in one row`
- `6be4d7a6` `docs(54-06): BEH-QD-606..610`

## Verification

- Task 1 verify (recomputed mutation numbers, index tail, three amendments, Revision 1.8, no diff in `scripts/check-house-style.mjs` or AGENTS.md since `phase_base`): OK. `spec-revise --check`: OK.
- Task 2 verify (one heading each, REQUIREMENT, ADR link, Invariant line, INV-QD-354 link, typescript/tsx fence counts unchanged): OK. `spec-revise --check` OK; `pnpm spec:examples`: 116 blocks compile.
- `node 54-mutation.mjs compare 54-mutation-static.json`: `WX-05 holds (D-10)` (the precondition's `compare` call).

## Deviations from Plan

**1. [Orchestrator ruling] The precondition's `compare` takes the static evidence path**
- The plan's precondition runs `54-mutation.mjs compare`; per the orchestrator it was run as `compare .../54-mutation-static.json`, which grants the static credit (without the path it exits 1 by design). The plan's check that `54-mutation.mjs` is unchanged since `chore(54-01)` is superseded by the ruling and was not run; the change (commit `0c917fdf`) is expected.
- ADR-QD-167 therefore carries the ruling as its own section.

**2. [Environment] Phase base read from 54-05-SUMMARY**
- The verifies read `phase_base` from `54-01-SUMMARY.md`; the same SHA (`afdd8d9c…`) is in 54-05-SUMMARY, which was used for the repo-diff checks.

**Total deviations:** 2, both procedural. **Impact:** none on the records.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- ADR-QD-167 file present; `39b89bd5` and `6be4d7a6` are ancestors of HEAD, each ending with the trailer.
- No source, test, script or AGENTS.md change; `.planning/config.json` left unstaged.
