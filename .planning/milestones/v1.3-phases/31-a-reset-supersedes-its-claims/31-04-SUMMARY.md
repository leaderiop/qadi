---
phase: 31-a-reset-supersedes-its-claims
plan: 04
subsystem: spec
tags: [spec, adr, behaviours, invariants, traceability, changeset]
requires: [31-03]
provides:
  - "ADR-QD-132 amended (Rev 1.1): the staleness rule moves into SharedComputation's standing"
  - "BEH-QD-491 (spec/behaviors/21-decision-cache.md Rev 1.9); BEH-QD-439 names the superseded state"
  - "INV-QD-307 (spec/invariants.md Rev 1.110); INV-QD-025 Enforcement restated"
  - "traceability Rev 1.155 and README Rev 1.159 (CCR-QD-422 row); .changeset/shared-computation-reset-supersedes.md"
affects: [31-05]
tech-stack:
  added: []
  patterns: ["spec-revise per document, once; amendment appended to an ADR, status row untouched"]
key-files:
  created:
    - .changeset/shared-computation-reset-supersedes.md
  modified:
    - spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md
    - spec/behaviors/21-decision-cache.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-144 stays unused: a reset is a second cause of the same decision, so ADR-QD-132 is amended"
  - "The README behaviour index row for 21 gains BEH-QD-439 as well as BEH-QD-491, which it had omitted"
requirements-completed: [SUPR-05]
duration: 15 min
completed: 2026-11-12
status: complete
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
plan_head_before: d143fc041ab0d6fcc031ea4a582218096369d339
plan_head_after: 7b97968ca3636e1da15663eea2ea4161db8f5271
commits: 2
---

# Phase 31 Plan 04: Writing the staleness rule down Summary

The rule that a reset supersedes its claims is now recorded where `spec/` readers look for it: an ADR-QD-132
amendment, BEH-QD-491, BEH-QD-439 and INV-QD-025 restated, INV-QD-307, the traceability and register rows, and one
`@qadi/core` patch changeset. Prose only; no code fence was added and no source file was touched.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1. ADR, behaviours, invariants | `4fbff641` docs(31-04): a reset supersedes its claims, in the ADR, the behaviours and the invariants | decisions/132, behaviors/21, invariants |
| 2. traceability, register, changeset | `7b97968c` docs(31-04): trace a reset that supersedes its claims; CCR-QD-422 and the core changeset | traceability, README, changeset |

## New revisions

| Document | Revision |
| -------- | -------- |
| spec/decisions/132-a-shared-computation-is-joinable-only-while-awaited.md | 1.1 |
| spec/behaviors/21-decision-cache.md | 1.9 |
| spec/invariants.md | 1.110 |
| spec/traceability.md | 1.155 |
| spec/README.md | 1.159 |

## Reserved numbers

Used: ARCH-79, BEH-QD-491, INV-QD-307, CCR-QD-422. Named Unused in CCR-QD-422's row: ADR-QD-144 (ADR-QD-132
amended instead), BEH-QD-492..495, INV-QD-308. `node scripts/next-id.mjs` was never run.

## Verification

Task 1: `spec-revise --check`, `spec:examples` (108 blocks compile), and the plan's eight-check content script, green.
Task 2: `spec:api` (no drift, 911 exports), `spec:examples`, `spec:verify:strict` (21 pass, 0 fail), `spec:gates`,
`spec:claims`, `spec-revise --check`, the eighteen-check traceability/README/changeset script, and the reserved-id
and frozen-file script against `phase_base` 7d89747a, all green. `spec/overview.md`, `upgrading.md`, every
`package.json` and every `CHANGELOG.md` are unchanged since the phase base; no `changeset version` was run.

## Deviations from Plan

None - plan executed exactly as written. (One in-task correction: a test title in BEH-QD-491's Enforcement paragraph
was first wrapped across two lines and the plan's verify, which matches titles verbatim, caught it; the paragraph was
rewrapped so each title is on one line before the first commit.)

## Known Stubs

None.

## Self-Check: PASSED

Both commits exist (`4fbff641`, `7b97968c`); the changeset file exists; the five documents' newest revision is a
2026-11-12 CCR-QD-422 entry.
