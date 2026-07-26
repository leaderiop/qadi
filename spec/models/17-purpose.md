# 17 — Purpose-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-17                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Purpose-based access control admits a request only for a **declared purpose**.
The caller states why it is asking — treatment, research, billing, fraud
investigation — and the decision is made against that declaration as well as
against the subject and the resource. The same clinician, holding the same role,
reading the same record, is permitted for treatment and refused for research.

This is the GDPR principle of purpose limitation as an access control rule, and
what the Hippocratic-database line of work set out to mechanise: data collected
for one purpose is not available for another merely because the reader holds the
privilege.

## Who asks for it

Anyone processing personal data under a regime that names a lawful basis —
healthcare, insurance, banking, telecommunications — and every platform sharing
production data with an analytics or research function. It is also the rule
behind "may support see this?": support and billing are purposes, not roles, and
modelling them as roles produces a role per purpose per department.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | **E2 recommended**, not required; decided, unbuilt |
| Breaking change | No |

Qadi decides on purpose today with no core change. Recording *what was declared*
— the half of purpose limitation that makes it accountable — is enabler **E2**,
whose design is settled in [ADR-QD-019](../decisions/019-obligations.md) and not
yet built. Read its closing trade-off alongside this document's: an obligation
obliges the caller, and neither Qadi nor this model can verify that the record
was actually written.

## How Qadi expresses it

Purpose is a property of the **request**, and that is exactly the shape Qadi has
no channel for. Neither the evaluation options nor the matcher context carries
anything request-scoped beyond the resource:

```ts
interface EvaluateOptions {
  readonly resource?: Resource;
  readonly action?: string;
  readonly maxDepth?: number;
}
// MatcherContext is { subject, subjectId, resource, action } — a verb, but no purpose.
```

So the declared purpose rides on the **subject**, attached per request rather
than per session: `withAttributes(session, { purpose: "treatment" })`.

