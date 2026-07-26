# 34 — Next Generation Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-34                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): E6 shipped; status now partial (CCR-QD-018)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Next Generation Access Control — NIST SP 800-178, standardised as INCITS 526,
formerly the Policy Machine — expresses policy as a **labelled graph**. Users
are assigned to user attributes and objects to object attributes, both
assignments transitive. **Associations** are the grants: a user attribute, a set
of operations, an object attribute. **Prohibitions** are the deny primitive.
Everything sits under one or more **policy classes**, each of which must
independently permit an access. A decision is then a **reachability question** —
is there a path from this user, up through their attributes, across an
association carrying the requested operation, and down through the object's
attributes, in every policy class at once, with no prohibition intervening.

**This is a different architecture, not a missing feature.** Qadi is an
*expression* evaluator: a policy is a tree, supplied by the caller per decision,
meaning the same thing wherever it is evaluated. NGAC is a *graph*: one global
structure, administered over time, queried per decision, where the meaning of
any edge depends on everything else in it. Neither shape emulates the other by
adding combinators, and that is worth settling before any API is proposed,
because most of what follows is a consequence of it.

The nearest thing Qadi already has is the `RelationshipResolver`, which answers
reachability questions for exactly this reason ([MOD-QD-003](./03-rebac.md)). An
NGAC-shaped deployment is far closer to *a very capable resolver* than to a
change in the evaluator.

## Who asks for it

Government and defence systems built to the NIST specification, and the vendors
who sell to them. Beyond that, enterprises consolidating several authorization
schemes onto one engine — NGAC's claim is that role-based, attribute-based and
multi-level policy are all graphs, so one engine serves all three.

There is a quieter and far more common asker who never says "NGAC": anyone who
needs **review queries**. "What can this user access?" for an access review,
"who can access this object?" for a sharing dialog or a leak investigation. Both
are first-class in NGAC, answerable by traversing the graph in either direction.
That demand is real and recurring, and it is the part of this model worth taking
seriously.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped, in part** |
| Priority | **P3** |
| Enablers required | ~~**E1**~~ **shipped**; ~~**E6**~~ **shipped** |
| Breaking change | No |

P3 describes the model as a whole, not its parts. Implementing NGAC is not
recommended at any priority; the two enablers it names are worth building for
their own sake, and that is the conclusion this document argues to. Both have
since been built on exactly those terms.

"Shipped, in part" is the ceiling for this row rather than a stage on the way to
"Shipped". The recommended shape — the graph behind a resolver, the operation in
`hasAction`, review queries in both directions — is now fully expressible. Review
over the whole user or object space is not, for the reason given below: it needs
a store Qadi does not have and an inversion only **E7** could provide. The graph
was declined, not deferred.

## What Qadi can express today

A graph is a reachability engine, and Qadi already has a port for one. The caller
keeps the graph — assignments, associations, prohibitions — and the resolver
answers the single question the evaluator asks. The operation travels in the
relation name below, which is the compromise E1 existed to remove; E1 has since
shipped, so `hasAction` beside the relationship check is the better spelling and
the example is left as written only because it predates it.

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
  filter,
  filterSubjects,
  hasRelationship,
  hasRole,
  makeSubject,
} from "@qadi/core";

// The caller's policy graph. Qadi never sees it — it sees only the answer.
// Assignment is one transitive relation, so one function serves both sides.
declare const attributesOf: (id: string) => Effect.Effect<ReadonlyArray<string>>;
declare const associationGrants: (
  userAttribute: string,
  objectAttribute: string,
  operation: string,
) => Effect.Effect<boolean>;
declare const isProhibited: (
  userId: string,
  objectId: string,
  operation: string,
) => Effect.Effect<boolean>;

const PolicyGraphResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    // `relation` carries the NGAC operation. One call is one full traversal:
    // prohibitions first, then the association search.
    check: (request: RelationshipCheck) =>
      Effect.gen(function* () {
        const { relation, resourceId, subjectId } = request;
        if (yield* isProhibited(subjectId, resourceId, relation)) return false;
        const userSide = yield* attributesOf(subjectId);
        const objectSide = yield* attributesOf(resourceId);
        const grants = yield* Effect.forEach(userSide, (ua) =>
          Effect.forEach(objectSide, (oa) => associationGrants(ua, oa, relation)),
        );
        return grants.some((row) => row.includes(true));
      }),
  },
);

const canRead = anyOf([hasRole("policy-admin"), hasRelationship("read")]);

const environment = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-alice" })),
  PolicyGraphResolver,
  AttributeResolverNone,
  EvaluationIdLive,
);

const decision = check(canRead, { resource: { id: "o-budget-2026" } }).pipe(
  Effect.provide(environment),
);

// Review in both directions, over candidate lists the *caller* enumerates.
// Note what this is not — an answer over the whole object or user space, which
// is the review query NGAC actually offers.
type Document = { readonly id: string; readonly kind: string };
declare const documentsInScope: ReadonlyArray<Document>;

// "What can this user reach?"
const visible = filter(canRead, documentsInScope).pipe(Effect.provide(environment));

// "Who can reach this object?" — the transpose, since E6. The subject travels
// as a parameter here, so the environment's own subject decides nothing.
const whoCanRead = filterSubjects(
  canRead,
  [makeSubject({ id: "u-alice" }), makeSubject({ id: "u-bob" })],
  { resource: { id: "o-budget-2026" } },
).pipe(Effect.provide(environment));
```

This decides correctly, and it is the recommended shape. What it does not do is
any of the review, administration or policy-class arithmetic that make NGAC what
it is — all of which stays on the caller's side of the port.

## Proposed API design

Signatures below are **proposed and unimplemented**. Nothing here exists.

**E6 — subject-set evaluation.** The transpose of `filter`: one policy, many
subjects, already on the [roadmap](../roadmap.md) as *Batch subject evaluation*.

```ts
// The awkward part is what the roadmap entry already names: the subject comes
// from the environment, not a parameter, so this cannot map over `check`.
const filterSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<ReadonlyArray<AuthSubject>, EvaluationError, EvaluationServices>;

// And the form that keeps the trace, which an access review needs — "denied"
// without "why" is not reviewable.
const decideSubjects: (
  policy: Policy,
  subjects: ReadonlyArray<AuthSubject>,
  options?: EvaluateOptions,
) => Effect.Effect<
  ReadonlyArray<{ readonly subject: AuthSubject; readonly decision: Decision }>,
  EvaluationError,
  EvaluationServices
>;
```

**E1 — the action dimension**, now shipped, and beside it the thing this
document deliberately declines to propose: the graph. Before E1 the operation was
smuggled into the relation string, as above; that worked, and it conflated two
dimensions — a policy could not say "this subtree is about `write`" without
restating it in every relation name.

```ts
interface EvaluateOptions {
  readonly resource?: Resource;
  readonly maxDepth?: number;
  readonly action?: string; // E1 — shipped
}

