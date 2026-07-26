# 30 — Chinese Wall

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-30                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Brewer and Nash's 1989 model addresses conflict of interest in professional
services. Objects belong to **companies**; companies belong to
**conflict-of-interest classes**. An analyst may access any company freely —
**until** they access one, at which point every other company in that class
becomes permanently forbidden to them. Nobody grants or revokes anything: the
wall is built by the first access.

The defining property is that **the decision depends on history**, and
specifically on *this subject's own past accesses*. Every model documented so far
is a function of state someone else maintains; a Chinese Wall decision is a
function of what the deciding system previously told this very subject. That is
enabler [E5](./00-adoption-matrix.md) — the decision history port, and only E5.
Two consequences: **a subject's permissions shrink monotonically** and never
recover, and this is the one model where a decision has a **side effect on future
decisions**.

## Who asks for it

Investment banks separating advisory from research, audit and law firms acting
for competitors, consultancies and agencies holding rival accounts. The signal is
an organisation that must demonstrate, after the fact, that no individual saw
both sides — to a regulator who asks about a named person and a named date. It is
asked for far less often than its prominence in the literature suggests, hence P3.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Additive** |
| Priority | **P3** |
| Enablers required | **E5** — decision history port |
| Breaking change | No |

Additive because nothing existing changes shape — a new service, a new policy
variant, a new error — and no policy serialised today becomes invalid.

## What Qadi can express today

Only the static half: the conflict-class structure as resource attributes, plus an
engagement marker if the caller maintains one.

```typescript
import {
  AttributeResolverNone, EvaluationIdLive, allOf, anyOf, check, currentSubjectLayer,
  eq, hasRelationship, hasResourceAttribute, hasRole, labeled, literal, makeSubject,
  relationshipResolverFromEdges, subject,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// Anonymised material sits outside the wall. Brewer–Nash exempts it explicitly,
// and it is an ordinary resource attribute — this branch needs no enabler.
const sanitised = labeled("wall.sanitised", hasResourceAttribute("sanitised", eq(literal(true))));

// Engagement as subject state: the caller precomputes, per class, the company
// this analyst is committed to. One node per class — the attribute path cannot be
// derived from the resource, so every further class needs its own node.
const committed = labeled(
  "wall.retail-banking",
  hasResourceAttribute("company", eq(subject("wall.retail-banking"))),
);

// Engagement as a relationship: an "already engaged with" edge the caller keeps
// per object. A deployment picks one form; both are wired here only to compile.
const engaged = labeled("wall.engaged", hasRelationship("engaged-with"));
const canRead = allOf([hasRole("analyst"), anyOf([sanitised, committed, engaged])]);

const analyst = makeSubject({
  id: "an-1",
  roles: ["analyst"],
  attributes: { wall: { "retail-banking": "bank-b" } },
});
const services = Layer.mergeAll(
  AttributeResolverNone,
  relationshipResolverFromEdges([["an-1", "engaged-with", "obj-b1"]]),
  EvaluationIdLive,
  currentSubjectLayer(analyst),
);

const at = (id: string, company: string, sanitised = false) =>
  check(canRead, { resource: { id, company, sanitised, conflictClass: "retail-banking" } });

const program = Effect.gen(function* () {
  const conflicting = yield* at("obj-a1", "bank-a"); // denied — conflicts with bank-b
  const anonymised = yield* at("obj-a2", "bank-a", true); // allowed — exempt
  const sameCompany = yield* at("obj-b1", "bank-b"); // allowed — same engagement
  return { conflicting, anonymised, sameCompany };
}).pipe(Effect.provide(services));
```

**This is not the model and must not be presented as one.** Every branch reads
state someone else established; nothing enforces the *first-access* dynamic. An
analyst with no recorded engagement is denied by `committed`, because comparing a
company against an absent attribute yields inequality — where Brewer–Nash says
that analyst may access anything. The encoding errs closed: the safe direction and
the wrong answer. No arrangement of shipped constructors fixes it, because the
missing ingredient is not a matcher but the record of what this subject did last.

## Proposed API design

The port answers one question — *what is this subject's engagement within this
conflict class?* A tagged union rather than a boolean is deliberate: a boolean port
has a polarity, and polarity is what makes fail-closed defaults subtle (see
[24](./24-separation-of-duty.md)). Read and write are kept apart in the shape,
because only one of them is an evaluation service.

