# 27 — Bell–LaPadula

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-27                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.1 (2026-07-26): Status corrected to Shipped, citing `@REQ-QD-013` as borrowed; the prescribed order-law property tests built (INV-QD-019, BEH-QD-102); the shipped tree promoted to a compiled example; the INV-QD-003 "one that matters" risk withdrawn; three prior revisions absorbed without a bump (CCR-QD-012, CCR-QD-016, CCR-QD-017) now recorded (CCR-QD-024)<br>1.0 (2026-07-26): Initial release (CCR-QD-008) |

---

## What it is

Bell–LaPadula is the confidentiality model. Subjects carry a clearance, objects a
classification, both drawn from one lattice, and two rules govern every access:

- **No read up** — the *simple security property*. A subject may read an object
  only if its clearance **dominates** the object's label.
- **No write down** — the **★-property**. A subject may write to an object only
  if the object's label **dominates** its clearance.

The ★-property is the counter-intuitive one, and the whole point. It does not
guard the object against a careless writer; it stops a cleared subject — or a
Trojan horse holding that subject's authority — copying secrets downward to where
a less cleared reader waits. Remove it and the simple security property is worth
nothing: anything a subject may read, it may then republish at `public`.

## Who asks for it

Almost nobody. Bell–LaPadula is the most cited access control model in the
literature and among the least requested in practice; the systems that genuinely
run it are military and intelligence ones, where the lattice is mandated
externally and the enforcement point is the operating system or the database
rather than an application library. The [matrix](./00-adoption-matrix.md) already
makes this point — priority follows demand and cost, not academic prominence —
and this is its clearest instance: the model every textbook opens with sits at
P3, behind sixteen recipes costing nothing but a resolver.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P3** |
| Enablers required | ~~**E1, E4**~~ **shipped**; none outstanding |
| Breaking change | No |

