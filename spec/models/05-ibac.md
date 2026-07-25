# 05 — Identity-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-05                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

The simplest model there is: access is granted to a named subject, directly.
No role, no attribute and no relationship stands between the rule and the
person — the resource names its owner, and the owner is allowed. Qadi expresses
it with the `subjectId()` value reference, which lets a policy compare a field
of the resource against the identity of the subject doing the asking.

The identity itself is never Qadi's to establish. It arrives on the
`AuthSubject` supplied by `CurrentSubject`, authenticated by something else;
Qadi only compares it. That boundary is the one [the URS](../urs.md) draws, and
it is why IBAC costs a value reference here rather than a subsystem.

## Who asks for it

Nearly every application, usually without calling it a model. "My drafts", "own
profile", "the author may edit their own comment", "a ticket belongs to whoever
raised it". It is also the base case of discretionary access control: before
there is any notion of sharing, ownership *is* the whole policy.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

## How Qadi expresses it

A matcher compares an attribute against a *value reference*. There are four,
and only one of them names the subject itself.

```ts
export const subject: (path: string) => ValueRef;   // subject attributes, dot-path
export const subjectId: () => ValueRef;             // the subject's own identifier
export const resource: (path: string) => ValueRef;  // resource fields, dot-path
export const literal: (value: unknown) => ValueRef; // a constant
```

| Reference | Resolves to | Note |
| --------- | ----------- | ---- |
| `subject(path)` | a dot-path into the subject's `attributes` | `subject("id")` is the *attribute* called `id`, which is normally absent |
| `subjectId()` | `AuthSubject.id` | a distinct variant of the union, not a reserved path |
| `resource(path)` | a dot-path into the resource passed in `EvaluateOptions` | `undefined` at any missing step |
| `literal(value)` | the constant it holds | |

Composed with `hasResourceAttribute` and `eq`, that yields the canonical
ownership rule — a single expression, entirely data:

```ts
hasResourceAttribute("ownerId", eq(subjectId()))
```

`subjectId()` is a union variant rather than a reserved path such as
`subject("$id")` because a reserved path is shadowed by, or shadows, an
attribute that happens to share its name
([BEH-QD-026](../behaviors/04-matchers.md)). The distinction is not pedantry:
attributes are frequently caller-supplied and identity is not, so a rule that
read identity out of the attribute bag would let anyone able to set their own
attributes claim ownership of anything. The acceptance suite pins that case.

Resolution happens against the context every matcher already receives:

```ts
export interface MatcherContext {
  /** The subject's attributes. Its identity is `subjectId`, kept separate. */
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
}
```

Both sides of the comparison are therefore in hand before the matcher runs, so
evaluation stays synchronous and total ([BEH-QD-028](../behaviors/04-matchers.md)).
The resource is read directly off `EvaluateOptions.resource` — it is not
resolved — and a `hasResourceAttribute` evaluated without one fails with
`MissingResource`, which is a wiring mistake rather than a decision.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  anyOf,
  check,
  currentSubjectLayer,
  eq,
  hasResourceAttribute,
  hasRole,
  makeSubject,
  someMatch,
  subjectId,
  type EvaluationError,
} from "@qadi/core";

// "the document's owner is me". A field comparison — no lookup, no resolver.
const ownsDocument = hasResourceAttribute("ownerId", eq(subjectId()));

// Co-ownership is the same rule per element, not a different mechanism.
const coOwnsDocument = hasResourceAttribute("ownerIds", someMatch(eq(subjectId())));

const canReadDocument = anyOf([ownsDocument, coOwnsDocument, hasRole("admin")]);

// Both resolvers are the fail-closed defaults, and neither is ever consulted:
// an identity rule performs no I/O, so it cannot fail and cannot be slow.
const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-42" })),
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

const program: Effect.Effect<boolean, EvaluationError> = check(canReadDocument, {
  resource: { id: "doc-1", ownerId: "u-42" },
}).pipe(Effect.provide(services));
// → true
```

## What is missing

Nothing. IBAC ships, in one expression, with no service behind it. What this
section records instead is the boundary easiest to get wrong — the one between
this model and its neighbour.

**Ownership by `subjectId()` is IBAC-shaped, and DAC-shaped, but it is not
ReBAC.** It is a field comparison: the evaluator reads `resource.ownerId`,
compares it to `subject.id`, and returns. No traversal, no
`RelationshipResolver`, no I/O, nothing that depends on another store being
reachable.

**The same sentence written as `hasRelationship("owner")` *is* ReBAC.** That
variant calls `RelationshipResolver.check` with
`{ subjectId, relation, resourceId, depth }`, requires the resource to carry a
string `id` — `MissingResourceId` otherwise — and needs a resolver layer that
knows the graph. It can traverse, and it can fail. See
[03 — Relationship-Based Access Control](./03-rebac.md).

Neither is the better one; they answer different questions.

| Situation | Reach for |
| --------- | --------- |
| The owner is a field on a resource you have already loaded | `subjectId()` |
| Ownership is one of several co-owners in an array on that resource | `someMatch(eq(subjectId()))` |
| Ownership lives in a separate graph or tuple store | `hasRelationship` |
| Ownership is transitive — owning the folder owns the file | `hasRelationship` with `depth` |
| The decision must not depend on another service being up | `subjectId()` |

The ownership policy also survives being stored. Matchers hold no closures, so
`eq(subjectId())` serialises with the policy that contains it and comes back
meaning the same thing — the acceptance suite round-trips it through `toJson`
and `fromJson` and re-evaluates the result, because a stored rule that returns
altered is the defect class this library was rewritten to make unrepresentable.

Two neighbouring models remain undocumented, both **P1 Wiring** in the
[matrix](./00-adoption-matrix.md): discretionary access control, where an owner
may *grant* to others, and access control lists, where an entry is a relation
tuple. Both extend `RelationshipResolver` rather than the core, and both build
on the rule described here — this document is their base case, not a competitor.

## Verification

| Claim | Evidence |
| ----- | -------- |
| The comparison allows the owner and denies everyone else | `packages/core/test/Evaluate.test.ts` — `describe("subject identity references")` |
| Identity is not the `id` attribute, and neither reference shadows the other | `packages/core/test/Evaluate.test.ts` — "leaves `subject(\"id\")` meaning the attribute named id", with a subject whose `id` attribute differs from its identity |
| Value references resolve against `MatcherContext`, purely and synchronously | `packages/core/test/Matcher.test.ts` — `describe("matchers")`, over a fixed context carrying `subject`, `subjectId` and `resource` |
| `eq(subjectId())` survives a JSON round trip | `packages/core/test/Policy.test.ts` — "round-trips every matcher variant", which lists `M.eq(M.subjectId())` explicitly |
| Acceptance | `REQ-QD-009` (`features/features/attributes/ownership.feature`) |

The feature file carries four scenarios: the owner is granted, a different owner
is denied, a subject whose `id` *attribute* names someone else is still denied,
and the policy is round-tripped through storage before evaluation. The
[traceability matrix](../traceability.md) chains `REQ-QD-009` to
[BEH-QD-026](../behaviors/04-matchers.md) and
[BEH-QD-036](../behaviors/05-evaluator.md).

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [04 — Matcher DSL](../behaviors/04-matchers.md) · [03 — Relationship-Based Access Control](./03-rebac.md)_
