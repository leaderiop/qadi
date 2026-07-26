# 12 — Context-Aware Access Control

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-MOD-12                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-07-26                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Planning — Model Adoption                      |
> | Change History | 1.0 (2026-07-26): Initial release (CCR-QD-007) |

---

## What it is

Context-aware access control decides on the circumstances of the request rather
than on the subject or the resource: device posture, network location, whether
the session is MFA-elevated, client version, threat level. XACML calls these
*environment* attributes, and the name is the useful part — they belong to
neither party in the decision. The same user, in the same role, asking about the
same document, is allowed at their desk and denied from a hotel network.

## Who asks for it

Anything operating under a zero-trust posture, which by now is most enterprise
software: step-up authentication before a privileged action, managed-device
requirements on data export, network restrictions on administrative surfaces. It
is also the shape risk-adaptive and trust-based access control take once the
score has been computed — same wiring, different provenance.

## Status

| Property | Value |
| -------- | ----- |
| Status | **Wiring** |
| Priority | **P1** |
| Enablers required | None |
| Breaking change | No |

Qadi decides on context today with no core change. What it needs is somewhere
for the context to come from, and there are exactly two places.

## How Qadi expresses it

There is no environment channel. `EvaluateOptions` carries
`{ resource?, maxDepth? }` and `MatcherContext` carries
`{ subject, subjectId, resource }` — neither has a slot for the circumstances of
the request. Context therefore arrives as a **subject attribute**, by one of two
routes:

```ts
// 1. On the subject. Cheap, synchronous, cannot fail — but a snapshot, fixed
//    when the subject was built. A session elevated afterwards is not reflected.
makeSubject({ id: "u-42", attributes: { mfa: true, network: "corp" } });

// 2. Behind the resolver. Read at decision time, free to perform I/O.
interface AttributeResolverShape {
  readonly resolve: (subjectId: string, attribute: string) =>
    Effect.Effect<unknown, AttributeResolveError>;
}
```

They are a fallback chain rather than alternatives. The evaluator reads the
subject's own `attributes` first with `Object.hasOwn` and consults the resolver
only on a miss, at the node that needs the value
([ADR-QD-005](../decisions/005-lazy-attribute-resolution.md)) — which is what
preserves short-circuiting: an `anyOf` whose cheap branch allows never calls the
posture service at all.

Which route a signal takes is a design decision, not a matter of taste.

| Signal | Route | Why |
| ------ | ----- | --- |
| MFA elevation, authentication method, client version, tenant | Subject | Fixed for the life of the session and already known at login; a lookup would re-derive what the token said |
| Device posture, patch level, EDR verdict | Resolver | Volatile and owned by another system; a snapshot goes stale within the session |
| Network zone, IP reputation, geolocation | Resolver | Cheap to compute but not the caller's to assert; deriving it centrally keeps one answer |
| Threat level, risk score | Resolver | Changes independently of any session, which is the whole point of being adaptive |

The rule of thumb: **stable session facts on the subject, volatile or expensive
signals behind the resolver.** A signal on the subject that changes mid-session
is not context — it is a cached decision input, and it will eventually be wrong.

## Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolveError,
  AttributeResolver,
  EvaluationIdLive,
  RelationshipResolverNever,
  allOf,
  check,
  currentSubjectLayer,
  eq,
  hasAttribute,
  hasResourceAttribute,
  literal,
  lt,
  makeSubject,
  type EvaluationError,
} from "@qadi/core";

// The caller's posture service. Qadi never sees it — only its answer.
declare const readPosture: (
  subjectId: string,
) => Effect.Effect<{ readonly managed: boolean; readonly risk: number }, Error>;

// A posture service that is down FAILS. It does not answer `false`, because
// that would convert an outage into a security decision.
const PostureResolver: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  {
    resolve: (subjectId: string, attribute: string) =>
      readPosture(subjectId).pipe(
        Effect.map((posture) =>
          attribute === "deviceManaged" ? posture.managed : posture.risk,
        ),
        Effect.mapError((cause) => new AttributeResolveError({ attribute, cause })),
      ),
  },
);

