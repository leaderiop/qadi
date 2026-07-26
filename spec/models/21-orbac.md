# 21 — Organisation-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-21                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Organisation-based access control (Kalam's model) states every rule *relative to
an organisation*. The concrete triple a request presents — subject, action,
object — is never written down directly; it is abstracted into **role**,
**activity** and **view**, held within an **organisation** and a **context**.

The extra dimension buys vocabulary: a hospital network, a multi-tenant
platform or a group of agencies sharing a register each says
`clinician may consult a medical record` in its own words, and none can redefine
another's `clinician` by accident.

## Who asks for it

Anyone running one engine over several parties that do not share a dictionary.
In practice most teams reaching for OrBAC want the narrow case: **per-tenant
rules with a shared engine**, where the organisation is a boundary first and a
vocabulary second.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | E1 shipped; none outstanding |
| Breaking change | No |

Qadi expresses the organisation, the role and the view with no core change, and
the *activity* since [E1](./00-adoption-matrix.md#e1--action-dimension) shipped.
The abstraction OrBAC exists to provide — a rule written about an activity rather
than about any one operation implementing it — is what `hasAction` now carries.

## How Qadi expresses it

Three of OrBAC's four abstractions land cleanly. One does not.

| OrBAC | Qadi |
| ----- | ---- |
| organisation | a subject attribute, or a prefix on role and relation names |
| role (abstracts subject) | `hasRole` — already the same idea |
| activity (abstracts action) | **no home** — Qadi has no action dimension at evaluation level; today it lives inside the permission token's second segment |
| view (abstracts object) | a resource attribute, typically `hasResourceAttribute("view", eq(literal("medical-record")))` |
| context | subject attributes, or values from `AttributeResolver` |

The organisation has two spellings, and they are not equivalent.

```ts
// Prefixed names — two tenants' `editor` roles cannot collide in one subject.
hasRole("acme:editor");
hasRelationship("acme:owner");

// Or as an attribute required to match the resource's: no resolver, no lookup,
// no failure mode, because both sides are already in hand.
hasResourceAttribute("orgId", eq(subject("orgId")));
```

Prefixing is right when a subject acts inside several organisations at once and
the names would otherwise clash. The attribute form is right when the
organisation is a boundary — one line, no cost, and the whole of tenant
isolation. Most systems want both. Note that `subject(path)` traverses
dot-paths, but `hasResourceAttribute`'s first argument is a **flat key**, not a
path; descending into a resource value is `fieldMatch`'s job.

### Where the rule catalogue lives

OrBAC assumes an authority holding abstract rules per organisation and deriving
concrete permissions from them. Qadi holds nothing: the catalogue is the
caller's, and Qadi evaluates the policy the caller selects.

```ts
const catalogue: ReadonlyMap<string, Policy> = new Map([
  ["acme", acmeMayReadRecord],
  ["beta", betaMayReadRecord],
]);
```

Because policies serialise, each entry can be a stored JSON document rather than
TypeScript — which makes decoding a trust boundary. `fromJson` validates, and
[the URS](../urs.md) requires that hostile or malformed input be rejected rather
than degraded into something permissive. A tenant editing its own rules is
exactly the case that boundary exists for.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  eq,
  fromJson,
  hasResourceAttribute,
  hasRole,
  literal,
  makeSubject,
  subject,
  toJson,
} from "@qadi/core";

// Tenant isolation, in one line and with no resolver: the subject's own
// organisation must equal the resource's. This branch performs no I/O.
const inSameOrganisation = hasResourceAttribute("orgId", eq(subject("orgId")));

// Acme's rule, in Acme's vocabulary: organisation × role × view. The activity
// is absent — there is nowhere in a policy to put it.
const acmeMayReadRecord = allOf([
  inSameOrganisation,
  hasRole("acme:clinician"),
  hasResourceAttribute("view", eq(literal("medical-record"))),
]);

