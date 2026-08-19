# 33 — Task-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-33                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Shipped and verified as `@REQ-QD-019`; the absent-`raisedBy` hazard closed in the example (CCR-QD-022)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Thomas and Sandhu's task-based access control attaches authorisations to a
**task in a workflow** rather than to a subject or a resource. They come into
existence when the task is activated, are *consumed* as its steps complete, and
expire when the task ends. The characteristic construct is the **just-in-time,
use-limited permission**: you hold the right to approve *this* invoice, *once*,
for as long as the approval step is open. Nobody holds "approve invoices" as a
standing fact.

## Who asks for it

Workflow and case-management systems: procurement approvals, claims
adjudication, clinical order sets, change advisory boards, joiner–mover–leaver
pipelines. The signal is an application that already runs a workflow engine —
something that activates a step, records who completed it and advances — and
wants authorisation to follow the workflow rather than run alongside it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P3** |
| Enablers required | ~~**E5**~~ **shipped**; none outstanding |
| Breaking change | No |

**Shipped: [ADR-QD-020](../decisions/020-decision-history-port.md),
[12 — Decision History](../behaviors/12-history.md), `@REQ-QD-019`,
`packages/core/test/Evaluate.test.ts`.** The cheapest model in this set to
complete, because most of it already worked and the rest was **one conjunct**.

**The distinction from every model documented so far** is what made this
additive rather than wiring. Roles, attributes and relationships are all
*standing* facts: true until something changes them, and true again on the next
call. A task authorisation is *transient and consumable* — it has a validity
window and a use count, and Qadi has no notion of either. A policy that allows
will allow again a millisecond later, indefinitely, because nothing in the
evaluator records that a decision was ever taken.

*The analysis was right and the verdict was too heavy.* It is a real distinction —
a task authorisation is transient and consumable where a role is standing — but
expressing it cost one labelled conjunct, not a construct.

**Usage counting was the whole of the E5 dependency**, and it turned out not to be
counting at all. "Approve once" requires knowing whether the right has already
been exercised, and that is history. This is the same port
[31 — History-Based Access Control](./31-hbac.md) proposed, and TBAC needed only
its cheapest question — *has this subject done X to this object?* — with no
window, no ordering, no aggregation. Two models converging on the same narrow
question is the argument for that narrow port shape rather than a general history
query interface, and it is the argument that won.

## What Qadi can express today

**Most of TBAC is already expressible, and that is the useful finding.** A
workflow engine that maintains task state can express nearly all of the model
with shipped, tested capability, because the parts TBAC treats as special are
ordinary facts once the engine has written them down:

| TBAC concept | Expressed by | Cost |
| ------------ | ------------ | ---- |
| The task exists and is yours | `hasRelationship("assigned-task")` | One resolver call |
| The step is open | `hasResourceAttribute("state", eq(literal("awaiting-approval")))` | No lookup — a field on the resource in hand |
| The professional right to act at all | `hasRole("approver")` | A set lookup on the subject |
| The composition | `allOf([…])` | Short-circuits on the first denial |
| The use is spent | `hasNotActed("approved")` | One port call, last |

What was genuinely missing was only the **consumption** — the once-ness — and it
is the smallest thing any model in this set needed: one conjunct. Validity always
worked, because a step the engine has advanced is no longer `awaiting-approval`,
and the policy denies on the next call.

```typescript
import {
  AttributeResolverNone,
  EvaluationIdLive,
  allOf,
  check,
  currentSubjectLayer,
  decisionHistoryFromEvents,
  eq,
  exists,
  hasNotActed,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  labeled,
  literal,
  makeSubject,
  not,
  relationshipResolverFromEdges,
  subjectId,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

// The workflow engine owns the task table. Qadi never writes to it; it reads
// the state the engine maintains — here, one edge per active assignment.
const TaskAssignments = relationshipResolverFromEdges([
  { subjectId: "u-amina", relation: "assigned-task", resourceId: "invoice-1041" },
]);

// A workflow-step authorisation, entirely in shipped capability. Each branch is
// labelled, so the trace records which one denied — and they are ordered
// cheapest first: a set lookup, then two free comparisons on the resource in
// hand, then a resolver call, then a port call.
const canApproveInvoice = allOf([
  labeled("task.role", hasRole("approver")),
  labeled("task.open", hasResourceAttribute("state", eq(literal("awaiting-approval")))),
  // Object-based separation of duty — see MOD-QD-024. Needs no history, and needs
  // `exists`: without it an absent `raisedBy` GRANTS the self-approval this
  // branch exists to stop.
  labeled(
    "task.not-raiser",
    allOf([
      hasResourceAttribute("raisedBy", exists()),
      not(hasResourceAttribute("raisedBy", eq(subjectId()))),
    ]),
  ),
  labeled("task.assigned", hasRelationship("assigned-task")),
  // The once-ness. `scope` defaults to `"Resource"`, which is exactly the keyed
  // question this model wanted.
  labeled("task.once", hasNotActed("approved")),
]);

const program = Effect.gen(function* () {
  // Allowed: assigned, the step is open, and someone else raised it.
  const whileOpen = yield* check(canApproveInvoice, {
    resource: { id: "invoice-1041", state: "awaiting-approval", raisedBy: "u-clerk" },
  });

  // Denied: the engine advanced the task, so the step closed. This is the
  // closest Qadi gets to expiry today — and it expires because the *engine*
  // moved, not because Qadi counted anything down.
  const afterAdvance = yield* check(canApproveInvoice, {
    resource: { id: "invoice-1041", state: "approved", raisedBy: "u-clerk" },
  });

  // Denied: the right was already exercised against this very invoice. Nothing
  // about the subject, the resource or the assignment differs from `whileOpen`.
  const afterApproving = yield* check(canApproveInvoice, {
    resource: { id: "invoice-1041", state: "awaiting-approval", raisedBy: "u-clerk" },
  }).pipe(
    Effect.provide(
      decisionHistoryFromEvents([
        { subjectId: "u-amina", event: "approved", resourceId: "invoice-1041" },
      ]),
    ),
  );

  return { whileOpen, afterAdvance, afterApproving };
}).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-amina", roles: ["approver"] }))),
  Effect.provide(
    Layer.mergeAll(
      TaskAssignments,
      AttributeResolverNone,
      // An approval on a *different* invoice, so the first two calls allow and
      // deny on their own terms and the keyed question is demonstrated.
      decisionHistoryFromEvents([
        { subjectId: "u-amina", event: "approved", resourceId: "invoice-1040" },
      ]),
      EvaluationIdLive,
    ),
  ),
);
```