// `mfa` rides on the subject and costs nothing. Posture is volatile, so the
// resolver supplies it — and only once the cheaper branches have allowed.
const canExport = allOf([
  hasResourceAttribute("classification", eq(literal("internal"))),
  hasAttribute("mfa", eq(literal(true))),
  hasAttribute("deviceManaged", eq(literal(true))),
  hasAttribute("deviceRisk", lt(50)),
]);

const program: Effect.Effect<boolean, EvaluationError> = check(canExport, {
  resource: { id: "ledger-7", classification: "internal" },
}).pipe(
  Effect.provide(
    Layer.mergeAll(
      currentSubjectLayer(makeSubject({ id: "u-42", attributes: { mfa: true } })),
      PostureResolver,
      RelationshipResolverNever,
      EvaluationIdLive,
    ),
  ),
);
```

## What is missing

**Half of the context. There is no action dimension.** Environment attributes are
one of the two things XACML means by context; the other is the *action* — read,
write, export, delete — and Qadi has none at evaluation level. An action exists
only inside a permission token, as the second segment of `resource:action`
([ADR-QD-007](../decisions/007-permission-token-representation.md)), never as an
input to evaluation. This is enabler **E1** in the
[matrix](./00-adoption-matrix.md#e1--action-dimension): additive, cheap, unbuilt.

"Allow writes only from a managed device, but allow reads from anywhere" is one
rule in prose and cannot be written as one policy here. Today it is two, selected
by the caller:

```ts
const readAnywhere = hasPermission("ledger:read");

const writeFromManagedDevice = allOf([
  hasPermission("ledger:write"),
  hasAttribute("deviceManaged", eq(literal(true))),
]);

// The verb lives at the call site, not in the policy.
const policyFor = (action: "read" | "write") =>
  action === "read" ? readAnywhere : writeFromManagedDevice;
```

That works, and is often the clearer design anyway. What it costs is the ability
to *ship* the rule as data: a policy stored as JSON no longer expresses the whole
rule, because the branch choosing between the two lives in TypeScript. Encoding
the verb into the resource keeps one policy but corrupts the resource into a
request descriptor, and is not recommended.

**Failure is not denial, and context is where this bites.**
[INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial) holds everywhere,
but it matters most here, because context signals are the ones most likely to be
unavailable: posture agents fall behind, threat feeds rate-limit, geo-IP lookups
time out. A resolver that catches its own timeout and returns `false` has
converted an outage into a mass denial indistinguishable from a correct
authorisation decision — no error, no alert, just users told they are not
permitted. It gets diagnosed as a permissions problem, and the engineer goes
looking for the wrong bug.

Fail the Effect. `AttributeResolveError` carries the attribute and the cause, the
evaluator propagates it rather than denying, and the caller decides — deny with
an incident, retry, or fall back to a documented degraded policy. That choice
belongs to the application, deliberately and visibly, never to a `catch` inside a
resolver.

## Verification

Nothing verifies this model today, and this document does not claim otherwise —
it is a recipe, not a shipped feature. The mechanics it stands on are already
proven: lazy per-node resolution by `REQ-QD-004`, short-circuiting by
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation), error
propagation by [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial),
and the fail-closed default of `AttributeResolverNone` by
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed).

Adopting it means a resolver implementation in the caller's codebase, plus the
one test that is easy to omit and is the important one: a resolver failure
surfaces as an error, not as a denial. Were a reference posture adapter shipped,
it would need a scenario tagged with a newly allocated `REQ-QD` identifier
covering all three outcomes — signal present and satisfying, present and failing
the matcher, unavailable — with the third asserting an error rather than `false`.

---

_Related: [00 — Adoption Matrix](./00-adoption-matrix.md) · [02 — Attribute-Based Access Control](./02-abac.md) · [13 — Temporal Access Control](./13-temporal.md) · [ADR-QD-005](../decisions/005-lazy-attribute-resolution.md)_
