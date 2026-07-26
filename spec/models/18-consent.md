# 18 — Consent-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-18                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Consent-based access control makes the *data subject* the source of authority
over data about them. A processor may read the data because the person it
describes agreed — for a stated purpose, for a period, and often over a named
subset of the fields.

It resembles [discretionary access control](./08-dac.md) and is not the same
thing. A DAC grant is issued by whoever holds the resource, at their discretion.
A consent is issued by the person the data is *about*, is valid only while it
stays specific and informed, and is revocable at any moment by someone who is
usually not the party holding the record.

## Who asks for it

Anything processing personal data on a lawful basis of consent: GDPR-governed
products generally; health systems honouring a patient's sharing directive
between a practice and a specialist; open banking, where an account holder
authorises a third party to read balances for ninety days; research platforms
where a participant consents to one study and not to secondary analysis.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides against consent today with no core change. What it needs is a
`RelationshipResolver` over the caller's consent register — which the caller
owns, because a register is a record of what their users agreed to.

## How Qadi expresses it

Consent is a relationship, and this is where the modelling is interesting,
because it is a **three-party** relationship in a two-party mechanism. Every
other model in the [matrix](./00-adoption-matrix.md) has a subject and a
resource; consent has the data subject who granted it, the processor who wants
access, and the data. Four parts, three slots in a relation tuple — one of them
has to go somewhere.

| Party | In consent terms | Where it lands |
| ----- | ---------------- | -------------- |
| Processor | wants access | the acting subject — `CurrentSubject`, whose `id` becomes `RelationshipCheck.subjectId` |
| Data | what the consent is about | `EvaluateOptions.resource`, whose string `id` becomes `RelationshipCheck.resourceId` |
| Consent | its purpose, and so its scope | the `relation` string — `consented:marketing`, never a bare `consented` |
| Data subject | granted it | **absent from the check**, because the data already identifies them |

```ts
export interface RelationshipCheck {
  readonly subjectId: string;   // the processor
  readonly relation: string;    // the consent, carrying its purpose
  readonly resourceId: string;  // the data — and so, implicitly, the data subject
  readonly depth: number | undefined;
}
```

The last row is the load-bearing one. The data subject collapses into the
resource: a record has exactly one person it is about, so naming the record names
them. Where that is not true — a joint account, a household record, a photograph
of four people — the collapse is invalid, and the fix is to narrow the resource
until it is, not to teach the resolver to guess which consent to honour.

The scope collapses into the relation name. `consented:marketing` and
`consented:treatment` are different relations, not one relation with a parameter:
a bare `consented` asserts only that some consent exists, which is not a claim
consent law recognises. Splitting also makes partial withdrawal expressible —
revoking marketing leaves the treatment edge standing, and no policy changes.

**Revocation is free, and caching would take it away.** The resolver reads the
register at decision time, so a withdrawn consent denies on the next evaluation —
nothing to invalidate, because nothing was retained. Validity periods work the
same way, decided by the register against `Clock` rather than `Date.now`
([ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)). Caching gives
this up, and is listed *Under consideration* on the
[roadmap](../roadmap.md#caching-decisions) with exactly this hazard recorded: a
cached allow is processing the data subject has already withdrawn permission for.

**Consent and purpose compose.** Consent answers *may you*;
[purpose](./17-purpose.md) answers *why are you asking*. Both must hold, so they
meet in one `allOf` — the edge proves the patient agreed to treatment use, the
purpose check proves this request is treatment rather than marketing wearing the
same credentials. Neither substitutes for the other.

**Field scope is field visibility.** Consent is frequently partial — share the
medication list with the pharmacy, not the mental-health notes. `hasRelationship`
takes a `fields` set, so consent scope and field visibility are one mechanism
rather than two kept in step ([MOD-QD-007](./07-field-level.md)). Under `allOf`,
whose default `fieldStrategy` is `Intersection`, a professional scope and a
consent scope meet at their overlap — least privilege by default, where `Union`
would let a role's scope restore a field the consent excluded.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolveError,
  RelationshipResolver,
  type RelationshipCheck,
  allOf,
  currentSubjectLayer,
  decide,
  hasPermission,
  hasRelationship,
  makeSubject,
  permission,
  project,
} from "@qadi/core";

