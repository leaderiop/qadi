---
phase: 16-role-graph-walk
plan: 04
subsystem: spec, changesets
tags: [spec, adr, glossary, invariant, traceability, changeset, gate]

requires: ["16-01", "16-02", "16-03"]
provides:
  - "ADR-QD-128 `One walk of the role graph` (indexed)"
  - "Glossary `## Role walk`; INV-QD-038 holds by construction (Source = `RoleTraversal.ts`)"
  - "BEH-QD-400 (the role walk, compiled `typescript` example) and BEH-QD-399 (the role tree is the role walk); BEH-QD-214 amended; BEH-QD-010/-011 notes"
  - "Overview row `roleWalk`, `RoleStep` (gate 13 green); traceability rows; CCR-QD-406"
  - "`.changeset/role-walk.md` (`@qadi/core` minor), `.changeset/devtools-role-tree.md` (`@qadi/devtools` patch)"
affects: [17-01]

actuals:
  tasks: 3
  commits: 4

key-files:
  created:
    - spec/decisions/128-one-walk-of-the-role-graph.md
    - .changeset/role-walk.md
    - .changeset/devtools-role-tree.md
  modified:
    - spec/decisions/index.yaml
    - spec/glossary.md
    - spec/invariants.md
    - spec/behaviors/02-roles.md
    - spec/behaviors/25-inspection.md
    - spec/behaviors/28-devtools-screens.md
    - spec/traceability.md
    - spec/overview.md
    - spec/README.md

key-decisions:
  - "16-01 T1 (D-04) = A, from `_DECISIONS.md`: \"A repeated role is a leaf referencing its first occurrence\" — quoted in ADR-QD-128 with the 2^k cost of option B stated"
  - "ADR-QD-128 `reads` (does not amend) ADR-QD-015/037/099: nothing in them changes"
  - "No pending changeset covers the role walk or the role tree's rendering (explorer-session / policy-choice-held-by-value cover the role viewer's *selection*), so two new ones"
  - "Breaking judged against the `@qadi/*@0.11.0` tags: core adds exports only (minor); the set fill order is unspecified (stated, not Breaking); `RoleNode`/`RoleRow` are package-private (devtools patch)"

requirements-completed: [ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05]

completed: 2026-11-10
status: complete
---

# 16-04 — Phase 16 recorded; the full PR gate is green

## Decision applied

> | 16-01 T1 (D-04) | `A` | A repeated role is a leaf referencing its first occurrence |

ADR-QD-128 quotes it and states the rejected option B's cost: about 2^k rows for k stacked diamonds (4,093 / 262,141 /
4,194,301 at k = 10/16/20), or an arbitrary truncation if capped.

## Task 1 — decision, glossary, invariant (commit `61700fd`)

- `spec/decisions/128-one-walk-of-the-role-graph.md` Rev 1.0: context (four copies, two drifts, the devtools probe),
  decision (package-private `traverseRoles`/`visitRoles`; public `roleWalk`/`RoleStep`; path links only for callers that
  ask; `fromRoles` one pass; option A; flat rows), consequences (walk-order set filling; the 16-02 bench table),
  alternatives. Indexed in `spec/decisions/index.yaml`.
- `spec/glossary.md` Rev 1.10: `## Role walk` after `## Flattening`.
- `spec/invariants.md` Rev 1.96: INV-QD-038 Source = the identity-keyed walk in `RoleTraversal.ts`; a "Holds by
  construction (CCR-QD-406)" note; Enforcement names the seeded property over `RoleGraphArbitrary.ts`. "name-keyed" gone.

## Task 2 — behaviours, overview, traceability, CCR, changesets (commits `85f4110`, `856a092`)

- BEH-QD-400 (25-inspection Rev 1.21): pre-order, identity, revisit with `first`, index/parent links, stack-safe; a
  compiled `typescript` example using `RoleStep.$match`. BEH-QD-192's diamond sentence names the walk.
- BEH-QD-399 (28-devtools-screens Rev 1.14): `RoleRow {name, index, depth, own, repeated, first}`, rows keyed by identity
  through the step, 20,000-deep model and render, repeated = leaf with `data-first`, rows linear. BEH-QD-214's diamond
  requirement amended in place (blockquote, history kept).
- 02-roles Rev 1.2: BEH-QD-010/-011 projection notes, no behaviour change.
- Overview Rev 1.85: `roleWalk`, `RoleStep` row beside the `flattenPermissions` row. Gate 13: 888 exports documented.
- Traceability Rev 1.138: §1 rows 02/25 name `RoleTraversal.ts`, 25 gains BEH-QD-400, 28 gains BEH-QD-399; INV-QD-038
  row; ADR-QD-128 row; §4 rows `RoleWalk.test.ts`, `RoleGraphArbitrary.ts`, `Role.bench.ts` (new), and
  `RolesAndDepth.test.ts` (the property), `AuthSubject.test.ts`, `RoleTree.test.ts`, `RoleViewer.test.tsx` updated.
