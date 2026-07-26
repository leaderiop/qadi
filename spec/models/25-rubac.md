# 25 — Rule-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-25                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Shipped as E3; two forecasts corrected (CCR-QD-019)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
| Status | **Shipped** |
| Priority | **P2** |
| Enablers required | ~~E3 — combining algorithms~~ **shipped** |
| Breaking change | Yes — a decoder predating `Rules` rejects a policy containing one |

**Shipped: [ADR-QD-023](../decisions/023-combining-algorithms.md),
[15 — Rule Tables](../behaviors/15-rules.md),
[INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden),
`@REQ-QD-015`.**

The obstruction this document recorded was structural, not a missing combinator.
`AllOf` and `AnyOf` are **unordered sets** of children whose allow/deny rule is
hard-coded in `evaluateAllOf` and `evaluateAnyOf`; `FieldStrategy` is their only
knob and it governs **field-set merging only**, never the outcome. No node in the
ADT carried an effect, so none could say "and if I match, deny"; `not` inverts a
subtree but composes as ordinary boolean negation, so it cannot express "deny
wins over the sibling that allowed".

| Addition | Where |
| -------- | ----- |
| `Rules` | the policy union, eleventh variant of fourteen |
| `Rule`, `RuleEffect`, `Combining` | `Policy.ts` |
| `rules`, `permitWhen`, `denyWhen` | the constructors |
| `evaluateRules` | `Evaluate.ts`, beside `evaluateAllOf` and `evaluateAnyOf` |
| a `reason` on an *allowing* trace node | `Decision.ts` — the first in the library |

## The shape it took

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive,
  RelationshipResolverNever, allOf, check, currentSubjectLayer, denyWhen, eq,
  hasAttribute, hasResourceAttribute, hasRole, literal, makeSubject, permitWhen,
  rules, subjectId,
} from "@qadi/core";

// The rule table an operator maintains, as rows. Each refusal is its own row,
// addable without touching the rest — which is the whole demand.
const canEdit = rules([
  denyWhen(hasAttribute("status", eq(literal("suspended")))),
  denyWhen(allOf([hasResourceAttribute("legalHold", eq(literal(true))), hasRole("legal")])),
  permitWhen(hasResourceAttribute("ownerId", eq(subjectId()))),
  permitWhen(hasRole("editor")),
  // Rule 5, the default, is the absence of a permit: no row applying denies.
]);

const subject = makeSubject({ id: "u-1", roles: ["editor"], attributes: { status: "active" } });
const resolvers = Layer.mergeAll(
  AttributeResolverNone, RelationshipResolverNever, DecisionHistoryUnknown, EvaluationIdLive,
);

const program = check(canEdit, {
  resource: { id: "doc-1", ownerId: "u-1", legalHold: false },
}).pipe(Effect.provide(currentSubjectLayer(subject)), Effect.provide(resolvers));
```

Note what the second deny row no longer needs: under the old idiom it was
`allOf([legalHold, not(hasRole("legal"))])`, because the whole guard was about to
be negated. A `Deny` row states the refusal directly, so the negation — and the
hazard below that came with it — is gone.

## What Qadi could express before

The workable idiom was **negative conditions first**: collect every deny rule into
one disjunction, negate the whole thing, and require it alongside the permits.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive,
  RelationshipResolverNever,
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
const resolvers = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
);

const program = check(canEdit, {
  resource: { id: "doc-1", ownerId: "u-1", legalHold: false },
}).pipe(Effect.provide(currentSubjectLayer(subject)), Effect.provide(resolvers));
```

This worked, and it degraded badly. **Every new deny rule had to be threaded into
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

## The design, and where it landed differently

E3 needed a `Combining` literal union either way. The only question was where it
sat, and the two answers were not equally good. This document preferred the
variant; [ADR-QD-023](../decisions/023-combining-algorithms.md) agreed and kept
the argument verbatim.

```ts
type Combining = "FirstApplicable" | "DenyOverrides" | "PermitOverrides";
type RuleEffect = "Permit" | "Deny";

interface Rule {
  /** Evaluated for *match*, not outcome: allow means "this rule applies". */
  readonly condition: Policy;
  readonly effect: RuleEffect;
  readonly label?: string | undefined;      // ← not shipped
  readonly fields?: ReadonlyArray<string> | undefined;  // ← not shipped
}

// Rejected: `combining: Combining` bolted onto the existing AllOf and AnyOf.
// Preferred: a new variant carrying the ordered list and the algorithm.
// { readonly _tag: "Rules"
// ; readonly rules: ReadonlyArray<Rule>
// ; readonly combining: Combining
// ; readonly fieldStrategy: FieldStrategy }   // ← not shipped
```

