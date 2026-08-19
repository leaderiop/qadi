# 30 — Chinese Wall

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-30                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Shipped and verified as `@REQ-QD-018`; `DecisionHistorySealed` withdrawn; the shipped form added (CCR-QD-022)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
function of what the deciding system previously told this very subject. That was
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
| Status | **Shipped** |
| Priority | **P3** |
| Enablers required | ~~**E5**~~ **shipped**; none outstanding |
| Breaking change | No |

**Shipped: [ADR-QD-020](../decisions/020-decision-history-port.md),
[BEH-QD-094](../behaviors/12-history.md),
[INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities),
`@REQ-QD-018`, `packages/core/test/Evaluate.test.ts`.**

*"Additive" overstated it, and that is this document's largest miss.* Nothing was
added for this model at all: no service member, no policy variant, no matcher, no
error. Brewer–Nash is a **composition of two nodes** the shared port already
carries, and the whole of the `Engagement` union, the `record` write and the
`withinWall` variant sketched below was declined rather than built.

## The shape it took

The conflict class is the **event** and the company in hand is the **resource**,
so the model is two questions: have you touched this class at all, or is this the
very company you touched?

```typescript
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever, allOf, anyOf,
  check, currentSubjectLayer, decisionHistoryFromEvents, eq, hasActed, hasNotActed,
  hasResourceAttribute, hasRole, labeled, literal, makeSubject,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// One policy per conflict class, because the class names the event and is baked
// into the node rather than read off the resource.
const withinWall = (conflictClass: string) =>
  anyOf([
    // Exempt material first: a field on the resource in hand, so an anonymised
    // read costs no history lookup at all (INV-QD-005).
    labeled("wall.sanitised", hasResourceAttribute("sanitised", eq(literal(true)))),
    labeled("wall.first", hasNotActed(conflictClass, { scope: "Any" })),
    labeled("wall.same", hasActed(conflictClass, { scope: "Resource" })),
  ]);

const canRead = allOf([hasRole("analyst"), withinWall("oil")]);

// The caller's store, behind the port. `an-1` is engaged with Shell.
const engaged = decisionHistoryFromEvents([["an-1", "oil", "shell"]]);

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "an-1", roles: ["analyst"] })),
  engaged,
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

const at = (id: string, sanitised = false) =>
  check(canRead, { resource: { id, sanitised } });

const program = Effect.gen(function* () {
  const competitor = yield* at("bp"); // denied — the wall closed on first access
  const sameCompany = yield* at("shell"); // allowed — this is the engagement
  const anonymised = yield* at("bp-research", true); // allowed — exempt
  return { competitor, sameCompany, anonymised };
}).pipe(Effect.provide(services));
```

**One node per class, exactly as forecast.** The paragraph below predicted it —
*"the attribute path cannot be derived from the resource, so every further class
needs its own node"* — and it survived a complete change of mechanism. The reason
is the same one, differently spelled: the class names the event, and an event is
part of the node rather than a field of the request.

## What Qadi could express before

Before the port, only the static half: the conflict-class structure as resource
attributes, plus an engagement marker if the caller maintained one.

