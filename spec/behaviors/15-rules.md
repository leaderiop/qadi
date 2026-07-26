# 15 — Rule Tables

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-15                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-019) |

_Previous: [14 — Subject Sets](./14-subject-sets.md)_

---

## BEH-QD-111: A rule carries an effect of its own

> **See:** [ADR-QD-023](../decisions/023-combining-algorithms.md)

```ts
export type Combining = "FirstApplicable" | "DenyOverrides" | "PermitOverrides";
export type RuleEffect = "Permit" | "Deny";

export interface Rule {
  readonly condition: Policy;
  readonly effect: RuleEffect;
}

export const permitWhen: (condition: Policy) => Rule;
export const denyWhen: (condition: Policy) => Rule;
export const rules: (
  rules: ReadonlyArray<Rule>,
  options?: { readonly combining?: Combining },
) => Policy;
```

```
REQUIREMENT: A rule's `condition` is evaluated for APPLICABILITY, not outcome.
             Allowing means "this rule applies"; `effect` says what applying
             means.
```

That second bit is the whole of E3. Boolean composition has one bit per child, so
under `anyOf` a child that denies and a child that is irrelevant are the same
event — evaluation moves on. In a rule list they are opposites: a row that
matches and carries a deny effect **stops the walk and refuses**, while a row
that does not match is skipped.

The recurring demand behind [25 — RuBAC](../models/25-rubac.md) is the **explicit
deny**: a row saying "and if this matches, refuse", visible as its own row,
addable without rewriting the rules around it. Before this it had to be hoisted
into a negated guard clause ahead of every permit — which grows a second
conjunction of exceptions the moment one deny should apply to only some permits,
and which inherits `not`'s inversion of the fail-closed default.

## BEH-QD-112: Exactly one rule decides

| Combining | The deciding rule |
| --------- | ----------------- |
| `FirstApplicable` | the first rule that applies |
| `DenyOverrides` | the first applying `Deny`; failing that, the first applying `Permit` |
| `PermitOverrides` | the first applying `Permit`; failing that, the first applying `Deny` |

```
REQUIREMENT: The decision's visible-field set and obligations MUST be the
             deciding rule's alone.
```

A rule that applied but did not decide granted nothing, so it conditions
nothing — [ADR-QD-019](../decisions/019-obligations.md)'s sentence applied
unchanged, and the same rule a losing `anyOf` branch follows under `First`.

Two consequences, both simplifications over what
[25 — RuBAC](../models/25-rubac.md) forecast:

- **`Rules` carries no `fieldStrategy`.** With one deciding rule there is nothing
  to merge. A caller who wants several branches' field sets merged writes an
  `anyOf` inside a condition, where the strategy already lives.
- **Obligations need no new merge rule.** They are the deciding rule's.

```
REQUIREMENT: A deciding rule whose effect is `Deny` MUST contribute neither
             visible fields nor obligations, whatever its own condition's trace
             holds.
```

This is `Not`'s rule for `Not`'s reason: a refusal permits nothing, so it
conditions nothing, and knowing a row *refused* says nothing about which fields
are safe. What is new is that the condition of a `Deny` row may well have
allowed — inside a `Deny` row applicability and permission point in opposite
directions — so it is the first place in the library where an allowing subtree
contributes nothing to the decision above it. The condition's own trace node
keeps both, so a reviewer can still see what the row matched on.

## BEH-QD-113: No rule applying is a denial

```
REQUIREMENT: A rule list in which no rule applies MUST deny, and so MUST an
             empty one.
```

There is no default-permit spelling. `allOf([])` allows vacuously; a rule list
must not, or a table emptied by an administrator would grant everything. A caller
wanting a default-permit row writes one whose condition always applies —
`permitWhen(allOf([]))` — and the awkwardness of that spelling falls on the
widening side, which is the side worth making deliberate.

XACML's `NotApplicable` stays collapsed into `Deny`, per
[26 — XACML](../models/26-xacml.md): under fail-closed defaults a policy that did
not apply is a policy that did not permit, and every safe enforcement point maps
it to a denial anyway. The distinction survives where it belongs, in the trace.

