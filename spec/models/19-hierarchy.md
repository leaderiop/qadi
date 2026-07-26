# 19 — Hierarchical Resource Scoping

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-19                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Resources form a tree, and a permission granted at a node applies to everything
beneath it. GCP nests organisation → folder → project → resource; AWS
Organizations nests accounts under organisational units; a multi-tenant product
nests workspace → project → document; a filesystem nests directories. In each
case the grant is written once, high in the tree, and the check happens low.

The model is routinely confused with role hierarchy, and the two are orthogonal.
[Role inheritance](./01-rbac.md) is a DAG over **roles**, flattened once when the
subject is constructed — by the time evaluation starts there is no graph left.
This is a hierarchy over **resources**, resolved at decision time, and it cannot
be flattened in advance because the tree is not known until the resource in hand
is. Different axis, different moment.

## Who asks for it

Any product with a containment tree: cloud consoles, multi-tenant SaaS nesting
workspace above project above document, document stores with folders, CI
platforms with organisations above repositories. The request is always the same
sentence — "an administrator of the workspace should be able to act on
everything in it, without a grant per document" — and fanning grants out to
every leaf on write is what these teams are trying to stop doing.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

The tree belongs to the caller, and so does the walk. What Qadi contributes is
the relation name, the resource in hand, and a depth bound to pass along.

## How Qadi expresses it

One policy node, with the option that makes it hierarchical:

```ts
export const hasRelationship: (
  relation: string,
  options?: FieldOptions & { depth?: number },
) => Policy;
```

`hasRelationship("member", { depth: 3 })` is the one place Qadi's policy language
acknowledges that a graph has distance. Be exact about what that means, because
the name invites over-reading. `depth` travels to the resolver as a field of
`RelationshipCheck`, alongside `subjectId`, `relation` and `resourceId`, and
that is all that happens to it: **Qadi performs no traversal itself.** The
evaluator never reads `depth`, counts no hops and does not know the tree exists.
It is a *bound the resolver is asked to honour*, not one the library enforces,
and `undefined` means the resolver decides. `relationshipResolverFromEdges`
ignores it entirely — a flat edge list has no graph to walk, so there is nothing
for a bound to bound. A real hierarchy resolver must implement it.

The resolver's question is not "is this subject a member of this resource?" but
"is this subject a member of this resource **or any ancestor of it**?" — so the
adapter needs the resource's ancestor chain. There are two ways to get it.

| Implementation | What the resolver does | Trade-off |
| -------------- | ---------------------- | --------- |
| **Walk upward at decision time** | Read the resource, read its parent, repeat to the root or until `depth` is exhausted, testing membership at each node | Nothing is denormalised, so a re-parent is a single write and can never leave stale data. Costs one read per level on every decision, and the read count is data-dependent |
| **Materialised ancestor path** | Store the full root-to-self path on each resource; membership is a containment test against that array | One read, and the check becomes a single lookup. The path must be rewritten across an entire subtree whenever a node moves |

The second is usually right. Moves are rare, decisions are not, and the
denormalised path turns an unbounded walk into a single indexed lookup — which
also removes the failure mode described below. Take the first only when the tree
re-parents often enough that subtree rewrites dominate.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolver,
  type RelationshipCheck,
  anyOf,
  check,
  currentSubjectLayer,
  hasRelationship,
  hasRole,
  makeSubject,
} from "@qadi/core";

// The caller's tenancy store. The materialised root-to-self path of a resource
// — ["org-acme", "folder-eu", "project-atlas"] — self last, closest ancestor
// nearest the tail; and the nodes on which a subject directly holds a relation.
declare const ancestorPath: (id: string) => Effect.Effect<ReadonlyArray<string>>;
declare const directGrants: (
  subjectId: string,
  relation: string,
) => Effect.Effect<ReadonlySet<string>>;

const TenancyTreeResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) =>
      Effect.gen(function* () {
        const path = yield* ancestorPath(request.resourceId);
        // `depth` is honoured here or nowhere: Qadi hands it over and forgets
        // it. Undefined means the resolver decides — here, the whole path.
        // Depth 0 is self only; depth 3 reaches three levels up.
        const inScope =
          request.depth === undefined ? path : path.slice(-(request.depth + 1));
        const granted = yield* directGrants(request.subjectId, request.relation);
        return inScope.some((node) => granted.has(node));
      }),
  },
);

// Module scope: a policy rebuilt per call is a new reference every time.
const canViewProject = anyOf([
  hasRole("platform-admin"),
  hasRelationship("member", { depth: 3 }),
]);

const program = check(canViewProject, { resource: { id: "project-atlas" } }).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-olivia" }))),
  Effect.provide(
    Layer.mergeAll(TenancyTreeResolver, AttributeResolverNone, EvaluationIdLive),
  ),
);
// A `member` grant on `org-acme` allows: the organisation sits in the project's
// ancestor path, two hops up and inside the budget of three.
```

## What is missing

**There is no way to carve a hole out of an inherited grant.** Inheritance here
is downward and monotonic: a grant at the root reaches every leaf, and Qadi
cannot express "…except this subtree". Exceptions require ordered evaluation,
where a deny at a lower node overrides an allow inherited from above, and that
is enabler **E3 — combining algorithms**, which the
[adoption matrix](./00-adoption-matrix.md) marks **Breaking**. `AllOf` and
`AnyOf` are unordered sets whose allow/deny rule is hard-coded; there is no
`deny-overrides` and no first-match. `not(...)` does not fill the gap — it
composes as a plain boolean, so excluding a subtree means restating the whole
rule as "inherited grant **and not** in the excluded set", every exceptable rule
rewritten at every call site with the exclusion list threaded through. This is
the sharpest limitation of the model as Qadi has it today, and a product whose
tenancy story depends on exclusions should not adopt this pattern before E3
lands.

**Depth bounds are a safety property, and they are the caller's to enforce.** An
unbounded upward walk over a tree that is deep, or — through a re-parenting bug
— cyclic, does not terminate: a denial-of-service surface inside the caller's
resolver, reached by an ordinary authorisation check. Qadi separately bounds
*policy* recursion, rejecting a tree deeper than `maxDepth` (default 64) with
`PolicyTooDeep` ([BEH-QD-038](../behaviors/05-evaluator.md)). **That is a
different bound and it does not protect the resolver** — it limits how deeply
nested a policy document may be, not how far a resolver may walk.

**Qadi does not model the tree.** There is no parent, ancestor or move operation
in the API, and `RelationshipCheck` carries no resource type — a constraint
shared with [Zanzibar-style stores](./10-zanzibar.md), where the usual answer is
to encode the type in the id.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. In particular, **no test asserts that any
resolver honours `depth`**, because no resolver Qadi ships interprets it; the
only assertion in the suite is the negative one, that
`relationshipResolverFromEdges` matches direct edges whatever value is passed.

The mechanics it rests on are proven: relationship evaluation and the
error-not-denial rule for a missing `resource.id` by `REQ-QD-005`, the
fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), and the
serialisation of `depth` by the round-trip property test in
`packages/core/test/Policy.test.ts`. The rest is the caller's resolver, tested
against their own tree — including a cycle case, which is the one the library
cannot help with. Short-circuiting *is* now proven for relationships
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)), which
matters here more than most: under a decision-time upward walk, the branch that
gets skipped is the most expensive thing an evaluation does.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [10 — Zanzibar-Style Relationship Stores](./10-zanzibar.md) · [01 — Role-Based Access Control](./01-rbac.md)_
