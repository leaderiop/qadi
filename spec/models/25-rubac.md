# 25 — Rule-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-25                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Rule-based access control is an **ordered list of rules**. Each rule pairs a
condition with an *effect* — permit or deny — and the list is walked from the
top; the first rule whose condition matches decides, the rest are never
consulted, and a default at the bottom catches everything unmatched.

This is the firewall model: iptables, cloud security groups, router ACLs and
most network policy languages are exactly this. Two properties define it and
Qadi has neither — a rule carries an effect of its own, and the order of the list
is part of its meaning rather than an artefact of evaluation.

## Who asks for it

Teams whose authorization is inherited from, or modelled on, network policy —
API gateways, service meshes, tenant isolation, egress control — and anyone
porting a rule table out of a firewall, a XACML policy set, or a hand-rolled
`for (const rule of rules)` loop, where the rules are *data* maintained by
operators rather than a tree written by a programmer. The recurring demand
behind it is the **explicit deny**: a rule saying "and if this matches, refuse",
visible as its own row, addable without rewriting the rules around it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Breaking** |
| Priority | **P2** |
| Enablers required | E3 — combining algorithms |
| Breaking change | Yes |

The obstruction is structural, not a missing combinator. `AllOf` and `AnyOf` are
**unordered sets** of children whose allow/deny rule is hard-coded in
`evaluateAllOf` and `evaluateAnyOf`; `FieldStrategy` is their only knob and it
governs **field-set merging only**, never the outcome. No node in the ADT
carries an effect, so none can say "and if I match, deny"; `not` inverts a
subtree but composes as ordinary boolean negation, so it cannot express "deny
wins over the sibling that allowed".

## What Qadi can express today

The workable idiom is **negative conditions first**: collect every deny rule into
one disjunction, negate the whole thing, and require it alongside the permits.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever,
  allOf, anyOf, check, currentSubjectLayer, eq, hasAttribute,
  hasResourceAttribute, hasRole, labeled, literal, makeSubject, not, subjectId,
} from "@qadi/core";

// Rules 1 and 2 deny. No node carries an effect, so they are hoisted into a
// guard clause ahead of every permit rule and negated as a set.
const blocked = labeled("deny-rules", anyOf([
  hasAttribute("status", eq(literal("suspended"))),
  allOf([hasResourceAttribute("legalHold", eq(literal(true))), not(hasRole("legal"))]),
]));

// Rules 3 and 4 permit. Order is observable — `anyOf` defaults to `First`, so
// the owner branch short-circuits before the role branch runs.
const permitted = labeled("permit-rules", anyOf([
  hasResourceAttribute("ownerId", eq(subjectId())),
  hasRole("editor"),
]));

// Rule 5, the default, is the absence of a permit: `allOf` denies.
const canEdit = allOf([not(blocked), permitted]);

const subject = makeSubject({ id: "u-1", roles: ["editor"], attributes: { status: "active" } });
const resolvers = Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive);

const program = check(canEdit, {
  resource: { id: "doc-1", ownerId: "u-1", legalHold: false },
}).pipe(Effect.provide(currentSubjectLayer(subject)), Effect.provide(resolvers));
```

This works, and it degrades badly. **Every new deny rule must be threaded into
the guard clause**, not appended to a list; the guard grows a second conjunction
of exceptions the moment one deny should apply to only some permits; and the
rule table an operator wanted to edit is a tree only its author can change
safely. It is a workaround, and it inherits the hazard [MOD-QD-009](./09-acl.md)
records — negation **inverts the fail-closed default**, so `not` over a branch
that failed closed returns *true*.

### First-allowing is not first-matching

Ordering is not entirely absent. `anyOf` with `fieldStrategy: "First"` — the
default — walks its children in array order and returns at the first allowing
one, so the order the author wrote **is** observable, in the decision and in the
resolver calls made.

But that is first-*allowing*, and a rule list needs first-*matching*. Under
`anyOf`, a child that denies and a child that is irrelevant are the same event:
evaluation moves on. In a rule list they are opposites — a rule that matches and
carries a deny effect **stops the walk and refuses**, while a rule that does not
match is skipped. Boolean composition has one bit per child and so cannot
distinguish "did not apply" from "applied, and said no"; a rule list needs two,
*matched* and *what the match means*. That distinction is the whole of E3, and
combining algorithms, field merging and the wire format all follow from
admitting the second bit.

## Proposed API design

E3 needs a `Combining` literal union either way. The only question is where it
sits, and the two answers are not equally good.

```ts
type Combining = "FirstApplicable" | "DenyOverrides" | "PermitOverrides";
type RuleEffect = "Permit" | "Deny";

interface Rule {
  /** Evaluated for *match*, not outcome: allow means "this rule applies". */
  readonly condition: Policy;
  readonly effect: RuleEffect;
  readonly label?: string | undefined;
  readonly fields?: ReadonlyArray<string> | undefined;
}

