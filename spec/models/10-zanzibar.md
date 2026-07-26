# 10 — Zanzibar-Style Relationship Stores

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-10                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Google's Zanzibar and its open implementations — SpiceDB, OpenFGA, Warrant —
store **relation tuples**: `document:readme#viewer@user:alice`, read as "alice is
a viewer of the readme document". A `Check` call asks whether a tuple is
*reachable*, not whether it was written literally, because a namespace
configuration declares **userset rewrite** rules — `viewer` may be defined as
"anyone with `editor`, plus the members of the parent folder's `viewer` set".

Nothing in that describes a policy tree, a role, a field or a decision. **Qadi is
the policy side; Zanzibar is the data side.** They are not alternatives.

## Who asks for it

Applications that have outgrown a grants table. Folder trees, nested groups and
organisation hierarchies turn "may she read this?" into a multi-hop reachability
question, and answering it across millions of tuples in single-digit milliseconds
is a specialised job. More often: teams already running such a store for another
service, who want their decisions to consult it rather than duplicate it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Adopting a store is writing an adapter, not changing the library:
`RelationshipResolver` is a port whose shape maps almost exactly onto a `Check`
call, which is no coincidence ([MOD-QD-003](./03-rebac.md)).

## How Qadi expresses it

Four fields in, one boolean out — and `check` returns an `Effect`, so a remote
store is a first-class implementation rather than a second, asynchronous API.

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

| Zanzibar concept | Qadi concept |
| ---------------- | ------------ |
| Userset subject (`user:alice`) | `subjectId` — the current subject's `id` |
| Relation or permission (`viewer`) | `relation` — the `hasRelationship` argument |
| Object id (`document:readme`) | `resourceId` — read from `resource.id` |
| Rewrite and traversal bound | `depth` — passed through, never interpreted |
| `Check` response | the `boolean` in the returned `Effect` |
| Consistency token (zookie) | Not represented. The adapter's business |
| Userset rewrite rules | Not represented. The store's schema |

**Qadi performs no traversal.** `depth` is handed to the resolver and the
evaluator never reads it. Group nesting, folder inheritance and transitive
ownership are the store's work; from Qadi's side a relationship check is one
boolean question carrying a budget.

### Where the object type comes from

Zanzibar objects are `type:id` pairs. Qadi's `resourceId` is a bare string taken
from `resource.id`, and `RelationshipCheck` carries nothing else about the
resource — no attributes, no type field.

**Encode the type in the id.** Pass `resource: { id: "document:readme" }` and let
the adapter split on the first colon. Taking the type from another resource field
is not really available to a resolver, because the resource never reaches it: it
would mean building a resolver layer per request, which makes the adapter
stateful and couples it to every call site. A third option is often sufficient —
one resolver per object type, the type fixed as a constant.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolver,
  type RelationshipCheck,
  allOf,
  anyOf,
  check,
  currentSubjectLayer,
  eq,
  hasAttribute,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  labeled,
  makeSubject,
  resource,
  subjectId,
} from "@qadi/core";

// The store's client. One network round trip per call; Qadi never sees it.
declare const checkPermission: (request: {
  readonly resourceType: string;
  readonly resourceId: string;
  readonly permission: string;
  readonly subject: string;
  readonly maximumDepth: number | undefined;
}) => Effect.Effect<boolean>;

const StoreResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) => {
      // The object type travels in the id — the only channel the port gives us.
      const colon = request.resourceId.indexOf(":");
      return checkPermission({
        resourceType: colon === -1 ? "employee" : request.resourceId.slice(0, colon),
        resourceId: request.resourceId.slice(colon + 1),
        permission: request.relation,
        subject: `user:${request.subjectId}`,
        maximumDepth: request.depth,
      });
    },
  },
);

// Module scope, and ordered deliberately: the first two branches decide without
// touching the network, so the remote Check runs only once they decline. Each
// branch also carries the fields it unlocks — the store says `manager`, Qadi
// says a manager sees `salary` and a same-region colleague does not.
const canViewEmployee = anyOf([
  labeled("self", hasResourceAttribute("id", eq(subjectId()))),
  labeled(
    "hr",
    allOf([
      hasRole("hr"),
      hasAttribute("region", eq(resource("region")), { fields: ["id", "name"] }),
    ]),
  ),
  labeled(
    "manager",
    hasRelationship("manager", { depth: 3, fields: ["id", "name", "salary"] }),
  ),
]);

const alice = makeSubject({ id: "alice", roles: ["hr"], attributes: { region: "eu" } });

const services = Layer.mergeAll(
  currentSubjectLayer(alice),
  StoreResolver,
  AttributeResolverNone,
  EvaluationIdLive,
);

const program = check(canViewEmployee, {
  resource: { id: "employee:e-42", region: "eu" },
}).pipe(Effect.provide(services));
// → true on the `hr` branch, exposing `id` and `name`; the store is never called.
```

## What is missing

**What the store gives you that Qadi cannot.** Horizontal scale across a tuple
set no single process could hold; consistency tokens — Zanzibar's zookies — that
make a write visible to the next read; rewrite rules defined once, centrally, and
shared by every service checking against them. Qadi has no opinion on any of the
three and **should not acquire one**: a consistency-token field on
`RelationshipCheck` would put a store-specific concept in the core ADT that every
other resolver must then ignore. A caller needing read-after-write threads the
token through their own request context, where the adapter reads it.

**What Qadi gives you that the store does not.** Field-level visibility — a
relation granting three columns rather than a row
([MOD-QD-007](./07-field-level.md)) — and composition of the relationship check
with role, attribute and content conditions in one policy tree that serialises,
round-trips and traces as a single object. A `Check` returns a boolean: it cannot
say *which fields*, and it cannot be combined with "and holds `hr`, and is in the
same region" without an application writing that by hand. That combination is the
actual argument for running both.

**Latency, and the ordering that mitigates it.** Every `hasRelationship` node is
a network call — by a wide margin the most expensive thing an evaluation does, so
cheap local checks belong first in an `anyOf`. That rests on
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), **which is
verified for attribute resolution only**: no test yet proves that an unevaluated
branch performs no *relationship* lookup. It is tracked on the
[roadmap](../roadmap.md#extend-short-circuit-coverage-to-relationships) and is a
prerequisite for this phase in [the matrix](./00-adoption-matrix.md), and matters
more here than anywhere else in the P1 tier: the unproven saving is a round trip,
not a map lookup.

**No adapter ships.** Qadi ships the port and this recipe; naming an adapter
package would be inventing one.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. The worked example compiles in CI, which
proves the mapping type-checks against the real port and nothing more.

Adopting it means a resolver in the caller's codebase, tested against the store's
own harness rather than against Qadi. A reference adapter shipped here would need
a newly allocated `REQ-QD` identifier, a scenario, and a contract test asserting
that a store failure surfaces as `RelationshipResolveError` rather than as a
denial ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)) — the
likeliest defect in an adapter over a remote service. What the recipe stands on
is proven: relationship evaluation by `REQ-QD-005`, the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), field restriction
by `REQ-QD-007`.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [09 — Access Control Lists](./09-acl.md) · [19 — Hierarchical Resource Scoping](./19-hierarchy.md)_
