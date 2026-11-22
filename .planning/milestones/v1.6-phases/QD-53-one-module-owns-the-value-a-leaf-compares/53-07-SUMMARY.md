---
phase: QD-53-one-module-owns-the-value-a-leaf-compares
plan: 07
subsystem: spec
tags: [adr, invariants, behaviours, traceability, operand, D-17, OPND-05]
plan_head_before: 2093838da9e830b25b2e774cfdae73e9a88fdc8a
plan_head_after: e85617911c266758c9c95fb7e971a46aa9fa8479
requires:
  - phase: QD-53
    provides: "53-03..05 Operand.ts and its readers; 53-06 the D-14 table"
provides:
  - "ADR-QD-166 and its index entry; amendment pointers in ADR-QD-091 (Rev 1.2) and ADR-QD-024"
  - "BEH-QD-601..605, INV-QD-091 restated, INV-QD-351, INV-QD-352, traceability rows, the overview getByPath note"
affects: [53-08]
actuals:
  tokens: 14000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["a restated invariant keeps its heading, so inbound anchors survive"]
key-files:
  created:
    - spec/decisions/166-one-module-owns-the-value-a-leaf-compares.md
  modified:
    - spec/decisions/index.yaml
    - spec/decisions/091-comparison-semantics-have-one-owner.md
    - spec/decisions/024-predicate-output.md
    - spec/behaviors/04-matchers.md
    - spec/behaviors/16-predicates.md
    - spec/behaviors/06-services.md
    - spec/behaviors/32-custom-predicates.md
    - spec/invariants.md
    - spec/traceability.md
    - spec/overview.md
key-decisions:
  - "ADR-QD-166 records D-02's probe (both fixture builders) and copies 53-06's D-14 table; BEH-QD-601 sits in 04-matchers, 602/603 in 16-predicates, 604 in 06-services, 605 in 32-custom-predicates"
requirements-completed: [OPND-05, WX-02, WX-03]
coverage:
  - id: D1
    description: "ADR-QD-166 extends ADR-QD-091 and ADR-QD-024; both carry an amendment pointing at it; INV-QD-091 restated under its unchanged heading"
    requirement: OPND-05
    verification:
      - kind: command
        ref: "the plan's Task 1 and Task 3 node checks; node scripts/spec-revise.mjs --check"
        status: pass
    human_judgment: false
  - id: D2
    description: "Only the reserved ids minted: ADR-QD-166, BEH-QD-601..605, INV-QD-351..352, each with its traceability row"
    requirement: WX-02
    verification:
      - kind: command
        ref: "pnpm spec:verify:strict (invariants, decisions, links, test files rows PASS)"
        status: pass
    human_judgment: false
  - id: D3
    description: "The overview names getByPath where it lives; no export added or removed"
    requirement: WX-03
    verification:
      - kind: command
        ref: "pnpm spec:api (935 exports documented)"
        status: pass
    human_judgment: false
duration: 15min
completed: 2026-11-18
status: complete
---

# Phase 53 Plan 07: The phase's records Summary

**ADR-QD-166 (with D-02's fixture-builder probe and 53-06's mutation table), BEH-QD-601..605, INV-QD-091 restated and INV-QD-351/352 added, traceability and the `getByPath` overview note, all in three `spec/`-only commits with every reserved number used.**

## Task Commits

1. **Task 1: ADR-QD-166, index entry, amendments in ADR-QD-091 and ADR-QD-024** - `1c7e4413` (docs)
2. **Task 2: BEH-QD-601..605** - `385cf700` (docs)
3. **Task 3: INV-QD-091 restated, INV-QD-351, INV-QD-352, traceability, overview** - `e8561791` (docs)

## Records written

- ADR-QD-166 (QADI-ADR-166, Rev 1.0, "Accepted — extends ADR-QD-091, ADR-QD-024"): Context (the roadmap probe and the two fixture builders), Decision (the reader table), Alternatives rejected, Mutation (the D-14 table, no `Operand.ts` survivor), Consequences. ADR-QD-091 is now Rev 1.2; ADR-QD-024 has no Document Control, so its amendment adds no revision.
- BEH-QD-601 (04), 602 and 603 (16), 604 (06), 605 (32): plain REQUIREMENT blocks; no `typescript` fence count changed.
- INV-QD-091 keeps its heading; Source, Implication, Enforcement and Related now name `Operand.ts`, the prototype-names property and `Operand.test.ts`. INV-QD-351 and INV-QD-352 follow INV-QD-349.
- Traceability Rev 1.214, invariants Rev 1.151, overview Rev 1.122, and the four behaviour files each bumped once through `spec-revise.mjs --date 2026-11-18`.

## Gate outputs

- `node scripts/spec-revise.mjs --check`: passes.
- `pnpm spec:examples`: 116 blocks compile. `pnpm spec:api`: 935 exports documented, none added or removed.
- Plan Task 1, 2 and 3 node checks: pass.
- `pnpm spec:verify:strict`: 20 PASS, 1 FAIL (see Deviations): `CCR register coverage`, drift only by `444`.

## Reserved numbers used

ADR-QD-166, BEH-QD-601, 602, 603, 604, 605, INV-QD-351, INV-QD-352 (eight records). ARCH-100 and CCR-QD-444 appear only as citations in Change History and the ADR; the CCR-QD-444 row itself is 53-08's.

## Deviations from Plan

### Expected gate failure handed to 53-08

**[Plan ordering] `pnpm spec:verify:strict` reports CCR register drift**
- **Found during:** Task 3
- **Issue:** The plan's Task 3 verify expects `spec:verify:strict` to exit 0, but the gate's "CCR register coverage" check fails because CCR-QD-444, cited in every Change History entry and the ADR as the plan requires, has no row in the CCR register yet. The only drift is `444`; every other check passes.
- **Fix:** None here. The register row is a 53-08 artifact ("the CCR-QD-444 row"), so adding it in this plan would take that plan's scope. 53-08's `check:pr` closes it.
- **Files modified:** none

**Total deviations:** 1 (a gate ordering, no code or spec content change). **Impact:** `pnpm check:pr` stays red until 53-08 writes the CCR-QD-444 row.

## Known Stubs

None.

## Threat Flags

None. Only `spec/` changed; no id outside the reservation was minted and INV-QD-091's heading is unchanged (T-53-19, T-53-20).

## Next Phase Readiness

Ready for 53-08: needs the CCR-QD-444 row (use "Unused: …" for any unused reservation; all of BEH-QD-601..605 and INV-QD-351..352 are used), the changeset, the phase scan and `check:pr`.

## Self-Check: PASSED

- ADR-QD-166 file exists; commits `1c7e4413`, `385cf700` and `e8561791` are on `arch-wave-11`, each ends with the trailer and touches only `spec/`.
- `git rev-list --count 2093838d..HEAD` is 3 before this SUMMARY commit.
