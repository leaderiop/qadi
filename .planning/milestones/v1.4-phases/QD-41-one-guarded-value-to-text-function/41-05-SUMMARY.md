---
phase: QD-41-one-guarded-value-to-text-function
plan: 05
subsystem: value-to-text
tags: [spec, behaviours, traceability, changesets, ccr]
plan_head_before: a3beedb3
plan_head_after: 37715cb7dc9aa09a553609c7d982be3fe2a4a802
requires: [41-04]
provides:
  - "BEH-QD-542 (explain's rule for a literal with no JSON form) between BEH-QD-141 and BEH-QD-142"
  - "BEH-QD-541 (the remedy label rule) between BEH-QD-223 and BEH-QD-224"
  - "traceability rows for both, four new test-file rows, two rows extended"
  - "two unconsumed changesets: @qadi/core minor, @qadi/devtools patch"
  - "CCR-QD-432 row completed with every changed file and revision"
affects: [41-06]
actuals:
  tokens: 9000
  tasks: 2
  commits: 2
tech-stack:
  added: []
  patterns: ["a rule stated in the behaviour document beside the one it extends, which stays byte-identical"]
key-files:
  created:
    - .changeset/core-value-text.md
    - .changeset/devtools-remedy-label-without-json.md
  modified:
    - spec/behaviors/18-explanation.md
    - spec/behaviors/29-devtools-simulator.md
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "BEH-QD-541 and BEH-QD-542 are new sections beside BEH-QD-223 and BEH-QD-141, which are untouched; BEH-QD-543 to 545, INV-QD-327 and INV-QD-328 are named Unused in the CCR-QD-432 row"
requirements-completed: [TEXT-04, WX-02, WX-03, WX-07]
duration: ~10 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 41 Plan 05: BEH-QD-542, BEH-QD-541, two changesets and CCR-QD-432 Summary

The two rules 41-04 implemented are specified where a reader of `explain` and of the simulator looks, each with three REQUIREMENT lines, traced to their tests, released as a `@qadi/core` minor and a `@qadi/devtools` patch, and the CCR-QD-432 row names every changed file and revision.

## Spec sections

- `spec/behaviors/18-explanation.md` Rev 1.8: `## BEH-QD-542: A literal with no JSON form is explained by a fixed rule, and never throws`, between BEH-QD-141 and BEH-QD-142.
- `spec/behaviors/29-devtools-simulator.md` Rev 1.20: `## BEH-QD-541: A remedy whose value has no JSON form is still offered, under a label that cannot throw`, between BEH-QD-223 and BEH-QD-224.
- BEH-QD-141 and BEH-QD-223 are byte-identical to `phase_base` (checked by Task 1's verify).

## Traceability (`spec/traceability.md` Rev 1.175)

Document-18 row gains BEH-QD-542 and `ValueText.ts`; document-29 row gains BEH-QD-541; `Explanation.test.ts` gains BEH-QD-542; `Remedies.test.ts` gains BEH-QD-541. New rows: `NonJsonLiteral.test.ts`, core `ValueText.test.ts`, `NonJsonWitness.test.ts`, `ValueTextConsumers.test.ts`.

## Changesets (unconsumed)

- `.changeset/core-value-text.md`: `"@qadi/core": minor`; `valueText`, `explain` no longer throwing, bigint as `10n`, the fixed words, the toJSON-gives-nothing change.
- `.changeset/devtools-remedy-label-without-json.md`: `"@qadi/devtools": patch`; remedy table, session commands, rail and inspector no longer throw; same labels; reads through `valueText`.

Neither carries a Breaking paragraph nor a plan or decision id.

## CCR-QD-432 row

`spec/README.md` Rev 1.179. One row directly after CCR-QD-431, four cells, naming 23 files (each spec document at its current revision: ADR-QD-154 1.0, overview 1.104, 18 at 1.8, 29 at 1.20, traceability 1.175, README 1.179), the ARCH-88 text with the two un-folded sites (`outsideUnion`, `resourceOf`), `Used: ARCH-88, ADR-QD-154, CCR-QD-432, BEH-QD-541, BEH-QD-542.` and `Unused: BEH-QD-543 to BEH-QD-545, INV-QD-327 and INV-QD-328 (no other statement was needed).`

## Task Commits

1. **Task 1: BEH-QD-542, BEH-QD-541 and traceability** - `89d1dfce` (docs)
2. **Task 2: changesets and the completed CCR-QD-432 row** - `37715cb7` (docs)

## Verification

- Task 1: `spec-revise --check` exit 0; `pnpm spec:verify:strict` 21 PASS, 0 FAIL; the node content verify exit 0.
- Task 2: `spec-revise --check`, `pnpm spec:verify:strict` (21 PASS) and `pnpm spec:api` (926 exports, 9 packages) exit 0; changeset/row node verify exit 0; commit shape and trailer verify exit 0.

## Deviations from Plan

None - plan executed exactly as written. Both commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (the executing model, as 41-01 recorded).

## Issues Encountered

None.

## Known Stubs

None.

## Self-Check: PASSED

- Both changeset files exist; commits `89d1dfce` and `37715cb7` are ancestors of HEAD; each carries exactly its planned files; no `packages/` change in this plan.
