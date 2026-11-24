---
phase: QD-78-timelinestore-owns-its-capacity
plan: 07
subsystem: spec-records
tags: [adr, ccr, traceability, amendment, spec]
requires: [78-06]
provides:
  - ADR-QD-191 at Revision 1.0, indexed, traced in section 3 and registered by the CCR-QD-470 row
  - ADR-QD-137 Revision 1.4 with a dated amendment pointing at ADR-QD-191
  - the CCR-QD-470 row, begun, with its line telling the dock's input-mapping rewrite to keep the whole-or-nothing rule
affects: [78-08, 78-09, 78-10]
key-files:
  created:
    - spec/decisions/191-a-timeline-store-owns-its-capacity.md
  modified:
    - spec/decisions/137-a-devtools-session-owns-its-runs-through-a-scope.md
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
decisions:
  - "ADR-QD-191 states eleven decisions: resize and its answer, the store's effective capacity, the identical timeline for a record kept nowhere, the pause rule, the feed's one store, the feed's configure order, the idle store, the hand-fed hook, clear at the held bound, publish not set, and the dock's whole-or-nothing configure"
  - "its Context quotes each RED test by title with the failure the code before the change gave, and its mutation-floor paragraph quotes the base counts measured through stryker.devtools.mjs (107 of 107, 32 of 33, 50 of 50, 70 of 70)"
  - "the record names no decision number, plan id, requirement id or phase-relative wording; the one requirement id (CONF-05) is in the CCR row only"
requirements-completed: []
metrics:
  duration: 25min
  completed: 2026-11-24
status: complete
commits: 2
plan_head_before: 7f0a0bbb49d474a90c7872856c76295737edd4d6
plan_head_after: 65a7b20fc6c5cf66b675bf87b3b99e84c45987a2
actuals:
  tokens: 14000
  tasks: 2
  commits: 2
---

# Phase QD-78 Plan 07: ADR-QD-191, a timeline store owns its capacity Summary

ADR-QD-191 records the decision the code of plans 04 to 06 shipped: the store's own `resize(capacity): boolean`, the
feed's one store, the dock applying a capacity whole or not at all, a record kept nowhere changing nothing, the hand-fed
hook following its option, and `clear` keeping the held bound. It is indexed, traced in section 3 with its five code
paths and the two reserved invariants, and registered by the CCR-QD-470 row, which carries the line handing the dock's
rule to its input-mapping rewrite. ADR-QD-137 gains a dated amendment pointing at it.

## Commits

| Task | Commit | Files |
| ---- | ------ | ----- |
| 1 (tracer) | `47f737c6` | `191-a-timeline-store-owns-its-capacity.md`, `index.yaml`, `traceability.md`, `README.md` |
| 2 | `65a7b20f` | `137-a-devtools-session-owns-its-runs-through-a-scope.md`, `index.yaml`, `README.md` |

## What shipped

- `spec/decisions/191-a-timeline-store-owns-its-capacity.md` Rev 1.0, Effective 2026-11-24, Status `Accepted — amends
  ADR-QD-137`: Context, Decision (eleven points and the run-time guard), Alternatives considered, Consequences (six
  Breaking items, the `0.13: a timeline store owns its capacity` upgrade section and the changeset file name), What
  enforces it (by file and title), Related.
- `spec/decisions/index.yaml`: the ADR-QD-191 entry after ADR-QD-190, and ADR-QD-137's status ends `amended 2026-11-24
  (the timeline feed holds one store, ADR-QD-191)`.
- `spec/traceability.md` Rev 1.293 to 1.294: the section 3 row after ADR-QD-190's.
- `spec/README.md` Rev 1.357 to 1.359: the CCR-QD-470 row after CCR-QD-469's, naming the README, ADR-QD-137 (Rev 1.4),
  ADR-QD-191 (Rev 1.0), the index and the traceability (Rev 1.294), with the sentence for the dock's input-mapping rewrite
  (CONF-05), M55 and M56.
- `spec/decisions/137-...md` Rev 1.3 to 1.4 by `scripts/spec-revise.mjs`: the `Amended 2026-11-24 (CCR-QD-470)`
  blockquote after the 2026-11-14 one.

## Verification

- Task 1 verify: exit 0 (ADR sections and required terms, no plan-local wording, index, section 3 row paths and ids, the
  CCR row's dock line, `verify-traceability.sh --strict` `FAIL: 0` with 21 passes, `spec-revise --check`,
  `scripts/check-dod-table.mjs` (26 steps), the commit holding exactly its four files and one trailer).
- Task 2 verify: exit 0 (amendment and its link, one minor revision past the base revision, its Change History entry,
  the index status, the CCR row naming ADR-QD-137, no plan-local wording in the added lines, the strict check,
  `spec-revise --check`, the commit holding exactly its three files and one trailer).
- Tracer gate: the Task 1 verify passed end to end before the amendment was written.
- No `packages/*/src`, test or `.planning/config.json` file was touched; `node scripts/next-id.mjs` was not run.

## Deviations from Plan

**1. [Rule 1 - Bug] The first ADR draft wrote the signature as `resize(capacity: number): boolean`.**
- **Found during:** Task 1 verify (`the ADR lacks: resize(capacity): boolean`).
- **Issue:** the plan and the verify spell the heading form without the parameter type, the form the store's own doc
  comment and the decision list use.
- **Fix:** decision 1's heading now reads `TimelineStore.resize(capacity): boolean`; the commit was amended (unpushed,
  same four files) before Task 2 began.
- **Files modified:** `spec/decisions/191-a-timeline-store-owns-its-capacity.md`
- **Commit:** `47f737c6`

## Decisions Made

- The Context quotes the failure each RED test gave on the code before the change, read from `78-RED-EVIDENCE.md`, so the
  record's claims are measured rather than restated from the plan.
- Where the plan asked for "the mutation floor measured at the base", the record quotes the four counts from
  `78-mutation-base.json` (valid mutants detected: `Timeline.ts` 107 of 107, `TimelineStore.ts` 32 of 33 with one
  survivor, `TimelineFeed.ts` 50 of 50, `DockModel.ts` 70 of 70).
- The ADR links BEH-QD-726 to BEH-QD-730 and INV-QD-401 and INV-QD-402 by the anchors plan 78-08 writes; the strict
  check's link integrity covers the files, and 78-08 checks the anchors.

## Known Stubs

None.

## Threat Flags

None. T-78-16 (the record is registered and traced, the CCR row names every document with its revision and carries the
dock line) and T-78-17 (every Revision moved through `scripts/spec-revise.mjs`, ADR-QD-137 one minor step) are mitigated.

## Self-Check: PASSED

- `spec/decisions/191-a-timeline-store-owns-its-capacity.md` exists; commits `47f737c6` and `65a7b20f` are ancestors of
  HEAD; `bash spec/scripts/verify-traceability.sh --strict` reported `FAIL: 0` and `node scripts/spec-revise.mjs --check`
  passes.
