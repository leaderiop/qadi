# ADR-QD-020: History is a three-valued port, because a boolean cannot fail closed under negation

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

Four models want the same missing thing: *has this subject already done this?*
Dynamic separation of duty ("approve, unless you raised it"), Chinese Wall
("access this company, unless you have engaged with a competitor"), history-based
control and task-based control all turn on a fact about the past, and Qadi holds
none. `EvaluationId` gives a decision an identity and deliberately has no store
behind it ([ADR-QD-012](./012-deterministic-time-and-ids.md)).

This is **E5** in the [adoption matrix](../models/00-adoption-matrix.md), and the
matrix calls it the enabler most at risk of violating scope. Whatever lands must
be a *port* over the caller's store, exactly as `RelationshipResolver` is, or
Qadi becomes a system of record — which [the URS](../urs.md) forbids and
[ADR-QD-016](./016-gxp-out-of-scope.md) reinforces.

Four documents sketched the port and they do not agree.
[24 — Separation of Duty](../models/24-separation-of-duty.md) proposed
`hasActed → boolean` keyed by resource.
[31 — HBAC](../models/31-hbac.md) proposed the same plus a `scope` of `"resource"`
or `"any"`, and both polarities of the policy.
[30 — Chinese Wall](../models/30-chinese-wall.md) proposed something else
entirely: `engagement → Engagement`, a three-case tagged union, plus a `record`
write member.
[33 — TBAC](../models/33-tbac.md) proposed `hasNotActed(action, …)` and adds
nothing to the port.

31 states the requirement this decision has to meet: *"Three documents now sketch
this service and there must be exactly one of it."*

The matrix also records a trap. `RelationshipResolverNever` fails closed by
answering `false`, because `hasRelationship` is a positive test. `hasNotActed` is
negative, so a `false`-answering default would **grant**, breaching
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed). Both 24 and 31
answer this with a default named `DecisionHistoryAssumeActed` that returns `true`.

## Decision

### The trap is worse than recorded, and a boolean cannot escape it

`DecisionHistoryAssumeActed` fixes `hasNotActed` and breaks `hasActed`. A default
returning `true` makes the negative policy deny — correct — and makes the
*positive* policy allow, which is a grant from an unwired port. Returning `false`
does the reverse. **No boolean default is fail-closed for both polarities**, and
31 proposes shipping both polarities.

So the port does not return a boolean:

```ts
export type ActedResult = "Acted" | "NotActed" | "Unknown";

export interface ActedQuery {
  readonly subjectId: string;
  /** What was done before, e.g. `"raised"`. */
  readonly event: string;
  /** The resource it was done to; absent when the question is "ever, at all". */
  readonly resourceId: string | undefined;
}

export interface DecisionHistoryShape {
  readonly hasActed: (
    query: ActedQuery,
  ) => Effect.Effect<ActedResult, DecisionHistoryUnavailable>;
}
```

`"Unknown"` means *nobody can say* — the structural absence of a store, not a
store that failed. Both policies deny on it:

| Port answers | `hasActed` | `hasNotActed` |
| ------------ | ---------- | ------------- |
| `"Acted"` | allow | deny |
| `"NotActed"` | deny | allow |
| `"Unknown"` | **deny** | **deny** |

One default layer, `DecisionHistoryUnknown`, is now fail-closed for every policy
that reads history, and there is no polarity argument left to get wrong. The
third value is doing exactly the work `undefined` does in the field-visibility
lattice: it is the value that makes a rule total.

### `hasNotActed` is not `not(hasActed)`

This follows from the table above and is the part someone will later try to
simplify away. `not` inverts a decision. Under `"Unknown"`, `hasActed` denies, so
`not(hasActed(e))` **allows** — from an unwired port. `hasNotActed` denies.

They are different policies and both must exist as variants. A comment will not
hold this; the schema does.

### `Deny`-on-`Unknown` is not the same as an error

Two distinct failures, and collapsing them is the mistake
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) exists to
prevent:

- **`"Unknown"`** — no history store is wired. A deliberate, structural absence,
  the exact counterpart of `RelationshipResolverNever` answering `false`. It is a
  denial.
- **`DecisionHistoryUnavailable`** — a wired store could not be reached. It
  propagates on the error channel and reaches the caller as a failure.

The temptation to collapse the second into a denial is stronger here than
anywhere else in the library, because for a separation-of-duty check a denial
*feels* like the safe answer. It is not: it makes an outage indistinguishable
from "you raised this invoice", and sends an engineer to audit approvals.

### One member, read-only, and Chinese Wall falls out of it

The port has **one** member and no write. 30's `record` is declined as a service
member, on 30's own argument: an evaluator that writes is not reproducible, and
`filter` and React's `Can` call speculatively — a component mounting would build
a wall. A write member on an evaluation service is one the evaluator must be
trusted never to call, and the way to guarantee that is not to have it. The
caller writes to its own store, which it owns anyway.

