# 14 — Spatial Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-14                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Spatial access control constrains a decision by *where* the request comes from.
GEO-RBAC is the named variant — a role parameterised by a spatial extent, so
"nurse" holds on the ward and lapses off it — but the shape is broader: any rule
whose truth depends on a network, a country, a site perimeter or an
export-control jurisdiction. The design question is not how to test a location.
It is who is allowed to answer the question, and in Qadi the answer arrives
already decided.

## Who asks for it

Applications with a perimeter: administrative screens restricted to the
corporate network, field tools that close a work order at the site but not from
the van park, design files that must not open outside an export licence. The
strongest case is data residency — "EU personal data is never served from a
region outside the EU" — and it is the one most often misfiled, because it
constrains the *resource* rather than the subject.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides spatial rules today with no core change. What it needs is an
`AttributeResolver` over whatever establishes location — a network lookup, an IP
geolocation provider, a device-reported fix.

## How Qadi expresses it

Qadi's matchers are equality, membership, ordering on numbers and structural
traversal. There is no point-in-polygon, no distance function, no coordinate type.

```ts
eq(ref) · neq(ref) · inArray(values) · exists() · gte(n) · lt(n)
contains(v) · fieldMatch(field, m) · someMatch(m) · everyMatch(m) · size(m)
```

That is not an oversight and it should not be closed. A `Matcher` is data:
defined once as a Schema, persisted, and re-parsed from untrusted JSON
([ADR-QD-002](../decisions/002-schema-derived-policy-adt.md)). A spatial
predicate in the policy tree would have to be serialised, versioned and
round-tripped like every other node — a polygon in a wire format, a datum and a
projection to agree on, a coordinate ordering to get wrong, and an entry in the
round-trip property that stands between this library and the data-loss defect it
was rewritten to fix
([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)). Geometry is the
wrong thing to put through a JSON codec, so it stays in the resolver, on the
caller's side of the boundary, and Qadi is told only the conclusion:

```ts
export interface AttributeResolverShape {
  readonly resolve: (subjectId: string, attribute: string) =>
    Effect.Effect<unknown, AttributeResolveError>;
}
```

| Question | Resolver returns | Policy writes |
| -------- | ---------------- | ------------- |
| From our network? | `inCorporateNetwork: boolean` | `hasAttribute("inCorporateNetwork", eq(literal(true)))` |
| Which country? | `country: "MA"` | `hasAttribute("country", inArray(["FR", "DE"]))` |
| How far from site? | `distanceToSiteMetres: 180` | `hasAttribute("distanceToSiteMetres", lt(500))` |

`gte` and `lt` are the only numeric matchers, so a distance is perfectly
workable — the third row is a real geofence. But a distance states the
*mechanism* where a boolean states the *intent*, and `eq(literal(true))` on
`atAssignedSite` survives the day the perimeter becomes a polygon rather than a
radius. Return the scalar only when the threshold is genuinely a policy decision
someone should be able to change.

### Residency constrains the resource, not the subject

| Rule | Expressed by | Cost |
| ---- | ------------ | ---- |
| "the data sits in a permitted region" | `hasResourceAttribute("storageRegion", inArray([…]))` | No lookup — the region is a field on the resource in hand |
| "the caller is in a permitted country" | `hasAttribute("country", inArray([…]))` | One resolver call, and one act of trust |

The first is [content-dependent](./06-content-dependent.md) in shape, performs no
I/O, cannot fail and cannot be spoofed. Most of what is asked for as "geo
restriction" is this; reach for the second only when the rule genuinely turns on
where the request originates.

### Spoofing

IP geolocation is an assertion, not a fact: a VPN, a proxy, a relay or a
mis-mapped allocation each change the answer without moving anyone, and a
device-reported fix is an assertion made by software the user controls. The
resolver's answer is exactly as trustworthy as its source, and Qadi adds nothing
to it. Spatial rules are a compliance and defence-in-depth control, not a
security boundary standing on their own — and a network-origin check backed by
mutual TLS is a materially stronger claim than a country derived from an
address, so it belongs in the policy as the separate attribute it is.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver, EvaluationIdLive, RelationshipResolverNever, allOf, anyOf,
  check, currentSubjectLayer, eq, hasAttribute, hasResourceAttribute, inArray,
  literal, lt, makeSubject, type AttributeResolveError, type EvaluationError,
} from "@qadi/core";

