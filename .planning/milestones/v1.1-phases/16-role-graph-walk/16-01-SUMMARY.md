---
phase: 16-role-graph-walk
plan: 01
subsystem: core, devtools
tags: [core, devtools, role, traversal, red-test, mutation-base, property]

phase_base: 443b45f
mutation_baseline:
  packages/core/src/Role.ts: 92.99
  packages/core/src/AuthSubject.ts: 100
  packages/devtools/src/model/RoleTree.ts: 100

requires: ["15-04"]
provides:
  - "Phase base `16-base.txt` (443b45f) and the scoped mutation bases `16-mutation-base-core.json`, `16-mutation-base-devtools.json`"
  - "`RoleTraversal.ts` (package-private): `traverseRoles(roots, onStep)` — the one iterative, identity-keyed, pre-order walk that reports revisits"
  - "Public `roleWalk(self): ReadonlyArray<RoleStep>` and `RoleStep = Visit | Revisit` (Data.TaggedEnum) in `Role.ts`"
  - "`RoleTree.ts` builds its tree from `roleWalk`: `RoleNode.path` → `RoleNode.index`, new `RoleNode.first`; a repeated role is a leaf"
  - "Shared test arbitrary `packages/core/test/RoleGraphArbitrary.ts` (random DAGs with diamonds and same-named roles)"
affects: [16-02, 16-03, 16-04]

actuals:
  tasks: 3
  commits: 3

key-files:
  created:
    - .planning/phases/16-role-graph-walk/16-base.txt
    - .planning/phases/16-role-graph-walk/16-mutation-base-core.json
    - .planning/phases/16-role-graph-walk/16-mutation-base-devtools.json
    - packages/core/src/RoleTraversal.ts
    - packages/core/test/RoleWalk.test.ts
    - packages/core/test/RoleGraphArbitrary.ts
  modified:
    - packages/core/src/Role.ts
    - packages/core/test/RolesAndDepth.test.ts
    - packages/devtools/src/model/RoleTree.ts
    - packages/devtools/src/react/RoleViewer.tsx
    - packages/devtools/test/model/RoleTree.test.ts
    - packages/devtools/test/react/RoleViewer.test.tsx

key-decisions:
  - "16-01 T1 (D-04) = A, from `_DECISIONS.md`: \"A repeated role is a leaf referencing its first occurrence\""
  - "Callback visitor, not a generator (CONTEXT discretion): `traverseRoles(roots, onStep(role, index, depth, parent, first))`; no allocation per step beyond the pending-stack entry"
  - "Step indices count visits and revisits alike, so `RoleStep.index` is the position in `roleWalk`'s array and `first` points into it"
  - "The devtools tree is folded from the last step back (children exist before their parent), so no unreachable fallback or `?.` is needed and RoleTree.ts stays at 100% mutation"

requirements-completed: [ROLE-04]  # ROLE-01 completes in 16-02, ROLE-03 in 16-03

completed: 2026-11-10
status: complete
---

# 16-01 — One role walk in core; the devtools role tree is its projection

`phase_base: 443b45f` (`16-base.txt`, written by this plan; the 15-04 docs commit).

## Task 1 — decision (D-04)

Answered up front in `.planning/phases/_DECISIONS.md`:

> | 16-01 T1 (D-04) | `A` | A repeated role is a leaf referencing its first occurrence |

Applied: a `Revisit` step becomes a leaf with `repeated: true` and `first` = the index of the role's first
occurrence; its subtree is not walked again. The comment that argued for re-walking (`RoleTree.ts:84-86` on the base)
is replaced by `treeOf`'s doc comment stating why (linear size; subtree shown once at the first occurrence; the same
first-path-wins rule as `permissionProvenance`).

## Task 2 — mutation base, then RED (XC-05, XC-06)

