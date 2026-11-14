---
phase: QD-41-one-guarded-value-to-text-function
plan: 01
subsystem: value-to-text
tags: [mutation-baseline, adr, spec-records, value-text]
phase_base: 4035fcdd420fc2d8090fb918da7826c43569c052
plan_head_before: 4035fcdd420fc2d8090fb918da7826c43569c052
plan_head_after: 7c4b690117ddda191beba8136c63fcd98ce58a3e
requires: []
provides:
  - 41-mutation-base.json (Explanation.ts, Filters.ts, Remedies.ts, SimulationForm.ts at the phase base; core ValueText.ts as new)
  - ADR-QD-154 (the one guarded value-to-text function is a public core export), with its index.yaml entry, its traceability row and the CCR-QD-432 row
affects: [41-02, 41-03, 41-04, 41-05, 41-06]
tech-stack:
  added: []
  patterns: [baseline committed alone on the untouched base, decision recorded before code]
key-files:
  created:
    - .planning/phases/QD-41-one-guarded-value-to-text-function/41-mutation-base.json
    - spec/decisions/154-one-value-to-text-function-exported-by-core.md
  modified:
    - spec/decisions/index.yaml
    - spec/traceability.md
    - spec/README.md
key-decisions:
  - "ADR-QD-154 records that valueText(value: unknown): string | undefined is a public @qadi/core export (ADR-QD-099: core cannot import a devtools-private module, and one rule must serve explain and the devtools panels); each consumer keeps its own reading of no text; the one label that changes is an object whose toJSON gives nothing; release shape is core minor, devtools patch"
requirements-completed: [WX-02, WX-05, WX-06, TEXT-02]
duration: ~25 min
completed: 2026-11-14
status: complete
commits: 2
---

# Phase 41 Plan 01: Baseline and ADR-QD-154 Summary

Mutation baseline of the four files the phase edits (core `Explanation.ts`, devtools `Remedies.ts`, `Filters.ts`, `SimulationForm.ts`), committed alone as the phase's first commit, then ADR-QD-154 recording why the one guarded value-to-text function is a public `@qadi/core` export, before any `packages/*/src` change.

## Reserved numbers

ARCH-88, ADR-QD-154, CCR-QD-432, BEH-QD-541 to 545 and INV-QD-327 to 328 were each free at `phase_base` (`git grep -E "<id>([^0-9]|$)"` over spec, packages, .changeset, AGENTS.md, CONTRIBUTING.md, features, apps/website/src, examples and scripts printed nothing; no `spec/decisions/154-*` file). `node scripts/next-id.mjs` was never run. This plan uses ARCH-88, ADR-QD-154 and CCR-QD-432; the CCR-QD-432 row names only those, and 41-05 completes it.

## Mutation base

Two invocations, run one at a time (core, then devtools), each exit 0 above its break threshold, the exact strings the close repeats:

- `pnpm exec stryker run stryker.config.mjs --mutate 'packages/core/src/Explanation.ts,packages/core/src/ValueText.ts'` (the `ValueText.ts` glob only warned; 15 seconds)
- `pnpm exec stryker run stryker.devtools.mjs --mutate 'packages/devtools/src/model/Remedies.ts,packages/devtools/src/model/Filters.ts,packages/devtools/src/model/SimulationForm.ts'` (2 minutes 45 seconds)

Printed by the writer (run verbatim, rc 0):

- `packages/core/src/Explanation.ts 0.9867256637168141 (223/226) ignored 73`
  - survivors 280:53 OptionalChaining, 521:64 StringLiteral, 651:75 StringLiteral
- `packages/devtools/src/model/Remedies.ts 1 (297/297) ignored 48`
- `packages/devtools/src/model/Filters.ts 1 (78/78) ignored 9`
- `packages/devtools/src/model/SimulationForm.ts 0.9819494584837545 (544/554) ignored 23`
  - survivors 151:69 StringLiteral (NoCoverage), 100:11 BlockStatement, 114:7 ConditionalExpression, 116:10 ConditionalExpression, 222:11 LogicalOperator, 222:11 ConditionalExpression, 222:25 StringLiteral, 222:38 ConditionalExpression, 236:23 EqualityOperator, 376:34 ConditionalExpression
- `{"measured":{"packages/core/src/Explanation.ts":0.9867256637168141,"packages/devtools/src/model/Remedies.ts":1,"packages/devtools/src/model/Filters.ts":1,"packages/devtools/src/model/SimulationForm.ts":0.9819494584837545},"unmeasured":{},"new":["packages/core/src/ValueText.ts"],"deleted":{}}`

These match the planning-time measurements exactly. The SimulationForm.ts survivor at 100:11 is inside the private `stringify` that 41-03 deletes.

## ADR-QD-154

`spec/decisions/154-one-value-to-text-function-exported-by-core.md`, Revision 1.0 (2026-11-14), status `Accepted`. `spec/traceability.md` Rev 1.174 (§3 row citing INV-QD-021), `spec/README.md` Rev 1.178 (CCR-QD-432 row directly after CCR-QD-431). `node scripts/spec-revise.mjs --check` and `pnpm spec:verify:strict` (21 PASS, 0 FAIL) are green.

## Commits

- `0236fb6b` chore(41-01): mutation baseline for the value-to-text guard (the JSON alone, parent is `phase_base`)
- `7c4b6901` docs(41-01): ADR-QD-154, one value-to-text function, exported by core (four spec files)

## Deviations from Plan

**1. [Trailer] Commit trailer names the executing model**
- The orchestrator prompt gave `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; the plan itself says an executor on another model writes its own model's name, and the session attribution names `Claude Sonnet 5.5`. Both commits end with `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`, which the plan's trailer check (`Claude .+ <noreply@anthropic.com>`) accepts.

**Total deviations:** 1 (documentation only). **Impact:** none.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

- 41-mutation-base.json, the ADR file, index.yaml, traceability.md and README.md exist; both commits are ancestors of HEAD; `git status --porcelain -- packages scripts .changeset AGENTS.md` is empty; Task 1's baseline-shape verify, Task 2's content verify and order/trailer verify, `spec-revise --check` and `spec:verify:strict` all exit 0.