## BEH-QD-114: Order is meaning

```
REQUIREMENT: Rules MUST be evaluated in array order, and a reordered list MUST
             be able to decide differently.
```

Stated as a requirement because it is the one property no existing test could
have caught. `AllOf` and `AnyOf` are order-*observable* — the trace and the
resolver calls differ — but never order-*dependent*: their verdict is the same
whatever order the children are written in. A rule list is the first construct in
Qadi where moving a row changes the answer, and it is what an operator
maintaining a rule table relies on most.

## BEH-QD-115: A rule list stops at the first rule that cannot be overridden

> **Invariant:** [INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden)

| Combining | Stops at | Must otherwise |
| --------- | -------- | -------------- |
| `FirstApplicable` | the first applying rule — nothing overrides anything | — |
| `DenyOverrides` | the first applying `Deny` | evaluate every rule to permit |
| `PermitOverrides` | the first applying `Permit` | evaluate every rule to deny |

`FirstApplicable` is not in tension with
[ADR-QD-013](../decisions/013-short-circuit-default.md); it is sequential
short-circuiting made explicit rather than inferred from a boolean operator, and
it is the default for that reason.

The overrides forfeit short-circuiting in one direction, and that **inverts the
cost profile of the rest of the library**, where allowing is the cheap outcome:
under `DenyOverrides` a permit is the expensive answer, because nothing-denied is
knowable only by asking everything. That is the algorithm's meaning rather than
an implementation shortfall, which is why
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) names this
invariant instead of enumerating a third node.

```
REQUIREMENT: A failure inside a condition MUST fail the evaluation rather than
             read as that row not applying
             ([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)).
             A resolver outage inside a rule table must not surface as the table
             falling through to its default deny.
```

## BEH-QD-116: The trace names the row that hit

```
REQUIREMENT: The `Rules` trace node MUST name the deciding row, in both
             directions, and its children MUST be the conditions actually
             evaluated, in order.
```

`Rules` is the only node in the library whose *allowing* trace carries a
`reason`. `Trace.reason` was documented as "why the node denied"; a rule table's
first diagnostic question is **which row hit**, and it is asked as often of a
grant as of a refusal. Answering it only for denials would leave the more common
half of a firewall-shaped debugging session unanswerable.

Because the walk stops early, the children are also the record of what was
*paid for*: a `FirstApplicable` table that decided on row 0 has one child, and a
`DenyOverrides` table that permitted has as many children as it has rows.

## BEH-QD-117: Worked example

A tenancy rule table with an explicit deny at the top — the shape an operator
ports out of a firewall, an API gateway or a hand-rolled `for (const rule of
rules)` loop.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  currentSubjectLayer,
  decide,
  denyWhen,
  eq,
  hasAttribute,
  hasResourceAttribute,
  hasRole,
  literal,
  makeSubject,
  permitWhen,
  rules,
  subjectId,
} from "@qadi/core";

const table = rules(
  [
    // The rows that refuse, as rows. Each is addable without touching the rest.
    denyWhen(hasAttribute("status", eq(literal("suspended")))),
    denyWhen(hasResourceAttribute("legalHold", eq(literal(true)))),
    // The rows that permit.
    permitWhen(hasResourceAttribute("ownerId", eq(subjectId()))),
    permitWhen(hasRole("editor")),
    // No row applying is already a denial, so this final row is needed only to
    // widen — and `allOf([])` is the condition that always applies.
    permitWhen(allOf([])),
  ],
  { combining: "DenyOverrides" },
);

const program = decide(table, {
  resource: { id: "doc-1", ownerId: "u-1", legalHold: false },
}).pipe(
  Effect.provide(
    currentSubjectLayer(
      makeSubject({ id: "u-1", roles: ["editor"], attributes: { status: "active" } }),
    ),
  ),
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

Under `DenyOverrides` this asks every row, because a permit is only knowable once
nothing has denied. Swapping to `FirstApplicable` stops at row 2 and answers the
same here — and would answer differently the moment a deny row sat below a permit
that applied.

---

_Previous: [14 — Subject Sets](./14-subject-sets.md)_
