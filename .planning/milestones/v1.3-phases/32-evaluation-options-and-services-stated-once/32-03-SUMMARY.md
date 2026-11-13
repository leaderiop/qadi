---
phase: 32-evaluation-options-and-services-stated-once
plan: 03
subsystem: spec
tags: [spec-records, adr-revision-note, traceability, changeset]
requires: [32-02]
provides:
  - "ADR-QD-105 and ADR-QD-037 revision notes (2026-11-12, ARCH-80, CCR-QD-423)"
  - "overview, services behaviour and traceability naming Question.ts and EvaluationServices.ts"
  - "CCR-QD-423 register row; one @qadi/core patch changeset"
affects: [32-04]
key-files:
  created:
    - .changeset/evaluation-options-stated-once.md
  modified:
    - spec/decisions/105-an-obligation-is-discharged-against-the-question-it-answered.md
    - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
    - spec/behaviors/06-services.md
    - spec/overview.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-081's paragraph naming Evaluate.ts as the home of StandingEvaluationServices is history; left as written and named in CCR-QD-423 for Phase 36"
requirements-completed: [EOPT-04, WX-02, WX-03, WX-07]
phase_base: 4a53454577f080ad0dd5d9a7bb6e9e14254e8977
commits: 2
plan_head_before: 8fae5b615d01125483a4f45444dd746d9787fa57
plan_head_after: 6d7d6a9f4d6d4075a72a1745010beb0ee43dc087
actuals:
  tokens: 6000
  tasks: 2
  commits: 2
duration: 10 min
completed: 2026-11-12
status: complete
---

# Phase 32 Plan 03: Spec records for the evaluation options and services move Summary

The move is written down: two ADR revision notes, the services behaviour, the overview's module column, six traceability rows, the CCR-QD-423 register row and one `@qadi/core` patch changeset, using only the reserved numbers.

## New revisions (printed by spec-revise)

| Document | Revision |
|---|---|
| spec/decisions/105-...md | 1.1 -> 1.2 |
| spec/decisions/037-...md | 1.4 -> 1.5 |
| spec/behaviors/06-services.md | 1.11 -> 1.12 |
| spec/overview.md | 1.96 -> 1.97 |
| spec/traceability.md | 1.155 -> 1.156 |
| spec/README.md | 1.159 -> 1.160 |

## Reserved numbers

Used: ARCH-80, CCR-QD-423. Named Unused in CCR-QD-423's row: ADR-QD-145, BEH-QD-496..500, INV-QD-309..310.

## Commits

- 882deb67: docs(32-03): the option and service types stated once, in ADR-QD-105, ADR-QD-037 and the services behaviour
- 6d7d6a9f: docs(32-03): the new declaring modules in the overview and traceability; CCR-QD-423 and the core changeset

Both end with the `Co-Authored-By: Claude Opus 5.5` trailer.

## Verification

`pnpm spec:api` (911 exports, no drift), `pnpm spec:examples`, `pnpm spec:verify:strict` (21 pass, 0 fail), `pnpm spec:gates`, `pnpm spec:claims` and `spec-revise --check` pass. Task 1's second verify, and Task 2's second and third verifies (reserved ids only; upgrading.md, package.json and CHANGELOG.md untouched since phase_base) pass.

## Deviations from Plan

None - plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

Changeset exists; both commits are ancestors of HEAD.
