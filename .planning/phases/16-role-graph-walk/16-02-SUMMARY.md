---
phase: 16-role-graph-walk
plan: 02
subsystem: core
tags: [core, role, traversal, bench, mutation, property]

requires: ["16-01"]
provides:
  - "`packages/core/bench/Role.bench.ts`: flattenPermissions (single, wide, deep chain, diamonds) and fromRoles (shared, disjoint)"
  - "`flattenAll`, `flattenPermissions`, `roleNames`, `permissionProvenance` as projections of the one walk; no other loop over `inherits` in `Role.ts`"
  - "`fromRoles` in one walk over all roots, one visited set"
  - "Package-private `visitRoles(roots, onVisit)` in `RoleTraversal.ts`: the first-visits filter the four projections share"
affects: [16-03, 16-04]

actuals:
  tasks: 3
  commits: 3

key-files:
  created:
    - packages/core/bench/Role.bench.ts
  modified:
    - packages/core/src/Role.ts
    - packages/core/src/RoleTraversal.ts
    - packages/core/src/AuthSubject.ts
    - packages/core/test/AuthSubject.test.ts
    - packages/core/test/RolesAndDepth.test.ts
    - packages/core/test/RoleWalk.test.ts

key-decisions:
  - "No `checkpoint:decision` in this plan; 16-01 T1 = A (\"A repeated role is a leaf referencing its first occurrence\", `_DECISIONS.md`) is unaffected"
  - "The projections read visits through one shared filter, `visitRoles`, instead of each checking `first`: a per-projection check would be an equivalent mutant (a set is idempotent), the shared one is killed by provenance's diamond tests"
  - "`traverseRoles` pushes parents with `reduceRight` (one closure per walk, no array per visit, holes skipped) instead of `toReversed()`"
  - "`permissionProvenance` keys path links by step in a `Map<number | undefined, PathLink>`; the array form left two equivalent survivors"

requirements-completed: [ROLE-01, ROLE-02, ROLE-05]  # ROLE-04 completed in 16-01 (property), now structural; XC-04/XC-05 checked here, closed at phase end

completed: 2026-11-10
status: complete
---

# 16-02 — Core's walkers and `fromRoles` are projections of the one role walk

## Task 1 — the bench, before anything changed (commit `c54db40`)

`packages/core/bench/Role.bench.ts`, in `Evaluate.bench.ts`'s shape (doc comment naming each workload and why). Graphs
built once at module scope: (a) single role, 5 permissions; (b) one role inheriting 50 parents × 5 permissions;
(c) 1,000-deep chain; (d) 10 stacked diamonds (31 roles); (e) `fromRoles` on three roots sharing 194 of a 200-role
"ladder" graph (role *i* inherits *i-1* and *i-2*); (f) the same three roots over disjoint 64-rung ladders (198 roles).

**The plan's command does not work as written:** `pnpm vitest bench --run --project core …` fails with
"No projects matched the filter \"core\"" in bench mode, and the default reporter prints no table under the agent
environment. The working invocation is `pnpm vitest bench --run --reporter=default packages/core/bench/Role.bench.ts`.
Vitest warns that the bench "accessed module export getters too many times" (`permissionKey`, `flattenPermissions`,
`makeRoleName`): the module runner's live-binding getters, which apply to before and after alike.

Standalone "before", five runs, min–max hz (unconverted walkers):

| Workload | before |
|---|---|
| single | 1,870,306 – 2,028,825 |
| wide — 50 parents | 37,410 – 38,789 |
| deep chain — 1,000 | 6,638 – 7,189 |
| diamonds — 10 stacked | 254,712 – 275,915 |
| fromRoles shared | 4,300 – 4,720 |
| fromRoles disjoint | 11,107 – 12,372 |

## Task 2 — the walkers and `fromRoles` as projections (commit `a7d8f60`)

- `Role.ts`: `flattenAll` is one `visitRoles` over all roots (not one walk per root); `flattenPermissions = flattenAll([self])`;
  `roleNames` collects names on each visit; `permissionProvenance` keeps one `PathLink` per visited step, linked to its
  parent step, and flattens a path only for a role with permissions. The three old loops, `Frame`, `enter` and the
  per-walker `seen` sets are gone. Doc comments say each is a projection of the role walk and cite INV-QD-038 as
  holding by construction; the ticket-86 iterative-walk rationale moved to `RoleTraversal.ts`'s header.
