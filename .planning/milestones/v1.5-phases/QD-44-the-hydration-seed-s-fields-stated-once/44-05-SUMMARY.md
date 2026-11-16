---
phase: QD-44-the-hydration-seed-s-fields-stated-once
plan: 05
phase_base: e7e896589864fc005144d433ae84054875f2a0f9
subsystem: spec-records
tags: [behaviour, invariant, traceability, overview, ccr]
requires: ["44-04"]
provides:
  - "BEH-QD-556 and INV-QD-333; dated CCR-QD-435 notes on BEH-QD-148, INV-QD-022 and INV-QD-059"
  - "traceability rows (section 1, 2, 4), the overview's SeededAllow/SeededDeny row, ADR-QD-157 Rev 1.1"
  - "the CCR-QD-435 row completed: every file, every Rev, the Used/Unused sentence"
affects: [44-06]
tech-stack:
  added: []
  patterns: ["dated amendment notes, history rows appended only"]
key-files:
  created: []
  modified:
    - spec/behaviors/19-hydration.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md
    - spec/README.md
decisions:
  - "INV-QD-333 is used; BEH-QD-557 to BEH-QD-560 and INV-QD-334 are named unused in the CCR row"
metrics:
  duration: "about 15 minutes"
  completed: 2026-11-15
status: complete
commits: 2
plan_head_before: 3dc19182b85038821a02cb85e778aae9d9fe470f
plan_head_after: 308f54ed67d463457db1725f40a1b3dba0ad78ba
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
---

# Phase 44 Plan 05: The hydration seed's fields, recorded Summary

BEH-QD-556 and INV-QD-333 state what the code now guarantees (a seed carries every field the payload discloses; a seed's fields are the wire's), the older statements that named the moved structure carry dated notes, and the CCR-QD-435 row is the phase's file-level account.

## Revisions now carried

| Document | Revision |
|---|---|
| `spec/behaviors/19-hydration.md` | 1.21 to 1.22 (BEH-QD-556 added between BEH-QD-148 and BEH-QD-149; BEH-QD-148 note) |
| `spec/invariants.md` | 1.123 to 1.124 (INV-QD-333 appended; INV-QD-022 and INV-QD-059 notes) |
| `spec/traceability.md` | 1.182 to 1.183 to 1.184 |
| `spec/overview.md` | 1.108 to 1.109 (`SeededAllow`, `SeededDeny` row only) |
| `spec/decisions/157-a-seeds-fields-are-the-wires-stated-once.md` | 1.0 to 1.1 (Related: BEH-QD-556, INV-QD-333) |
| `spec/README.md` | 1.185 to 1.186 (CCR-QD-435 row completed) |

The CCR-QD-435 row names 19 files (every path in `git diff --name-only phase_base -- . ':!.planning'` plus `spec/README.md`, which was already in the diff), and every spec Rev it names equals the document's Revision (checked with the plan's own script). It ends with the exact `Used: ... Unused: BEH-QD-557 to BEH-QD-560 and INV-QD-334 (no other statement was needed).` sentence.

## Why no existing invariant covers INV-QD-333

INV-QD-022 states the subject binding and strict validation of an entry, INV-QD-059 that a seed never claims a trace it was not given, and INV-QD-170 that a decision agrees with its trace. None says a seed carries every wire field the payload discloses, which is the defect ARCH-91 closed (a field dropped in `rebuild` while everything compiled). INV-QD-045 (accounting) is about counting, not fields.

## Commits

- `7e66fdbc` docs(44-05): BEH-QD-556 and INV-QD-333, a seed carries every field the payload discloses
- `308f54ed` docs(44-05): overview, test rows and the CCR-QD-435 row completed

Both end with the Co-Authored-By trailer. The metadata commit follows, so `rev-list plan_head_before..HEAD` reads 3 after it; `commits:` counts the two task commits.

## Verification

`pnpm spec:verify:strict` (21 pass, 0 fail), `node scripts/spec-revise.mjs --check`, `pnpm spec:api` (927 exports across 9 packages, none moved), `pnpm spec:gates`, `pnpm spec:claims`, `pnpm spec:examples` (114 blocks), `pnpm spec:website-examples` (62 blocks), and `pnpm lint` (house-style clean; the oxlint warnings are in the untracked `.codex/` hooks only). No `packages/` file changed in this plan.

## Deviations from Plan

**1. [Rule 3 - Blocking] Link targets.** The plan's INV-QD-333 Related list named ADR-QD-135 and INV-QD-170 without their real file and anchor names; the links use `decisions/135-sink-record-fields-stated-once.md` and `#inv-qd-170-a-decision-agrees-with-its-trace` (a wrong name fails link integrity). No other deviation.

## Known Stubs

None.

## Self-Check: PASSED

Both commits are ancestors of HEAD; the six modified spec files exist; the plan's four automated checks passed.
