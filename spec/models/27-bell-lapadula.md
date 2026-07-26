# 27 — Bell–LaPadula

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-27                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-008) |

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
| Status | **Additive** |
| Priority | **P3** |
| Enablers required | ~~**E1**~~ **shipped**; **E4** outstanding |
| Breaking change | No |

## What Qadi can express today

One special case, and it should be labelled as such rather than as the model: a
**totally ordered, compartment-free** scheme, with the verb chosen by the caller
selecting which of two policies to evaluate. `gte` and `lt` take a plain number,
never a value reference, so the subject's clearance cannot be compared against
the resource's level ([matrix §3.2](./00-adoption-matrix.md)); both rules are
therefore enumerated as rungs, and the enumeration is what a reviewer reads.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone, EvaluationIdLive, RelationshipResolverNever,
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
      EvaluationIdLive,
    ),
  ),
);
```

A useful recipe and a poor model. Two policies the caller must pair with the
correct verb is a convention, not an enforced rule: nothing stops a handler
calling `mayRead` on a write path, and Qadi cannot detect it.

## Proposed API design

### Why both enablers, and what each supplies

**E4 — the label lattice** supplies dominance over `(level, compartments)`.
**E1 — the action dimension** supplies the read/write asymmetry. Neither alone
suffices, and this is the clearest case in the matrix of why: with **E4 and no
E1** the two rules compare the same pair of labels in opposite directions, so
knowing that `a` dominates `b` says nothing until you know which of read or write
was attempted; with **E1 and no E4** the verb is known, but labels can only be
compared as scalars — the wrong answer the moment compartments exist.

That second case is now the live one. E1 shipped
([ADR-QD-018](../decisions/018-action-dimension.md)), so this model is exactly
one enabler away, and it is the enabler carrying the design question rather than
the mechanical work.

```ts
export interface SecurityLabel {
  readonly level: number;
  readonly compartments: ReadonlySet<string>;
}

/** `a` dominates `b`: at least as high, and at least as broad. */
export const dominates = (a: SecurityLabel, b: SecurityLabel): boolean =>
  a.level >= b.level && [...b.compartments].every((c) => a.compartments.has(c));
```

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

With both enablers the model becomes one policy rather than two, and the verb
stops being a convention the caller may forget. Per
[INV-QD-001](../invariants.md#inv-qd-001-permission-key-uniqueness) that action
input must not be derived from or compared against the action segment of a
permission token — two spellings of one word that must stay apart.

```ts
anyOf([
  allOf([hasAction("read"), hasAttribute("clearance", dominates(resource("label")))]),
  allOf([hasAction("write"), hasResourceAttribute("label", dominates(subject("clearance")))]),
]);
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

## What it would cost

E4 alone, now that E1 has shipped — the cheaper half went first, on the argument
that it unlocked six other models. E4 is the half with a real design question in
it, and all of what follows is E4's.

| Invariant | Risk |
| --------- | ---- |
| [INV-QD-003](../invariants.md#inv-qd-003-codectype-identity) | **The one that matters.** `Dominates` is a new codec variant, and `SecurityLabel` carries a `ReadonlySet` |
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

Nothing verifies this model. E1 has shipped, but E4 has not, so no part of this
document beyond the compiled example and the action dimension describes shipped
API — and without dominance there is no rule to test.

Bell–LaPadula is, however, unusually testable, and that is worth noting while the
design is open. The two rules are small, total and mutually constraining, and
dominance is a partial order — so property tests over generated lattices suit it
far better than worked examples do: reflexivity, antisymmetry and transitivity of
dominance; incomparable labels denying in **both** directions; and the composite
property the model exists for, that no sequence of permitted reads and permitted
writes moves information to a label which does not dominate its origin. Adopting
it means an ADR per enabler, a behaviour, an invariant and newly allocated
`REQ-QD` scenarios covering at minimum a read allowed by dominance, a read denied
by an incomparable compartment set, a write denied downward, and an absent action
denying.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [23 — Label-Based Access Control](./23-label-based.md) · [28 — Biba](./28-biba.md) · [29 — Multi-Level Security](./29-mls.md)_
