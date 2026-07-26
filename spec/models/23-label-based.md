# 23 — Label-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-23                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Label-based access control attaches a **sensitivity label** to the data — a row,
a document, a column, a cell — and a **clearance** to the subject. Access follows
from comparing the two: the clearance must cover the label. No grant is issued to
anyone, and nothing else about the subject matters.

Oracle Label Security is the canonical database implementation, PostgreSQL row
security policies over a label column the hand-rolled version, Accumulo's cell
visibility expressions the wide-column version, and every "Confidential /
Internal / Public" banner in a document template the same model with enforcement
left to human beings.

## Who asks for it

Organisations that classify their data before anyone writes software for it:
defence and intelligence, regulated finance, healthcare, legal discovery, any
enterprise whose classification policy predates the application. The label is not
a design choice in these settings — it arrives with the data, and the
application's job is to honour it, not to invent it.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

That status covers **label comparison**, which is what this document is about and
is genuinely most of what applications want. Lattice **dominance** and the
Bell–LaPadula family are separate, unshipped and P3; the boundary between them is
the most important part of this document.

## How Qadi expresses it

The label is an attribute on the resource, the clearance an attribute on the
subject. Both sides are shipped ([MOD-QD-002](./02-abac.md)) and the comparison
is an ordinary matcher.

```ts
hasResourceAttribute("classification", inArray(["public", "internal"]));
hasAttribute("clearanceLevel", gte(3));
```

Three things get called "label-based", and they cost very different amounts:

| Form | Shape | What it needs |
| ---- | ----- | ------------- |
| **Label comparison** | Label as a value; a total order or a small fixed set | Nothing. Expressible today — this document |
| **Lattice dominance** | `(level, compartments)` ordered by dominance | **E4** — additive, P3 |
| **Bell–LaPadula, Biba** | Dominance *plus* read-down / write-up asymmetry | **E1 + E4** — additive, P3 |

Comparison suffices more often than it looks, because most real schemes are
**totally ordered** — Public < Internal < Confidential < Secret — and a total
order has no incomparable pairs, so dominance degenerates into `≥` on a number.
Schemes that are not totally ordered are usually small enough to enumerate, and
`inArray` then decides them exactly, with the enumeration sitting in the policy
where a reviewer can read it.

### The constraint worth stating plainly

`gte` and `lt` take a **plain number**, not a value reference. A threshold
against a constant works; comparing the subject's clearance *number* against the
resource's level *number* does not, because there is no `gte(resource("level"))`.
`eq` and `neq` do take a `ValueRef` and can relate the two sides — but by
equality, and a label scheme decided by equality is not a label scheme. Two ways
round it, and no third: **enumerate** the permitted label set per clearance rung
and use `inArray`, keeping the rungs in the reviewable artefact, as the worked
example does; or **derive in the resolver**, returning an already-computed
boolean and matching it with `eq(literal(true))`, which moves the comparison out
of the reviewable half and is for schemes whose rungs cannot be enumerated.

## Worked example

A totally-ordered clearance scheme, where the label additionally narrows which
**fields** come back. `anyOf` defaults to `fieldStrategy: "First"`, so the first
rung that allows supplies the visible set — which makes the ordering of the rungs
the whole of the rule.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  anyOf,
  currentSubjectLayer,
  enforceProjected,
  gte,
  hasAttribute,
  hasResourceAttribute,
  inArray,
  makeSubject,
} from "@qadi/core";

// A type alias, not an interface: `enforceProjected` requires
// `A extends Record<string, unknown>`, which only aliases satisfy.
type Report = {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly classification: string;
};

declare const loadReport: (id: string) => Effect.Effect<Report>;

// Rungs, most privileged first. Each pairs a clearance threshold with the
// labels that clearance covers; the enumeration stands in for the ordering
// comparison Qadi cannot express, and is the part a reviewer reads.
const readClassified = anyOf([
  allOf([
    hasAttribute("clearanceLevel", gte(3)),
    hasResourceAttribute("classification", inArray(["public", "internal", "secret"])),
  ]),
  allOf([
    hasAttribute("clearanceLevel", gte(2)),
    hasResourceAttribute("classification", inArray(["public", "internal"]), {
      fields: ["id", "title", "classification"],
    }),
  ]),
  hasResourceAttribute("classification", inArray(["public"]), {
    fields: ["id", "title"],
  }),
]);