**Shipped: [ADR-QD-018](../decisions/018-action-dimension.md),
[ADR-QD-021](../decisions/021-label-lattice.md),
[13 — The Label Lattice](../behaviors/13-labels.md),
[INV-QD-015](../invariants.md#inv-qd-015-incomparable-labels-deny-in-both-directions),
[INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order),
`@REQ-QD-013`, `packages/core/test/Evaluate.test.ts`.**

The tag is **borrowed and not allocated**, deliberately.
`features/features/labels/labels.feature` is described as *"Bell-LaPadula as one
stored policy: no read up, no write down"* — it is this model's acceptance suite
under a name given to the enabler, and allocating a second tag over the same nine
scenarios would buy a row in the traceability matrix and no evidence.
[MOD-QD-028](./28-biba.md) set the precedent in the other direction: it needed
its own tag because nothing existed for the inverted reading.

## What Qadi could express before E4

> **Historical.** The section below is the pre-E4 workaround, kept because the
> enumeration it describes is what callers on the old shape have deployed and the
> hazard in its rung ordering is real. It is **not** the model — see
> [The shape it took](#the-shape-it-took) — and nothing below this line should be
> copied into new code.

One special case, and it should be labelled as such rather than as the model: a
**totally ordered, compartment-free** scheme, with the verb chosen by the caller
selecting which of two policies to evaluate. `gte` and `lt` take a plain number,
never a value reference, so the subject's clearance could not be compared against
the resource's level; both rules are therefore enumerated as rungs, and the
enumeration is what a reviewer reads.

*Corrected in CCR-QD-024.* The premise about `gte` and `lt` still holds — they
take constants to this day. The conclusion does not: `dominates` takes a
`ValueRef` (ADR-QD-021), so for **labels** the two live values do compare, and
the general rule is one policy rather than a transcribed ladder.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, DecisionHistoryUnknown, EvaluationIdLive,
  RelationshipResolverNever,
  allOf, anyOf, check, currentSubjectLayer, gte, hasAttribute,
  hasResourceAttribute, inArray, lt, makeSubject,
  type Matcher, type Policy,
} from "@qadi/core";

// public(0) < internal(1) < secret(2). A total order, no compartments.
const cleared = (m: Matcher): Policy => hasAttribute("clearance", m);
const at = (...labels: ReadonlyArray<string>): Policy =>
  hasResourceAttribute("classification", inArray(labels));

// No read up. Permitted label sets are nested downward as clearance rises, so
// descending rungs under `anyOf`'s default `First` strategy are correct here.
const mayRead = anyOf([
  allOf([cleared(gte(2)), at("public", "internal", "secret")]),
  allOf([cleared(gte(1)), at("public", "internal")]),
  at("public"),
]);

// No write down. The permitted sets *shrink* as clearance rises, so the rungs
// are not nested — descending order would let a `secret` subject fall through
// to the `internal` rung — and each band must be closed at both ends.
const mayWrite = anyOf([
  allOf([cleared(lt(1)), at("public", "internal", "secret")]),
  allOf([cleared(gte(1)), cleared(lt(2)), at("internal", "secret")]),
  allOf([cleared(gte(2)), at("secret")]),
]);

// The verb is the caller's choice of policy, not an input to evaluation. A
// clearance-2 subject reads the `internal` memo and may not write to it.
const memo = { id: "memo-1", classification: "internal" };

const program = Effect.all([
  check(mayRead, { resource: memo }),
  check(mayWrite, { resource: memo }),
]).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(makeSubject({ id: "u-7", attributes: { clearance: 2 } })),
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

A useful recipe and a poor model. Two policies the caller must pair with the
correct verb is a convention, not an enforced rule: nothing stopped a handler
calling `mayRead` on a write path, and Qadi could not detect it.

*Corrected in CCR-QD-024.* It can now: `hasAction` makes the verb an input to
evaluation rather than a convention around it (ADR-QD-018), so the two policies
became two arms of one, and a handler cannot pick the wrong arm because it does
not pick.

## The shape it took

> **Superseded by [ADR-QD-021](../decisions/021-label-lattice.md).** E4 shipped,
> and in two respects it is *cheaper* than sketched below. `compartments` is an
> array rather than a `ReadonlySet`, and there is **no `SecurityLabel` codec at
> all** — the `Dominates` matcher carries a `ValueRef` and no label, so both
> operands are runtime data and the set-ordering hazard described below never
> arises. The comparison is four-valued (`Equal` is named separately) and `join`
> and `meet` were declined as out of scope. The sketch is left as written.

### Why both enablers, and what each supplies

**E4 — the label lattice** supplies dominance over `(level, compartments)`.
**E1 — the action dimension** supplies the read/write asymmetry. Neither alone
suffices, and this is the clearest case in the matrix of why: with **E4 and no
E1** the two rules compare the same pair of labels in opposite directions, so
knowing that `a` dominates `b` says nothing until you know which of read or write
was attempted; with **E1 and no E4** the verb is known, but labels can only be
compared as scalars — the wrong answer the moment compartments exist.

Both cases are closed: E1 shipped in
[ADR-QD-018](../decisions/018-action-dimension.md) and E4 in
[ADR-QD-021](../decisions/021-label-lattice.md). The argument above is why they
had to ship as a pair, and it survived the build unchanged.

```ts
export interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlySet<string>;
}

/** `a` dominates `b`: at least as high, and at least as broad. */
export const dominates = (a: SecurityLabel, b: SecurityLabel): boolean =>
  a.level >= b.level && [...b.compartments].every((c) => a.compartments.has(c));
```

*As shipped:* `compartments` is a `ReadonlyArray<string>`, and the predicate is
named **`labelDominates`** — `dominates` is the *matcher constructor*, which takes
one `ValueRef` rather than two labels. ADR-QD-021 records the two names as "close
enough to confuse" and chose the split deliberately; the sketch above asserts the
name that lost, and [29](./29-mls.md) built a claim on it that the ADR overruled.

### Why compartments break scalar comparison

`(Secret, {CRYPTO})` and `(Secret, {BIO})` are **incomparable**: neither
dominates the other, so neither may read the other. A total order has no
incomparable pairs, so `gte` and `lt` over a numeric level cannot represent that
relation — read as scalars, both labels are `2` and each reads the other. This is
not an approximation of dominance. It is a different relation returning a
different answer, and it returns *allow* exactly where dominance returns *deny*.
Shipping it under the name Bell–LaPadula would be a security defect, not a
simplification. That is the most important point in this document, and the reason
the compiled example above is confined to the compartment-free case.

### The matcher, and the action

One matcher variant covers both rules, because the two rules are one comparison
with the operands exchanged. The action rides on the evaluation options.

```ts
// Matcher: the matched value dominates the referenced value.
| { readonly _tag: "Dominates"; readonly ref: ValueRef }

hasAttribute("clearance", dominates(resource("label")));        // no read up
hasResourceAttribute("label", dominates(subject("clearance"))); // no write down

// Shipped, as sketched:
export interface EvaluateOptions {
  readonly resource?: Resource;
  readonly maxDepth?: number;
  readonly action?: string;
}

export interface MatcherContext {
  readonly subject: Readonly<Record<string, unknown>>;
  readonly subjectId: string;
  readonly resource: Readonly<Record<string, unknown>> | undefined;
  readonly action: string | undefined;
}
```

With both enablers the model **became** one policy rather than two, and the verb
stopped being a convention the caller may forget. Per
[INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) that action
input must not be derived from or compared against the action segment of a
permission token — two spellings of one word that must stay apart.

This is the model, entire, and it is byte-for-byte the tree
`packages/core/test/Evaluate.test.ts` evaluates:

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  check,
  currentSubjectLayer,
  dominates,
  hasAction,
  hasAttribute,
  hasResourceAttribute,
  makeSubject,
  resource,
  subject,
  type SecurityLabel,
} from "@qadi/core";

