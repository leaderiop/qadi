# 32 — Usage Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-32                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): E5 shipped; the enabler rows and the write-path precondition brought up to date (CCR-QD-022)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Usage control — Park and Sandhu's **ABC** model — adds three decision factors:
**A**uthorisations, predicates over subject and object attributes;
o**B**ligations, actions a subject must perform for usage to be permitted; and
**C**onditions, environmental predicates depending on neither party. Each has a
pre- and an ongoing- variant, which is where the model's sixteen core cases come
from. Two further properties make it a different thing rather than a bigger ABAC:

- **Continuity.** Enforcement is not a gate at the start of a usage; it continues
  *during* it. A permission granted at `t₀` can be withdrawn at `t₁` while the
  usage is still running, and the usage must then stop.
- **Mutability.** Attributes are updated *as a consequence of* usage — before it
  (`preUpdate`), during it (`onUpdate`), or after it (`postUpdate`). A view
  counter decremented on each read is the canonical example.

## Who asks for it

Digital rights management, metered and pay-per-use content, licence enforcement,
and any system where a session must end when entitlement changes: revoke a
contractor's access and the video they are already streaming should stop, not
merely fail to start next time.

Most people who say "UCON" deploy pre-authorisation with conditions and a usage
counter — which is the part this document recommends pursuing.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Breaking** |
| Priority | **P3** |
| Enablers required | ~~**E1, E2, E5**~~ **shipped**; none outstanding — what is missing is not an enabler |
| Breaking change | Yes |

### Why this is the deepest mismatch in the matrix

Every other model here asks Qadi a harder question. UCON asks it to be a
different kind of component. Qadi answers a question at a point in time and
returns a value: `decide` returns an `Allow` or a `Deny`, `check` reduces that to
a boolean, and `enforce` runs the assertion and then hands control away.

```ts
export const enforce =
  (policy: Policy, options?: EvaluateOptions) =>
  <A, E, R>(self: Effect.Effect<A, E, R>) =>
    Effect.flatMap(assert(policy, options), () => self);
```

That is the whole enforcement model. The decision happens, and then it is over:
nothing re-checks while `self` runs and nothing can interrupt it.
[INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied)
states a guarantee about *starting* — a denied effect is never begun — and says
nothing about an effect already in flight, because there is nothing to say.

UCON supervises an ongoing activity: it must know when usage starts, hold a
handle on it, watch attributes move, and revoke. That is not a missing feature an
enabler would supply. **Continuous enforcement would be a second execution
model**, beside the one-shot evaluator rather than extending it.

### Mutability breaks purity

UCON's attribute updates mean evaluation **writes**. Qadi's evaluator reads: the
subject from `CurrentSubject`, the resource from `EvaluateOptions`, resolved
attributes from `AttributeResolver`, producing a `Decision` and a `Trace`.
Nothing it touches changes as a result, and
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) depends on
that. Under mutability, evaluating one policy against one subject twice is
*supposed* to differ, because the first evaluation spent the quota the second
checks.

This is the tension [Chinese Wall](./30-chinese-wall.md) raises, and strictly
worse: Chinese Wall needs one write *after* a decision is final, whereas UCON
needs writes *during* it, and `onUpdate` needs them repeatedly on a schedule the
evaluator does not control. One is a post-decision hook that can be kept outside
the evaluator; the other is not.

### Decomposing the model

"Implement UCON" is not a tractable proposal. Split into parts, it becomes four
ordinary pieces of work and one that is out of scope:

| UCON element | Qadi | Enabler |
| ------------ | ---- | ------- |
| Authorisations (pre) | Shipped | — |
| Conditions (environmental) | Shipped, via `AttributeResolver` | — |
| Obligations (pre) | `obliged`, discharged before the guarded effect | **E2 — shipped** |
| Attribute mutability | Missing the **write** half | ~~**E5**~~ **shipped**, plus a write path |
| Continuity / ongoing enforcement | **Architecturally absent** | Not an enabler |