30's `Engagement` union is declined too, and this is the surprise: **Chinese Wall
does not need it.** With `scope` from 31, Brewer–Nash is two questions the
boolean-shaped port already answers — has this subject engaged with the conflict
class at all, and was it with *this* member?

```typescript
import { anyOf, hasActed, hasNotActed, type Policy } from "@qadi/core";

// The conflict class names the event; the resource in hand is the company.
const withinWall = (conflictClass: string): Policy =>
  anyOf([
    // free first access: no engagement anywhere in the class
    hasNotActed(conflictClass, { scope: "Any" }),
    // or an engagement with this very company
    hasActed(conflictClass, { scope: "Resource" }),
  ]);
```

Note that the first branch is `hasNotActed(…, { scope: "Any" })` and *not*
`not(hasActed(...))` — under an unwired port the second would grant access to
every company in the class, which is the whole of what Chinese Wall forbids.

### Naming: `event`, not `action` and not `relation`

Qadi now has three things a policy can name and they must stay apart:

| Word | Means | Where |
| ---- | ----- | ----- |
| `action` | what the caller is doing **now** | `EvaluateOptions`, `hasAction` ([ADR-QD-018](./018-action-dimension.md)) |
| `relation` | a named edge in the caller's graph | `RelationshipResolver`, `hasRelationship` |
| `event` | what the subject did **before** | `DecisionHistory`, `hasActed` |

33 sketched `hasNotActed(action, …)` and separately recorded the naming hazard it
would create against permission tokens. E1 has since shipped an `action` that is
neither of those, making it a three-way collision. `event` is chosen to break it,
and it matches 31's own `decisionHistoryFromEvents`.

`activity` was considered and rejected: [21 — OrBAC](../models/21-orbac.md) maps
OrBAC's *activity* onto `hasAction`, so the word is already spoken for.

## Consequences

**Positive**:

- One service answers all four documents, which is what 31 asked for, and it is
  narrower than three of the four sketches rather than the union of them.
- The fail-closed default needs no argument at the call site, no naming
  convention and no comment. `DecisionHistoryUnknown` denies everything, in both
  polarities, by construction.
- The port cannot become a database. One member, one closed three-valued answer,
  no filters, no ranges, no projections — the discipline both 30 and 31 said the
  enabler most needed.

**Negative**:

- **`EvaluationServices` gains a fourth service**, so every layer that provides
  the evaluator must now provide `DecisionHistory` — every test, every fixture
  and every compiled example in `spec/`. That is real churn, and it is the same
  churn `RelationshipResolver` imposed. The doc-example gate finds all of it.
- **Two new `Policy` variants**, not one. `HasActed` and `HasNotActed` land in
  the schema union, the derived type, the evaluator and the round-trip generator
  in a single change ([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)).
  A single variant with an `expect` field would be cheaper, and was rejected
  because a trace that says which question was asked is worth more than one
  schema entry — "you have already acted" and "you have not acted" are different
  denials.
- **`scope: "resource"` needs `resource.id`** and fails with `MissingResourceId`
  without it. That error is reused rather than duplicated: it is the same
  failure, the same diagnosis and the same code, and a second error meaning the
  same thing would be worse than a widened doc comment.
- **Evaluation becomes stateful**, and
  [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) must be
  restated as reproducible *given the same history* in the change that lands
  this. Four documents say so. Left unrestated it does not become false loudly;
  it weakens silently, and everything that cites it goes on citing it.

**Trade-off accepted**: three-valued logic is harder to reason about than a
boolean, and every future reader of `hasActed` has to learn that `Unknown`
exists. That cost buys a default that cannot grant. The alternative — a boolean
plus a rule that only the negative policy may be used, or a differently-polarised
default per policy — is cheaper to describe and has a failure mode where wiring
nothing at all opens the door. This library exists because its predecessor had
several of those.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[12 — Decision History](../behaviors/12-history.md),
[INV-QD-014](../invariants.md#inv-qd-014-an-unwired-history-port-denies-both-polarities),
`@REQ-QD-012`.

Two notes from building it.

**The Chinese Wall claim was checked, not assumed.** `withinWall` above is a
test, not an illustration: it runs against a fixture history and asserts that a
competitor is refused, the same company is allowed, and an analyst with no
engagement takes a free first access. A second test asserts that an *unwired*
port seals every wall rather than opening it — which is the failure
`not(hasActed(…))` would have produced, and the reason 30's `Engagement` union
was declined rather than merely deferred.

**Both polarities of the trap were mutation-tested.** Changing the default layer
to answer `"NotActed"` kills four tests; changing it to `"Acted"` kills four.
That is the argument of this ADR reduced to two experiments, and it is worth
more than the paragraph making it, because the paragraph would survive a
refactor and the tests would not.
