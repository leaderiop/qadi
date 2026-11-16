---
phase: QD-48-audit-reports-core-s-refusal-and-derives-lost
plan: 07
subsystem: spec
tags: [spec, behaviours, invariants, traceability, arch-95]
phase_base: c9fde4ba08f8cb8b4bfd5a230616f026f2a49eaa
requires: [48-06]
provides:
  - "BEH-QD-576..580 in spec/behaviors/33-audit-pipeline.md; BEH-QD-249/250 listings and REQUIREMENTs restated; three CCR-QD-439 amendment notes"
  - "INV-QD-341 and INV-QD-342; INV-QD-106 names UnwrittenRow.ts and the new tests"
  - "traceability rows for the new ids, ADR-QD-161's links and five test files"
  - "the completed CCR-QD-439 row (Used: ..., Unused: none)"
affects: [48-08]
key-files:
  created: []
  modified:
    - spec/behaviors/33-audit-pipeline.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
    - spec/decisions/161-audit-reports-cores-refusal-and-decides-lost-once.md
    - spec/README.md
decisions:
  - "BEH-QD-579 scopes the warning leg to the six unwritten leaves and names Written.CommitFailed and Refused as the two that warn without being lost"
status: complete
plan_head_before: 18bc893cfea59e0cee67cc83f9550f197728f104
plan_head_after: d5ef81cab78f6a7124cd37aee622b40ffe934dd4
commits: 3
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
---

# Phase QD-48 Plan 07: The specification the code now follows Summary

BEH-QD-576 to 580, INV-QD-341 and INV-QD-342, the BEH-QD-249/250/252 restatements, the INV-QD-106 amendment, the traceability rows, the overview's `durabilityOf` row, ADR-QD-161's links and the completed CCR-QD-439 row are written, using only the reserved numbers; no code changed.

## Commits

- `0b2f64b1` docs(48-07): BEH-QD-576 to 580, the audit refusal is core's and lost is decided once
- `70e76a83` docs(48-07): INV-QD-341 and INV-QD-342, traced
- `d5ef81ca` docs(48-07): the durabilityOf row, ADR-QD-161 linked, CCR-QD-439 complete

## Revisions `spec-revise.mjs` printed

- `spec/behaviors/33-audit-pipeline.md` 1.21 -> 1.22
- `spec/invariants.md` 1.135 -> 1.136
- `spec/traceability.md` 1.200 -> 1.201
- `spec/overview.md` 1.115 -> 1.116
- ADR-QD-161 1.0 -> 1.1
- `spec/README.md` 1.209 -> 1.210 (the CCR-QD-439 row names it)

## Results

- `pnpm spec:verify`, then `pnpm spec:verify:strict` (final): `PASS: 21   FAIL: 0   SKIP: 0`.
- `pnpm spec:examples`: `116 block(s) compile`, exit 0. `pnpm spec:api` and `pnpm lint` exit 0 (lint's warnings are pre-existing, in `.codex/` and `scripts/`).
- Task 1, 2 and 3 node checks: `ok`. Anchor check: 29 links to the new headings across the eight spec documents resolve to a heading slug. Scope check: no `docs(48-07)` commit touches anything but `spec/` and `.planning/`; no Change History entry or old CCR row changed.
- Every reserved number is used: ARCH-95, ADR-QD-161, CCR-QD-439, BEH-QD-576..580, INV-QD-341..342; `scripts/next-id.mjs` never run.

## Deviations from Plan

None - plan executed as written.

Notes:

- The `StageResult` doc comment still carries no ADR-QD-161 citation; this plan edits no source (its prohibition), so it is left for 48-08 or a later pass.
- BEH-QD-576's heading and the INV-QD-342 heading carry no backticks (the plan allowed either); the slugs are the same.

## Self-Check: PASSED

- Commits `0b2f64b1`, `70e76a83`, `d5ef81ca` exist on `arch-wave-10`.
- All six spec documents exist and carry the new ids.