// NOT proposed. No node type, no assignment edge, no association, no policy
// class: Qadi will not gain these.
const assign: (child: NodeId, parent: NodeId) => Effect.Effect<void>;
const associate: (
  userAttribute: NodeId,
  operations: ReadonlySet<string>,
  objectAttribute: NodeId,
) => Effect.Effect<void>;
```

One reason suffices: assignment and association are **administrative mutations
over persisted state**, which [the URS](../urs.md) places out of scope and
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) argues for keeping there —
the same boundary that keeps [DAC](./08-dac.md)'s grant table on the caller's
side. The second is that a graph inside Qadi becomes a second source of truth
beside the store the caller already runs.

## What it would cost

**E1 — action dimension. Shipped.** Additive and cheap, as forecast: `action?:
string` on `EvaluateOptions` and `MatcherContext`, with the constraint recorded
against [INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) that
it must not be derived from permission segments —
[ADR-QD-018](../decisions/018-action-dimension.md) made that constraint the
decision itself. The pattern was the argument:
[21 — OrBAC](./21-orbac.md) was blocked on it for *activity*,
[22 — Type Enforcement](./22-type-enforcement.md) for *operation*, and this
document for *operation sets*. Three models, three vocabularies, one missing
input — and none of it depended on anyone wanting NGAC.

**E6 — subject-set evaluation. Shipped.**
[ADR-QD-022](../decisions/022-subject-set-evaluation.md),
[14 — Subject Sets](../behaviors/14-subject-sets.md),
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone),
`@REQ-QD-014`. This paragraph forecast it correctly on both counts and was wrong
about one mechanism, which is worth keeping on the record.

It was right that the design work is in the environment rather than the type, and
right that the fan-out is the danger — *"a batch API that fans out unboundedly is
a denial-of-service surface reached through a review screen"* is why the shipped
implementation is sequential, and why concurrency, if ever added, belongs as a
bounded option rather than a change of default.

It was wrong that N subjects means N environments. `Effect.provideService` supplies
one service into an existing environment, so nothing is rebuilt per element — and
because that discharges the requirement, the batch entry points end up needing
*fewer* services than `evaluate` does, not more. `SubjectSetServices` is
`Exclude<EvaluationServices, CurrentSubject>`: a review query is asked by nobody.

**Full review queries stay out of reach, and that should be said plainly.** E6
answers "who, of *these* subjects, can access this object?" — the caller
supplies the list. NGAC answers it over the whole user space, and the transpose
over the whole object space, because the graph is finite and traversable in both
directions. Qadi has neither a subject store nor an object store, and an
expression tree cannot be inverted into a set: `hasResourceAttribute` and
`hasRelationship` are *predicates over a resource in hand*, and asking which
resources satisfy them is a query, not a decision. The honest shape for that is
**E7 — predicate output**, where the evaluator returns a filter to push into the
caller's query — the same enabler [row-level security](./00-adoption-matrix.md)
needs, and marked **Breaking**. Partial review is achievable; full review is not,
and no amount of additive work makes it so.

**Prohibitions need E3.** Combining a prohibition with an association is
order-sensitive in exactly the way `AllOf` and `AnyOf` are not. That is the same
obstruction, with the same analysis, as
[25 — Rule-Based Access Control](./25-rubac.md), and it is not re-derived here.
The resolver above sidesteps it by evaluating prohibitions *inside* the
traversal, before the association search — which is correct, and is also the
general answer: a deny that lives behind the port never reaches the combining
rule.

**The recommendation is not to implement NGAC.** E1 was built because three
other models and one roadmap item wanted it, not because this one did; E6 was
built on the same terms. Treat an
NGAC-shaped deployment as a **resolver integration**, in the manner of
[10 — Zanzibar-Style Relationship Stores](./10-zanzibar.md) — a close analogy
rather than a loose one, since both are reachability engines behind a port, both
keep their graph and its administration on their own side of it, and both map a
multi-hop traversal onto a single boolean.

## Verification

Nothing verifies this model. It is unbuilt, and the section above describes an
API that does not exist.

The compiled example rests on proven mechanics — relationship evaluation by
`REQ-QD-005`, the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — but the
resolver in it is the caller's and its traversal is untested by anything here.
Short-circuiting *is* proven for relationships
([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)), which
matters more here than usual: under a full graph traversal, the branch that gets
skipped is the whole cost of the decision.

E6 is now verified, and this paragraph named the right property before it was
built: *a subject's decision in a batch is identical to that subject's decision
alone.* It became
[INV-QD-016](../invariants.md#inv-qd-016-a-batch-decision-is-the-decision-made-alone)
rather than a case of INV-QD-008, because reproducibility says the same inputs
give the same answer twice while this says neighbouring evaluations are not
inputs to each other — a stronger claim, and the one a batch can break.
`@REQ-QD-014` and `packages/core/test/SubjectSet.test.ts` carry it.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [10 — Zanzibar-Style Relationship Stores](./10-zanzibar.md) · [25 — Rule-Based Access Control](./25-rubac.md) · [Roadmap](../roadmap.md)_