*One correction and one addition.* The `task.not-raiser` branch was written
without the `exists` guard, which **granted** whenever `raisedBy` was absent —
the hazard [MOD-QD-024](./24-separation-of-duty.md) records, arriving in the one
other document that recommends the rule. And the branches were ordered with the
resolver call ahead of two free comparisons; cheapest-first is what
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) implies, and
the original comment had it half right.

**Where the workflow lives.** TBAC presupposes an engine that activates tasks,
assigns them, records completion and ends them. Qadi is not that engine and
should not become one: the task lifecycle is *administration*, which
[the URS](../urs.md) places out of scope. Qadi decides against the state the
engine maintains — the same division that keeps grant issuance out of
[DAC](./08-dac.md) and roster edits out of [TMAC](./20-tmac.md). An application
with no workflow engine does not need TBAC from Qadi; it needs a workflow engine.

**Expiry reads the `Clock`.** Where a step carries a real deadline rather than
just a state, the comparison must be against `Clock`, never the ambient clock —
[ADR-QD-012](../decisions/012-deterministic-time-and-ids.md), with the resolver
recipe in [13 — Temporal Access Control](./13-temporal.md). The constraint in
[00 §3.2](./00-adoption-matrix.md) applies: only `eq` and `neq` take a value
reference, so "now is before the deadline" is derived in the resolver and
matched as a boolean, not written in the policy tree.

**Separation of duty pairs with this constantly.** "Approve this invoice, unless
you raised it" is a TBAC authorisation and a dynamic separation-of-duty
constraint at once, and both wanted E5 — and both have it —
[24 — Separation of Duty](./24-separation-of-duty.md). The two are closer than
they look, because the *object-based* case above needs no enabler at all: who
raised the invoice is a column on the invoice, not history.

## Proposed API design

One question is missing, and E5 answers it. The port itself — service, error and
default layer — is settled in
[ADR-QD-020](../decisions/020-decision-history-port.md) and has shipped; TBAC
added nothing to it. One detail below is out of date: the parameter is `event`,
not `action`, precisely because of the naming hazard this document recorded — see
[what it cost](#what-it-cost).

> **Superseded by [ADR-QD-020](../decisions/020-decision-history-port.md).** Two
> differences, and the second is a small delight. The parameter is `event`, not
> `action`, for exactly the naming reason this document records below. And the
> options object omits `scope` — the shipped signature is
> `HistoryOptions extends FieldOptions { readonly scope?: HistoryScope }` — but
> because it **defaults to `"Resource"`**, every call site this document writes is
> correct unchanged. *The sketch asked for exactly the default, without knowing
> there would be one.* The fence is left as written; ADR-QD-020 quotes it.

```ts
/** Has this subject already performed `action` against this resource? Denies
 *  when it has — the use is spent. TBAC wants no window, no ordering and no
 *  count beyond one, which is the argument for keeping the port that narrow. */
export const hasNotActed: (
  action: string,
  options?: { readonly fields?: ReadonlyArray<string> },
) => Policy;
```

Dropped into the `allOf` above beside `task.open`, that is the whole of "approve
once, while the step is open". Recording that the approval happened stays the
engine's write; the port is read-only, as the relationship port is.

## What it cost

**E5 in its narrowest shape, and nothing else.** One of the cheapest P3 models,
precisely because most of it already worked: no new service beyond the shared
history port, no second policy variant beyond `hasNotActed`, no change to any
existing type or wire format. *Held, and cheaper than priced* — TBAC contributed
nothing to the port and consumed one conjunct of it.

The costs are therefore E5's, argued in full in
[24](./24-separation-of-duty.md) and [31](./31-hbac.md) and inherited without
amendment: [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — an
unreachable history store is an error, not a denial;
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) — restated
as reproducible *given the same history*, a consumable permission being by
definition one whose second evaluation differs;
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — a negative
policy under an unwired port must deny, so the default layer has to assert the
subject *has* acted; and
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) — the
lookup must be lazy, so an `allOf` already denied by the role branch never
reaches it.

