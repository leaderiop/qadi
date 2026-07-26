# ADR-QD-023: A rule list stops at the first rule that cannot be overridden

> **Status:** Accepted
> **Date:** 2026-07-26

## Context

`AllOf` and `AnyOf` are **unordered sets** whose allow/deny rule is hard-coded in
`evaluateAllOf` and `evaluateAnyOf`. `FieldStrategy` is their only knob and it
governs field-set merging, never the outcome. No node in the ADT carries an
effect of its own, so no policy can say *"and if this matches, refuse"*.

That is the whole of **E3** in the [matrix](../models/00-adoption-matrix.md), and
it is the last construct two model documents are waiting on:
[25 — RuBAC](../models/25-rubac.md) wants an ordered rule table, and
[26 — XACML](../models/26-xacml.md) defers its combining algorithms to whatever
25 settles rather than proposing a second spelling.

[MOD-QD-025](../models/25-rubac.md) states the obstruction precisely and it is
worth repeating, because it is the reason this cannot be a combinator:

> Under `anyOf`, a child that denies and a child that is irrelevant are the same
> event: evaluation moves on. In a rule list they are opposites — a rule that
> matches and carries a deny effect **stops the walk and refuses**, while a rule
> that does not match is skipped.

Boolean composition has one bit per child. A rule list needs two: *did this
apply*, and *what does applying mean*. Everything below follows from admitting
the second bit.

## Decision

### A new variant, not a field on `AllOf` and `AnyOf`

```ts
export type Combining = "FirstApplicable" | "DenyOverrides" | "PermitOverrides";
export type RuleEffect = "Permit" | "Deny";

export interface Rule {
  /** Evaluated for *applicability*, not outcome: allow means "this rule applies". */
  readonly condition: Policy;
  readonly effect: RuleEffect;
}

// the fourteenth policy variant
// { readonly _tag: "Rules"
// ; readonly rules: ReadonlyArray<Rule>
// ; readonly combining: Combining }
```

[MOD-QD-025](../models/25-rubac.md) argued this and the argument holds. A
`combining` field on the existing combinators would have to be **required**, for
the reason [ADR-QD-006](./006-field-strategy-always-encoded.md) makes
`fieldStrategy` required — the optional field is the one that goes missing — and
a required field rejects every policy already serialized. It would also give two
constructs an effect vocabulary their names deny, and put a knob on precisely the
nodes whose short-circuit behaviour
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) pins by
counting resolver calls. The smaller diff, the larger change.

The constructors are named for how a rule table reads:

```ts
export const permitWhen: (condition: Policy) => Rule;
export const denyWhen: (condition: Policy) => Rule;
export const rules: (
  rules: ReadonlyArray<Rule>,
  options?: { readonly combining?: Combining },
) => Policy;
```

Not `permit` and `deny`: `Deny` is already a decision class, and a `deny` in
scope beside it would be read as producing one.

### Exactly one rule decides

This is the decision the model document did not reach, and it is what makes the
rest small.

```
REQUIREMENT: Under every combining algorithm, exactly one rule decides a rule
             list. The decision's field set and obligations are that rule's
             alone.
```

| Combining | The deciding rule |
| --------- | ----------------- |
| `FirstApplicable` | the first rule that applies |
| `DenyOverrides` | the first applying `Deny`; failing that, the first applying `Permit` |
| `PermitOverrides` | the first applying `Permit`; failing that, the first applying `Deny` |

No rule applying is a **denial**, and so is an empty list. There is no
default-permit spelling and the absence is deliberate; a caller wanting one
writes a final rule whose condition always applies.

Two things fall out of the deciding-rule formulation, and both are simplifications
over the sketch in [MOD-QD-025](../models/25-rubac.md):

**`Rules` needs no `fieldStrategy`.** That document expected one, and observed
that it would be meaningless under `FirstApplicable` and ill-defined for `First`
under the exhaustive algorithms. With one deciding rule there is nothing to
merge, under any algorithm. A caller who wants several branches' field sets
merged writes an `anyOf` inside a rule's condition, where the strategy already
lives and already means what it says.

**Obligations need no new rule either.** They are the deciding rule's, which is
[ADR-QD-019](./019-obligations.md)'s existing sentence — *the obligations on a
decision are those contributed by the allow that was returned* — applied
unchanged. A rule that applied but did not decide granted nothing, so it
conditions nothing, exactly as a losing `anyOf` branch does under `First`.

### A `Deny` rule contributes neither fields nor obligations

```
REQUIREMENT: When the deciding rule's effect is `Deny`, the decision carries no
             visible fields and no obligations, whatever its condition's own
             trace holds.
```

This is `Not`'s rule and it is the same reasoning
([ADR-QD-019](./019-obligations.md)): knowing that a rule *refused* says nothing
about which fields are safe, and a refusal permits nothing, so it can condition
nothing. What is new is that the condition of a `Deny` rule may well have
allowed — applicability and permission point in opposite directions inside a
`Deny` rule — so this is the first place in the library where an allowing subtree
contributes nothing to the decision above it.

### Short-circuiting, restated as a property of the algorithm

[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) currently
reads as a property of the evaluator: `AllOf` stops at its first denial, `AnyOf`
at its first allow. `Rules` cannot be described that way, and stating a per-node
exception would leave the invariant true only by enumeration.

One sentence covers all three algorithms:

```
REQUIREMENT: A rule list stops at the first rule that cannot be overridden.
```

| Combining | Stops at | Must otherwise |
| --------- | -------- | -------------- |
| `FirstApplicable` | the first applying rule — nothing overrides anything | — |
| `DenyOverrides` | the first applying `Deny` | evaluate every rule to permit |
| `PermitOverrides` | the first applying `Permit` | evaluate every rule to deny |

