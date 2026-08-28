# 02 — Attribute-Based Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-02                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-006) |

---

## What it is

Access follows from properties rather than from grants: a subject is permitted
because their clearance reaches a threshold, their department matches the
record's, or their contract has not expired — never because someone enumerated
them. Qadi expresses this with two policy variants — `hasAttribute` over subject
properties, `hasResourceAttribute` over resource properties — each carrying a
matcher that states the comparison as data.

## Who asks for it

Applications whose authorisation rules are stated in the domain's own language:
clearance bands in clinical and defence systems, tenant and region fields in
multi-tenant SaaS, record state in workflow tools ("only an *open* case may be
edited"). It is also the substrate most of the P1 tier in the
[matrix](./00-adoption-matrix.md) is built on — context-aware, temporal, spatial
and risk-adaptive access control are all ABAC with a particular resolver behind
them.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Shipped** |
| Priority | **P0** |
| Enablers required | None |
| Breaking change | No |

## How Qadi expresses it

Two policy constructors. Both take the attribute name, a matcher, and an
optional field restriction applied when the policy allows.

```ts
export const hasAttribute: (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
) => Policy;

export const hasResourceAttribute: (
  attribute: string,
  matcher: Matcher,
  options?: FieldOptions,
) => Policy;
```

The comparison itself is a `Matcher` — pure data, no closures, so it serialises
with the policy that holds it ([BEH-QD-025](../behaviors/04-matchers.md)). There
are eleven.

| Matcher | Applies to | Semantics |
| ------- | ---------- | --------- |
| `eq(ref)` | any | value is identical to the referenced value |
| `neq(ref)` | any | value differs from the referenced value |
| `inArray(values)` | any | value is one of the listed constants |
| `exists()` | any | value is neither `null` nor `undefined`; `0` and `""` pass |
| `gte(n)` | numbers | value is a number and `>= n`; `"5"` never satisfies `gte(3)` |
| `lt(n)` | numbers | value is a number and `< n` |
| `contains(v)` | arrays, strings | value includes `v`; any other type yields false |
| `fieldMatch(field, m)` | objects | applies `m` to a nested field |
| `someMatch(m)` | arrays | at least one element satisfies `m` |
| `everyMatch(m)` | arrays | every element satisfies `m` |
| `size(m)` | arrays, strings | applies `m` to the length |

Nothing coerces and nothing throws: a type mismatch is false, never an error.

`eq` and `neq` compare against a *reference*, which is what lifts ABAC beyond
constant comparison into relational rules. There are five.

```ts
export const subject: (path: string) => ValueRef;   // a subject attribute, dot-path
export const subjectId: () => ValueRef;             // the subject's own identifier
export const resource: (path: string) => ValueRef;  // a resource field, dot-path
export const action: () => ValueRef;                // the verb of the request
export const literal: (value: unknown) => ValueRef; // a constant
```

`subjectId()` is a distinct variant rather than a reserved path, so an attribute
that happens to be called `id` can neither shadow it nor be shadowed by it
([BEH-QD-026](../behaviors/04-matchers.md)). Paths yield `undefined` at any
missing step; a reference that resolves to nothing denies, and denial is not an
error.

### Lazy attribute resolution

Subject attributes come from two places, and the order matters. The evaluator
reads the subject's own `attributes` first with `Object.hasOwn`, and calls
`AttributeResolver` only on a miss, at the node that needs the value
([ADR-QD-005](../decisions/005-lazy-attribute-resolution.md),
[BEH-QD-034](../behaviors/05-evaluator.md)).

```ts
export interface AttributeResolverShape {
  readonly resolve: (subjectId: string, attribute: string) =>
    Effect.Effect<unknown, AttributeResolveError>;
}
```

`Object.hasOwn` rather than an `undefined` check is deliberate: an attribute
explicitly set to `undefined` is an answer, and re-asking the resolver for it
would turn a stated absence into a lookup. Resolving at the node, rather than
sweeping the tree up front as the predecessor did, is what keeps
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) true — an
`anyOf` whose cheap branch allows pays for no lookup in the branches it never
reaches. A resolver returning `undefined` fails the matcher; a resolver
*failing* propagates as an error
([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)). The default
layer, `AttributeResolverNone`, resolves nothing and therefore denies
([INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed)).

Resource attributes are not resolved at all: they are read directly off the
`resource` passed in `EvaluateOptions`, and a `hasResourceAttribute` evaluated
without one fails with `MissingResource` — a wiring mistake, not a decision.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  CustomPredicateNone,
  SignatureHistoryNone,
  EvaluationIdLive,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  allOf,
  attributeResolverFromRecord,
  check,
  currentSubjectLayer,
  eq,
  gte,
  hasAttribute,
  hasResourceAttribute,
  literal,
  makeSubject,
  subject,
  type EvaluationError,
} from "@qadi/core";