```typescript
import {
  AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive, allOf, anyOf, check,
  currentSubjectLayer, eq, hasRelationship, hasResourceAttribute, hasRole, labeled,
  literal, makeSubject, relationshipResolverFromEdges, subject,
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
  // Present even though no branch reads history: `EvaluationServices` requires
  // the port unconditionally, and omitting it leaves a residual requirement that
  // only surfaces when something runs the program.
  DecisionHistoryUnknown,
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

It is kept because the shape of the workaround is the shape of the gap, and the
section above it is what closed the gap. **Nothing below this line should be
copied.**

## Proposed API design

> **Superseded by [ADR-QD-020](../decisions/020-decision-history-port.md), and
> this document's proposal was declined.** Neither the `Engagement` union nor the
> `record` write shipped — and Chinese Wall does not need them. Brewer–Nash is
> two questions the one-member port already answers:
>
> ```ts
> anyOf([
>   hasNotActed(conflictClass, { scope: "Any" }),   // free first access
>   hasActed(conflictClass, { scope: "Resource" }), // or this very company
> ])
> ```
>
> That equivalence is asserted by test rather than argued. The `record` write was
> declined on *this document's own* reasoning, quoted below: an evaluator that
> writes is not reproducible, and a write member on an evaluation service is one
> the evaluator must be trusted never to call. The sketch is left as written.
>
> Three further names below never existed and must not be lifted from here:
> `DecisionHistorySealed`, `decisionHistoryFromAccesses`, and this document's
> spelling of the error. The shipped layers are `DecisionHistoryUnknown` and
> `decisionHistoryFromEvents`; `DecisionHistoryUnavailable` carries
> `{ event, cause }` (`ACL011`), not `{ subjectId, scope, cause }`.

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
  "DecisionHistoryUnavailable",
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

### The third value came back, for another reason

This is the most interesting thing in the document, and it is only visible in
hindsight.

The paragraph above argues that a boolean read is wrong **because a boolean has a
polarity**, and proposes three cases. The *union* was declined: `ActedResult` is a
three-valued **answer**, it carries no member, and it has no notion of a sealed
class. But the *argument* is the one
[ADR-QD-020](../decisions/020-decision-history-port.md) accepted, and the port
shipped three-valued.

So this document was **right about the shape and wrong about the content**, and
right for a reason it did not have. Not that a class can be sealed — that
`hasNotActed` is negative, `hasActed` is positive, and **no boolean default is
fail-closed for both**. [24](./24-separation-of-duty.md) reached the same trap from
the polarity side; this document reached it from the return-type side, and neither
had the whole of it.

`DecisionHistorySealed` never existed. Sealing is what `DecisionHistoryUnknown`
does to *every* wall at once, which is the last scenario under `@REQ-QD-018` and
`Evaluate.test.ts`'s "an unwired port seals every wall rather than opening it".

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

*Held, and it decided the ADR.* The `record` write was declined on exactly this
reasoning, which
[ADR-QD-020](../decisions/020-decision-history-port.md) adopts and cites — a
forecast that settled a later decision rather than merely anticipating it.

An evaluator that writes is no longer reproducible, and
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) is worth more
than the saved line. It is also no longer safe to call speculatively, and Qadi is
called speculatively all the time: `filter` evaluates one policy across a list and
would wall the analyst off from every candidate it merely *considered*; the React
binding's `Can` re-evaluates on render, so a component mounting would build a
wall. An access is a fact about what a person actually saw, and only the caller
knows whether they saw it. The precedent is in the tree — `EvaluationId` gives
every decision an identity and deliberately has no store behind it, and
[ADR-QD-012](../decisions/012-deterministic-time-and-ids.md) keeps that identity
*deterministic* rather than persistent.

## What it cost

E5, and nothing else: a service, two layers, one error and one `Policy` variant —
the variant being the expensive half, since per
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) it lands in the schema
union, the derived type, the evaluator and the FastCheck generator in a single
change.

*Three misses, and the third is the one worth keeping.* **Two** variants shipped
(`HasActed` and `HasNotActed`), not one, because a trace that records which
question was asked is worth more than a schema entry saved. `relation` became
**`event`**, to break a three-way collision with `hasAction` and
`hasRelationship`. And the `withinWall` variant this paragraph prices **was not
built at all** — so the expensive half cost Chinese Wall nothing, and the model
that drove E5 hardest is the one that contributed no node to it. **The port must be a port** — the caller's store behind an interface,
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

*Held, and sharpened.* The inversion is real and the shipped shape names it:
`"Unknown"` satisfies neither polarity so it grants nothing, and an unreachable
store is `DecisionHistoryUnavailable` (`ACL011`) on the error channel
([BEH-QD-093](../behaviors/12-history.md)). The asymmetry this paragraph
identified — that this port fails towards *grant* where every other fails towards
denial — is why the answer is three-valued rather than defaulted.

**[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) must be
restated as reproducible *given the same history*.** With a history port the same
subject, policy and resource legitimately yield different answers on the second
call; that is the model working. Unrestated, the invariant does not become false
loudly but quietly, and the qualification evidence goes on citing it.

*Restated in CCR-QD-016*, in the change that landed the port, as this asked — "the
same subject, policy, services **and history**".

Two more needed attention and neither was weakened.
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation): the lookup
must be lazy, and the relationship short-circuit gap recorded in [08](./08-dac.md)
should be closed before a second lazy port is added. *It closed first, as asked*
(CCR-QD-009).

> **Withdrawn.**
> [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) is satisfied by
> **`DecisionHistoryUnknown`**, not by a layer that never existed. The clause that
> followed — *"which is why `Engagement` carries a third variant"* — has the right
> conclusion and the wrong premise: a third value **was** needed, and not because
> a class can be sealed. See [the third value came back](#the-third-value-came-back-for-another-reason).

## Verification

**The model is built.** Eight scenarios sit under `@REQ-QD-018` in
`features/features/chinese-wall/chinese-wall.feature`, and two unit tests in
`packages/core/test/Evaluate.test.ts` reach the same claims independently.

| Claim | Evidence |
| ----- | -------- |
| The first access in a class is free | `@REQ-QD-018`, `Evaluate.test.ts` |
| The wall closes against a competitor | `@REQ-QD-018`, `Evaluate.test.ts` |
| The company already engaged with stays accessible | `@REQ-QD-018`, `Evaluate.test.ts` |
| Classes are independent, and one analyst's engagement is not another's wall | `@REQ-QD-018` — the store is wired with an unrelated class, so the question is demonstrably keyed |
| Sanitised material is exempt, at no history cost | `@REQ-QD-018`; the exempt branch is a resource field checked first ([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation)) |
| A refused wall names **every** branch | `@REQ-QD-018` — a disjunction must ask all three to know none allowed |
| An unwired port seals rather than opens | `@REQ-QD-018`, `Evaluate.test.ts` ("an unwired port seals every wall rather than opening it"), [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities) |
| Failure is not denial | [BEH-QD-093](../behaviors/12-history.md), `Evaluate.test.ts` — `DecisionHistoryUnavailable` (`ACL011`) on the error channel, never `Deny` |
| The lookup is lazy | `Evaluate.test.ts` ("an unevaluated history branch performs no lookup") |
| Wire format and reproducibility | The round-trip property in `packages/core/test/Policy.test.ts`, with `HasActed`/`HasNotActed` in the generator; [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) as restated |
| **The `record` write** | **None, and none is wanted.** It was declined on this document's own argument; the caller writes after acting. The row states the exclusion rather than omitting it |

`@REQ-QD-018` chains through [traceability](../traceability.md) §5 to
[BEH-QD-019](../behaviors/03-policy-adt.md) (combinators),
[BEH-QD-039](../behaviors/05-evaluator.md) (decisions and traces),
[BEH-QD-092](../behaviors/12-history.md) (scope) and
[BEH-QD-094](../behaviors/12-history.md) (Chinese Wall needs nothing further),
plus [INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities).
No new `BEH-QD` or `INV-QD` identifier was allocated, following `REQ-QD-009`'s
precedent: nothing new is claimed about the evaluator.

**What the forecast got wrong.**

- *"Only the static half."* The whole model is expressible, and was the day the
  port shipped.
- *"One `Policy` variant."* Zero, for this model. Two shipped for the port, and
  Chinese Wall contributed neither.
- *"A third variant, satisfied by `DecisionHistorySealed`."* Three values, for a
  different reason, and that layer never existed.
- *"The read must return which member the subject is engaged with."* It need not —
  `hasActed(class, { scope: "Resource" })` asks about the company in hand, so the
  answer is a fact rather than a value.

**And what it got right**, which is the larger half: one node per class, for the
reason given; the write is the caller's, and that decided the ADR; and a boolean
read would have been wrong, though not quite for the reason argued.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [31 — History-Based Access Control](./31-hbac.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [32 — Usage Control](./32-ucon.md)_
