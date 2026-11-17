---
phase: QD-45-the-audit-circuit-breaker-as-one-transition-function
plan: 07
subsystem: spec
tags: [spec, behaviour, invariant, traceability, ccr]
status: complete
plan_head_before: 2650cf82d29a2a59b4bb979971d0a8d0ac962588
plan_head_after: 90d7c00625bc66fca98bae946fc6db8a619ccddb
commits: 2

requires:
  - phase: QD-45 plan 06
    provides: ADR-QD-158, its traceability rows and the started CCR-QD-436 row
provides:
  - "BEH-QD-561 and the BEH-QD-249/251/379 amendments"
  - "INV-QD-335 and the INV-QD-052 Source restated over run and step"
  - "traceability rows for both, and for the four test files the phase added"
  - "the overview options row naming the refusal; ADR-QD-158 Rev 1.1; the CCR-QD-436 row completed with Used/Unused"
affects: [45-08]

actuals:
  tokens: 14000
  tasks: 2
  commits: 2

key-files:
  modified:
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/decisions/158-the-breakers-rules-are-one-transition-function.md
    - spec/README.md

key-decisions:
  - "The CCR-QD-436 row lists changed files by full path, not brace shorthand, because the plan's check matches each changed path as a substring"

requirements-completed: [WX-02, WX-03]

duration: 12min
completed: 2026-11-15
---

# Phase 45 Plan 07: Spec records Summary

BEH-QD-561 and INV-QD-335 are stated and traced, the old `never` layer type and the pinned zero deadline are gone from the normative text, and every reserved id is either used or named unused in the CCR-QD-436 row.

## Tasks

| Task | Commit | What |
|------|--------|------|
| 1 | `7afe03dd` | BEH-QD-561 (between BEH-QD-379 and BEH-QD-380); BEH-QD-249 fence now `Layer<DecisionSink, InvalidAuditSinkOption, AuditTrailPort>` with note; BEH-QD-251 note (its no-public-error requirement untouched); BEH-QD-379 refuses a zero deadline, keeps the `Duration.infinity` requirement, old paragraph kept in a note; INV-QD-335 last in `invariants.md`; INV-QD-052 Source over `run`/`step` with note; traceability §1/§2/§3/§4 rows |
| 2 | `90d7c006` | overview `AuditDecisionSinkOptions` row; ADR-QD-158 Related; CCR-QD-436 row names 24 changed files and ends `Used: ARCH-92, ADR-QD-158, CCR-QD-436, BEH-QD-561, INV-QD-335. Unused: BEH-QD-562 to BEH-QD-565 and INV-QD-336 (no other statement was needed).` |

## Revisions reached

| Document | Revision |
|----------|----------|
| `spec/behaviors/33-audit-pipeline.md` | 1.19 to 1.20 |
| `spec/invariants.md` | 1.126 to 1.127 |
| `spec/traceability.md` | 1.187 to 1.188 |
| `spec/overview.md` | 1.110 to 1.111 |
| ADR-QD-158 | 1.0 to 1.1 |
| `spec/README.md` | 1.189 to 1.190 |

## Verification

- `pnpm typecheck`: clean. `pnpm spec:examples`: `115 block(s) compile` (the new BEH-QD-561 fence is the extra one).
- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0` after each task. `spec-revise --check`: every Revision matches its newest entry.
- `pnpm spec:api`: `928 export(s) documented across 9 package(s)`; no export added or removed in this plan.
- Task 1 structural check: `BEH-QD-561, INV-QD-335, the amendments and every row in place`. Task 2 structural check: `overview, ADR-QD-158 Rev 1.1 and the CCR-QD-436 row complete (24 files named)`.
- `git diff --name-only 2650cf82 HEAD` is the six spec files only: no src, test, script, AGENTS.md or ADR-QD-056 change.

## Deviations from Plan

None. The plan executed as written.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- FOUND commits: 7afe03dd, 90d7c006
- FOUND: BEH-QD-561 heading once, INV-QD-335 last section, no heading for BEH-QD-562..565 or INV-QD-334/336