- `RoleTraversal.ts`: `visitRoles(roots, onVisit(role, index, parent))`, the first-visits filter over `traverseRoles`.
  `traverseRoles` now pushes parents with `reduceRight` (see deviations).
- `AuthSubject.ts`: `fromRoles` is one `visitRoles(config.roles, …)` adding `makeRoleName(role.name)` and every
  `permissionKey` per visit, then `config.permissions`. Imports the package-private leaf; nothing joins the barrel.
- Tests: `AuthSubject.test.ts` — two roots sharing `viewer`, a third a distinct same-named `viewer` with its own parent;
  roles and permissions equal the explicit sets and the `roleNames`/`flattenAll` union. `RolesAndDepth.test.ts` —
  property (seed 1638, 300 runs) over the 16-01 arbitrary with 1–4 roots drawn from the graph: `fromRoles` equals the
  per-root union of `roleNames`/`flattenPermissions`, and `flattenAll(roots)` equals it too. `RoleWalk.test.ts` — sparse
  `inherits` and sparse roots are skipped.

Baselines → now (plan's own greps): `new Set<Role>()` in `Role.ts` 3 → 0; `while (stack.length` in `Role.ts` 3 → 0;
`roleNames(`/`flattenAll(` in `AuthSubject.ts` 2 → 0.

**Set iteration order changed (observable, unspecified).** `flattenPermissions`/`roleNames` used to fill their sets in
pop order; they now fill in walk (pre-)order, the same order provenance reports. `fromRoles`'s `roles`/`permissions`
follow the walk across roots. Nothing in core, the other packages or BDD asserted the old order (all 167 vitest files,
4,339 tests, and 34 BDD files green). 16-04 may mention it in the changeset.

## Task 3 — after, coverage, mutation (commit `25d2b9b`)

### Bench (ROLE-05)

Method (spec/process/house-rules-evidence.md §2): same machine, same session, **interleaved** — five rounds, each
running the bench once on the before sources (`Role.ts`, `AuthSubject.ts`, `RoleTraversal.ts` from `c54db40`) and once
on the after sources, copied into place and restored after; min–max hz over the five, plus the paired after/before
ratio per round. Throughput moved by up to ~40% between rounds (the "before" single ran 1.59M–1.95M within one
session), so only direction transfers.

| Workload | before (min–max) | after (min–max) | paired after/before |
|---|---|---|---|
| single | 1,588,350 – 1,949,056 | 1,372,130 – 1,857,330 | 0.86 – 1.03 |
| wide — 50 parents | 27,026 – 38,076 | 29,005 – 36,994 | 0.96 – 1.19 |
| deep chain — 1,000 | 4,315 – 7,079 | 4,569 – 6,401 | 0.85 – 1.13 |
| diamonds — 10 stacked | 206,968 – 270,050 | 197,972 – 242,183 | 0.80 – 0.96 |
| fromRoles shared | 3,505 – 4,697 | **10,377 – 15,232** | **2.29 – 3.33** |
| fromRoles disjoint | 8,479 – 12,359 | 10,345 – 15,177 | 0.87 – 1.59 |

ROLE-05 holds by the plan's criterion: every `flattenPermissions` after range overlaps its before range, and the
`fromRoles` shared-graph after range lies wholly above its before range (one pass instead of six per-root walks).
Stated plainly: the paired ratios for single, deep and diamonds sit mostly just below 1 (medians ~0.9–0.95), a small
directional cost of the shared walk (a `Map` for `first`, a `Pending` object per edge, two visitor calls per step)
inside run-to-run noise. The first after-measurement (16-01's `toReversed` form, before the deviation below) was
~10–20% slower on flatten in a standalone run; an in-process A/B of variants (old loop, `toReversed`, index loop,
parallel stacks, `reduceRight`) showed `reduceRight`/index loop closest to the old loop, and `reduceRight` was chosen.

### Coverage

`pnpm coverage` exit 0: all files 99.34% statements; `core/src` 99.19 / 97.35 / 99.23 / 99.75 (≥ 95%). `Role.ts`
100% lines (the one uncovered branch, :316, is `resolveRoleGraph`, untouched).

### Mutation (XC-05), scoped Stryker, compared with `16-mutation-base-core.json`

| File | Base (443b45f) | After |
|---|---|---|
| `packages/core/src/Role.ts` | 92.99 | **97.41** (108 killed, 5 timeout, 3 survived) |
| `packages/core/src/AuthSubject.ts` | 100 | 100 (18/18) |
| `packages/core/src/RoleTraversal.ts` | — (new in 16-01, no file at the base) | 100 (21/21) |

The plan's compare one-liner exits 0. The three remaining survivors are all in `resolveRoleGraph` (`ancestors.delete`,
`if (built !== undefined)`, the `","` join), untouched and present at the base. The first run after Task 2 scored
`Role.ts` 95.80 with two new survivors in `permissionProvenance` (an initial `links` element overwritten at step 0;
the root's `parent === undefined` guard falling through to `links[undefined]`), both equivalent; simplified away by
keying the links in a `Map` (standing rule: simplify the equivalent mutant away). `RoleTraversal.ts` has no base entry
and none can be measured at 443b45f (the file does not exist there); recorded here only.

## Deviations

1. **[Rule 1 - bug] `traverseRoles` threw on a sparse `inherits`.** 16-01's `toReversed()` turns holes into
   `undefined`, which was then pushed and read (`TypeError: Cannot read properties of undefined`); the three walkers it
   replaced skipped holes (`if (current === undefined) continue` / `if (parent === undefined) continue`). `reduceRight`
   skips holes natively and allocates no array per visit. RED seen on the 16-01 form, GREEN after
   (`RoleWalk.test.ts` "skips the holes of a sparse inherits array, and of sparse roots").
2. **[Rule 3 - blocking] Bench invocation.** The plan's `--project core` filter fails in bench mode; ran by file with
   `--reporter=default` (above). The plan's Task 1/Task 3 verify commands are otherwise unchanged in intent.
3. **[Rule 2 - mutation] `visitRoles` added to `RoleTraversal.ts`** (in the plan's file list) so the four
   visit-only projections share one revisit filter that a test can observe, rather than four equivalent-mutant checks.
4. **[Rule 2 - mutation] provenance links in a `Map`** (commit `25d2b9b`), see Mutation.

## Gates

- Task 1 verify: bench file exists and runs (by file, see deviation 2) — pass.
- Task 2 verify: the three targeted test files 55/55; the three greps at 0; `pnpm typecheck` 0; `pnpm lint` 0
  (house-style 435 files clean; no warnings in touched files); `pnpm circular` clean; `pnpm spec:examples` 107 blocks
  compile — pass.
- Task 3 verify: bench after; `pnpm coverage` 0; scoped Stryker 0; compare one-liner 0 — pass.
- Extra: all vitest projects 167 files / 4,339 tests; `pnpm test:bdd` 34 files / 567 tests — green.
- **`pnpm spec:api` (gate 13) still knowingly red** for `RoleStep`/`roleWalk` until 16-04. `visitRoles` is
  package-private (not in the barrel), so it adds no overview row.

## Deferred

- **16-03:** flat rendering of the devtools tree in `RoleViewer.tsx` (still recursive `Branch`), `index` as key, `first`
  linking a repeated row to its first occurrence; devtools mutation against `16-mutation-base-devtools.json`.
- **16-04:** overview rows for `roleWalk`/`RoleStep` (gate 13), glossary "role walk", ADR-QD-128, CCR-QD-406, the
  INV-QD-038 note (now structural: provenance and flatten read the same visits), BEH for the tree's identity keying,
  stack safety and repeated-as-leaf, traceability, changesets (`@qadi/core` minor; mention `fromRoles` walking once and
  that `flattenPermissions`/`roleNames`/`fromRoles` sets now fill in walk order; sparse `inherits` tolerated again),
  `pnpm check:pr`. The `RolesAndDepth.test.ts` describe "the three walkers survive a very deep inheritance chain" and
  its ticket-86 comment still read as history; 16-04 may retitle it.