// The caller's geolocation service, bound to the request in scope. It answers
// `country`, `inCorporateNetwork` and `distanceToSiteMetres`; Qadi never sees an
// address, a polygon or a coordinate — only the decided answer.
declare const locate: (
  subjectId: string,
) => Effect.Effect<Readonly<Record<string, unknown>>>;

const PlacementResolver: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  {
    resolve: (
      subjectId: string,
      attribute: string,
    ): Effect.Effect<unknown, AttributeResolveError> =>
      Effect.map(locate(subjectId), (placement) => placement[attribute]),
  },
);

// Residency first: it reads the resource in hand, so a file stored outside the
// permitted regions denies without any geolocation call at all. The branches
// below it are three grades of the same claim, strongest first.
const canOpenControlledDesign = allOf([
  hasResourceAttribute("storageRegion", inArray(["eu-west-1", "eu-central-1"])),
  anyOf([
    hasAttribute("inCorporateNetwork", eq(literal(true))),
    hasAttribute("distanceToSiteMetres", lt(500)),
    hasAttribute("country", inArray(["FR", "DE"])),
  ]),
]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-9", roles: ["engineer"] })),
  PlacementResolver,
  RelationshipResolverNever,
  EvaluationIdLive,
);

const program: Effect.Effect<boolean, EvaluationError> = check(
  canOpenControlledDesign,
  { resource: { id: "design-31", storageRegion: "eu-west-1" } },
).pipe(Effect.provide(services));
```

## What is missing

**No action dimension (E1).** The same gap
[context-aware control](./12-context-aware.md) records, and spatial rules hit it
hardest, because the canonical spatial requirement is asymmetric: *read from
anywhere, write only on site*. `EvaluateOptions` is `{ resource?, maxDepth? }`
and `MatcherContext` is `{ subject, subjectId, resource }`; neither knows the
verb, so that requirement is two policies chosen by the caller at the call site.
Honest, but it puts half the rule in application code where no serialised policy
records it. E1 is additive and scheduled in
[phase 3](./00-adoption-matrix.md).

**Location is a subject attribute, which it is not.** A subject does not *have*
a country; a request does. `resolve` receives only the subject id, so either the
resolver is built per request, closing over the connection it was built for, or
the location is placed on the subject when the subject is constructed — the
second being simpler and what most callers should do. Neither makes the layer
safe to build once at start-up and share.

**Nothing here is time-bounded.** Qadi holds no cache, so a placement is as
fresh as its source; a caller memoising it for the session has quietly converted
a geofence into a check performed once at login. Decision caching carries the
same hazard and is listed *Under consideration* on the
[roadmap](../roadmap.md) with it recorded.

**No geometry, permanently.** Point-in-polygon, distance and datum handling stay
with the caller — not a gap awaiting an enabler, but the boundary this document
argues for.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Adopting it means a resolver implementation in the caller's codebase, and, if a
reference adapter is ever shipped, a scenario tagged with a newly allocated
`REQ-QD` identifier plus a resolver unit test over a fixed placement fixture.
The mechanics it relies on are proven: attribute resolution by `REQ-QD-004`,
resource attributes by `REQ-QD-006`, lazy per-node resolution by
[ADR-QD-005](../decisions/005-lazy-attribute-resolution.md) and
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), a failed
lookup propagating rather than denying by
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial), and the
unwired-resolver default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed).

The example's claim that a failing residency branch costs no geolocation call
rests on the general short-circuit tests, which count resolver invocations
rather than time them (`packages/core/test/Evaluate.test.ts`,
`describe("short-circuiting")`). The guarantee holds; only its spatial framing is
undemonstrated, and an adapter shipping without that assertion would be claiming
a cost model it has not shown.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [12 — Context-Aware Access Control](./12-context-aware.md)_
