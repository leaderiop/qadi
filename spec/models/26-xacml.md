# 26 — XACML Parity

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-26                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

XACML — the OASIS eXtensible Access Control Markup Language — is two things
wearing one name. It is a **policy language**: rules carrying a target and a
condition over subject, resource, action and environment attributes, combined by
named algorithms. And it is an **architecture**: an enforcement point (PEP) asks
a decision point (PDP), which pulls attributes from information points (PIP) and
evaluates policies published by an administration point (PAP).

*Parity* here means expressing what a XACML policy expresses. It does not mean
implementing the XML dialect, which nobody should want — the JSON profile that
displaced it in practice is the same shape with fewer angle brackets. What is
interesting about XACML is how it decomposes an authorisation question, not how
it serialises one.

## Who asks for it

Organisations with an existing XACML deployment they would rather not rewrite:
enterprise IAM suites, and the government, defence and healthcare procurement
that names the standard in a requirements document. A larger and quieter group
asks without saying so — anyone wanting attribute rules that also *require
something of the caller* (log this, mask that, re-authenticate first) is asking
for obligations, the one part of XACML with no substitute in this matrix.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Breaking** |
| Priority | **P2** |
| Enablers required | ~~**E1** (action dimension)~~ and ~~**E2** (obligations)~~ **shipped**; **E3** (combining algorithms) outstanding |
| Breaking change | Yes — E3 changes what `AllOf` and `AnyOf` mean |

E1 and E2 were additive; only E3 makes this row breaking. A useful subset of
parity therefore lands without a breaking change, and the recommendation below
turns on exactly that split. E1 has since shipped
([ADR-QD-018](../decisions/018-action-dimension.md)) — on its own merits, as the
recommendation below argues it should be, not for parity.

## What Qadi can express today

More than the standard's reputation suggests: the attribute machinery, the
condition language and the decision point are shipped. What is missing is the
verb, the obligation and the combinator.

| XACML concept | Qadi | Status |
| ------------- | ---- | ------ |
| Subject and resource attributes | `hasAttribute`, `hasResourceAttribute` | **Shipped** ([MOD-QD-002](./02-abac.md)) |
| Rule `<Condition>` | The `Matcher` algebra | **Shipped** |
| Rule `<Target>` | Approximated by a leading conjunct in `allOf` | **Approximated** |
| Action | `hasAction`, `action()` | **Shipped** — E1 |
| Environment attributes | Resolved attributes ([MOD-QD-012](./12-context-aware.md)) | **Partial** |
| Obligations and advice | `obliged`, `Allow.obligations`, `advisory` | **Shipped** — E2 |
| Combining algorithms | `allOf` / `anyOf`, fixed and unordered | **Missing** — E3 |
| Decision point (PDP) | The evaluator — `decide`, `check`, `enforce` | **Shipped** |
| Information point (PIP) | `AttributeResolver`, `RelationshipResolver` | **Shipped** |
| Administration and enforcement points | The caller's; Qadi neither administers nor enforces | Out of scope ([URS](../urs.md)) |
| `Indeterminate` | A typed error in the error channel | **Stronger** |

Target versus condition is an optimisation, not a semantic: XACML separates them
so a PDP can index policies by target and skip subtrees wholesale. Qadi has one
tree evaluated left to right, so a target is the first conjunct of an `allOf`,
and short-circuiting ([INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation))
means a non-matching one costs nothing further. What is lost is indexing
*across* policies, which matters at PDP scale, not library scale.

Indeterminate is where Qadi is straightforwardly better. XACML makes it a fourth
value in the same channel as Permit and Deny, so a PIP timeout and a considered
refusal reach the PEP by the same path. Here a failed lookup is an
`AttributeResolveError` or `RelationshipResolveError` in the error channel: it
cannot be pattern-matched as a `Deny`, nor silently coerced into one — which is
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial).

The example below is a XACML rule with nothing left over — target, condition,
subject attributes, resource attributes — against the shipped API.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever,
  allOf, anyOf, currentSubjectLayer, decide, eq, gte, hasAttribute,
  hasResourceAttribute, hasRole, inArray, isAllowed, labeled, makeSubject,
  subjectId,
} from "@qadi/core";

// XACML <Target>: the rule applies to cardiology records. Qadi has no target
// slot, so it becomes the first conjunct — evaluated, not indexed.
const target = hasResourceAttribute("unit", inArray(["cardiology", "cardiac-icu"]));

// XACML <Condition>: the attending clinician, or a senior enough supervisor.
// Labels survive into the trace, so a denial names the branch that failed.
const condition = anyOf([
  labeled("attending", hasResourceAttribute("attendingId", eq(subjectId()))),
  labeled("supervisor", allOf([hasRole("supervisor"), hasAttribute("seniority", gte(3))])),
]);

