# 24 — Separation of Duty

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-24                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Verified as `@REQ-QD-017`; the static row corrected to Shipped, in part; `DecisionHistoryAssumeActed` withdrawn; the label/reason and absent-field forecasts corrected (CCR-QD-021)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
| Status | **Shipped, in part** | **Shipped** |
| Priority | **P2** | **P3** |
| Enablers required | None | ~~**E5**~~ **shipped** |
| Breaking change | No | No |

**Static SoD — shipped, in part: `@REQ-QD-017`,
`packages/core/test/Evaluate.test.ts`.** Detection ships and is verified;
assignment-time prevention is **excluded, not deferred**, because it needs a
surface Qadi does not have ([the URS](../urs.md),
[00 §3.4](./00-adoption-matrix.md)). *Shipped, in part* is therefore the ceiling
for this row rather than a stage on the way to *Shipped*.

Static SoD needed no enabler, because the part of it that matters is not a Qadi
problem at all — and it turned out to need no new construct either. Both forms
below are compositions of `allOf`, `not`, `labeled` and `subjectId()`.

**Dynamic SoD — shipped: [ADR-QD-020](../decisions/020-decision-history-port.md),
[12 — Decision History](../behaviors/12-history.md),
[INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities),
`@REQ-QD-012`.** It was blocked on [E5](./00-adoption-matrix.md) and only on E5.
The port shipped **three-valued**, and the polarity trap **this document was the
first of four to spot** is exactly why — see the withdrawal below, where the
sketch that spotted it is also the sketch that got the answer wrong.

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
  AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive,
  RelationshipResolverNever, allOf, check, currentSubjectLayer, eq, evaluate, exists,
  hasResourceAttribute, hasRole, labeled, makeSubject, not, subjectId,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// Object-based SoD: the payment records who raised it, so the whole constraint
// is a resource field compared against the subject's own id. `exists` is not
// decoration — without it an absent `raisedBy` GRANTS. See below.
const notSelfRaised = labeled(
  "sod.object",
  allOf([
    hasResourceAttribute("raisedBy", exists()),
    not(hasResourceAttribute("raisedBy", eq(subjectId()))),
  ]),
);

// Static SoD as *detection*: Qadi cannot prevent the assignment, only refuse to
// act on a subject who should never have been given both roles.
const bothPaymentRoles = allOf([hasRole("raise-payment"), hasRole("approve-payment")]);
const rolesNotConflicting = labeled("sod.static", not(bothPaymentRoles));

// Every conjunct is labelled, because only the trace can say which one refused.
const canApprove = allOf([
  labeled("sod.role", hasRole("approve-payment")),
  rolesNotConflicting,
  notSelfRaised,
]);
const approver = makeSubject({ id: "u-approver", roles: ["approve-payment"] });
const conflicted = makeSubject({ id: "u-clerk", roles: ["raise-payment", "approve-payment"] });