```ts
export type Engagement =
  | { readonly _tag: "Unengaged" }
  | { readonly _tag: "Engaged"; readonly member: string }
  | { readonly _tag: "Sealed" }; // no member of this class is accessible

/** `scope` is the conflict class, `member` the company; both read off the resource. */
export interface EngagementQuery { readonly subjectId: string; readonly scope: string }
export interface AccessEvent extends EngagementQuery { readonly member: string }

export class DecisionHistoryUnavailable extends Data.TaggedError(
  "qadi/DecisionHistoryUnavailable",
)<{ readonly subjectId: string; readonly scope: string; readonly cause: unknown }> {}

export interface DecisionHistoryShape {
  /** READ — consulted during evaluation. The only member the evaluator calls. */
  readonly engagement: (q: EngagementQuery) => Effect.Effect<Engagement, DecisionHistoryUnavailable>;
  /** WRITE — called by the caller after a decision, never by the evaluator. */
  readonly record: (e: AccessEvent) => Effect.Effect<void, DecisionHistoryUnavailable>;
}

export class DecisionHistory extends Context.Service<
  DecisionHistory,
  DecisionHistoryShape
>()("qadi/DecisionHistory") {
  static readonly engagement = (q: EngagementQuery) =>
    DecisionHistory.use((h) => h.engagement(q));
  static readonly record = (e: AccessEvent) => DecisionHistory.use((h) => h.record(e));
}

/** Fail-closed default: every class is sealed, so `withinWall` always denies. */
export const DecisionHistorySealed: Layer.Layer<DecisionHistory>;

/** Deterministic layer over fixed `[subjectId, scope, member]` accesses. */
export const decisionHistoryFromAccesses: (
  accesses: ReadonlyArray<readonly [string, string, string]>,
) => Layer.Layer<DecisionHistory>;

export const withinWall: (options: {
  readonly scopeAttribute: string;
  readonly memberAttribute: string;
  readonly fields?: ReadonlyArray<string>;
}) => Policy;
```

`withinWall` names the two resource attributes it reads; the *evaluator* does the
comparison, so the decision stays in Qadi rather than migrating into the port. Its
rule: read both attributes, denying if either is absent; query the port; allow on
`Unengaged` (the free first access), allow on `Engaged` with a matching member,
deny on `Engaged` with a different one, deny on `Sealed`.

### Who writes the access

Someone must record the access or the wall is never built. Qadi's evaluator
returns a decision and records nothing, so the honest question is whether the
write is the caller's — explicit, after a successful decision — or the library's,
implicit on every allow. **It is the caller's.**

```ts
const openObject = (object: WalledObject) =>
  Effect.gen(function* () {
    yield* assert(canRead, { resource: object });
    const body = yield* load(object.id);
    const { analystId: subjectId, conflictClass: scope, company: member } = object;
    yield* DecisionHistory.record({ subjectId, scope, member });
    return body;
  });
```

An evaluator that writes is no longer reproducible, and
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) is worth more
than the saved line. It is also no longer safe to call speculatively, and Qadi is
called speculatively all the time: `filter` evaluates one policy across a list and
would wall the analyst off from every candidate it merely *considered*; the React
binding's `Can` re-evaluates on render, so a component mounting would build a
wall. An access is a fact about what a person actually saw, and only the caller
knows whether they saw it. The precedent is in the tree — `EvaluationId` gives
every decision an identity and deliberately has no store behind it, and
[ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) keeps that identity
*deterministic* rather than persistent.

## What it would cost

E5, and nothing else: a service, two layers, one error and one `Policy` variant —
the variant being the expensive half, since per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in the schema
union, the derived type, the evaluator and the FastCheck generator in a single
change. **The port must be a port** — the caller's store behind an interface,
exactly as `RelationshipResolver` is. Qadi holding accesses itself would make it a
system of record, which [the URS](../urs.md) forbids and
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) reinforces; E5 is the enabler
most at risk of violating scope, because a wall *feels* like something an
authorisation library should own.

**[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — and here the
asymmetry runs the other way.** An unreachable history store must error. Answering
"no prior access" on a timeout returns `Unengaged`, which *grants*: it would tear
the wall down silently, one timeout at a time, leaving nothing distinguishable from
a legitimate first access. Every other resolver in the library fails towards
denial; this one fails towards grant, and that inversion is the most important
property to hold on to when implementing E5. `DecisionHistoryUnavailable` reaches
the caller on the error channel — never collapsed to `Deny`, which would make an
outage indistinguishable from a policy result, and never to `Unengaged`.

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) must be
restated as reproducible *given the same history*.** With a history port the same
subject, policy and resource legitimately yield different answers on the second
call; that is the model working. Unrestated, the invariant does not become false
loudly but quietly, and the qualification evidence goes on citing it.

Two more need attention.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, and the relationship short-circuit gap recorded in [08](./08-dac.md)
should be closed before a second lazy port is added.
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed): satisfied by
`DecisionHistorySealed`, which is why `Engagement` carries a third variant.

## Verification

Nothing here is built and this document claims no evidence. The compiled example
proves only that its constructors exist, not that they implement Brewer–Nash.

| Part | What would prove it |
| ---- | ------------------- |
| First access is free | An acceptance scenario under a newly allocated `REQ-QD` identifier: an `Unengaged` subject is allowed against any member of the class |
| The wall closes, and stays closed | The same subject and policy, after `record`, denied against a different member and still allowed against the same one; and a property test that no sequence of accesses re-admits a member once a different member of its class was accessed |
| Failure is not denial | Error injection on `engagement`: evaluation fails, and the failure is neither `Deny` nor `Unengaged` |
| Fail-closed default and laziness | `withinWall` denies under `DecisionHistorySealed`; a call-counting test that a denied `allOf` sibling suppresses the lookup |
| Wire format and reproducibility | The round-trip property once `WithinWall` is in the FastCheck generator; two evaluations against the same history agree, against a changed history may differ |

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [31 — History-Based Access Control](./31-hbac.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [32 — Usage Control](./32-ucon.md)_
