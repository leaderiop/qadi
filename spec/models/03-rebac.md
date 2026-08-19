# 03 — Relationship-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-03                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

Under ReBAC, authority follows from a **relationship between the subject and the
resource** rather than from a label carried by either. Olivia may read `doc-1`
because she owns it — not because she holds an `archivist` role, and not because
`doc-1` carries a `visibility` attribute she matches against.

Those relationships form a graph, and "is Olivia the owner of `doc-1`?" is a
reachability query over it. Roles, attributes and permission tokens are property
lookups on one party; this is a question about the pair.

## Who asks for it

Any application whose resources have owners — document stores, repository hosts,
ticketing systems, shared drives, patient records, tenant trees. They ask "is
this *yours*?" before "what are you?", which is what a role-based system cannot
answer. ReBAC also underpins much of the
[adoption matrix](./00-adoption-matrix.md)'s P1 tier: discretionary access
control, access control lists, team-based access, consent and hierarchical
tenant scoping are each a naming convention over the same relation tuple.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

## How Qadi expresses it

One policy node names a relation; one service port answers whether it holds.

```ts
export const hasRelationship: (
  relation: string,
  options?: FieldOptions & { depth?: number },
) => Policy;
```

The request carries everything a graph store needs and nothing it does not.
`depth` is a **required key that may be `undefined`** — an unstated depth is a
decision the resolver makes, not a field an implementation may quietly omit.

```ts
export interface RelationshipCheck {
  readonly subjectId: string;
  readonly relation: string;
  readonly resourceId: string;
  /** Maximum traversal depth. Undefined means the resolver decides. */
  readonly depth: number | undefined;
}

export interface RelationshipResolverShape {
  readonly check: (
    request: RelationshipCheck,
  ) => Effect.Effect<boolean, RelationshipResolveError>;
}
```

`check` returns an `Effect`, so a resolver backed by a remote graph service is a
first-class implementation rather than a second, asynchronous API — the
predecessor's `checkAsync` was unreachable because evaluation was synchronous
([BEH-QD-033](../behaviors/05-evaluator.md)).

Two layers ship. Neither is a graph store.

```ts
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver>;
export interface RelationshipEdgeInput {
  readonly subjectId: string;
  readonly relation: string;
  readonly resourceId: string;
}

export const relationshipResolverFromEdges: (
  edges: ReadonlyArray<RelationshipEdgeInput>,
) => Layer.Layer<RelationshipResolver>;
```

`RelationshipResolverNever` is the default and denies every relation: an unwired
port must not grant access, so a wiring omission surfaces as denials in testing
rather than as a silent breach in production
([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed),
[BEH-QD-043](../behaviors/06-services.md)). `relationshipResolverFromEdges`
matches direct `RelationshipEdgeInput` edges only — a flat list has
no graph, so it ignores `depth`.

**A relationship check without a resource is an error, not a denial.** A
`HasRelationship` node evaluated with no `resource`, or with one carrying no
string `id`, fails with `MissingResourceId`; its sibling `MissingResource`
covers the same omission for resource attributes. Reporting a wiring fault as
"not authorized" sends engineers to audit permissions instead of the call site
([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial),
[BEH-QD-036](../behaviors/05-evaluator.md),
[ADR-QD-008](../decisions/008-error-taxonomy.md)), and the acceptance suite pins
it as its own scenario.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  anyOf,
  check,
  currentSubjectLayer,
  hasRelationship,
  hasRole,
  makeSubject,
  relationshipResolverFromEdges,
} from "@qadi/core";

// Module scope: a policy rebuilt per call is a new reference every time.
const canReadDocument = anyOf([
  hasRelationship("owner"),
  hasRelationship("member", { depth: 3, fields: ["id", "title"] }),
  hasRole("archivist"),
]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-olivia" })),
  relationshipResolverFromEdges([
    { subjectId: "u-olivia", relation: "owner", resourceId: "doc-1" },
    { subjectId: "u-peggy", relation: "member", resourceId: "doc-1" },
  ]),
  AttributeResolverNone,
  EvaluationIdLive,
  DecisionHistoryUnknown,
);

const allowed = check(canReadDocument, { resource: { id: "doc-1" } }).pipe(
  Effect.provide(services),
);
// → true, on the `owner` edge.
// Omit `resource` and this fails with MissingResourceId — it does not return false.
```

## What is missing

Nothing in the model; two things around it.

**Qadi ships no graph store — it ships a port.** Zanzibar-style adapters for
SpiceDB and OpenFGA are P1 *Wiring* work in the
[adoption matrix](./00-adoption-matrix.md): a resolver implementation and a
recipe, no core change, and a document of their own rather than a section of
this one. A store built here would cross the boundary [the URS](../urs.md)
draws, under which the relationship graph is served by the caller's own system.

**Qadi performs no traversal.** `depth` is passed to the resolver and never
interpreted by the evaluator. Transitive ownership, group nesting and tenant
ancestry belong to the resolver; from Qadi's side the check is one boolean
question with a depth budget attached.

## Verification

| Evidence | Location |
| -------- | -------- |
| Resolver consulted; absent edge denies; missing `resource.id` fails; default fails closed | `packages/core/test/Evaluate.test.ts` |
| An unevaluated branch performs **no relationship lookup**, under both `anyOf` and `allOf`; `Union` performs every lookup by design; a resolver failure propagates rather than denying | `packages/core/test/Evaluate.test.ts` |
| `RelationshipResolverNever` denies everything; `relationshipResolverFromEdges` matches direct edges only | `packages/core/test/Layers.test.ts` |
| `hasRelationship` carries `depth` and `fields`; JSON round trip via the FastCheck generator | `packages/core/test/Policy.test.ts` |
| `edgeRelationshipResolver` records its queries; `qadiTestLayer` defaults fail closed | `packages/testing/test/TestLayers.test.ts` |
| Acceptance scenarios, tagged `@REQ-QD-005` | `features/features/rebac/relationships.feature` |

`REQ-QD-005` maps to `BEH-QD-036` in the
[traceability matrix](../traceability.md). Its four scenarios cover the grant,
the plain denial, a relationship to a *different* resource, and the
error-not-denial case.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [06 — Services and Layers](../behaviors/06-services.md) · [Roadmap](../roadmap.md)_