const blp = anyOf([
  // No read up: the reader must dominate what it reads.
  allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
  // No write down: what is written must dominate the writer.
  allOf([
    hasAction("write"),
    hasResourceAttribute("label", dominates(subject("clearance"))),
  ]),
]);

// A clearance and a classification, as they arrive from JSON. Neither dominates
// the other — incomparable compartments — so both the read and the write refuse.
// Compared as scalars both are `2`, and each would reach the other.
const clearance: SecurityLabel = { level: 2, compartments: ["CRYPTO"] };
const classification: SecurityLabel = { level: 2, compartments: ["BIO"] };

const program = check(blp, {
  action: "read",
  resource: { id: "doc-1", label: classification },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(makeSubject({ id: "u-7", attributes: { clearance } })),
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
    ),
  ),
);
```

### The four coordinated edits

Every new `Matcher` or `Policy` variant lands in four places **in one change**,
which is what [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) exists
to enforce: the member of the hand-written type union; the `Schema.TaggedStruct`
defining its wire shape; its entry in the `Schema.Union([...])`; and the
constructor function. A fifth follows for free — `evaluateMatcher` switches
exhaustively, so a variant added to the type with no evaluation arm fails to
compile. And [matrix §6.1](./00-adoption-matrix.md) applies without exception:
the `FastCheck.letrec` generator behind the round-trip property test must gain
the variant in the same change, or the new node is untested by the one property
standing between this library and the defect that motivated the rewrite.

*Held exactly, and cost less than four.* `Dominates` landed in all four places in
one change and the generator gained it in the same commit. But `SecurityLabel`
needed none of them — it is a hand-written interface, never a codec, because a
label never enters a policy tree. The rule is about **variants**, not about every
type a variant mentions, and this section did not draw that line.

## What it cost

Nothing further: E1 and E4 have both shipped. What follows is the cost as
estimated, kept for the record — the design question it names was settled by
[ADR-QD-021](../decisions/021-label-lattice.md), and the row below it about a
`ReadonlySet` codec turned out not to apply, because no label is ever encoded.

| Invariant | Risk |
| --------- | ---- |
| ~~[INV-QD-003](../invariants.md#inv-qd-003-codectype-identity)~~ | ~~**The one that matters.** `Dominates` is a new codec variant, and `SecurityLabel` carries a `ReadonlySet`~~ — **withdrawn.** `Dominates` cost the same as `Eq`, and `SecurityLabel` is a hand-written interface with no codec at all, so the risk this row called the largest did not exist |
| [INV-QD-011](../invariants.md#inv-qd-011-a-policy-that-reads-the-action-cannot-be-evaluated-without-one) | Settled: an absent `action` **fails**; it neither denies nor matches every branch |
| [INV-QD-008](../invariants.md#inv-qd-008-evaluation-is-reproducible-given-the-same-history) | Unaffected — dominance is pure, and a lattice is data, not state |

A `ReadonlySet` is not directly serializable, so the wire form has to be an
array — and that is not a formality. Encode and decode must compose to an exact
identity, `deepStrictEqual` over arrays is order-sensitive, and a set has none,
so the codec needs a canonical ordering on encode and must tolerate any ordering
on decode. Two encodings of one label that compare unequal is precisely the class
of defect schema-derived types were adopted to prevent. Whether the lattice is
declared as data handed to the evaluator or left implicit in the labels
themselves is the other open question, and belongs in an ADR.

*Resolved in ADR-QD-021, and this paragraph is the reason it went the way it
did.* The hazard is real, and the ADR quotes the sentence above when explaining
why it chose the array: the way to make a canonical set encoding safe is to need
no set encoding, so `compartments` is an array and **no label is ever encoded** —
`Dominates` carries a `ValueRef`, and both operands arrive as runtime data. The
second question is settled too: the lattice is declared **nowhere**, and
dominance is computed structurally from `(level, compartments)`
([BEH-QD-097](../behaviors/13-labels.md)). The ADR this paragraph asked for is
ADR-QD-021.

## Tranquillity

Bell–LaPadula assumes labels do not change during an access — the *tranquillity
principle*. Qadi satisfies the strong form by construction: a decision is
point-in-time, it reads the subject and resource it was handed, and it returns
before anything can be relabelled. That is an accident of the architecture rather
than a design choice, and worth recording as such so it is not mistaken for a
guarantee that survives change. Anything approaching UCON's continuous
enforcement — a decision that stays live for the duration of an access and
re-evaluates as attributes move — would lose it, and would have to restate the
assumption explicitly rather than inherit it. Callers who cache decisions have
already given it up.

## Verification

This model is verified.

| Claim | Evidence |
| ----- | -------- |
| Reads down, refuses to read up | `@REQ-QD-013`, `Evaluate.test.ts` |
| Writes up, refuses to write down | `@REQ-QD-013`, `Evaluate.test.ts` |
| Incomparable compartments refuse a read in **both** directions | `@REQ-QD-013` (two scenarios), INV-QD-015 |
| Incomparable compartments refuse a write | `Evaluate.test.ts`, `Matcher.test.ts` |
| A broader clearance reads a narrower document at the same level | `@REQ-QD-013`, `Evaluate.test.ts` |
| An absent clearance denies rather than failing | `@REQ-QD-013`, ADR-QD-021 |
| An absent **action** fails rather than denying | `Evaluate.test.ts`, INV-QD-011 |
| The rule survives a round trip through JSON | `Evaluate.test.ts` |
| **Dominance is reflexive, antisymmetric and transitive** | `Matcher.test.ts` properties, INV-QD-019, BEH-QD-102 |
| **No permitted read-then-write moves information downwards** | `Matcher.test.ts` property |

One imprecision corrected while assembling that table: the previous wording
claimed incomparable compartments were "refused in both directions" end to end.
For a **read** they are, in two scenarios and two unit tests. For a **write** the
refusal is asserted once, in one direction. The relation is symmetric so the
second direction adds little, but the sentence claimed more than the suite did.

### The property tests this document asked for now exist

Revision 1.0 argued Bell–LaPadula is "unusually testable" and prescribed exactly
this: *"reflexivity, antisymmetry and transitivity of dominance; incomparable
labels denying in both directions; and the composite property the model exists
for, that no sequence of permitted reads and permitted writes moves information to
a label which does not dominate its origin."*

All of it is now asserted, under [INV-QD-019](../invariants.md#inv-qd-019-dominance-is-a-partial-order)
and [BEH-QD-102](../behaviors/13-labels.md). Two things the forecast did not
anticipate:

- **The composite property *is* transitivity.** `subject ⊵ source` permits the
  read and `sink ⊵ subject` permits the write, so `sink ⊵ source` follows if and
  only if dominance composes. The document listed them as two items; they are one
  law stated twice, and the interesting direction is that the ★-property's
  guarantee turns out to be a consequence of the order rather than a rule the
  evaluator enforces.
- **The laws hold structurally, so the tests found nothing.** With `>=` on levels
  and containment on compartments there is no arrangement of the current code that
  violates them, and no mutation broke a law without also breaking an example.
  That makes them regression protection against a specific future change — a
  configurable lattice or a compartment hierarchy, which is what
  [29](./29-mls.md) asks for — rather than the bug-finding exercise "unusually
  testable" implied.

The remaining ask, an ADR per enabler, was met by ADR-QD-018 and ADR-QD-021. No
new `REQ-QD` was allocated: `@REQ-QD-013` is this model's suite under the
enabler's name, and the Status section says so.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [23 — Label-Based Access Control](./23-label-based.md) · [28 — Biba](./28-biba.md) · [29 — Multi-Level Security](./29-mls.md)_
