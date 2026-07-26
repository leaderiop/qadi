# 16 — Trust- and Reputation-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-16                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Access earned by standing rather than assigned by an administrator. A seller
whose rating reaches a threshold may list in a restricted category; a community
member accumulates the privilege to close a thread; a partner organisation sits
at a trust tier. Nobody wrote the grant — the subject's own history produced it.

Mechanically this is the same recipe as
[risk-adaptive access control](./15-risk-adaptive.md): a scalar arrives from a
resolver, a threshold compares it in the policy. That machinery is documented
there and is not repeated here. What is different is **provenance and
incentive**. A risk score is computed *about* a subject by a defender who wants
it accurate; a reputation score is accumulated *by* a subject who wants it high.
That inversion is the whole subject of this document.

## Who asks for it

Marketplaces gating seller capability by rating. Community platforms unlocking
moderation without appointing moderators. Federated systems assigning partner
organisations to trust tiers. Contributor ladders in open collaboration tools.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

No core change. What it costs is a resolver over the caller's reputation store,
which the caller owns because reputation is data about their users.

## How Qadi expresses it

Two shapes, chosen by whether trust is global or scoped.

```ts
hasAttribute("reputation", gte(500));   // global standing, true everywhere
hasRelationship("trusted-contributor"); // standing held in one place
```

| Trust is… | Use | Why |
| --------- | --- | --- |
| Global to the account | `hasAttribute` + `gte` | `resolve(subjectId, attribute)` takes no resource, so a resolved attribute cannot be keyed by context |
| Scoped to a community, category or tenant | `hasRelationship` | `RelationshipCheck` carries `resourceId`, and `depth` already walks a resource tree |

Reputation is usually contextual, so the second row is the common case: standing
earned in one community does not transfer to another, which a flat subject
attribute cannot express. **Use `hasRelationship` when trust is scoped to a
resource tree, and a resolved attribute only when it is genuinely global.**

### Provenance changes the design

Reputation is farmable, so three rules follow that
[risk-adaptive control](./15-risk-adaptive.md) does not need.

**Pair the threshold with a second condition.** A lone `gte` is one number an
adversary can optimise; reputation combined under `allOf` with account age, a
verified-identity attribute or an assigned role costs them something that cannot
be farmed on the same timescale.

**Never let reputation be the sole gate on a destructive action.** Deleting
content, moving money or removing another user should require an assigned role
as well as earned standing — reputation is a good filter for *more* capability
and a poor sole authority for *irreversible* capability.

**Decay and recency belong in the resolver.** Qadi holds no history, so it
cannot know a score was earned three years ago in a category that no longer
exists. Where recency matters, return a decayed figure, not a lifetime total.

### Federated trust tiers

Partner organisations placed at tiers, the tier gating capability, is the most
defensible use of this model: the tier is assigned by contract rather than
accumulated by behaviour, so there is no farming incentive and the rules above
relax. In shape it is closer to [OrBAC](./21-orbac.md) than to reputation — an
attribute of the organisation, not of the subject.

### Determinism and appeal

A subject denied by a reputation threshold is being told their own conduct was
insufficient, and deserves to know which threshold failed. Qadi's decisions
carry a full trace ([BEH-QD-039](../behaviors/05-evaluator.md)) and
[the URS](../urs.md) requires the explanation — URS-QD-009, "explain a denial".
This is one of the few models where that is felt by end users rather than
operators, so wrap the threshold in `labeled` and let the failing node name
itself instead of appearing as an anonymous comparison.

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
  currentSubjectLayer,
  decide,
  gte,
  hasAttribute,
  hasRelationship,
  labeled,
  makeSubject,
} from "@qadi/core";

// The caller's store: standing earned in one community, already decayed.
declare const standing: (
  subjectId: string,
  communityId: string,
) => Effect.Effect<number>;

const StandingResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) =>
      request.relation === "trusted-contributor"
        ? Effect.map(standing(request.subjectId, request.resourceId), (s) => s >= 500)
        : Effect.succeed(false),
  },
);

// Standing alone is farmable, so it is paired with a condition that is not.
const mayCloseThread = allOf([
  labeled("standing in this community", hasRelationship("trusted-contributor")),
  labeled("account age", hasAttribute("accountAgeDays", gte(30))),
]);

const subject = makeSubject({ id: "u-1", attributes: { accountAgeDays: 412 } });

const program = decide(mayCloseThread, { resource: { id: "community-rust" } }).pipe(
  Effect.provide(currentSubjectLayer(subject)),
  Effect.provide(
    Layer.mergeAll(StandingResolver, AttributeResolverNone, EvaluationIdLive),
  ),
);
```

## What is missing

**The threshold moves out of the policy.** In the relationship form the number
`500` lives in the resolver, so the trace records that `trusted-contributor`
failed, not that 412 fell short of 500 — a real loss of explanation, and the
reason for the `labeled` wrapper. The attribute form keeps the threshold in the
policy but cannot be scoped; pick the loss that hurts less.

**Qadi accumulates nothing.** No state, no memory of prior decisions: it cannot
compute reputation, apply decay or notice farming. History-based control sits at
P3 in [the matrix](./00-adoption-matrix.md).

**No appeal surface.** The trace suffices to explain a denial; presenting that
explanation and handling the objection is the application's.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. The mechanics it rests on are proven:
relationship evaluation by `REQ-QD-005`, attribute evaluation and numeric
strictness by `REQ-QD-004`, the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), reproducible
traces by [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible).

Nothing verifies the *advice*: that a threshold is paired, that decay is
applied, that reputation does not solely gate a destructive action are review
obligations, not properties Qadi can enforce.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [15 — Risk-Adaptive Access Control](./15-risk-adaptive.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [21 — Organisation-Based Access Control](./21-orbac.md)_