const program = decide(labeled("cardiology-access", allOf([target, condition])), {
  resource: { id: "rec-88", unit: "cardiology", attendingId: "u-7" },
}).pipe(
  Effect.map(isAllowed),
  Effect.provide(
    currentSubjectLayer(
      makeSubject({ id: "u-9", roles: ["supervisor"], attributes: { seniority: 4 } }),
    ),
  ),
  Effect.provide(
    Layer.mergeAll(AttributeResolverNone, RelationshipResolverNever, EvaluationIdLive),
  ),
);
```

That rule can now say which operation is attempted (E1) and attach "and write an
access record" to the allow (E2). Both have shipped. What remains is only the
combining algorithm.

## Proposed API design

Unshipped, except where marked. These fences are signatures, not examples.

### E1 — the action dimension — **shipped**

```ts
interface EvaluateOptions {
  readonly resource?: Resource;
  readonly action?: string;
  readonly maxDepth?: number;
}

interface MatcherContext {
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Resource | undefined;
  readonly action: string | undefined;
}

/** A value reference, so an action compares like any other value. */
const action: () => ValueRef;
```

The shapes landed as sketched. `MatcherContext` is built per evaluation and never
serialised, so widening it cost no wire compatibility; the `ActionRef` variant of
`ValueRef` did touch a codec. The action stays disjoint from permission tokens,
whose `resource:action` keys already encode a verb
([ADR-QD-007](../decisions/007-permission-token-representation.md)).

**One thing this document got wrong.** It proposed that an absent action *deny*
any policy inspecting one. [ADR-QD-018](../decisions/018-action-dimension.md)
decided the opposite: it **fails**, with `MissingAction`. The sketch reached for
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), which governs
information a resolver could not supply; a missing action is instead input the
caller never provided, which is
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) — the rule an
absent resource already followed. Denying would have sent an engineer to audit
permissions over a forgotten argument. The distinction is now
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one).

### E2 — obligations on the decision

The substantive half of parity, and the half with no workaround. `Allow` and
`Deny` are `Data.TaggedClass` values with **no `Schema`**, unlike `Policy` and
`Matcher`, so adding a field is not a codec change, cannot invalidate a
serialised policy, and cannot reproduce the round-trip defect this library was
rewritten to fix. The types are the easy part:

```ts
interface Obligation {
  readonly id: string;
  readonly attributes: Readonly<Record<string, unknown>>;
  /** XACML `advice` is an obligation the PEP may ignore. */
  readonly advisory: boolean;
}

/** An obligation is carried by a node, not by a new leaf type. */
const obliged: (obligation: Obligation, policy: Policy) => Policy;