*One correction, and one thing now proven rather than assumed.* The INV-QD-007
clause has the right requirement and the wrong remedy: a negative policy under an
unwired port must indeed deny, but *"so the default layer has to assert the
subject has acted"* does not follow — a `true`-answering default breaks `hasActed`
instead, and no boolean default is fail-closed for both polarities. The shipped
default is `DecisionHistoryUnknown`, whose third value satisfies neither
([INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities)).
INV-QD-005's laziness is no longer inherited on trust: `@REQ-QD-019` asserts that
a refusal at the role branch leaves both `task.assigned` and `task.once` out of
the trace, and a unit test asserts that neither the resolver nor the port was
called.

The one cost specific to TBAC is a *naming* decision. The history port's
`action` and a permission token's action segment
([ADR-QD-007](../decisions/007-permission-token-representation.md)) are
different concepts that will be spelled alike in every workflow application —
`"approve"` the step versus `invoice:approve` the permission. The hazard
recorded against E1 in [00 §6](./00-adoption-matrix.md) applies verbatim, and
[ADR-QD-018](../decisions/018-action-dimension.md) has since settled it for the
action dimension in the same terms: the two must never be derived from or
compared against each other. A history port naming its field `action` inherits
that rule; it does not get to relitigate it.

*Called correctly, and the ADR spelled it out in this document's terms.* The
parameter is `event` precisely to stay apart from `hasAction` and
`hasRelationship` — a three-way collision this section predicted from two.

## Verification

**Both halves are built, and the composition this document called untested has
seven scenarios.** `hasNotActed` exists; once-ness is exercised.

| Claim | Evidence |
| ----- | -------- |
| An assigned approver may approve an open step | `@REQ-QD-019` |
| **A spent approval is refused** — the characteristic construct | `@REQ-QD-019`, `packages/core/test/Evaluate.test.ts` ("a spent approval is refused, and nothing else changed") |
| Once-ness is keyed per object — an approval elsewhere spends nothing here | `@REQ-QD-019`, `Evaluate.test.ts`; the default `scope: "Resource"` |
| A step the engine has advanced is closed | `@REQ-QD-019` |
| Nobody approves the invoice they raised | `@REQ-QD-019` |
| An unrecorded raiser does not open the step, and why the `exists` guard is needed | `@REQ-QD-019` |
| The role without the assignment is not authority | `@REQ-QD-019` |
| The cheapest check refuses first, and neither the resolver nor the port is called | `@REQ-QD-019` (absent from the trace) and `Evaluate.test.ts` (neither dependency invoked) — [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) |
| The standing mechanics underneath | `REQ-QD-005` (relationships), `REQ-QD-003` (roles), `REQ-QD-006` (resource attributes), `REQ-QD-002` (combinators), `REQ-QD-009` (`subjectId()`), [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) |
| An unavailable history store surfaces as a failure, not a `Deny` | Inherited rather than duplicated: `@REQ-QD-012`, `Evaluate.test.ts`, `ACL011`, [BEH-QD-093](../behaviors/12-history.md) |
| The task lifecycle — activation, assignment, completion | **None, and none is wanted.** That is the engine's; the URS places administration out of scope |

`@REQ-QD-019` chains through [traceability](../traceability.md) §5 to
[BEH-QD-019](../behaviors/03-policy-adt.md) (combinators),
[BEH-QD-026](../behaviors/04-matchers.md) (value references),
[BEH-QD-036](../behaviors/05-evaluator.md) (relationships and resource
attributes) and [BEH-QD-092](../behaviors/12-history.md) (scope). No new
`BEH-QD` or `INV-QD` identifier was allocated, following `REQ-QD-009`'s
precedent.

**What the forecast got wrong.**

- *"Additive."* One conjunct, and no contribution to the port at all.
- *"`hasNotActed(action, { fields? })`."* The parameter is `event`, and there is a
  `scope` the sketch did not know it already had by default.
- *"The default layer has to assert the subject has acted."* No boolean default
  works; the third value does.
- *"Needs no history"* on the object-based branch. True — and the branch as
  written **granted** when `raisedBy` was absent, which is worse than needing an
  enabler. The correction came from [24](./24-separation-of-duty.md) rather than
  from here.

**And what it got right**, which is nearly all of it: most of TBAC was already
expressible and the document said so plainly; the once-ness was the only gap; the
narrow port shape was the right call and two models converging on it was the
argument that carried; the write stays the engine's; and the naming hazard was
predicted before the port existed.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [20 — Team-Based Access Control](./20-tmac.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [31 — History-Based Access Control](./31-hbac.md)_