// Clearance 2 against an `internal` report: the second rung allows and `body`
// is withheld rather than the read being refused. A `secret` report matches no
// rung and denies — fail-closed, with no rung silently passing.
const program = loadReport("rpt-1").pipe(
  enforceProjected(readClassified, {
    resource: { id: "rpt-1", classification: "internal" },
  }),
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(
        makeSubject({ id: "u-4", attributes: { clearanceLevel: 2 } }),
      ),
      AttributeResolverNone,
      RelationshipResolverNever,
      EvaluationIdLive,
    ),
  ),
);
```

## What is missing

**Lattice dominance — enabler E4.** A real security label is a pair: a
hierarchical level and a set of non-hierarchical compartments. `(Secret,
{CRYPTO, NUCLEAR})` dominates `(Secret, {CRYPTO})` and is **incomparable** to
`(Secret, {BIO})` — neither dominates the other, so neither may read the other.
Dominance is `level₁ ≥ level₂ ∧ compartments₁ ⊇ compartments₂`. Qadi has no
matcher for that relation and nowhere to declare the lattice.

`contains`, `someMatch` and `everyMatch` are **not** a substitute, and it is
worth being blunt about why: they test membership, and membership is not
superset. `contains` asks whether one named compartment is present; `someMatch`
and `everyMatch` apply a matcher across an array's elements, and that inner
matcher still compares against a constant or a value reference. There is no way
to say "for every element of the *resource's* compartment set, that element
appears in the *subject's*" — the two sets sit on opposite sides of the
comparison, and no composition of the shipped matchers relates them in general.
What they can build is an `allOf` of
`hasAttribute("compartments", contains("CRYPTO"))`, one per compartment the
resource carries, which is correct only when that set is known as the policy is
written — exactly the case where the lattice was not needed. Against a resource
whose compartments vary it silently checks the wrong thing, and a classification
system that is subtly wrong is worse than one that is absent, because it produces
a confident allow on the data it was installed to protect. Do not approximate
this: wait for E4, or enumerate a finite label set and use `inArray`.

**Bell–LaPadula and Biba — E1 and E4.** No-read-up with no-write-down, and its
integrity mirror, need dominance *and* an action dimension, because the rule for
reading is not the rule for writing and the evaluator cannot see the verb. Both
are P3 in the [matrix](./00-adoption-matrix.md) and get their own documents.

**Row-level enforcement — enabler E7.** In a database, label-based control
usually means the label *filters rows* before they are returned: the predicate is
pushed into the query and the excluded rows are never read. Qadi decides about a
row already in hand. `filter(policy, items)` gives the right answer but requires
loading every candidate row first, which defeats the purpose at exactly the scale
where the purpose matters. Pushdown is E7, **breaking** — the evaluator's return
type changes — and the largest departure from the current design in the plan.

**Labelling itself is the application's.** Qadi reads a label off the resource it
is given. It does not assign labels, propagate them through a join or an export,
or stop a caller writing a `secret` field into a `public` record. That is
information flow control, excluded in [the matrix](./00-adoption-matrix.md) for
the reasons [ADR-QD-016](../decisions/016-gxp-out-of-scope.md) sets out.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Its mechanics are proven independently: subject and resource attributes by
`REQ-QD-004` and `REQ-QD-006`, field merging and `First` ordering by `REQ-QD-007`
and [INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top),
denial of a label matching no rung by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed). The worked
example compiles in CI, so its signatures are current even though its behaviour
is unasserted. Adopting the model means a newly allocated `REQ-QD` scenario
covering at minimum a clearance above the label allowing with full fields, a
clearance below it allowing with narrowed fields, and a label covered by **no**
rung denying — the third being the one that would be skipped, and the one a
classification scheme exists to get right.

No verification is claimed, or should be claimed, for dominance. Until E4 ships
there is nothing to test, and a scenario asserting that enumerated `contains`
checks "implement MLS" would be exactly the kind of evidence
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) was written against.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [07 — Field-Level Authorization](./07-field-level.md) · [22 — Type Enforcement](./22-type-enforcement.md)_
