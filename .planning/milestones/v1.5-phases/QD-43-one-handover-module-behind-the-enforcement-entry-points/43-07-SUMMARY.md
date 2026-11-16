---
phase: QD-43-one-handover-module-behind-the-enforcement-entry-points
plan: 07
subsystem: spec
tags: [spec, invariants, behaviours, traceability, handover]
phase_base: 712317c10688ebce97b8b29b5a5c515b84a8d71b
plan_head_before: 849004971567556fded127b2af6b01cc9cba9f47
plan_head_after: f839ceffa1cad4920b1bef1b6afef021ea92ad6a
requires: ["43-06"]
provides:
  - "INV-QD-009, 013, 032 and 108 restated over Handover.ts; INV-QD-331 new"
  - "BEH-QD-551 and BEH-QD-552; BEH-QD-050, 051, 055 and 324 show HandoverOptions"
  - "the completed CCR-QD-434 row, with traceability rows for every new statement and test file"
affects: [43-08]
actuals:
  tokens: 21000
  tasks: 3
  commits: 3
tech-stack:
  added: []
  patterns: ["restate an invariant in place and rename its heading, then correct every anchor to it"]
key-files:
  created: []
  modified:
    - spec/invariants.md
    - spec/traceability.md
    - spec/behaviors/07-enforcement.md
    - spec/behaviors/22-promise-facade.md
    - spec/models/07-field-level.md
    - spec/overview.md
    - spec/README.md
    - spec/decisions/156-a-handed-over-value-is-decided-through-one-module.md
    - packages/core/src/Qadi.ts
key-decisions:
  - "INV-QD-331 added because no existing invariant stated that the array and stream forms agree (the precondition search found none); INV-QD-332 unused"
requirements-completed: [HAND-06, WX-02, WX-03]
status: complete
---

# Phase 43 Plan 07: The spec states what the handover module guarantees Summary

The invariants, behaviours, overview and traceability now describe `Handover.ts` instead of `permitted`, `decideOne` and a `guard` that overrides `options.resource`, and the CCR-QD-434 row names every file the phase changed.

## Statements restated or new

| Id | Before | After |
| --- | --- | --- |
| INV-QD-009 | Source: `flatMap` after `permitted` | `flatMap` after `admittedOrDenied`, so `self` runs only after `verdictOf` asked, refused and discharged |
| INV-QD-013 | "enforce the same rule through a second path", a deliberate second implementation | all ten entry points reach `verdictOf` and `discharge`; effect shapes through `admittedOrDenied`, collections through `handOver`; `Handover.test.ts` added to Enforcement |
| INV-QD-032 | `guard` calls `enforce(policy, { ...options, resource })` and overrides `options.resource` | `HandoverOptions` cannot carry a resource; `decidedOn` drops an untyped caller's and sets the positional one; Enforcement cites the three refusal tests by title. History paragraphs and the CCR-QD-112 update kept |
| INV-QD-108 | "A projected value is the evaluated resource" (`withLoadedResource`, the old options type) | "A handed-over value is the evaluated resource": `decidedOn`, `resourceFree`, `RELEASE`, `handOver`; the eight entry points listed; `enforce` and `assert` not in the list |
| INV-QD-331 | none | new, last invariant: the array and stream forms agree on who passes, in order, because both adapt `handOver` |
| BEH-QD-050/051/055/324 | `EnforceOptions` / `LoadedEnforceOptions` in value-handing signatures; BEH-QD-055 "MUST NOT override it" | `HandoverOptions` in all eight (`EnforceOptions` remains on `enforce` and `assert`); BEH-QD-055 says `options` accepts no `resource` and an untyped caller's is never the one evaluated |
| BEH-QD-551 | none | new (`07-enforcement.md`, between 324 and 056): the refusal, `exactOptionalPropertyTypes`, the runtime drop, the tests |
| BEH-QD-552 | none | new (`22-promise-facade.md`, between 172 and 173): the facade's `filter` and `filterProjected` take `Omit<FacadeOptions, "resource">` |

## Documents and final revisions

`invariants.md` 1.123, `traceability.md` 1.180, `behaviors/07-enforcement.md` 1.14, `behaviors/22-promise-facade.md` 1.4, `models/07-field-level.md` 1.4, `overview.md` 1.108, `README.md` 1.184, ADR-QD-156 1.1.

## Gates

- `pnpm spec:verify:strict`: `PASS: 21   FAIL: 0   SKIP: 0`; `spec-revise --check`: every Revision matches its newest Change History entry.
- `pnpm spec:gates`, `pnpm spec:claims` (8 claims), `pnpm spec:api` (927 exports), `pnpm spec:examples` (114 blocks), `pnpm spec:website-examples` (61 blocks): green.
- The plan's phase-wide stale-sentence search: `no stale sentence anywhere` (0 hits).
- `pnpm lint` and `pnpm exec tsc -p tsconfig.test.json` after the `Qadi.ts` comment edit: clean.
- `next-id.mjs` was not run. Used reserved numbers: CCR-QD-434, BEH-QD-551, BEH-QD-552, INV-QD-331. Unused, named in the CCR-QD-434 row: BEH-QD-553 to BEH-QD-555 and INV-QD-332.

## Commits

- `0b8e13b9` docs(43-07): INV-QD-009, 013, 032 and 108 restated over the handover module; INV-QD-331 new
- `f3c574a0` docs(43-07): BEH-QD-551 and BEH-QD-552; the enforcement, facade, field-level and overview text
- `f839ceff` docs(43-07): traceability rows and the completed CCR-QD-434 row

## Deviations from Plan

**1. [Rule 1 - Bug] INV-QD-108 anchor.** `traceability.md` linked INV-QD-108 as `#inv-qd-106-…` (rows INV-QD-108 and ADR-QD-104), `behaviors/07-enforcement.md` BEH-QD-324 had the same, and the ADR-QD-156 text and traceability row linked the pre-rename `#inv-qd-108-a-projected-…`. All now use `#inv-qd-108-a-handed-over-value-is-the-evaluated-resource`; no old anchor remains in `spec`. Task 1's commit therefore also holds `07-enforcement.md` (1.12 to 1.13, then 1.14 in Task 2) and ADR-QD-156 (1.0 to 1.1, so the CCR row says `new, Rev 1.1`), beyond the plan's two files. The INV-QD-107 row in `traceability.md` also links a `#inv-qd-106-…` anchor; it is a different invariant and was left alone.

**2. [Rule 1 - Stale comment] `Qadi.ts` `guard` doc comment.** "What actually gates the protected work is `enforce` re-checking the policy" now says the handover module checks the policy on every call; the over-long lines near 221, 246 and 260 are re-wrapped to about ninety columns. Comment-only (a diff filter shows no non-comment line changed), committed with Task 2.

**3. Task 2's stale-sentence search printed nothing at the start**, not the 52 the plan expected: the earlier plans had already removed those sentences, so the gate was already at 0 and stayed there (two clauses written in Task 3 briefly tripped it and were reworded).

**4. Precondition count.** Task 1's precondition expected two `docs(43-06):` commits; there are three (two tasks and the completion commit), the same off-by-one 43-06 recorded. The intent holds.

## Known Stubs

None.

## Threat Flags

None.

## Self-Check: PASSED

The three commits are ancestors of HEAD on `arch-wave-10`, and `spec/invariants.md` holds `## INV-QD-331: `, `spec/behaviors/07-enforcement.md` `## BEH-QD-551: `, `spec/behaviors/22-promise-facade.md` `## BEH-QD-552: `.
