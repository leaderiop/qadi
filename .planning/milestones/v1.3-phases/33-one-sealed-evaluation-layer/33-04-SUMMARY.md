---
phase: 33-one-sealed-evaluation-layer
plan: 04
subsystem: spec
tags: [adr, invariants, behaviours, evaluation-environment, shadowing, clock]
requires: [33-03]
provides:
  - "ADR-QD-146 (Rev 1.0, Accepted, amends ADR-QD-050) and its index entry"
  - "ADR-QD-050 Rev 1.5 amendment (2026-11-12)"
  - "INV-QD-042 restated; INV-QD-311, INV-QD-312"
  - "BEH-QD-501..503 (06-services), BEH-QD-226 restated, BEH-QD-504..505 (29-devtools-simulator)"
affects: [33-05]
tech-stack:
  added: []
  patterns: ["spec-revise bump per revised document; hand bump for (draft) devtools-spec documents"]
key-files:
  created:
    - spec/decisions/146-one-evaluation-environment-states-its-shadowing.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/050-a-simulation-is-sealed.md
    - spec/invariants.md
    - spec/behaviors/06-services.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/devtools-spec/00-overview.md
    - spec/devtools-spec/02-screens.md
key-decisions:
  - "ADR-QD-050's body is untouched; the testing clock literal is corrected by a new amendment, not a rewrite"
  - "Doc 29's duplicated shadowing paragraph is edited identically in both copies; the duplication is left for its owner"
  - "INV-QD-312 cites stryker.config.mjs as mutating the module because it globs packages/core/src/**, with no per-file entry"
requirements-completed: [SEAL-02]
phase_base: a201e2fbc09660c3d49e56d8a1936d0ccc663a28
commits: 2
plan_head_before: 519109254ba917044e5bd6b6fb83c1fe520392f2
plan_head_after: 3e7a8b3e7a2f4777f20cfa5ce266ca1f187ddf04
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
duration: 20 min
completed: 2026-11-12
status: complete
---

# Phase 33 Plan 04: Spec records for the one evaluation environment Summary

ADR-QD-146, the ADR-QD-050 amendment, INV-QD-042 restated, INV-QD-311..312 and BEH-QD-501..505 record that the seal is the simulator's `shadow: "sinkAndCache"` choice of core's `evaluationEnvironment` and that the clock is core's `EvaluationClock`.

## Commits

- d8468f19: docs(33-04): ADR-QD-146, one evaluation environment states its shadowing (3 files)
- 3e7a8b3e: docs(33-04): the seal and the clock restated on the one evaluation environment (5 files)

Both end with the `Co-Authored-By: Claude Opus 5.5` trailer (checked with `git log -1 --format=%B`).

## New revisions

| Document | Revision |
| -------- | -------- |
| `spec/decisions/146-…` | 1.0 (new) |
| `spec/decisions/050-a-simulation-is-sealed.md` | 1.4 to 1.5 |
| `spec/invariants.md` | 1.110 to 1.111 |
| `spec/behaviors/06-services.md` | 1.12 to 1.13 |
| `spec/behaviors/29-devtools-simulator.md` | 1.14 to 1.15 |
| `spec/devtools-spec/00-overview.md` | 0.8 to 0.9 (draft, by hand) |
| `spec/devtools-spec/02-screens.md` | 0.16 to 0.17 (draft, by hand) |

## Results

- Both tasks' automated verify scripts: `V1 OK`, `V2 OK`.
- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry.
- `pnpm spec:examples`: `doc-examples: 110 block(s) compile`.
- `pnpm spec:claims`: `devtools-claims: 8 claim(s) registered across 6 file(s)`.
- `pnpm spec:gates`: `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve`.
- `node scripts/check-house-style.mjs`: `470 file(s) clean (3 declared switch(es))`.
- `pnpm spec:verify` (non-strict): 18 pass, 3 fail, all owned by 33-05: `invariants -> traceability` (INV-QD-311, INV-QD-312), `decisions -> traceability` (ADR-QD-146) and `CCR register coverage` (CCR-QD-424 is not in the register yet). `pnpm spec:api` and `spec:verify:strict` not run, per the plan.

## Deviations from Plan

None - plan executed exactly as written.

Note: `spec/overview.md:878` still lists `SimulationClock`; it is in the out-of-scope set 33-05 owns.

## Self-Check: PASSED

- ADR-QD-146 file, both commits (`d8468f19`, `3e7a8b3e`) present in history; all five revision headers agree with their newest history entry.