The first row understated one gap, since closed. A UCON authorisation is a
predicate over `(subject, object, right)`, and Qadi could not see the right: the
verb existed only inside a permission token and never reached evaluation, so
choosing a policy per verb — as the example below still does — was a convention
the caller could forget rather than a rule the library enforced. That was **E1**,
shared with six other models, the cheapest of the three, and now shipped
([ADR-QD-018](../decisions/018-action-dimension.md)). The example below predates
it; `hasAction` is the current spelling.

## What Qadi can express today

Pre-authorisation with conditions, plus a *read* of a mutable attribute — most of
what deployed usage-control systems actually do.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  DecisionHistoryUnknown,
  EvaluationIdLive, RelationshipResolverNever, allOf, attributeResolverFromRecord,
  currentSubjectLayer, enforce, eq, exists, gte, hasAttribute, hasResourceAttribute,
  hasRole, inArray, labeled, literal, makeSubject, not, subject, subjectId,
} from "@qadi/core";

const mayStream = labeled(
  "ucon.pre-authorisation",
  allOf([
    // Authorisations: rights the subject holds over this object.
    hasRole("subscriber"),
    hasResourceAttribute("licenseeId", eq(subjectId())),
    hasResourceAttribute("region", eq(subject("region"))),
    not(hasResourceAttribute("withdrawnAt", exists())),
    // A mutable attribute, resolved at decision time and never written back.
    hasAttribute("viewsRemaining", gte(1)),
    // Conditions: environmental, about neither the subject nor the object.
    hasAttribute("deviceAttested", eq(literal(true))),
    hasAttribute("networkZone", inArray(["corp", "vpn"])),
  ]),
);

declare const openStream: Effect.Effect<ReadonlyArray<Uint8Array>>;

// The decision is taken once, before `openStream` begins. Revoking the licence
// one frame later has no effect on this stream — only on the next request.
const program = openStream.pipe(
  enforce(mayStream, { resource: { id: "film-1", licenseeId: "u-9", region: "eu" } }),
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(
        makeSubject({ id: "u-9", roles: ["subscriber"], attributes: { region: "eu" } }),
      ),
      attributeResolverFromRecord({
        viewsRemaining: 3, deviceAttested: true, networkZone: "vpn",
      }),
      RelationshipResolverNever,
      EvaluationIdLive,
      DecisionHistoryUnknown,
    ),
  ),
);
```

Two of the three factors are already here. What is not: the obligation, the
decrement, and everything after the first line of `openStream`.

## Proposed API design

### Obligations — E2

`Allow` and `Deny` are `Data.TaggedClass` values with no `Schema`, so adding a
field is not a codec change and cannot reproduce the round-trip defect the
rewrite exists to fix. The design is shared with
[XACML parity](./26-xacml.md), which is the model that should drive it.

```ts
interface Obligation {
  readonly id: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly advisory: boolean;
}

const obliged: (obligation: Obligation, policy: Policy) => Policy;

class Allow extends Data.TaggedClass("Allow")<{
  // …existing fields…
  readonly obligations: ReadonlyArray<Obligation>;
}> {}
```

Composition is settled by [ADR-QD-019](../decisions/019-obligations.md).
Obligations are a condition on permission, so a decision carries those
contributed by the allow it returned: `AllOf` unions its children's, `AnyOf`
unions its allowing children's, and anything that denies carries none. `AnyOf`
under the default `First` strategy takes the obligations of the branch that
justified the decision, which the ADR *states* rather than leaves implicit,
because collecting from every allowing branch requires exhaustive evaluation and
would repeal
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation). `Not`
turned out to need no rule at all — it is handed an obligation set in neither of
its cases.

One constraint is absolute, and matters more here than in XACML because UCON's
obligations are *actions*: an obligation is **data returned with a decision**,
never a callback the evaluator invokes. The moment the evaluator can run one,
evaluation has side effects and INV-QD-009 is gone.

### Attribute mutability — E5 shipped, plus a write path

E5 as scoped in [the matrix](./00-adoption-matrix.md) was a *read* port, and that
is what shipped ([ADR-QD-020](../decisions/020-decision-history-port.md)). UCON
needs the write half too, and the only safe shape keeps it out of the evaluator.

```ts
interface UsageRecord {
  readonly subjectId: string;
  readonly resourceId: string;
  readonly evaluationId: string;
  readonly attributes: Readonly<Record<string, unknown>>;
}

