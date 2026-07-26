# 08 — Discretionary Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-08                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Discretionary Access Control makes the owner of a resource the authority over
it. Access follows from a grant the owner issued, at their discretion, rather
than from a rule an administrator wrote centrally. The canonical form is the
Unix file mode and the "share this document with" button.

The word doing the work is *discretionary*: what distinguishes DAC from every
other model here is not how the check is evaluated but **who is allowed to
create the grant**.

## Who asks for it

Any application where users share things with other users — documents, folders,
calendars, repositories. It is the most common model in consumer and
collaboration software, and it is almost always paired with role-based rules for
the administrative override.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides DAC today with no core change. What it needs is a
`RelationshipResolver` over the caller's grant table — which the caller owns,
because grants are data about their users.

## How Qadi expresses it

A grant is a relationship. The policy side already exists:

```ts
const hasRelationship: (
  relation: string,
  options?: { readonly depth?: number; readonly fields?: ReadonlyArray<string> },
) => Policy;

interface RelationshipCheck {
  readonly subjectId: string;
  readonly relation: string;
  readonly resourceId: string;
  readonly depth: number | undefined;
}

interface RelationshipResolverShape {
  readonly check: (
    request: RelationshipCheck,
  ) => Effect.Effect<boolean, RelationshipResolveError>;
}
```

There are two shapes of DAC rule, and they cost different things:

| Rule | Expressed by | Cost |
| ---- | ------------ | ---- |
| "the owner may act" | `hasResourceAttribute("ownerId", eq(subjectId()))` | No lookup — the owner is a field on the resource in hand |
| "someone the owner granted may act" | `hasRelationship("reader")` | One resolver call against the grant table |

Prefer the first when ownership is a column you already loaded. It is
[identity-based](./05-ibac.md) in shape, performs no I/O, and cannot fail. Reach
for the second only when the grant lives somewhere else.

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
  eq,
  hasRelationship,
  hasResourceAttribute,
  makeSubject,
  subjectId,
} from "@qadi/core";

interface Grant {
  readonly subjectId: string;
  readonly relation: string;
}

// The caller's store. Qadi never sees it — it sees only the answer.
declare const loadGrants: (
  resourceId: string,
) => Effect.Effect<ReadonlyArray<Grant>>;

const GrantTableResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) =>
      loadGrants(request.resourceId).pipe(
        Effect.map((grants) =>
          grants.some(
            (g) =>
              g.subjectId === request.subjectId &&
              g.relation === request.relation,
          ),
        ),
      ),
  },
);

// Owner-or-grantee. The owner branch is evaluated first and short-circuits,
// so an owner reading their own document performs no grant lookup at all.
const canRead = anyOf([
  hasResourceAttribute("ownerId", eq(subjectId())),
  hasRelationship("reader"),
]);

const program = check(canRead, {
  resource: { id: "doc-1", ownerId: "u-2" },
}).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-1" }))),
  Effect.provide(
    Layer.mergeAll(GrantTableResolver, AttributeResolverNone, EvaluationIdLive),
  ),
);
```

## What is missing

**Administration.** DAC's defining property is that the owner may *create* and
*revoke* grants, and may delegate that power onward. Qadi decides whether a
grant exists; it does not issue them, store them, or decide who may issue them.
That is administration, which [the URS](../urs.md) places out of scope and
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) argues for keeping there.

This is not a gap to be closed later. An application implementing DAC needs a
grant-administration surface, and it should build one — a "may this subject
grant `reader` on this resource?" question is itself an authorization decision,
so Qadi can decide *that* too, but the mutation is the application's.

**Revocation timing.** A resolver reads the grant table at decision time, so a
revoked grant takes effect on the next evaluation. Callers who cache decisions
reintroduce staleness; caching is listed *Under consideration* on the
[roadmap](../roadmap.md) with exactly this hazard recorded.

**Ownership transfer** is likewise the application's, and is the reason the
owner-as-field form should be a field the application controls rather than
something Qadi derives.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Adopting it means a resolver implementation in the caller's codebase, and, if a
reference adapter is ever shipped, a scenario tagged with a newly allocated
`REQ-QD` identifier plus a resolver unit test. The mechanics it relies on are
already proven: relationship evaluation by `REQ-QD-005`, the fail-closed default
by [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), and
owner-as-field by `REQ-QD-009`.

One caveat inherited from [MOD-QD-003](./03-rebac.md): there is still no test
proving that an unevaluated branch performs no *relationship* lookup. The
short-circuit claim in the worked example above rests on the general rule in
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), which is
verified for attribute resolution only. Closing that gap is listed as a
prerequisite for this phase in [the matrix](./00-adoption-matrix.md).

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [05 — Identity-Based Access Control](./05-ibac.md) · [09 — Access Control Lists](./09-acl.md)_