class Allow extends Data.TaggedClass("Allow")<{
  // …existing fields…
  readonly obligations: ReadonlyArray<Obligation>;
}> {}
```

The hard question is **composition**, in three parts:

- **`AllOf`** — easy. Every child allowed, so every child's obligations apply
  and the result is their concatenation, modulo a rule for two obligations
  sharing an `id` with different attributes: a merge policy of exactly the kind
  `FieldStrategy` already encodes for fields.
- **`AnyOf`** — harder, because of short-circuiting. Under the default `First`
  strategy evaluation stops at the first allowing child, so the obligation set
  depends on order. Defensible — that branch is what justified the decision —
  but it must be *stated*, because collecting from every allowing branch instead
  forces exhaustive evaluation and would quietly repeal
  [INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) for any
  tree containing an obligation.
- **`Not`** — no obvious answer at all. Negating "allow, and log this" yields a
  denial; an obligation on a decision that did not happen is meaningless, yet
  dropping it silently loses something a reviewer may rely on. Three candidates
  exist — drop, propagate as advisory, or reject `obliged` inside `Not` at
  construction — and each reads differently in the trace. **That belongs in an
  ADR**, decided before any code.

**Settled by [ADR-QD-019](../decisions/019-obligations.md), and none of the three
candidates won.** Obligations are a condition on permission, so a decision
carries those contributed by the allow it returned; `Not` is handed an obligation
set in neither of its cases and needs no rule. The objection that dropping is
silent is answered by the trace, which records the node the obligation arose on
whether or not a negation discarded it.

The ADR also contradicts the `AllOf` bullet above. **A merge policy of the kind
`FieldStrategy` encodes is exactly the wrong shape**: field sets intersect
because narrowing disclosure is safe, whereas narrowing a duty lets a caller
discharge less than an allowing branch required. Obligations union, always, and
there is no strategy to configure.

`mergeFields` in `Evaluate.ts` is the only place sibling results combine today,
and it is the shape the obligation analogue should take: one function called
from `evaluateAllOf` and `evaluateAnyOf`, strategy named rather than implied.
One constraint bounds the whole design — an obligation is **data returned with a
decision**, never a callback the evaluator invokes, because the moment
obligations execute, evaluation acquires side effects and
[INV-QD-009](../invariants.md#inv-qd-009-guarded-effects-do-not-run-when-denied)
is gone. Reporting them belongs on the existing span
([ADR-QD-009](../decisions/009-observability-via-effect.md)), not a new port.

### E3 — combining algorithms

XACML defines `deny-overrides`, `permit-overrides`, `first-applicable`,
`only-one-applicable` and their ordered variants; Qadi has `allOf` and `anyOf`,
unordered, with the allow/deny rule hard-coded in the evaluator. This document
does **not** design that mechanism. Ordered first-match is the same problem in a
more common vocabulary, and it is designed in
[25 — Rule-Based Access Control](./25-rubac.md); parity should consume whatever
lands there rather than propose a second, XACML-flavoured spelling of it.

## What it would cost

| Enabler | Nature | Work |
| ------- | ------ | ---- |
| ~~**E1**~~ **shipped** | Additive | `action` on `EvaluateOptions` and `MatcherContext`; an `ActionRef` across schema, type, constructor and generator — plus a `referencesAction` pre-check this table did not anticipate |
| ~~**E2**~~ **shipped** | Additive to `Decision`, codec change for `Policy` | Landed as scoped, plus one thing this table did not anticipate: the refusal belongs to `assert` and `filter` too, not only `enforce`. [ADR-QD-019](../decisions/019-obligations.md) |
| **E3** | Breaking | Deferred to [MOD-QD-025](./25-rubac.md) |

Invariants at risk: [INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness)
(the action must not alias permission segments),
[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) (a new `ValueRef`
lands in four places at once),
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) (obligation
collection must not force exhaustive evaluation) and
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)
(an absent action fails — see the correction above).

### The recommendation: do not pursue full parity

E1 was worth building because a policy that cannot see the verb cannot express
read-down or write-up, which blocked a whole family of models; it has shipped on
that argument alone. E2 was worth
building because obligations have no substitute anywhere in this matrix, and has
also shipped. E3 is worth building because ordered rule lists are how people
write rules, and is the only one of the three still open.

Each is worth building **on its own merits** — none because XACML has it. Three
things should be declined outright: the XML dialect and its request/response
profile, a translation layer anyone can write over `decide` without the library
growing a parser; the four-value decision algebra, below; and the full combining
catalogue, since two algorithms cover the demand and the rest exist to close the
standard under its own composition rules. The reason is plain — **parity with a
standard is not a goal; expressiveness is.** A feature justified by "the
standard has it" is a feature with no user behind it, and this library exists
because its predecessor shipped compliance primitives that were never assembled
([ADR-QD-016](../decisions/016-gxp-out-of-scope.md)).

### On the four values

XACML returns Permit, Deny, NotApplicable or Indeterminate; Qadi returns
`Allow | Deny` with failures in the error channel. Both extra values collapse,
and to something better rather than merely different — which is why no
recommended subset of parity adopts them.

**NotApplicable is a denial.** Under fail-closed defaults
([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)) a policy that
does not apply is a policy that did not permit, and every safe enforcement point
maps it to Deny anyway. Keeping it as a return value preserves a distinction the
PEP is obliged to erase, while adding a third case every caller must handle in
which the unsafe handling is also the shortest to write. Qadi keeps the
distinction in the trace, which records whether the policy denied or never
matched without letting that difference change the decision.

**Indeterminate as a return value is the confusion itself.** It places "the
attribute store timed out" in the same channel as "this subject may not read
this record", and every mishandling of that fails open or closed by accident.
The error channel makes it unmistakable: an `AttributeResolveError` cannot be
read as a decision, and a caller who ignores it gets a propagated failure rather
than a denial. Adopting the four-value algebra would mean weakening
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) to match a table
in a specification. This document does not propose it.

## Verification

Nothing here is built. This document claims nothing about the current library
beyond the example above, which uses only shipped API and is type-checked in CI.

Parity in the recommended sense would need three ADRs — the action dimension,
obligation composition under `Not`, and whatever [MOD-QD-025](./25-rubac.md)
settles for combining — plus, per enabler, a behaviour document, an invariant
and a scenario tagged with a newly allocated `REQ-QD` identifier. E1 did exactly
that: [ADR-QD-018](../decisions/018-action-dimension.md),
[10 — The Action Dimension](../behaviors/10-actions.md),
[INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one)
and `@REQ-QD-010`, with its cases added to the FastCheck generator in
`packages/core/test/Policy.test.ts` in the same change that added them to the
schema. E2 follows the same path and can now use the span-emission collector in
`Evaluate.test.ts`: obligations are reported through the span, so asserting them
means being able to read one. Until then the honest status is that the attribute
and action halves of XACML are shipped and
tested, and the rest is a plan.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [25 — Rule-Based Access Control](./25-rubac.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [ADR-QD-009](../decisions/009-observability-via-effect.md)_