const services = Layer.mergeAll(
  currentSubjectLayer(
    makeSubject({
      id: "u-1",
      roles: ["acme:clinician"],
      attributes: { orgId: "acme" },
    }),
  ),
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

// The rule as it would be stored and reloaded — malformed input fails the
// Effect rather than becoming a policy that happens to allow. Acme's own
// record allows; another tenant's is denied by the cheapest branch, before
// the role or the view is ever consulted.
const program = Effect.gen(function* () {
  const rule = yield* fromJson(yield* toJson(acmeMayReadRecord));
  const own = yield* check(rule, {
    resource: { id: "rec-9", orgId: "acme", view: "medical-record" },
  });
  const other = yield* check(rule, {
    resource: { id: "rec-3", orgId: "beta", view: "medical-record" },
  });
  return { own, other };
}).pipe(Effect.provide(services));
```

## What is missing

**The activity, which is the point of the model.** OrBAC exists to abstract the
action: `consult`, `prescribe` and `archive` are activities that several
concrete operations implement, and a rule is written about the activity rather
than any one of them.

[E1](./00-adoption-matrix.md#e1--action-dimension) /
[ADR-QD-018](../decisions/018-action-dimension.md) has shipped, so
`hasAction("consult")` says this directly and the two encodings below are now
historical — recorded because they remain the shape of anything decoded from a
policy store written before E1, and because the reasoning explains why the
activity belongs on the request rather than on the subject.

Encoded, an activity took one of two routes, and both lost the abstraction OrBAC
exists to provide. **As a permission token**,
`hasPermission("record:consult")` names the activity, but as a grant the subject
holds rather than as something the organisation defined — the
activity-to-operation mapping then lives wherever tokens are minted, usually the
role catalogue, so the abstraction has been folded back into the role. **As one
policy per activity**, selected by the call site exactly as the
[context-aware](./12-context-aware.md) recipe selects a policy by verb, each
rule stays readable, but the branch choosing between them lives in TypeScript,
so an organisation's rule set is no longer wholly expressible as stored data.
Encoding the activity into the resource — `{ id, activity: "consult" }` — keeps
one stored document and is not recommended: it corrupts the resource into a
request descriptor.

**No derivation, and no administrative surface.** OrBAC's authority derives
concrete permissions from abstract rules and answers "which organisations may
define this role?". Qadi decides; it neither stores the abstract rules nor
governs who writes them. That is administration, which [the URS](../urs.md)
places out of scope and [ADR-QD-016](../decisions/016-gxp-out-of-scope.md)
argues for keeping there. "May this subject edit Acme's policy?" is itself an
authorisation question, so Qadi can decide *that* — the catalogue and its
mutation remain the application's.

**Organisation hierarchies** — a parent whose rules reach its subsidiaries — are
not the attribute form. Attribute equality tests one level; ancestry is a
relationship, and is the subject of [MOD-QD-019](./19-hierarchy.md).

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. Every mechanic it uses is proven
elsewhere: role membership by `REQ-QD-003`, resource-attribute comparison
against a subject value by `REQ-QD-006` and `REQ-QD-009`, and the JSON round
trip by the `FastCheck.letrec` property in `packages/core/test/Policy.test.ts`.
No identifier is allocated here.

Adopting it means a catalogue in the caller's codebase plus the one test that is
easy to omit and is the important one: a subject from organisation A, evaluated
against a resource belonging to organisation B, denied — for **every** policy in
the catalogue, not only the one A authored. Tenant isolation is a property of
the whole catalogue, and a per-policy test will not catch the entry that forgot
its `inSameOrganisation` branch. The activity dimension has since shipped under
E1, so the mapping table above is now honest for all four abstractions; the
worked example still encodes its activity and should be read as the pre-E1 form.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [01 — Role-Based Access Control](./01-rbac.md) · [19 — Hierarchical Resource Scoping](./19-hierarchy.md) · [02 — Attribute-Based Access Control](./02-abac.md)_
