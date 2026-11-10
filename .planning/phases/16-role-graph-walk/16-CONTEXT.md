# Phase 16: One role-graph walk - Context

**Gathered:** 2026-11-10
**Status:** Ready for planning
**Ticket:** ARCH-64 · review candidate #1 (Strong, top recommendation; defect in devtools)
**Read first:** `.planning/phases/_SHARED-CONTEXT.md`

<domain>
## Phase Boundary

`@qadi/core`'s `Role.ts` owns one traversal of the role-inheritance graph. It visits each reachable role once,
keyed on object identity, iteratively (stack-safe), in pre-order with parents in array order. The first path to
reach a role wins, and it reports revisits. `flattenPermissions`, `roleNames`, `permissionProvenance`,
`AuthSubject.fromRoles` (in one pass) and the devtools role tree (`RoleTree.ts`) all become projections of it.
INV-QD-038 (provenance agrees with flatten) holds by construction rather than by a test.
</domain>

<evidence>
## Evidence (verified at 1721a42)
- Four copies of the same walk: `packages/core/src/Role.ts:58-73` (`flattenPermissions`), `:134-196`
  (`permissionProvenance`), `:218-233` (`roleNames`), and `packages/devtools/src/model/RoleTree.ts:77-90` (`nodeOf`).
  `AuthSubject.ts:97-101` (`fromRoles`) walks each role twice (`roleNames` then `flattenAll`), with separate
  visited sets.
- The copies have drifted twice: ticket 86 (make the walks iterative) and the name-to-identity keying fix both had to
  be applied to all three core walkers (`test/RolesAndDepth.test.ts:283-286`). Agreement is held only by a test
  (`RolesAndDepth.test.ts:255-262`).
- **Defect (devtools):** `RoleTree.ts:78-79` keys `seen` on `self.name`. Two distinct roles with the same name are
  shown with the second marked `repeated`, which contradicts its own doc (`:29-35`). It recurses natively
  (`:87`), so a deep chain overflows the stack, the thing ticket 86 removed from core. It re-walks the subtree of a
  repeated node, so a chain of k diamonds builds about 2^k nodes. **Probe (2026-11-10):** stacked diamonds k=10/16/20 → 4,093 /
  262,141 / 4,194,301 nodes (574 ms at k=20); a 20,000-deep chain throws `RangeError` from `nodeOf`, while core's walkers handle it.
  `roleSummary` *is* tested (`devtools/test/model/RoleTree.test.ts`: a 200-deep chain, diamond marking), but nothing covers the
  blow-up, depth past 200, or distinct roles with the same name.
</evidence>

<decisions>
## Implementation Decisions
- **D-01 (test first):** RED tests on `1721a42`:
  (a) devtools: two different `Role` objects named "editor" in one graph are *not* marked `repeated`;
  (b) a 10 000-deep inheritance chain renders a tree without a `RangeError`;
  (c) a 30-diamond chain finishes and the node count is linear in roles.
  Core's walkers are already correct; pin them with a property test (fast-check, if it is already a dev dependency;
  the planner checks) that `flattenPermissions` equals the union of `permissionProvenance`'s keys and that
  `roleNames` equals the set of reached names, over random DAGs with shared and same-named roles.
- **D-02:** the traversal is one internal function (or a small iterator) in `Role.ts`, exported from the barrel
  only if devtools needs it. Devtools does need it, and devtools may import only `@qadi/core`'s root
  (ADR-QD-099), so it is either exported (gate 13: a `spec/overview.md` row) or devtools receives a core-made
  projection. Recommend exporting **one** projection that devtools consumes (a tree-with-revisits, or the
  traversal itself), named in the domain glossary. The planner proposes the name and adds it to `spec/glossary.md`.
- **D-03:** performance. `flattenPermissions` runs once per subject per request. Path links are built only for
  callers that ask for them (provenance, the tree). Add a benchmark row to the existing `pnpm bench` suite. The
  flatten/fromRoles path must not regress beyond noise (state the method, following
  `spec/process/house-rules-evidence.md`). `fromRoles` must improve (one pass).
- **D-04:** how a revisit is reported is decided once: the traversal yields a `Visit | Revisit` closed union
  (user preference: closed unions). The tree keeps showing repeated nodes, but **does not** re-walk their
  subtrees. This changes what devtools shows; the comment at `RoleTree.ts:84-85` argues the other way. That is a
  `checkpoint:decision`: (A) show a repeated node as a leaf that references the first occurrence (recommended);
  (B) keep re-walking but cap it. State the 2^k cost honestly.
- **D-05:** Records: CCR row; INV-QD-038 note (now structural); a BEH for the devtools tree's identity keying and
  stack safety; changesets (`@qadi/core` minor if a new export, `@qadi/devtools` patch). Add an ADR only if
  D-02 adds a public concept.

### Claude's Discretion
- Generator vs callback-style traversal (mind AGENTS.md: no `as`; sync CPU code inside Effect goes through `Effect.sync`
  only where an Effect wraps it — `Role.ts` is pure today, keep it pure).
</decisions>

<canonical_refs>
## Canonical References
- `packages/core/src/Role.ts`, `AuthSubject.ts`, `packages/core/test/RolesAndDepth.test.ts`
- `packages/devtools/src/model/RoleTree.ts` and its consumers (`grep -rn roleSummary packages/devtools/src`)
- `spec/invariants.md` INV-QD-038; `spec/glossary.md` (Role, Permission); ADR-QD-099 (entry points)
</canonical_refs>

<deferred>
## Deferred Ideas
None.
</deferred>

---
*Phase: 16-role-graph-walk · Context gathered: 2026-11-10*