- README Rev 1.140: CCR-QD-406 (files of 16-01..16-04).
- Changesets: core minor (`roleWalk`/`RoleStep`; one walk behind flatten/roleNames/provenance/fromRoles; sets fill in walk
  order, unspecified; sparse `inherits` holes skipped as before); devtools patch (same-name roles, deep chains, diamonds).

## Task 3 — the gate

- Budgets (XC-04): `git diff 443b45f -- AGENTS.md scripts/check-house-style.mjs` empty.
- Ids (XC-02): new ids over `spec` since 443b45f are only ADR-QD-128, CCR-QD-406, BEH-QD-399, BEH-QD-400 (plus the
  unused-range mentions BEH-QD-401–408 / INV-QD-275–279 in the CCR row, inside the reservation). Count outside = 0.
- **`pnpm check:pr`: first run exit 1** at `spec:gates` (`check-dod-table.mjs`): the BEH-QD-400 example comment
  "editor (step 0)" read as a gate number. Rephrased ("editor at index 0"), commit `856a092`. **Second run exit 0**: 16 of
  17 steps (mutation skipped by design); vitest 167 files / 4,341 tests; coverage 99.34% statements; BDD 34 / 567;
  tstyche 194; doc examples 108; strict traceability 21 PASS / 0 FAIL / 0 SKIP; gate 13 888 exports.

### Mutation (XC-05), phase compare, ratios

Scoped Stryker on HEAD (`stryker.config.mjs --mutate Role.ts,AuthSubject.ts,RoleTraversal.ts`;
`stryker.devtools.mjs --mutate RoleTree.ts`), compared per file with the phase-base jsons:

| File | Base (443b45f) | Now |
|---|---|---|
| `packages/core/src/Role.ts` | 0.9299 | 0.9741 (113/116) |
| `packages/core/src/AuthSubject.ts` | 1.0 | 1.0 (18/18) |
| `packages/core/src/RoleTraversal.ts` | — (new) | 1.0 (21/21) |
| `packages/devtools/src/model/RoleTree.ts` | 1.0 | 1.0 (25/25) |

Compare one-liner exits 0 for both jsons: no drop. No file had 0 mutants.

## Requirement → evidence

| Req | Evidence |
|---|---|
| ROLE-01 | `RoleTraversal.ts` `traverseRoles`/`visitRoles`; `Role.ts` and `AuthSubject.ts` have no other loop over `inherits` (16-02); ADR-QD-128 |
| ROLE-02 | `fromRoles` = one `visitRoles(config.roles, …)` (16-02); `AuthSubject.test.ts`; bench shared 2.29–3.33× |
| ROLE-03 | `RoleTree.ts` `rows` from `roleWalk`; `RoleTree.test.ts` (same-name, 20,000-deep, diamonds linear), `RoleViewer.test.tsx` (20,000 render, siblings); BEH-QD-399 |
| ROLE-04 | INV-QD-038 note + seeded property in `RolesAndDepth.test.ts` (seed 1638, 300 runs) |
| ROLE-05 | `Role.bench.ts`, 16-02 interleaved table (in ADR-QD-128): every flatten after-range overlaps before |
| XC-01 | `pnpm check:pr` exit 0 (second run) |
| XC-02 | ADR-QD-128, CCR-QD-406, BEH-QD-399/400, INV-QD-038 amended; id check 0 outside the reservation |
| XC-03 | overview row; gate 13 green |
| XC-04 | budget diff empty; lint/house-style green |
| XC-05 | coverage 99.34% (core ≥ 95); mutation table above |
| XC-06 | RED on 443b45f: 16-01 `6fecedf` (RangeError, same-name, 2^k), 16-03 `a253594` (render RangeError, nesting), 16-02 sparse-holes RED |

## Bench (from 16-02, five interleaved rounds, paired after/before)

single 0.86–1.03 · wide 0.96–1.19 · deep 0.85–1.13 · diamonds 0.80–0.96 · fromRoles shared **2.29–3.33** · fromRoles disjoint 0.87–1.59.

## Reservations

Used: ADR-QD-128, CCR-QD-406, BEH-QD-399, BEH-QD-400. Unused: BEH-QD-401–408, INV-QD-275–279 (INV-QD-038 amended
instead of a new invariant).

## Deviations

1. **[Rule 3 - blocking] Gate 11 phrasing.** See Task 3; fixed in the doc, gate untouched.
2. ADR-QD-128's status is "reads", not "amends": no earlier ADR's text changes.

## Phase 17 base

The `docs(16-04): complete plan` commit (see git log).
