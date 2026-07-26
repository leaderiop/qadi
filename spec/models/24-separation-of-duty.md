# 24 — Separation of Duty

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-24                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Sandhu's RBAC₂ adds *constraints* on top of RBAC₀ and RBAC₁: mutually exclusive
roles, cardinality limits on assignment, and prerequisite roles; RBAC₃ is RBAC₁
and RBAC₂ together. Separation of duty is the reason those constraints exist —
no one person should both raise a payment and approve it, because a single
dishonest or compromised actor should not complete a consequential transaction
alone.

It comes in two forms, enforced in different places. **Static** separation of
duty constrains *assignment*: a user may never hold both roles. **Dynamic**
separation of duty constrains *activation*: a user may hold both, but may not
exercise both against the same transaction.

## Who asks for it

Finance and procurement (raise / approve), clinical and laboratory systems
(perform / review), change management (author / release), and anything governed
by four-eyes rules. The signal is a workflow with two named steps and an auditor
who will ask, of one record, whether the same person did both.

## Status

| Property | Static SoD | Dynamic SoD |
| -------- | ---------- | ----------- |
| Status | **Additive** | **Additive** |
| Priority | **P2** | **P3** |
| Enablers required | None | ~~**E5**~~ **shipped** |
| Breaking change | No | No |

Static SoD needs no enabler, because the part of it that matters is not a Qadi
problem at all. Dynamic SoD is blocked on [E5](./00-adoption-matrix.md), and
only on E5.

## What Qadi can express today

**Object-based separation of duty** — "you may not approve a payment you
raised" — is the concrete case behind most four-eyes requirements, and it is
subtly *not* dynamic SoD: it needs the *record's* history, not the *subject's*,
and who raised this payment is normally already a column on the payment. That
makes it a comparison between a resource field and the subject's own id —
shipped, verified, costing no lookup. The case people actually want is usually
already expressible. **Static SoD as detection** is the second: Qadi cannot stop
a conflicting pair being assigned, but it can refuse to act on a subject who
holds one.

```typescript
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever, allOf, check,
  currentSubjectLayer, eq, hasResourceAttribute, hasRole, labeled, makeSubject, not,
  subjectId,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// Object-based SoD: the payment records who raised it, so the whole constraint
// is a resource field compared against the subject's own id.
const notSelfRaised = labeled("sod.object", not(hasResourceAttribute("raisedBy", eq(subjectId()))));

// Static SoD as *detection*: Qadi cannot prevent the assignment, only refuse to
// act on a subject who should never have been given both roles.
const bothPaymentRoles = allOf([hasRole("raise-payment"), hasRole("approve-payment")]);
const rolesNotConflicting = labeled("sod.static", not(bothPaymentRoles));

const canApprove = allOf([hasRole("approve-payment"), rolesNotConflicting, notSelfRaised]);
const approver = makeSubject({ id: "u-approver", roles: ["approve-payment"] });
const conflicted = makeSubject({ id: "u-clerk", roles: ["raise-payment", "approve-payment"] });

const program = Effect.gen(function* () {
  // Allowed: one role only, and someone else raised this payment.
  const allowed = yield* check(canApprove, {
    resource: { id: "pay-1", raisedBy: "u-clerk" },
  }).pipe(Effect.provide(currentSubjectLayer(approver)));

  // Denied by the static branch — the assignment itself was invalid.
  const bothRoles = yield* check(canApprove, {
    resource: { id: "pay-1", raisedBy: "u-other" },
  }).pipe(Effect.provide(currentSubjectLayer(conflicted)));

  // Denied by the object branch — no one approves what they raised.
  const selfApproval = yield* check(canApprove, {
    resource: { id: "pay-2", raisedBy: "u-approver" },
  }).pipe(Effect.provide(currentSubjectLayer(approver)));

  return { allowed, bothRoles, selfApproval };
}).pipe(
  Effect.provide(Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive)),
);
```

**Preventing an assignment and refusing to act on a bad one are different
jobs.** Static SoD in the literature is a constraint over the role-assignment
relation, checked by the administrative surface as a role is granted. Qadi has
none and never sees an assignment ([the URS](../urs.md),
[00 §3.4](./00-adoption-matrix.md)) — by the time a subject reaches evaluation
the invalid grant already exists, so assignment-time enforcement is the
caller's, permanently. Qadi contributes defence in depth: the `sod.static`
branch turns a mis-administered subject into a denial rather than a silent
authorisation, and `labeled` records *why*. Assignment checks are exactly the
control a data migration or a support script bypasses.

**Cardinality** — "at most two admins" — is out of reach and out of scope: it is
a property of the assignment *set*, and Qadi is handed one subject at a time,
never the set. E6 would let a review tool *report* a violation; enforcing one
means standing in the path of the grant, which Qadi does not. Prerequisite roles
are the same shape. Neither is planned.

## Proposed API design

