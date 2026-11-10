# ADR-QD-128 — One walk of the role graph

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-128                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — reads ADR-QD-015, ADR-QD-037, ADR-QD-099 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-64, CCR-QD-406) |

---

## Context

The role-inheritance graph was walked by four hand-kept copies of one loop:
`flattenPermissions`, `permissionProvenance` and `roleNames` in `packages/core/src/Role.ts`,
and `nodeOf` in `packages/devtools/src/model/RoleTree.ts`. `AuthSubject.fromRoles` walked
each role twice more (`roleNames`, then `flattenAll`), with separate visited sets.

The copies had already drifted twice. Ticket 86 made the walks iterative, and a later fix
keyed them on object identity instead of `name`; each change had to be applied to every
core copy by hand. Agreement between provenance and flattening
([INV-QD-038](../invariants.md#inv-qd-038-provenance-and-flattening-agree)) was held by a
test, not by structure.

The devtools copy had missed both fixes. A probe on the base (`443b45f`) showed three defects:

- It keyed its visited set on `name`, so a second, distinct role named `editor` was drawn
  as "repeated".
- It recursed natively, so a 20,000-deep chain threw `RangeError: Maximum call stack size
  exceeded`. Core's walkers handled that chain.
- It re-walked the subtree under every repeated role, so a chain of *k* stacked diamonds
  built about 2^k nodes: 4,093 at k = 10, 262,141 at k = 16, 4,194,301 at k = 20 (574 ms).
  The library itself walks the same chain in linear time.

## Decision

**One traversal, in one package-private leaf.** `packages/core/src/RoleTraversal.ts`
holds `traverseRoles(roots, onStep)`. It is generic over anything with `inherits`, so it
imports nothing and `AuthSubject.ts` can share it without a cycle
([ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md)). Its rules are fixed once:

- a role is keyed on **object identity**, never on `name`;
- it is **iterative**, with an explicit stack, so depth costs heap, not native stack;
- it is **pre-order with parents in `inherits` order**, so the first path to reach a role
  wins;
- every edge into an already-visited role is **reported as a revisit**, naming the step of
  the first visit, and is not walked again;
- holes in a sparse `inherits` (or roots) array are skipped, as every earlier copy did.

`visitRoles` is the first-visits filter over it. `flattenAll`, `flattenPermissions`,
`roleNames`, `permissionProvenance` and `fromRoles` are projections of that one walk.
`fromRoles` walks all its roots in one pass with one visited set. INV-QD-038 now holds by
construction, because provenance and flattening read the same visits.

**One public projection: `roleWalk` / `RoleStep`.** `roleWalk(role)` returns the walk as an
array of `RoleStep`, a closed `Visit | Revisit` union (`Data.TaggedEnum`). Each step carries
its `role`, its `index` in the array, its `depth` and its `parent` step index; a `Revisit`
also carries `first`, the index of that role's `Visit`. The devtools role tree needs the
walk, and `@qadi/devtools` may import only `@qadi/core`'s root
([ADR-QD-099](./099-entry-points-are-a-closed-list.md)). So the walk is exported as data,
and no fifth copy is written. `traverseRoles` and `visitRoles` stay out of the barrel.

**Path links only for callers that ask.** `flattenPermissions` runs once per subject, so
once per request on a server. It builds no path. `permissionProvenance` keeps one link per
visited step, keyed by step in a `Map`, and flattens a path only for a role that has
permissions. The devtools tree reads `parent`/`depth` from the steps.

**A repeated role is a leaf** (decision 16-01 T1, answered `A` in the phase's decision
record: "A repeated role is a leaf referencing its first occurrence"). The devtools tree
draws a `Revisit` as one row marked repeated, linked to its first occurrence by the step
index (`data-first`). Its subtree is drawn once, at the first occurrence. The rejected
option, B, kept re-walking each repeated subtree with a cap. Uncapped, that costs 2^k rows
for k stacked diamonds (the probe above). Capped, it shows an arbitrary truncation. Either
way it draws structure the decision never used. Under A, the row count is the number of
reachable roles plus the number of revisits: linear in the graph's edges.

The devtools tree also stopped nesting. `RoleSummary.rows` is the walk as flat rows
(`{ name, index, depth, own, repeated, first }`), and `RoleViewer` renders them as sibling
elements indented by depth. A 20,000-deep chain renders in about 2.2 s. It used to throw
after 69 s.

## Consequences

- A new rule for the walk (a new key, a new order) is written once, in `RoleTraversal.ts`,
  and every projection gets it. A sixth walker would need to justify not reading
  `roleWalk`/`visitRoles`.
- The sets returned by `flattenPermissions`, `roleNames` and `fromRoles` now fill in walk
  (pre-)order, the same order provenance reports. Before, they filled in pop order. No
  spec defines that order, and nothing in the repository asserted the old one; the
  changeset says so.
- Cost, measured by `packages/core/bench/Role.bench.ts`: five interleaved rounds on one
  machine, before and after sources swapped in each round
  ([house-rules evidence §2](../process/house-rules-evidence.md)). Throughput moved by
  up to about 40% between rounds, so only direction transfers. The paired after/before
  ratios:

  | Workload | after / before |
  | -------- | -------------- |
  | `flattenPermissions` — single role | 0.86 – 1.03 |
  | `flattenPermissions` — 50 parents | 0.96 – 1.19 |
  | `flattenPermissions` — 1,000-deep chain | 0.85 – 1.13 |
  | `flattenPermissions` — 10 stacked diamonds | 0.80 – 0.96 |
  | `fromRoles` — three roots sharing a graph | **2.29 – 3.33** |
  | `fromRoles` — three disjoint roots | 0.87 – 1.59 |

  Every `flattenPermissions` after-range overlaps its before-range. The medians sit just
  below 1 (about 0.9–0.95): a small cost of the shared walk (a `Map` for `first`, one
  pending entry per edge, one visitor call per step), inside run-to-run noise.
  `fromRoles` on a shared graph is two to three times faster, because it walks once
  instead of twice per root.
- The devtools tree's size is linear in the graph, its depth costs no native stack, and two
  distinct roles that share a name are two rows.

## Alternatives considered

- **A generator instead of a callback visitor.** Rejected. A generator allocates an iterator
  result per step, and `flattenPermissions` runs on every request. The callback form
  allocates nothing per step beyond the pending-stack entry.
- **Export `traverseRoles` itself.** Rejected. The callback's argument list is an
  implementation shape. `RoleStep` is a closed union a reader can match on, and it is the
  same data.
- **Give devtools a core-made tree.** Rejected. A tree is one rendering of the walk. The
  flat walk carries the same links (`parent`, `first`) and is stack-safe to consume.
- **Re-walk repeated subtrees, capped (option B).** Rejected at the decision, for the reason
  above.

## Related

[ADR-QD-015](./015-role-dag-acyclic-by-construction.md),
[ADR-QD-037](./037-circular-imports-and-type-level-tests-are-gates.md),
[ADR-QD-099](./099-entry-points-are-a-closed-list.md),
[BEH-QD-010](../behaviors/02-roles.md#beh-qd-010-permission-flattening),
[BEH-QD-011](../behaviors/02-roles.md#beh-qd-011-transitive-role-names),
[BEH-QD-192](../behaviors/25-inspection.md#beh-qd-192-a-permission-names-the-role-that-granted-it),
[BEH-QD-214](../behaviors/28-devtools-screens.md#beh-qd-214-provenance-is-shown-and-the-cycle-check-is-not-claimed),
[BEH-QD-399](../behaviors/28-devtools-screens.md#beh-qd-399-the-role-tree-is-the-role-walk),
[BEH-QD-400](../behaviors/25-inspection.md#beh-qd-400-the-role-walk-visits-each-reachable-role-once),
[INV-QD-038](../invariants.md#inv-qd-038-provenance-and-flattening-agree).