// Rejected: `combining: Combining` bolted onto the existing AllOf and AnyOf.
// Preferred: a new variant carrying the ordered list and the algorithm.
// { readonly _tag: "Rules"
// ; readonly rules: ReadonlyArray<Rule>
// ; readonly combining: Combining
// ; readonly fieldStrategy: FieldStrategy }
```

**Why not the field.** `fieldStrategy` is required precisely because
[ADR-QD-006](../decisions/006-field-strategy-always-encoded.md) found the
optional field is the one that goes missing, so `combining` must be required
too — and a required field rejects every policy already serialized. It also
gives two constructs an effect vocabulary their names deny, and puts a knob on
the nodes whose short-circuit behaviour
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) pins by
call counting. The smaller diff, the larger change.

**Why the variant.** Existing semantics stay untouched and the round-trip
property is extended rather than perturbed. The comment on `condition` is
load-bearing: inside a rule a `Policy` answers *does this apply?* and `effect`
answers *and what then?*. No rule matching is a denial, per
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — there is no
"default permit" spelling, and a caller wanting one writes a final rule that
always matches.

[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) requires the variant
to land in **four places in one change**:

```ts
// 1. the type union member
export type Policy = /* … */ | { readonly _tag: "Rules"; /* … */ };

// 2. the tagged struct — RuleStruct reuses the shared PolicyRef for recursion,
//    so a rule condition is itself a full policy tree
const Rules = Schema.TaggedStruct("Rules", {
  rules: Schema.Array(RuleStruct),
  combining: Combining,
  fieldStrategy: FieldStrategy,
});

// 3. the union entry
export const Policy: Schema.Codec<Policy> = Schema.Union([/* … */, Rules]);

// 4. the constructor
export const rules: (
  rules: ReadonlyArray<Rule>,
  options?: { readonly combining?: Combining; readonly fieldStrategy?: FieldStrategy },
) => Policy;
```

A fifth edit sits outside `Policy.ts`: the `FastCheck.letrec` generator in
`packages/core/test/Policy.test.ts` must gain a `Rules` branch **in the same
change**. A variant absent from the generator is untested by the round-trip
property — the regression guard for the data-loss defect this library was
rewritten to fix.

## What it would cost

**Why it is breaking.** Even as a new variant, `Rules` changes the wire format in
the direction that hurts: a decoder predating it *rejects* a policy containing
one. Policies cross a trust boundary and are re-parsed from storage, so a
mixed-version fleet sees valid policies fail to decode — which holds whichever
node the field lands on, and is why the matrix files E3 under **Breaking**.

**INV-QD-005 — short-circuit preservation.** The real tension, and the answer
differs per algorithm:

| Combining | Stops when | Short-circuits |
| --------- | ---------- | -------------- |
| `FirstApplicable` | the first rule matches, either effect | **Yes** — order is the semantics |
| `DenyOverrides` | a `Deny` rule matches | Only on the deny path |
| `PermitOverrides` | a `Permit` rule matches | Only on the permit path |

`FirstApplicable` is *compatible* with
[ADR-QD-013](../decisions/013-short-circuit-default.md) — arguably it is
sequential short-circuiting made explicit rather than inferred from a boolean
operator. The overrides forfeit it in one direction: to return permit under
`DenyOverrides` you must evaluate **every** rule to know none denied, inverting
today's cost profile where allowing is the cheap outcome. The invariant must
therefore be restated as a property *of the combining algorithm*, or it weakens
silently the moment `Rules` ships.

**INV-QD-004 — the field lattice.** A `Deny` rule contributes no field set, for
the reason `Not` contributes none: knowing a rule refused says nothing about
which fields are safe. Under `FirstApplicable` exactly one rule decides, so
`fieldStrategy` is meaningful only under the exhaustive algorithms, where the
permitting rules' sets merge — and `First` is ill-defined there. `undefined` must
remain **top**, meaning all fields, in every case.

**Concurrent evaluation** is on the
[roadmap](../roadmap.md#concurrent-evaluation) and already recorded as blocked by
E3. The dependency runs this way round: `FirstApplicable` is inherently
sequential, its order being meaning rather than optimisation, while the two
overrides are order-independent and are precisely the algorithms concurrency
would help. Settling concurrency first would fix the answer prematurely.

## Verification

**Nothing verifies this model. It is unbuilt**, and this document asserts only
intent — no `BEH-QD`, `INV-QD` or `REQ-QD` identifier is allocated here. The
compiled example is the exception: it uses shipped API only and is type-checked
by CI, resting on `REQ-QD-003`, `REQ-QD-004`, `REQ-QD-006` and `REQ-QD-009`.

Building the model means, in one change: an ADR settling the combining set and
the short-circuit restatement; a behaviour in
[the policy ADT](../behaviors/03-policy-adt.md); the four edits above plus the
generator branch; per-algorithm call-counting tests, since "`FirstApplicable`
evaluated three rules and stopped" is the claim rather than a side effect; and a
scenario tagged with a newly allocated `REQ-QD` identifier. Order-dependence
needs its own test — that a *reordered* rule list decides differently — because
it is the one property no existing test could have caught.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [26 — XACML Parity](./26-xacml.md) · [09 — Access Control Lists](./09-acl.md) · [ADR-QD-013](../decisions/013-short-circuit-default.md)_