> **Superseded by [ADR-QD-020](../decisions/020-decision-history-port.md).** The
> port shipped, and it is not quite the shape sketched below. Two differences
> matter: it returns `"Acted" | "NotActed" | "Unknown"` rather than a boolean,
> because no boolean default is fail-closed for *both* polarities — the trap this
> document was first to spot turned out to have no boolean solution; and the
> query field is named `event`, not `relation` or `action`, to keep it apart from
> `hasAction` (E1) and `hasRelationship`. The sketch is left as written, because
> the reasoning that led here is worth more than a tidy record.

Dynamic SoD asks a question no shipped service can answer: *has this subject
already acted on this object?* The missing thing is **history**, not roles —
roles are already fully visible to the evaluator. E5 supplies it, and it must be
a *port* over the caller's store, as `RelationshipResolver` is, or Qadi begins
persisting and leaves its scope.

```ts
export interface ActedQuery {
  readonly subjectId: string;
  /** The step already taken, e.g. `"raised"` — not the step being attempted. */
  readonly relation: string;
  readonly resourceId: string;
}

export interface DecisionHistoryShape {
  readonly hasActed: (query: ActedQuery) => Effect.Effect<boolean, DecisionHistoryUnavailable>;
}

export class DecisionHistory extends Context.Service<DecisionHistory, DecisionHistoryShape>()(
  "qadi/DecisionHistory",
) {
  static readonly hasActed = (query: ActedQuery) => DecisionHistory.use((h) => h.hasActed(query));
}

export class DecisionHistoryUnavailable extends Data.TaggedError("qadi/DecisionHistoryUnavailable")<{
  readonly relation: string;
  readonly resourceId: string;
  readonly cause: unknown;
}> {}

export const hasNotActed: (relation: string, options?: FieldOptions) => Policy;
```

The port is **read-only**: recording that a subject raised a payment is the
application's write, not Qadi's — the boundary that also keeps grant issuance
out of [DAC](./08-dac.md).

The default layer is the design's sharpest edge. `RelationshipResolverNever`
fails closed by answering `false`, because `hasRelationship` is a positive test.
`hasNotActed` is negative, so an unwired port answering `false` would *grant*.
The default must assert the subject **has** acted, and its name must say so.

```ts
/** Fail-closed default: assumes the subject already acted, so `hasNotActed` denies unwired. */
export const DecisionHistoryAssumeActed: Layer.Layer<DecisionHistory>;

/** Deterministic layer over fixed `[subjectId, relation, resourceId]` records. */
export const decisionHistoryFromRecords: (
  records: ReadonlyArray<readonly [string, string, string]>,
) => Layer.Layer<DecisionHistory>;
```

## What it would cost

A service module, two layers, one error, and one `Policy` variant — the variant
being the expensive half. Per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in four
places in one change: the schema union, the derived type, the evaluator, and the
FastCheck generator behind the JSON round-trip property that guards the
data-loss defect this library was rewritten to fix.

**[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — a history
store that is down is an error, not a denial.** The highest-risk pairing in the
enabler set. `DecisionHistoryUnavailable` must propagate on the error channel and
reach the caller as a failure; collapsing it to `Deny` is the more convenient
implementation and makes an outage indistinguishable from a policy result. The
temptation is stronger here than for relationships, because for a
separation-of-duty check a denial *feels* like the safe answer.

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) — history
makes evaluation stateful.** Today the same subject, policy and resource yield
the same decision forever; with a history port the second call legitimately
differs from the first. The invariant must be restated as reproducible *given
the same history*, in the change that lands E5 — otherwise it does not become
false loudly, it weakens silently, and the qualification evidence goes on citing
it.

Two more need care but are not weakened.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, so an `allOf` that has already denied performs no call — and the
relationship short-circuit gap noted in [08](./08-dac.md) should close first.
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) is satisfied by
`DecisionHistoryAssumeActed`, which is why the polarity argument belongs in the
design rather than in a code comment.

## Verification

Nothing here is built, and this document claims no evidence. The object-based
form rests on proven mechanics — resource-attribute matching and the
`subjectId()` value reference — but nothing exercises them *as a
separation-of-duty control*, so no claim is made until something does.

| Part | What would prove it |
| ---- | ------------------- |
| Object-based SoD | An acceptance scenario under a newly allocated `REQ-QD` identifier: same subject as `raisedBy` denies, a different subject allows, an absent field denies |
| Static SoD detection | A unit test that a subject holding both conflicting roles is denied, plus an assertion that the reported reason is the `sod.static` branch, not the role branch |
| Dynamic SoD | A port test over `decisionHistoryFromRecords`; a call-counting test that a denied sibling suppresses the lookup; an error-injection test that an unavailable store surfaces as a failure, not a `Deny`; and a test that `hasNotActed` denies with no layer wired |
| Wire format and reproducibility | The existing round-trip property, once the new variant is in the FastCheck generator; and the restated invariant — two evaluations against the same history agree, against a changed history they may differ |

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [01 — Role-Based Access Control](./01-rbac.md) · [30 — Chinese Wall](./30-chinese-wall.md) · [32 — Usage Control](./32-ucon.md)_