`FirstApplicable` is not in tension with
[ADR-QD-013](./013-short-circuit-default.md) at all — it is sequential
short-circuiting made explicit rather than inferred from a boolean operator. The
overrides forfeit it in one direction, and that inverts today's cost profile,
where allowing is the cheap outcome: under `DenyOverrides` a permit is the
expensive answer, because you cannot know that nothing denied without asking
everything. That is the algorithm's meaning rather than an implementation
shortfall, and it is why the invariant must be a property of the algorithm.

This becomes [INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden),
and INV-QD-005 is amended to name it rather than to enumerate a third node.

### Order is meaning, and a test must say so

```
REQUIREMENT: Rules MUST be evaluated in array order, and a reordered list MUST
             be able to decide differently.
```

Stated as a requirement because it is the one property no existing test could
have caught. `AllOf` and `AnyOf` are order-*observable* — the trace and the
resolver calls differ — but never order-*dependent*: the verdict is the same
whatever order the children are written in. A rule list is the first construct
in Qadi where moving a row changes the answer, and it is the property an operator
maintaining a rule table relies on most.

### What is not added

No new error, no new matcher, no service, nothing in `@qadi/react`, and **not the
full XACML catalogue**. `only-one-applicable` and the ordered/unordered variants
exist to close that standard under its own composition rules, and
[MOD-QD-026](../models/26-xacml.md) already declines them on the grounds this
library was built on: *parity with a standard is not a goal; expressiveness is.*
Three algorithms cover the demand behind every request in the matrix.

Nor is a `Rules` **decision** introduced. XACML's `NotApplicable` stays collapsed
into `Deny`, per that same document — under fail-closed defaults a policy that
did not apply is a policy that did not permit, and the distinction survives where
it belongs, in the trace.

## Consequences

**Positive**:

- The explicit deny lands: a rule saying "and if this matches, refuse", visible
  as its own row, addable without rewriting the rules around it. That is the
  recurring demand behind [MOD-QD-025](../models/25-rubac.md), and behind the
  deny rows [09 — ACL](../models/09-acl.md) and the inherited-grant exceptions
  [19 — Hierarchy](../models/19-hierarchy.md) each record as out of reach.
- The workaround it replaces was actively hazardous. Hoisting every deny rule
  into one negated guard clause inherits `not`'s inversion of the fail-closed
  default: `not` over a branch that failed closed returns **true**. A `Deny` rule
  denies because it applied, never because something under it was unavailable.
- `combining` is a required field on a **new** variant, so no serialized policy
  is invalidated by its being required.

**Negative**:

- The wire format moves in the direction that hurts: a decoder predating `Rules`
  **rejects** a policy containing one, and policies are re-parsed from storage,
  so a mixed-version fleet sees valid policies fail to decode. This is what files
  E3 under *Breaking*, and it holds for any spelling of the feature.
- Two ways to say some things. `rules([permitWhen(a), permitWhen(b)])` and
  `anyOf([a, b])` agree, and the second is better. Documented rather than
  prevented — a rule list carrying no `Deny` row is a rule list that did not need
  to be one.
- The exhaustive algorithms cost more than the equivalent `anyOf` and the API
  makes that easy to reach for. `FirstApplicable` is the default for that reason.

**Trade-off accepted**: an allowing `Rules` trace node carries a `reason` —
*which rule permitted* — where every other allowing node in the library carries
none. `Trace.reason` was documented as "why the node denied". A rule table's
first diagnostic question is *which row hit*, in both directions, and answering
it only for denials would leave the more common half of a firewall-shaped debug
session unanswerable. The field is now the sentence explaining a node's outcome.

**Trade-off accepted**: there is no `always()` policy, so the default-permit
catch-all row is written `permitWhen(allOf([]))`, which is obscure. A fifteenth
variant to spell "true" is not worth four coordinated edits
([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)), and the awkwardness
falls on the dangerous side: the default is deny, so the catch-all is needed only
to *widen*, and a widening row that is slightly hard to write is not a defect.

**Implemented**, with the evidence the
[Definitions of Done](../process/definitions-of-done.md) require:
[15 — Rule Tables](../behaviors/15-rules.md),
[INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden),
`@REQ-QD-015`.

Three notes from building it.

**The phase was framed on a premise this enabler did not meet.** Phase 5 exists
because "both change what existing constructs mean". `AllOf`, `AnyOf`, the
evaluator's existing branches and every serialized policy came through unchanged;
the only thing that moved was `Trace.reason`'s documented meaning. E3 is breaking
because a decoder predating `Rules` rejects a policy containing one, which is a
wire-format break rather than a semantic one, and the two deserve different
words. E7 is the enabler the original framing describes.

**`Rule` is the only untagged struct in the codec, and that is what made the
generator branch awkward rather than mechanical.**
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)'s four coordinated
edits assume a tagged member of the policy union. A rule is a *row*, not a
policy, so it has no `_tag` to discriminate on and its recursion into `PolicyRef`
happens one level below the union. The `FastCheck.letrec` branch therefore had to
generate rows rather than policies and lift them, and it landed in the same change
as the schema, which is the rule.

**The cost profile inverted, and the tests had to be built to notice.** Every
short-circuit test in the library before this asserted that *allowing* was
cheap. Under `DenyOverrides` it is the expensive answer. The first pass of the
exhaustive-path tests passed for the wrong reason — the rows meant to be
*skipped* were written with a condition that applied, so the walk stopped early
and the resolver count matched by coincidence. Distinguishing "cost a lookup and
applied" from "cost a lookup and did not" is what those tests are actually
about, and the fixtures now say so by name.
