---
title: Wiring Services & Resolvers
description: The port architecture the evaluator depends on, and why an unwired port must deny rather than grant.
---

Everything `evaluate` needs beyond the `Policy` value itself — who the subject
is, what their attributes are, what relationships hold, what they've already
done — is read through a service. Each is declared as a `Context.Service` and
provided as a `Layer`, the same pattern used throughout Qadi:

```ts
export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {}
```

A policy never talks to a database, an identity provider, or a relationship
graph directly. It asks a port, and what answers that port is a `Layer` you
provide — a real backend in production, a fixture in tests.

## The required ports

| Service | Answers | Layer |
| --- | --- | --- |
| `CurrentSubject` | Who is being authorized | `currentSubjectLayer(subject)` / `CurrentSubjectAnonymous` |
| `AttributeResolver` | Attributes not already on the subject | `attributeResolverFromRecord(...)` / `AttributeResolverNone` |
| `RelationshipResolver` | ReBAC graph questions (`hasRelationship`) | `relationshipResolverFromEdges(...)` / `RelationshipResolverNever` |
| `DecisionHistory` | What this subject has already done (`hasActed`/`hasNotActed`) | `decisionHistoryFromEvents(...)` / `DecisionHistoryUnknown` |
| `EvaluationId` | A correlating identifier per evaluation | `evaluationIdSequential` / `EvaluationIdLive` |

These are ports, not stores: the record lives in your system, and Qadi never
writes to it through a resolver. `attributeResolverRetrying`/
`attributeResolverBounded` and their `RelationshipResolver`/`CustomPredicate`
equivalents are layer combinators for adding retry and concurrency bounds
around a resolver you already have.

Two more required services back specific policy leaves rather than the core
evaluation path — `CustomPredicate` for `hasCustom`, and `SignatureHistory`
for `hasSignature` (see [E-Signatures](/docs/packages/audit/signatures/)) —
and are wired the same way.

## An unwired port denies

Every default layer above fails closed, deliberately:

- `AttributeResolverNone` resolves nothing, so any matcher reading an
  unresolved attribute compares against `undefined` and fails.
- `RelationshipResolverNever` answers `"Unknown"` — not `false` — because a
  boolean can't distinguish "no such edge" from "no resolver was ever wired."
  Both deny, but the decision's reason names which one happened.
- `DecisionHistoryUnknown` is three-valued for the same reason: a boolean
  default would have to pick a polarity, and whichever it picked would grant
  under one of `hasActed`/`hasNotActed`. `"Unknown"` denies under both.
- `CurrentSubjectAnonymous` holds no roles, permissions or attributes.

A wiring omission is meant to surface as denials while you're building the
integration, not as a silent grant once it ships.

## Optional services

Two more services exist outside `EvaluationServices` entirely, read through
`Effect.serviceOption` so that never providing them changes nothing about an
application's types or behavior:

**`DecisionCache`** caches a decision's `Trace` for repeated evaluations of
the same subject, policy, resource and action, within a scope you provide the
layer around — a request, or the whole process. It never caches the
`Decision` itself: `evaluationId` and `durationMillis` are stamped fresh on
every call, hit or miss, so a hit and a miss remain distinguishable in your
logs.

```ts
import { decisionCacheLayer, evaluate, hasRole } from "@qadi/core";

const program = evaluate(hasRole("editor")).pipe(Effect.provide(decisionCacheLayer()));
```

**`DecisionSink`** is the only write-only port in the library: `evaluate`
hands it every completed evaluation through its one method, `record()`, and
reads nothing back. Whatever happens inside a sink — a failure, even a defect
— cannot change the decision that already happened. `@qadi/audit`'s
`AuditDecisionSinkLive` is the assembled implementation of this seam; see
[@qadi/audit](/docs/packages/audit/).

```ts
import { decisionSinkRing } from "@qadi/core";

const withRingBuffer = decisionSinkRing({ environment: "staging", capacity: 500 });
```
