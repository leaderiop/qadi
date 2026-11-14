---
phase: QD-39-each-hydration-drop-reason-stated-once-with-its-kind
plan: 04
subsystem: spec
tags: [spec, adr, invariant, changeset, hydration, drop-reasons]
phase_base: b3b8cdcdb7843944a5795c117b82c8dada530c61
requires: [39-03]
provides:
  - ADR-QD-152 and its index entry, INV-QD-323 (new), INV-QD-045 amended
  - ADR-QD-123 and ADR-QD-037 amendments, BEH-QD-230 and BEH-QD-231 restated
  - the overview naming HydrationDropReasonOf and HydrationDropRow (gate 13 green)
  - the CCR-QD-430 row, the @qadi/core minor and @qadi/react patch changesets
affects: [39-05]
tech-stack:
  added: []
  patterns: [one decision + one new invariant + amend-in-place for the rest]
key-files:
  created:
    - spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md
    - .changeset/hydration-drop-reasons-stated-once.md
    - .changeset/hydration-drop-groups-derived.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/123-a-metric-is-declared-once.md
    - spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md
    - spec/invariants.md
    - spec/behaviors/19-hydration.md
    - spec/overview.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-152 states the payload-row finding as found: only an entry row is a compile error in react (at bucketOf); a payload or dehydration row compiles everywhere"
  - "INV-QD-323 (the kinds partition the reasons) is the one new number; BEH-QD-531 to 535 and INV-QD-324 are named Unused in the CCR row"
requirements-completed: [DROP-01, DROP-02, DROP-04, WX-02, WX-03, WX-07]
duration: ~25 minutes
completed: 2026-11-14
status: complete
commits: 3
plan_head_before: 0f29605801190246b27e0f551b4b5f8d0c28522c
plan_head_after: f2bc56e62ed3abaafe5701f260065c1f11855c00
actuals:
  tokens: 30000
  tasks: 3
  commits: 3
---

# Phase 39 Plan 04: Records for the one-table drop reasons Summary

ADR-QD-152 (Rev 1.0) and INV-QD-323 record that each hydration drop reason is one row with one kind and that react's groups are read off it, with ADR-QD-123, ADR-QD-037, INV-QD-045, BEH-QD-230 and BEH-QD-231 amended in place, the overview naming the two new types, and two changesets (`@qadi/core` minor, `@qadi/react` patch, no Breaking marker).

## Task commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 ADR-QD-152, index entry, INV-QD-323, INV-QD-045 amendment, CCR-QD-430 row | `ad6b5c59` | 5 |
| 2 ADR-QD-123 and ADR-QD-037 amended, BEH-QD-230 and BEH-QD-231, overview, traceability | `17cca91b` | 5 |
| 3 two changesets, CCR-QD-430 row completed | `f2bc56e6` | 3 |

## Revisions spec-revise printed

All equal the plan's list: `spec/invariants.md` 1.119 -> 1.120; `spec/traceability.md` 1.168 -> 1.169 (Task 1) -> 1.170 (Task 2); `spec/README.md` 1.172 -> 1.173 (Task 1) -> 1.174 (Task 3); `spec/overview.md` 1.101 -> 1.102; `spec/behaviors/19-hydration.md` 1.18 -> 1.19; `spec/decisions/123-a-metric-is-declared-once.md` 1.2 -> 1.3; `spec/decisions/037-circular-imports-and-type-level-tests-are-gates.md` 1.5 -> 1.6; ADR-QD-152 is Rev 1.0.

## Gate outputs

- `node scripts/spec-revise.mjs --check`: every Revision matches its newest Change History entry (after each task).
- `pnpm spec:api` (gate 13): `api-surface: 920 export(s) documented across 9 package(s)`, green from `17cca91b`.
- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`.
- `pnpm spec:examples`: `doc-examples: 113 block(s) compile`.
- `pnpm spec:gates`: `dod-table: 25 step(s) match pnpm check, 141 reference(s) resolve`.
- `pnpm lint`: `house-style: 496 file(s) clean (3 declared switch(es))`, no errors (warnings are pre-existing, in files this plan did not touch).
- Id check (the plan's mechanical verify): no id outside ARCH-86, ADR-QD-152, CCR-QD-430, INV-QD-323 and the unused BEH-QD-531 to 535 and INV-QD-324; the unused numbers and Phase 38's appear only in `spec/README.md`.
- Every plan verify script (Task 1: three, Task 2: one node check plus the shell gates, Task 3: node checks, shell gates, id check) exited 0 on the final state.

## Deviations from Plan

None - plan executed exactly as written. One fix inside Task 3 before its commit: the first draft of the core changeset wrote `HydrationDropReasonOf<K>` inside the backticks, which the verify (whole backticked name `HydrationDropReasonOf`) refused; the changeset now says `HydrationDropReasonOf`, the reasons of one kind.

Commit trailer: the plan and dispatch brief name `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`, which the three commits carry, as in 39-01 to 39-03.

## Known Stubs

None.

## Threat Flags

None. T-39-08 (a number outside the reservation, an unnamed changed file) is mitigated by the id check and Task 3's file-list verify; T-39-09 by the changeset and ADR-QD-152's Consequences both stating that `hydrationDropMeaning`'s object carries `kind` at run time.

## Self-Check: PASSED

- `spec/decisions/152-each-hydration-drop-reason-is-stated-once-with-its-kind.md`, `.changeset/hydration-drop-reasons-stated-once.md` and `.changeset/hydration-drop-groups-derived.md` exist.
- Commits `ad6b5c59`, `17cca91b` and `f2bc56e6` are ancestors of HEAD; `git rev-list --count` from `plan_head_before` is 3.
