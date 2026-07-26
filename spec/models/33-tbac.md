# 33 — Task-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-33                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
| Status | **Additive** |
| Priority | **P3** |
| Enablers required | **E5** — decision history port |
| Breaking change | No |

**The distinction from every model documented so far** is what makes this
additive rather than wiring. Roles, attributes and relationships are all
*standing* facts: true until something changes them, and true again on the next
call. A task authorisation is *transient and consumable* — it has a validity
window and a use count, and Qadi has no notion of either. A policy that allows
will allow again a millisecond later, indefinitely, because nothing in the
evaluator records that a decision was ever taken.

**Usage counting is the whole of the E5 dependency.** "Approve once" requires
knowing whether the right has already been exercised, and that is history. This
is the same port [31 — History-Based Access Control](./31-hbac.md) proposes, and
TBAC needs only its cheapest question — *has this subject done X to this
object?* — with no window, no ordering, no aggregation. Two models converging on
the same narrow question is the argument for that narrow port shape rather than
a general history query interface.

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

What is genuinely missing is only the **consumption** — the once-ness. Validity
already works, because a step the engine has advanced is no longer
`awaiting-approval`, and the policy denies on the next call.

```typescript
import {
  AttributeResolverNone,
  EvaluationIdLive,
  allOf,
  check,
  currentSubjectLayer,
  eq,
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
  ["u-amina", "assigned-task", "invoice-1041"],
]);

// A workflow-step authorisation, entirely in shipped capability. Each branch is
// labelled, so the trace records which one denied. The role check is a set
// lookup on the subject in hand, so it goes first and spares the resolver call.
const canApproveInvoice = allOf([
  labeled("task.role", hasRole("approver")),
  labeled("task.assigned", hasRelationship("assigned-task")),
  labeled("task.open", hasResourceAttribute("state", eq(literal("awaiting-approval")))),
  // Object-based separation of duty — see MOD-QD-024. Needs no history.
  labeled("task.not-raiser", not(hasResourceAttribute("raisedBy", eq(subjectId())))),
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

  return { whileOpen, afterAdvance };
}).pipe(
  Effect.provide(currentSubjectLayer(makeSubject({ id: "u-amina", roles: ["approver"] }))),
  Effect.provide(Layer.mergeAll(TaskAssignments, AttributeResolverNone, EvaluationIdLive)),
);
```

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
constraint at once, and both want E5 —
[24 — Separation of Duty](./24-separation-of-duty.md). The two are closer than
they look, because the *object-based* case above needs no enabler at all: who
raised the invoice is a column on the invoice, not history.

## Proposed API design

One question is missing, and E5 already answers it. The port itself — service,
error and default layer — is designed in
[31 — History-Based Access Control](./31-hbac.md); TBAC adds nothing to it.

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

## What it would cost

**E5 in its narrowest shape, and nothing else.** One of the cheapest P3 models,
precisely because most of it already works: no new service beyond the shared
history port, no second policy variant beyond `hasNotActed`, no change to any
existing type or wire format.

The costs are therefore E5's, argued in full in
[24](./24-separation-of-duty.md) and [31](./31-hbac.md) and inherited without
amendment: [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — an
unreachable history store is an error, not a denial;
[INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible) — restated
as reproducible *given the same history*, a consumable permission being by
definition one whose second evaluation differs;
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — a negative
policy under an unwired port must deny, so the default layer has to assert the
subject *has* acted; and
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) — the
lookup must be lazy, so an `allOf` already denied by the role branch never
reaches it.

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

## Verification

Nothing here is built, and this document claims no evidence for the consumption
half — `hasNotActed` does not exist, so nothing exercises once-ness.

The rest is a different case, worth stating precisely: the compiled example
rests entirely on shipped, tested mechanics — relationship evaluation by
`REQ-QD-005`, role membership by `REQ-QD-003`, resource attributes by
`REQ-QD-006`, combinator semantics by `REQ-QD-002`, the `subjectId()` value
reference by `REQ-QD-009`, and the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed). Untested is the
*composition as a workflow control*: an acceptance scenario under a newly
allocated `REQ-QD` identifier would allow while the step is open and deny once
the engine advances it, deny for the raiser, and deny a subject holding the role
but no assignment. Two caveats carry over — the short-circuit saving that puts
`hasRole` first is sound by
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) but
unmeasured for relationship lookups (the gap recorded in [08](./08-dac.md),
which should close before a second lazy port arrives), and the consumption part
would additionally need an error-injection test proving an unavailable history
store surfaces as a failure rather than a `Deny`.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [20 — Team-Based Access Control](./20-tmac.md) · [24 — Separation of Duty](./24-separation-of-duty.md) · [31 — History-Based Access Control](./31-hbac.md)_