const program = Effect.gen(function* () {
  // Allowed: one role only, and someone else raised this payment.
  const allowed = yield* check(canApprove, {
    resource: { id: "pay-1", raisedBy: "u-clerk" },
  }).pipe(Effect.provide(currentSubjectLayer(approver)));

  // Denied by the static branch — the assignment itself was invalid. Read the
  // decision rather than the boolean, because *which* branch refused is on the
  // trace and nowhere else: `refusedBy` is "sod.static", while the decision's
  // own reason says only "negated policy allowed".
  const decision = yield* evaluate(canApprove, {
    resource: { id: "pay-1", raisedBy: "u-other" },
  }).pipe(Effect.provide(currentSubjectLayer(conflicted)));
  const refusedBy = decision.trace.children[1]?.label;

  // Denied by the object branch — no one approves what they raised.
  const selfApproval = yield* check(canApprove, {
    resource: { id: "pay-2", raisedBy: "u-approver" },
  }).pipe(Effect.provide(currentSubjectLayer(approver)));

  return { allowed, refusedBy, selfApproval };
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

### A label is a property of the trace, not of the reason

For that policy and a subject holding both roles, the final `Deny.reason` is
exactly `"negated policy allowed"`. `Labeled` copies its child's sentence verbatim
into a field of its own, `Not` passes no label at all, `AllOf` propagates the
child's, and `Deny` has no label channel — `allow` and `deny` both accept a label
parameter and no call site in the evaluator ever supplies one.

This document's verification table asked for "an assertion that the reported
reason is the `sod.static` branch, not the role branch". **That assertion cannot
be written, and the ask was wrong rather than merely unimplemented.** Attribution
is a walk over the trace, which is what
[BEH-QD-039](../behaviors/05-evaluator.md) makes the trace *for*: the reason is a
summary, the trace is the structure.

The second half is worth as much. `AllOf` short-circuits at its first refusal, so
when the static branch denies, `sod.object` is **never evaluated** and
`trace.children` has two entries rather than three. The absence of a branch is
evidence in its own right, and both halves are scenarios under `@REQ-QD-017`.

### An absent `raisedBy` grants

The forecast under *Verification* below said an absent field denies. It **allows**.
`eq(subjectId())` against `undefined` is false, an absent field on a resource
that *is* present raises nothing, and `not` allows on a denying child — so the
object-based rule grants exactly the self-approval it exists to stop.

That is the negation-inverts-fail-closed hazard [MOD-QD-009](./09-acl.md)
records, arriving in the model where it costs most: a payment row with no raiser
recorded is precisely what a data migration or a support script leaves behind, and
it is approvable by anyone, including the person who raised it. The remedy is one
conjunct — `hasResourceAttribute("raisedBy", exists())` — and both encodings are
scenarios, because the hazard is only instructive next to its fix.

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

**Cardinality** — "at most two admins" — is out of scope for *enforcement*: it is
a property of the assignment *set*, and the evaluator is handed one subject at a
time, never the set. E6 has since shipped (CCR-QD-018), so a review tool **can**
now report a violation: `decideSubjects` over the candidate list answers "who
holds admin", with the counting left to the caller. Enforcing a limit still means
standing in the path of the grant, which Qadi does not do. Prerequisite roles are
the same shape. Neither *enforcement* is planned.

## Proposed API design

> **Superseded by [ADR-QD-020](../decisions/020-decision-history-port.md).** The
> port shipped, and it is not quite the shape sketched below. Two differences
> matter: it returns `"Acted" | "NotActed" | "Unknown"` rather than a boolean,
> because no boolean default is fail-closed for *both* polarities — the trap this
> document was first to spot turned out to have no boolean solution; and the
> query field is named `event`, not `relation` or `action`, to keep it apart from
> `hasAction` (E1) and `hasRelationship`. The sketch is left as written, because
> the reasoning that led here is worth more than a tidy record.
>
> One thing that reading four sketches together settled. This one was the
> **narrowest** of the four — a read, no write, no `Engagement` type — and it
> still lost, because narrowness was never the problem. Polarity was, and the
> paragraph below gets it exactly half right.

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

> **Withdrawn.** The paragraph above is half right, and the half it gets wrong is
> the conclusion. A `true`-answering default fixes `hasNotActed` and breaks
> `hasActed`: **no boolean default is fail-closed for both polarities.** That is
> [ADR-QD-020](../decisions/020-decision-history-port.md)'s finding and
> [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)'s
> wording. `DecisionHistoryAssumeActed` never existed and **must not be
> recommended anywhere**; the shipped default is `DecisionHistoryUnknown`, whose
> third value satisfies neither polarity, and the deterministic layer is
> `decisionHistoryFromEvents`, keyed by `event` rather than `relation`. The fence
> below is left uncompiled so the withdrawn names can never masquerade as API.

```ts
/** Fail-closed default: assumes the subject already acted, so `hasNotActed` denies unwired. */
export const DecisionHistoryAssumeActed: Layer.Layer<DecisionHistory>;

/** Deterministic layer over fixed `[subjectId, relation, resourceId]` records. */
export const decisionHistoryFromRecords: (
  records: ReadonlyArray<readonly [string, string, string]>,
) => Layer.Layer<DecisionHistory>;
```

## What it cost

A service module, two layers, one error, and one `Policy` variant — the variant
being the expensive half. Per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in four
places in one change: the schema union, the derived type, the evaluator, and the
FastCheck generator behind the JSON round-trip property that guards the
data-loss defect this library was rewritten to fix.

*Two misses in that sentence.* **Two** variants shipped, not one — `HasActed` and
`HasNotActed` — because a trace that records which question was asked is worth
more than a schema entry saved, and collapsing them into one node with a polarity
flag would have made `hasNotActed` look like `not(hasActed)`, which is the single
thing ADR-QD-020 exists to prevent. And `relation` became **`event`**, to break a
three-way collision with `hasAction` and `hasRelationship`.

**[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — a history
store that is down is an error, not a denial.** The highest-risk pairing in the
enabler set. `DecisionHistoryUnavailable` must propagate on the error channel and
reach the caller as a failure; collapsing it to `Deny` is the more convenient
implementation and makes an outage indistinguishable from a policy result. The
temptation is stronger here than for relationships, because for a
separation-of-duty check a denial *feels* like the safe answer.

*Held.* The ADR reaches the same conclusion in the same terms, and
`Evaluate.test.ts` injects the failure to prove it — the test's own comment is
"the strongest temptation in the library".

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) — history
makes evaluation stateful.** Today the same subject, policy and resource yield
the same decision forever; with a history port the second call legitimately
differs from the first. The invariant must be restated as reproducible *given
the same history*, in the change that lands E5 — otherwise it does not become
false loudly, it weakens silently, and the qualification evidence goes on citing
it.

*Restated in CCR-QD-016*, in the change that landed the port, as this asked. The
shipped wording is
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history):
"Given the same subject, policy, services **and history**". The invariant records
the weakening as deliberate rather than absorbing it.

Two more needed care and neither was weakened.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, so an `allOf` that has already denied performs no call — and the
relationship short-circuit gap noted in [08](./08-dac.md) should close first.
*It closed first, as asked* (CCR-QD-009). This is the one instance in the model
set of a planning document setting the order of work, and following it was right:
the coverage it demanded also caught `RelationshipResolveError` propagation, which
turned out to be untested entirely.

[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) is satisfied by
**`DecisionHistoryUnknown`** — not by the withdrawn layer named above — which is
why the polarity argument belonged in the design rather than in a code comment. It
ended up in an ADR *and* an invariant, which is more than this document asked
for.

## Verification

**Both halves Qadi can perform are built.** The earlier revision said "nothing
here is built, and this document claims no evidence", which stopped being true
when E5 shipped and has now stopped being true for the static half too.

| Claim | Evidence |
| ----- | -------- |
| A different raiser allows; the same raiser denies | `@REQ-QD-017`, `packages/core/test/Evaluate.test.ts` |
| A subject holding both conflicting roles is refused | `@REQ-QD-017`, `Evaluate.test.ts` |
| The refusal is attributable to `sod.static`, and **not** to the role branch | `@REQ-QD-017` — asserted on the trace, not the reason |
| Holding one role of the pair is not a conflict | `@REQ-QD-017`, `Evaluate.test.ts` |
| The reason is the negation's sentence, never the branch's label | `@REQ-QD-017`, `Evaluate.test.ts` |
| The short-circuit leaves `sod.object` unevaluated and absent from the trace | `Evaluate.test.ts` — `trace.children.length === 2` |
| An absent `raisedBy` grants, and `exists()` closes it | `@REQ-QD-017`, `Evaluate.test.ts` — both encodings |
| Dynamic SoD — "approve, unless you raised it" | [12 — Decision History](../behaviors/12-history.md), [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities), `@REQ-QD-012` |
| Wire format and reproducibility | The round-trip property in `packages/core/test/Policy.test.ts`, with `HasActed`/`HasNotActed` in the generator; INV-QD-008 as restated |
| **Assignment-time prevention** | **None, and none is possible.** There is nothing to test: Qadi never sees an assignment. The row states the exclusion rather than omitting it |

Seven scenarios sit in
`features/features/separation-of-duty/separation-of-duty.feature`, chained through
[traceability](../traceability.md) §5 to
[BEH-QD-019](../behaviors/03-policy-adt.md) (combinators),
[BEH-QD-026](../behaviors/04-matchers.md) (value references) and
[BEH-QD-039](../behaviors/05-evaluator.md) (decisions and traces). No new
`BEH-QD` or `INV-QD` identifier was allocated, and none should be: nothing new is
claimed about the evaluator. This follows `REQ-QD-009`, which gave ownership its
own tag over pre-existing behaviours for the same reason.

**What the forecast got wrong**, recorded because the corrections are worth more
than the plan was:

- *"An absent field denies."* It **grants**. The most consequential error in this
  document, and a security one — see above.
- *"An assertion that the reported reason is the `sod.static` branch."* Not
  writable. A label is a trace property; the reason names the leaf that refused.
- *"One `Policy` variant."* Two, and deliberately.
- *Static SoD as "Additive".* Nothing additive was ever required. Detection was
  expressible on the day this document was written, by the very example it
  contains, and prevention is excluded permanently. The status was a leftover.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [01 — Role-Based Access Control](./01-rbac.md) · [30 — Chinese Wall](./30-chinese-wall.md) · [32 — Usage Control](./32-ucon.md)_