That works, and it is a workaround. A subject describes *who is asking*; a
purpose describes *why*, and putting the second inside the first means the
subject must be rebuilt for every call and can never be shared across them. The
natural home is a request-scoped channel. Enabler **E1** in the
[matrix](./00-adoption-matrix.md#e1--action-dimension) has since built one, but
it carries the *action* — the verb, not the reason — and the two must not be
conflated. See [what is missing](#what-is-missing) below. This is the weak point
of the recipe and should be read as one.

### Field visibility is what makes the model useful

Purpose rarely toggles access all-or-nothing. It changes **which columns** you
may see, which is why it belongs in a policy rather than in a `switch` at the
call site: a purpose branch carries `fields`, and the decision returns the
projection with it.

| Declared purpose | Also requires | Visible fields |
| ---------------- | ------------- | -------------- |
| `treatment` | `clinician` | `id`, `name`, `diagnosis`, `medications` |
| `research` | `clinician` | `id`, `ageBand`, `diagnosis` — de-identified |
| `billing` | `billing-clerk` | `id`, `name`, `billingCode` |

The strategies are chosen, not inherited. Each branch is an `allOf`, whose
`Intersection` default is correct because `hasRole` carries no field set and an
absent set is the *top* of the lattice
([INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top)),
so the intersection narrows to exactly the columns the purpose leaf named. The
branches combine with `anyOf` under its `First` default, right here because the
purposes are mutually exclusive: at most one can allow, so visiting the rest buys
nothing ([ADR-QD-013](../decisions/013-short-circuit-default.md)).

`Union` is the deliberate exception. A caller declaring two compatible purposes
at once — treatment *and* billing for a discharge summary — wants the columns of
both, which no single branch exposes; that composite must name
`{ fieldStrategy: "Union" }` and accept that every branch runs
([MOD-QD-007](./07-field-level.md)).

## Worked example

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
  eq,
  hasAttribute,
  hasRole,
  literal,
  makeSubject,
  withAttributes,
  type Policy,
} from "@qadi/core";

// A `type`, not an `interface`: `enforceProjected` requires
// `A extends Record<string, unknown>`, and an interface has no index signature.
type PatientRecord = {
  readonly id: string;
  readonly name: string;
  readonly ageBand: string;
  readonly diagnosis: string;
  readonly medications: string;
  readonly billingCode: string;
};

declare const loadRecord: (id: string) => Effect.Effect<PatientRecord>;

// One branch per purpose. `fields` on the purpose leaf names what the branch
// exposes; `allOf` defaults to `Intersection`, and `hasRole` carries no field
// set, so the conjunction narrows nothing further.
const purposeView = (
  purpose: string,
  role: string,
  fields: ReadonlyArray<string>,
): Policy =>
  allOf([hasAttribute("purpose", eq(literal(purpose)), { fields }), hasRole(role)]);

// `anyOf` defaults to `First`, correct here: the purposes are mutually
// exclusive, so the first allowing branch is the only allowing branch.
const mayRead: Policy = anyOf([
  purposeView("treatment", "clinician", ["id", "name", "diagnosis", "medications"]),
  purposeView("research", "clinician", ["id", "ageBand", "diagnosis"]),
  purposeView("billing", "billing-clerk", ["id", "name", "billingCode"]),
]);

// The session subject says who is asking. It says nothing about why.
const session = makeSubject({ id: "dr-amina", roles: ["clinician"] });

const services = (purpose: string) =>
  Layer.mergeAll(
    // Purpose belongs to the request, so the subject is rebuilt per call.
    currentSubjectLayer(withAttributes(session, { purpose })),
    AttributeResolverNone,
    RelationshipResolverNever,
    EvaluationIdLive,
  );

// Same clinician, same record, two purposes, two shapes of answer.
const treatmentRead = loadRecord("p-1").pipe(
  enforceProjected(mayRead),
  Effect.provide(services("treatment")),
);
// → { id, name, diagnosis, medications }

const researchRead = loadRecord("p-1").pipe(
  enforceProjected(mayRead),
  Effect.provide(services("research")),
);
// → { id, ageBand, diagnosis }; `name` and `medications` never leave the handler
```

## What is missing

**A request-scoped channel for the purpose.** E1 has since shipped, and it does
*not* close this gap — a point worth stating precisely, because the shape is so
nearly right. `EvaluateOptions.action` is request-scoped, but it names the verb,
and a purpose is not a verb: `"read"` and `"treatment"` answer different
questions, and one field cannot carry both. Overloading `action` with a purpose
would reproduce, one level up, exactly the conflation
[ADR-QD-018](../decisions/018-action-dimension.md) refused between a grant and a
request. So purpose still travels on the subject. What E1 established is the
*precedent*: a second request-scoped field is now an additive change of a shape
the library has already accepted, rather than a new idea.

**The declared purpose is an assertion, not a fact.** Nothing in this recipe —
and nothing that could be added to it — stops a caller declaring `treatment` and
performing research. Qadi checks that a purpose was declared and that the
declaration admits the read; it cannot check that the declaration is true. Say
this plainly to anyone adopting the model: **purpose limitation is a compliance
and accountability control, not a technical boundary.** Its force comes from the
declaration being on the record, attributable and reviewable afterwards — from
the consequence of having declared falsely, not from the check.

Which makes the *record* the load-bearing part, and the record is an obligation:
"allow, and log the declared purpose". `Decision` has no obligation channel —
`Allow` and `Deny` carry a subject id, a reason, a trace and a visible-field set,
and nothing the caller is obliged to do. Adding one is enabler **E2**, whose
design is [ADR-QD-019](../decisions/019-obligations.md) — additive for `Decision`,
which has no codec, though the `Obliged` policy node is a codec change like any
other variant ([the matrix](./00-adoption-matrix.md#e2--obligations-on-decision)).
Until then the nearest substitute is the span: `evaluate` runs inside
`qadi.evaluate`, annotated with the decision, subject id, evaluation id and
policy tag ([ADR-QD-009](../decisions/009-observability-via-effect.md)), and
since the purpose is a subject attribute the caller can annotate it onto that
same span. That is a trace, and should not be mistaken for more.

**Audit is out of scope, and this is the model where that bites.** Durable,
tamper-evident audit trails are excluded by [the URS](../urs.md) and the
exclusion argued in [ADR-QD-016](../decisions/016-gxp-out-of-scope.md). A
regulated deployment of purpose limitation needs exactly such a trail: a
retained, non-repudiable record of every purpose declared and every decision made
against it. Qadi will not provide one, and will not provide a port pretending to.
The predecessor shipped an `AuditTrailPort` that guaranteed nothing, and shipping
the appearance of the guarantee was worse than shipping neither.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature.

Its mechanics are proven individually: subject-attribute matching by
`REQ-QD-004`, field merging and projection by `REQ-QD-007`, the `First` and
`Intersection` defaults by the combinator tests behind
[MOD-QD-007](./07-field-level.md), and the fail-closed default by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) — an undeclared
purpose matches no branch and the composite denies, with no rule needed to make
that happen.

What is unproven is anything specific to this model, and the gap is less a
missing test than a property no test can establish. A scenario tagged with a
newly allocated `REQ-QD` identifier could assert the useful part: that one
subject reading one resource yields different field sets under different declared
purposes, and that an absent or unrecognised purpose denies. It could not assert
that the declaration was honest, and nothing written against this library ever
will.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [07 — Field-Level Authorization](./07-field-level.md) · [18 — Consent-Based Access Control](./18-consent.md) · [ADR-QD-016](../decisions/016-gxp-out-of-scope.md)_