// A case worker may work a case that is still open, sits at their own site, and
// is within their clearance band. Order is not decoration: the two cheap
// resource comparisons run before the branch that may cost a lookup.
const canWorkCase = allOf([
  hasResourceAttribute("state", eq(literal("open"))),
  hasResourceAttribute("site", eq(subject("site"))),
  hasAttribute("clearance", gte(3)),
]);

// `site` is carried by the subject, so `subject("site")` reads it directly.
// `clearance` is not, so the resolver supplies it — and only once the first two
// branches have allowed. A closed case costs no lookup at all.
const services = Layer.mergeAll(
  currentSubjectLayer(makeSubject({ id: "u-42", attributes: { site: "lyon" } })),
  attributeResolverFromRecord({ clearance: 5 }),
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const program: Effect.Effect<boolean, EvaluationError> = check(canWorkCase, {
  resource: { id: "case-7", state: "open", site: "lyon" },
}).pipe(Effect.provide(services));
```

## What is missing

Qadi's ABAC has three of the four dimensions the literature assumes. Neither gap
below is a defect in what ships; both are the boundary of what a policy can say.

**No environment dimension.** `EvaluateOptions` is
`{ resource?, action?, maxDepth? }` and `MatcherContext` is
`{ subject, subjectId, resource, action }`. Neither knows what time it is, nor
where the request came from. Environment attributes have a stand-in — the
temporal, spatial and context-aware rows of the
[matrix](./00-adoption-matrix.md) route them through `AttributeResolver`, so
"current hour" or "device posture" is a resolved subject attribute. It is a
stand-in and the spatial document says why it is an uncomfortable one: a subject
does not *have* a country, a request does.

The action dimension, which this document previously listed as the larger of the
two gaps, has shipped —
[E1](./00-adoption-matrix.md#e1--action-dimension) /
[ADR-QD-018](../decisions/018-action-dimension.md). A rule treating reads and
writes asymmetrically is now expressible in one stored policy.

**~~No obligations (E2).~~ Closed.** A decision was `Allow | Deny` and nothing
else, so XACML's "permit, provided the access is logged" had no expression —
Qadi could say the redaction, since `fields` and `fieldStrategy` are exactly
that, but not the duty.
[E2](./00-adoption-matrix.md#e2--obligations-on-decision) /
[ADR-QD-019](../decisions/019-obligations.md) has shipped, and `obliged` carries
it.

**XACML parity needs E3.** Beyond obligations, now shipped, `deny-overrides`,
`permit-overrides` and `first-applicable` have no representation:
`FieldStrategy` governs field-set merging only, and the allow/deny rule is
hard-coded in `AllOf` and `AnyOf`. E3 is breaking because the honest fix changes
what those combinators mean. Qadi is not an XACML implementation, and this
document does not propose it become one.

## Verification

| Claim | Evidence |
| ----- | -------- |
| Eleven matchers, including non-coercion and type mismatches yielding false | `packages/core/test/Matcher.test.ts` — `describe("matchers")`, plus `describe("getByPath")` for dot-path traversal |
| Subject attributes are read without a resolver; resource attributes match against the resource; a missing resource fails | `packages/core/test/Evaluate.test.ts` — `describe("leaf policies")` |
| Resolution is per node, and unevaluated branches trigger no lookup | `packages/core/test/Evaluate.test.ts` — `describe("short-circuiting")`, asserted by counting resolver invocations rather than by timing |
| A failed lookup propagates as an error rather than a denial | `packages/core/test/Evaluate.test.ts` — "attribute resolution errors propagate rather than denying" |
| `subjectId()` and `subject("id")` are distinct | `packages/core/test/Evaluate.test.ts` — `describe("subject identity references")` |
| Attribute policies and their matchers survive a JSON round trip | `packages/core/test/Policy.test.ts` — the `FastCheck.letrec` round-trip property |
| Acceptance | `REQ-QD-004` (`features/features/attributes/attributes.feature`), `REQ-QD-006` (`features/features/attributes/resource-attributes.feature`), `REQ-QD-009` (`features/features/attributes/ownership.feature`) |

The `@REQ-QD-004` feature file pins the two-source rule end to end: one scenario
satisfies the policy from an attribute the subject carries, the next from an
attribute only the resolver knows, the last denies when neither source has it.
Asserting *which* attributes were asked for uses `recordingAttributeResolver`
from the testing package, alongside `qadiTestLayer` and `subjectWith`.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [04 — Matcher DSL](../behaviors/04-matchers.md) · [ADR-QD-005](../decisions/005-lazy-attribute-resolution.md)_