// The caller's register. It applies validity periods and withdrawal itself;
// Qadi never sees it, only the answer it gives at this instant. A register that
// is unreachable FAILS: "we could not ask" is not "the patient declined".
declare const activeConsents: (
  recordId: string,
) => Effect.Effect<ReadonlyArray<{ grantedTo: string; purpose: string }>, Error>;

const ConsentRegisterResolver: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  {
    check: (request: RelationshipCheck) =>
      activeConsents(request.resourceId).pipe(
        Effect.map((consents) =>
          consents.some(
            (c) =>
              c.grantedTo === request.subjectId &&
              `consented:${c.purpose}` === request.relation,
          ),
        ),
        Effect.mapError((cause) =>
          new RelationshipResolveError({
            relation: request.relation,
            resourceId: request.resourceId,
            cause,
          })
        ),
      ),
  },
);

// What a clinician may ever see, intersected with what this patient shared for
// treatment. `allOf` merges with `Intersection`, so the narrower set wins and
// `mentalHealthNotes` is unreachable however senior the clinician is.
const canReadForTreatment = allOf([
  hasPermission(permission("record", "read"), {
    fields: ["id", "medications", "mentalHealthNotes"],
  }),
  hasRelationship("consented:treatment", { fields: ["id", "medications"] }),
]);

declare const record: { id: string; medications: string; mentalHealthNotes: string };

const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "dr-yusra", permissions: ["record:read"] })),
  ConsentRegisterResolver,
  AttributeResolverNone,
  EvaluationIdLive,
);

// `resource` must carry a string `id`; without one this fails with
// MissingResourceId rather than denying. A denial projects to `{}`; this allow
// projects to the consented fields, so `mentalHealthNotes` never leaves.
const program = decide(canReadForTreatment, { resource: { id: "record-812" } }).pipe(
  Effect.map((decision) => project(decision, record)),
  Effect.provide(services),
);
```

## What is missing

**The consent lifecycle, all of it.** Qadi does not capture consent, present the
notice it was given against, prove it was informed, version the terms, or retain
evidence that any of that happened. It decides against a register the caller
keeps — the same boundary [the URS](../urs.md) draws for administration, whose
retention half is excluded explicitly by
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md).

**Per-grant field sets.** The `fields` list is written into the policy, so it
describes the scope a *class* of consent carries, not what one individual chose;
the resolver answers a boolean and cannot narrow it. Per-person scope must become
distinct relations — `consented:treatment:summary` beside
`consented:treatment:full` — which works until the scope is a free-form field
picker. Returning a field set from the resolver would be new core capability, not
wiring, and is not proposed here.

**Absence of consent denies; a broken register errors.**
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) makes the absent
edge a denial: no consent, no lawful basis.
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) makes an
unreachable register an error, which is equally right and far easier to get
wrong. A resolver that catches its own timeout and answers `false` has written
"the patient declined" into a decision where nobody asked the patient anything.
The two claims are indistinguishable downstream, they oblige the operator to do
different things, and only one is true.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. The mechanics it stands on are proven:
relationship evaluation by `REQ-QD-005`, `Intersection` field merging by
`REQ-QD-007` and
[INV-QD-004](../invariants.md#inv-qd-004-field-visibility-is-a-lattice-with-undefined-at-the-top),
the fail-closed default of `RelationshipResolverNever` by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed), and error
propagation by [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial).

Adopting it means a resolver in the caller's codebase and three tests, the last
of which is the one usually skipped: consent present and the data projected to
its scope; consent withdrawn and the next evaluation denying with no
invalidation step; and the register unavailable, asserting a
`RelationshipResolveError` rather than `false`. A reference adapter, if one is
ever shipped, needs a scenario tagged with a newly allocated `REQ-QD` identifier
covering the same three.

The caveat inherited from [MOD-QD-003](./03-rebac.md) applies: no test proves that
an unevaluated branch performs no *relationship* lookup, so any claim that a
failed permission check spares the register a call rests on
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), verified
for attribute resolution only.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [03 — Relationship-Based Access Control](./03-rebac.md) · [17 — Purpose-Based Access Control](./17-purpose.md) · [07 — Field-Level Authorization](./07-field-level.md)_
