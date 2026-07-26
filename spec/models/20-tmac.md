# 20 — Team-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-20                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Under team-based access control, authority comes from membership of a **team
collaborating on a specific object** rather than from a role held globally. The
canonical case is clinical: no nurse may read any patient record, but a nurse on
*this* patient's care team may.

TMAC is the model that shows most plainly why roles alone are insufficient, and
the reason is worth stating precisely. A role answers *what kind of person are
you?* A team answers *are you working on this?* Neither subsumes the other, and
a real system almost always needs both at once:

```ts
allOf([hasRole("nurse"), hasRelationship("care-team")]);
```

That conjunction is the whole recipe. The rest is detail about how the team is
modelled, when the roster is read, and what happens when it must be overridden.

## Who asks for it

Clinical systems first, but the shape recurs wherever work is organised around
an object with a shifting cast around it: case teams in legal and social
services, incident response, project squads, deal rooms, editorial teams. The
signal is that membership is *created by the work* and dissolves when the work
ends, while the professional role outlives it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides TMAC today with no core change. What it needs is a
`RelationshipResolver` over the caller's roster — which the caller owns, because
rosters are operational data about their organisation.

## How Qadi expresses it

**A team is a relationship, and the relation names the member's role within
it.** Structure inside the team therefore needs no second mechanism:

```ts
hasRelationship("care-team"); // any member
hasRelationship("care-team:lead"); // the attending clinician
hasRelationship("care-team:member"); // an ordinary member
```

The resolver receives the relation verbatim and decides how much to interpret;
Qadi imposes no convention — see [MOD-QD-003](./03-rebac.md) for the port.

**Team membership is transient**, which is the operationally interesting
property of this model: it begins when the collaboration begins and ends when it
ends — a shift change, a discharge, a case closure. A resolver reading the
roster at decision time gets that for free, so a removal takes effect on the
next evaluation. A subject with membership baked in as a role —
`fromRoles({ roles: ["care-team-patient-42"] })` — goes stale the moment the
roster changes and stays stale for the life of the session or token carrying it.
**Prefer the resolver form**, and bake membership into the subject only where
that subject is rebuilt per request from a roster already loaded.

**The conjunction is also a performance story.** `hasRole` is a set lookup on
the subject in hand; `hasRelationship` is a query. Order the `allOf` so the
cheap check comes first and a subject who could never qualify is denied without
the roster being touched. The general rule is
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), with the
caveat carried over from [MOD-QD-003](./03-rebac.md): it is verified for
*attribute* resolution only. No test yet proves an unevaluated branch performs
no *relationship* lookup, so this saving rests on the rule, not on evidence.

**Break-glass** is the natural counterpart to a model this tight, which will
eventually deny someone who genuinely needs the record. Qadi can decide it — an
`anyOf` with an override branch, `anyOf([teamRule, hasRole("emergency-override")])`.
The decision is in scope; the **accountability is not**. Break-glass is safe
only because every use of it is recorded, reviewed and answered for, and durable
audit trails are excluded by
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md). Qadi emits spans and returns
a `Decision` carrying its reason; it persists nothing. An application should not
ship a break-glass branch without an audit trail it owns.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolver,
  type RelationshipCheck,
  allOf,
  anyOf,
  check,
  currentSubjectLayer,
  hasRelationship,
  hasRole,
  makeSubject,
} from "@qadi/core";

/** `teamRole` is the member's role within the team: "lead", "member", … */
interface TeamMembership {
  readonly subjectId: string;
  readonly teamRole: string;
}

// The caller's roster, read at decision time: a clinician taken off the team
// this morning is denied this afternoon, with no subject rebuilt anywhere.
declare const loadCareTeam: (id: string) => Effect.Effect<ReadonlyArray<TeamMembership>>;

const CareTeamResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    // "care-team:lead" narrows to a role within the team; "care-team" matches any.
    check: (request: RelationshipCheck) =>
      loadCareTeam(request.resourceId).pipe(
        Effect.map((members) =>
          members.some(
            (m) =>
              m.subjectId === request.subjectId &&
              (request.relation === "care-team" ||
                request.relation === `care-team:${m.teamRole}`),
          ),
        ),
      ),
  },
);

// Module scope: a policy rebuilt per call is a new reference every time. The
// role check is first, so a non-nurse never reaches the roster query.
const canReadRecord = anyOf([
  allOf([hasRole("nurse"), hasRelationship("care-team")]),
  // Break-glass: decidable here, auditable only in the calling application.
  hasRole("emergency-override"),
]);

const program = check(canReadRecord, { resource: { id: "patient-42" } }).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-nadia", roles: ["nurse"] }))),
  Effect.provide(Layer.mergeAll(CareTeamResolver, AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive)),
);
```

## What is missing

**Roster administration.** Qadi decides whether a subject is on a team; it does
not add them, remove them, or decide who may. That is administration, which
[the URS](../urs.md) places out of scope. As with [DAC](./08-dac.md), "may this
subject add a member to this care team?" is itself an authorization question
Qadi can answer — the mutation that follows is the application's.

**Membership expiry.** Transience comes from the resolver reading fresh data,
not from Qadi expiring anything. A resolver over a cached roster reintroduces
exactly the staleness this model exists to avoid; caching is listed *Under
consideration* on the [roadmap](../roadmap.md) with that hazard recorded.

**Break-glass audit**, as above: excluded by
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) and not planned.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. Adopting it means a resolver in the
caller's codebase and, if a reference adapter is ever shipped, a scenario tagged
with a newly allocated `REQ-QD` identifier. The mechanics it composes are
already proven: relationship evaluation by `REQ-QD-005`, role membership by
`REQ-QD-003`, combinator semantics by `REQ-QD-002`, and the fail-closed default
by [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed).

The one claim above resting on reasoning rather than a test is the short-circuit
saving: nothing proves an unevaluated branch performs no *relationship* lookup,
so ordering the role check first is sound by
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) but
unmeasured. Closing that gap is a prerequisite for this phase in
[the matrix](./00-adoption-matrix.md).

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [01 — Role-Based Access Control](./01-rbac.md) · [09 — Access Control Lists](./09-acl.md)_