Baselines re-measured at 443b45f (the plan's interfaces cite 1721a42): line numbers unchanged, no drift.
`seen.has(self.name)` in `RoleTree.ts` = 1; `roleWalk` in `packages/core/src` = 0.

Scoped Stryker before any change (plan's one-liners, ratios in the json):

| File | Base |
|---|---|
| `packages/core/src/Role.ts` | 92.99 (128 killed, 18 timeout, 11 survived, 0 NoCoverage) |
| `packages/core/src/AuthSubject.ts` | 100 (16/16) |
| `packages/devtools/src/model/RoleTree.ts` | 100 (24/24) |

The plan names two files (`16-mutation-base-core.json`, `16-mutation-base-devtools.json`), which 16-02/16-03's compare
one-liners read; there is no single `16-mutation-base.json`.

RED on the base (commit `6fecedf`):
- devtools `RoleTree.test.ts` "the inheritance tree on hostile shapes": 3 failed / 11 passed.
  - same-name pair: `AssertionError` (the second "editor" is marked `repeated`).
  - 10,000/20,000-deep chains: `RangeError: Maximum call stack size exceeded` (fails at the first depth, 10,000).
  - stacked diamonds: `k = 16: expected 262141 to equal 65`, in 49 ms; k = 30 is never built.
- core `RoleWalk.test.ts`: 4 failed (`roleWalk is not a function`).
- core `RolesAndDepth.test.ts` "INV-QD-038 over random role graphs": **passes** on the base (a pin, as planned;
  seed 1638, 300 runs). 36/36.

## Task 3 — GREEN

- `packages/core/src/RoleTraversal.ts`: `traverseRoles<R extends { readonly inherits: ReadonlyArray<R> }>(roots, onStep)`.
  Pop stack seeded with the roots reversed; parents pushed with `toReversed()`; a `Map<R, number>` keyed on identity
  holds each role's visit index. Imports nothing (no cycle when `AuthSubject.ts` uses it in 16-02). Not in the barrel.
- `Role.ts`:
  ```ts
  export type RoleStep = Data.TaggedEnum<{
    Visit:   { readonly role: Role; readonly index: number; readonly depth: number; readonly parent: number | undefined };
    Revisit: { readonly role: Role; readonly index: number; readonly depth: number; readonly parent: number | undefined; readonly first: number };
  }>;
  export const RoleStep = Data.taggedEnum<RoleStep>();
  export const roleWalk = (self: Role): ReadonlyArray<RoleStep>
  ```
  The three existing walkers are untouched (16-02 converts them).
- `RoleTree.ts` `RoleNode` is now `{ name; index; own; children; repeated; first: number | undefined }`. `index` is the
  walk step, unique per node and the React key; `first` is set only on a repeated node. `roleSummary`'s grants,
  counts, `decidingSet`, `grantPath` and `sameRole` are unchanged.
- `RoleViewer.tsx`: key `child.path` → `child.index` only (flat rendering is 16-03).

### Deviations

1. **[Rule 3 - blocking] `RoleViewer.test.tsx` diamond assertion.** It expected `["viewer", "commenter"]` repeated
   (the re-walked subtree). Under decision A the repeated arm is a leaf, so it is now `["viewer"]`. Not in the plan's
   file list; required for the devtools suite to stay green.
2. **[Rule 2 - mutation] Multi-root test for `traverseRoles`.** `roleWalk` passes one root, so reversing the roots
   was unobservable through it; a direct test of `traverseRoles([a, b, a], …)` in `RoleWalk.test.ts` pins root order
   and cross-root revisits (what `fromRoles` will need in 16-02). Without it RoleTraversal.ts would carry an
   equivalent-looking survivor.
3. Added `packages/core/test/RoleGraphArbitrary.ts` (not in the plan's list) so `RolesAndDepth.test.ts` and
   `RoleWalk.test.ts` share one arbitrary, as Task 2 asks ("on the same arbitrary").

## Gates

- Task 2 verify: mutation jsons written and non-empty; `RolesAndDepth.test.ts` green; `RoleTree.test.ts` and
  `RoleWalk.test.ts` red — pass.
- Task 3 verify: `RoleWalk.test.ts` + `RolesAndDepth.test.ts` 40/40 (then 41 with the multi-root test);
  `RoleTree.test.ts` + `RoleViewer.test.tsx` 25/25; `seen.has(self.name)` 1 → 0; `nodeOf(parent` 1 → 0; `roleWalk(` in
  RoleTree.ts present; `pnpm typecheck` 0; `pnpm lint` 0 (house-style clean, no warnings in touched files);
  `pnpm circular` 0 — pass.
- Full projects: core 60 files / 1962 tests, devtools 41 files / 1113 tests — green.
- Mutation after the change (not required by the plan, run for XC-05): Role.ts **93.98** (base 92.99),
  RoleTraversal.ts **100** (15/15, new), AuthSubject.ts 100, RoleTree.ts **100** (34/34). No drop.
- **Gate 13 (`pnpm spec:api`) is knowingly red** for `RoleStep` and `roleWalk` (2 drifts), by design until 16-04 adds
  their overview rows. No `spec/` file was touched.

## Ids

None allocated here. Phase 16's reservations (ARCH-64, ADR-QD-128, CCR-QD-406, and the BEH/INV ids in PROJECT.md)
are for 16-04's records; code comments cite decision "16-01 T1 = A" and existing INV-QD-038/ADR-QD-099/ADR-QD-037.

## Deferred to later plans

- **16-02:** convert `flattenPermissions`, `roleNames`, `permissionProvenance` and `AuthSubject.fromRoles` (one pass,
  multiple roots) onto `traverseRoles`; the `Role.bench.ts` before/after; compare against `16-mutation-base-core.json`
  (add `RoleTraversal.ts`, new, 100 at 1556b94, if the compare needs an entry). The property and `RoleWalk.test.ts`
  pin the semantics it must keep.
- **16-03:** flat rendering of the tree in `RoleViewer.tsx` (it still renders `Branch` recursively, so a 20,000-deep
  *render* is still unbounded nesting), using `index` as key and `first` to link a repeated row to its first occurrence.
- **16-04:** overview rows for `roleWalk`/`RoleStep` (turns gate 13 green), glossary term "role walk", ADR-QD-128,
  CCR-QD-406, the INV-QD-038 note (now structural), a BEH for the tree's identity keying, stack safety and
  repeated-as-leaf (the reversed display rule), traceability, changesets (`@qadi/core` minor for the new export;
  `@qadi/devtools` patch — `RoleNode` is package-private), `pnpm check:pr`.