interface UsageJournalShape {
  readonly record: (usage: UsageRecord) => Effect.Effect<void, UsageRecordError>;
}
```

`postUpdate` is expressible this way: the decision is taken, the usage runs, the
caller records it. `preUpdate` is not, without making evaluation write.
`onUpdate` is not expressible at all, because there is no "during". A journal
that is unreachable must fail, not deny
([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)), and
INV-QD-008 would have to be restated as reproducible *given the same journal
state*, in the same change, or it weakens silently.

### Continuity — declined, not designed

This document deliberately proposes no API for ongoing enforcement. Sketching one
would imply it is on a path, and it is not.

What it would require is not mysterious: a **supervised scope** outliving the
decision and representing the usage; a **revocation channel** that re-evaluates
on attribute change and signals that scope; and **interruption** of in-flight
work when the signal arrives. Effect supplies every one of those — `Scope`,
fibers, structured interruption — so this is not impossible, and saying so is
more honest than claiming a technical obstacle. It is a **deliberate non-goal**,
because it would roughly double both the library's surface and its failure modes:
callers would have to reason about what a revoked-mid-write usage leaves behind,
what a half-applied obligation means, and what a decision *is* once it has a
lifetime.

There is precedent for declining exactly this trade.
[ADR-QD-004](../decisions/004-single-effect-evaluator.md) already refused a
second execution model — a synchronous fast path beside the `Effect`-returning
evaluator — because the predecessor's two evaluators produced a destroyed
short-circuit and an unreachable async API. That was two evaluators over the
*same* decision shape; this would be two enforcement models over *different*
decision shapes, and the reasoning applies with more force.

## What it would cost

| Part | Verdict |
| ---- | ------- |
| **E1** — action dimension | **Done.** Additive and cheap, as forecast; shipped on the argument that it unlocks seven models |
| **E2** — obligations | **Done.** Built on the argument from [XACML parity](./26-xacml.md) and purpose-based control, not from UCON |
| **E5** — decision history port | **Done.** Built on [Chinese Wall](./30-chinese-wall.md)'s and [history-based control](./31-hbac.md)'s argument, as forecast — and three-valued rather than boolean ([ADR-QD-020](../decisions/020-decision-history-port.md)) |
| Write path / `postUpdate` | **Pursue conditionally.** The precondition has fired — E5 exists — and the condition holds: still only as a caller-invoked journal, and nothing has asked for one |
| Continuity / `onUpdate` | **Decline.** Not an enabler, not on the [roadmap](../roadmap.md), not a gap to close |

**The recommendation is that Qadi never targets UCON.** It built E5 — having built
E1 and E2 — because other models justified it independently, and it states, here
and once, that continuous enforcement is out of scope. An application needing
it should terminate sessions at the layer that owns them, consulting Qadi for the
decision each time it re-checks.

That leaves the model partly reachable rather than absent: pre-authorisations,
conditions, pre-obligations and post-updates cover the systems people actually
deploy. What stays unreachable is the ongoing usage decision.

## Verification

Nothing verifies this model, and nothing is planned to. It is the only document
in this set whose conclusion is a recommendation *against* adoption, so there is
no scenario to write and no `REQ-QD` identifier to allocate. The compiled example
above is the sole verified content: it exercises shipped API, and CI fails if a
signature under it drifts.

The recommended parts have been built, and the evidence lives where the shipped
behaviour lives rather than in the documents that argued for it: obligations in
[11 — Obligations](../behaviors/11-obligations.md) and
[XACML parity](./26-xacml.md), the history port in
[12 — Decision History](../behaviors/12-history.md) and
[ADR-QD-020](../decisions/020-decision-history-port.md).
[Chinese Wall](./30-chinese-wall.md) and
[history-based control](./31-hbac.md) are now *verified models* citing that
behaviour, not the place its evidence is kept. One obligation falls to this document
alone: if continuity is ever reconsidered, that must open with an ADR superseding
this recommendation and a restatement of
[INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied),
which today guarantees only that a denied effect never *starts*.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [26 — XACML Parity](./26-xacml.md) · [30 — Chinese Wall](./30-chinese-wall.md) · [31 — History-Based Access Control](./31-hbac.md)_