**Three of those fields did not ship, and the reason is one decision.** Exactly
one rule decides a table under every algorithm, so there is nothing to merge and
`fieldStrategy` has no work to do; the deciding rule's condition supplies the
field set and the obligations, which is
[ADR-QD-019](../decisions/019-obligations.md)'s existing sentence rather than a
new rule. `fields` and `label` on the row went with it: a condition is an
ordinary policy and already carries both, through `fields` on its leaves and
through `labeled`. `Rule` shipped with two members, `condition` and `effect` —
the second bit, and nothing else.

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
answers *and what then?*. No rule matching is a denial — there is no
"default permit" spelling, and a caller wanting one writes a final rule that
always matches, which is spelled `permitWhen(allOf([]))`.

*One correction.* This paragraph cited
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), and that is the
same misrouting [MOD-QD-026](./26-xacml.md) made about the absent action. That
invariant governs what an *unwired resolver* answers. A table in which no row
applied has no missing service in it; it simply granted nothing, exactly as
`anyOf([])` does. The rule is default-deny, not fail-closed, and the two are
different mechanisms that happen to agree here.

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

## What it cost

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

*This document called it correctly and it is the sharpest thing in here.* The
restatement shipped as
[INV-QD-017](../invariants.md#inv-qd-017-a-rule-list-stops-at-the-first-rule-that-cannot-be-overridden),
one sentence covering all three rows of that table: **a rule list stops at the
first rule that cannot be overridden.** INV-QD-005 defers to it rather than
enumerating a third node, because an invariant true by listing has stopped
constraining anything.

**INV-QD-004 — the field lattice.** A `Deny` rule contributes no field set, for
the reason `Not` contributes none: knowing a rule refused says nothing about
which fields are safe. Under `FirstApplicable` exactly one rule decides, so
`fieldStrategy` is meaningful only under the exhaustive algorithms, where the
permitting rules' sets merge — and `First` is ill-defined there. `undefined` must
remain **top**, meaning all fields, in every case.

*Half right, and noticing which half is what removed the field.* The `Deny`
sentence shipped unchanged, and it carries further than written here: a `Deny`
row's condition may well have **allowed**, so this is the first place in the
library where an allowing subtree contributes nothing to the decision above it.
The observation that `fieldStrategy` is meaningless under `FirstApplicable` and
ill-defined for `First` elsewhere was the answer rather than a caveat — a knob
that is meaningless in one case and ill-defined in another is a knob that should
not exist. Exactly one rule decides under **every** algorithm, and there is
nothing to merge.

**Concurrent evaluation** was on the
[roadmap](../roadmap.md#concurrent-evaluation) and recorded as blocked by E3. The
dependency ran this way round: `FirstApplicable` is inherently sequential, its
order being meaning rather than optimisation, while the two overrides are
order-independent and are precisely the algorithms concurrency would help.
Settling concurrency first would have fixed the answer prematurely.

*Unblocked, and still unbuilt.* The algorithm set is now settled, so the roadmap
entry can be designed. One thing that surfaced in building it constrains the
design: the overrides are order-independent in the **verdict** but not in the
**deciding rule**, which is the first applying row of the winning effect and
supplies the field set and obligations. A concurrent implementation must still
resolve the decider by index after collecting every result, or two runs of the
same table will owe different duties.

## Verification

**This model is built.** `packages/core/test/Rules.test.ts` covers it, the
round-trip property in `packages/core/test/Policy.test.ts` gained its `Rules`
branch in the same change that added the variant
([INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)), and eleven
scenarios are tagged `@REQ-QD-015`.

The plan this document set out was followed to the letter, and both of the tests
it insisted on earned their place. Per-algorithm call counting is what proves
"`FirstApplicable` evaluated three rules and stopped" as a claim rather than a
side effect — and the trace's child count asserts the same thing by an
independent route, so a mutant would have to defeat both. Order-dependence has
its own test, and it remains the one property no existing test could have caught:
`allOf` and `anyOf` are order-*observable* but never order-*dependent*, so a rule
list is the first construct in Qadi where moving a row changes the answer.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [26 — XACML Parity](./26-xacml.md) · [09 — Access Control Lists](./09-acl.md) · [ADR-QD-013](../decisions/013-short-circuit-default.md)_
