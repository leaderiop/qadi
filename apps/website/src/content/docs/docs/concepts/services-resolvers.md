---
title: Services & Resolvers
description: How a policy reaches outside itself for information it doesn't already hold — and why every unwired default denies rather than grants.
---

A policy can only compare values it has. `hasRole` reads the subject's own
role set; `hasResourceAttribute` reads a field already on the resource
object in hand. But two kinds of question can't be answered from what's
already sitting in memory: "what is this subject's clearance level, from the
directory service?" and "is this subject actually related to this resource,
according to the graph store?" Those go through a **service** — a dependency
the evaluator calls out to rather than reads directly — and specifically
through one of two resolver services: `AttributeResolver` for the first
kind of question, `RelationshipResolver` for the second.

## The shape: a `Service` supplied by a `Layer`

Qadi declares its services with `Context.Service<Self, Shape>()("ns/Id")` —
`AttributeResolver` is one, `RelationshipResolver` another. A `Layer` is the
recipe that constructs one: `attributeResolverFromRecord({...})` builds one
backed by a static table, and a caller wiring a real directory service would
write their own layer with the same `resolve` shape, backed by an `Effect`
that actually calls out over the network.

<svg viewBox="0 0 680 280" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: a policy node that needs an attribute calls the AttributeResolver service. A wired layer reaches out through Effect I/O and returns a value. The unwired default, AttributeResolverNone, returns undefined immediately with no I/O, and the matcher then fails, denying the policy.">
  <defs>
    <marker id="svc-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="200" y="8" width="280" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="30" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">hasAttribute("clearance", ...)</text>
  <path d="M 280 42 L 160 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#svc-arrow)"/>
  <path d="M 400 42 L 520 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#svc-arrow)"/>
  <rect x="20" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">WIRED</text>
  <rect x="40" y="104" width="240" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="123" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">attributeResolverFromRecord</text>
  <rect x="40" y="142" width="240" height="30" rx="6" fill="oklch(0.13 0.012 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="161" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">resolve() → Effect I/O</text>
  <line x1="40" y1="184" x2="280" y2="184" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="206" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">→ value found</text>
  <text x="40" y="228" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">→ matcher runs normally</text>
  <rect x="380" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">UNWIRED (DEFAULT)</text>
  <rect x="400" y="104" width="240" height="30" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="520" y="123" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">AttributeResolverNone</text>
  <rect x="400" y="142" width="240" height="30" rx="6" fill="oklch(0.13 0.012 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="520" y="161" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-2)">resolve() → undefined, no I/O</text>
  <line x1="400" y1="184" x2="640" y2="184" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="206" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-2)">→ matcher has no value to compare</text>
  <text x="400" y="228" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">→ matcher fails → Deny</text>
</svg>

```typescript
import * as Effect from "effect/Effect";
import {
  AttributeResolverNone,
  attributeResolverFromRecord,
  currentSubjectLayer,
  eq,
  evaluate,
  fromRoles,
  hasAttribute,
  literal,
} from "@qadi/core";

const requiresClearance = hasAttribute("clearance", eq(literal("secret")));
const subject = currentSubjectLayer(fromRoles({ id: "u1", roles: [] }));

const wired = evaluate(requiresClearance).pipe(
  Effect.provide(subject),
  Effect.provide(attributeResolverFromRecord({ clearance: "secret" })),
);
// → Allow: the resolver answered "secret", and the matcher compared it.

const unwired = evaluate(requiresClearance).pipe(
  Effect.provide(subject),
  Effect.provide(AttributeResolverNone),
);
// → Deny: the default never returns a value, so the matcher has nothing to
// compare against — no exception, no defect, just a fail-closed answer.
```

## Fail closed is the point, not an edge case

Every default layer in this library denies rather than grants:
`AttributeResolverNone` resolves nothing, `RelationshipResolverNever`
answers every relationship check "unrelated." That's deliberate, and it's
the reason an application missing a piece of wiring shows up as **too many
denials in testing** rather than a silent over-grant once it reaches
production. A resolver that granted by default would turn "forgot to wire
the directory service" into a real security hole nobody would notice until
an audit — see
[INV-QD-007](https://github.com/leaderiop/qadi/blob/main/spec/invariants.md#inv-qd-007-defaults-fail-closed).

This is also where **failure** stays a different thing from **denial**. A
resolver whose `resolve` call itself fails — the directory service is down —
propagates as a typed `AttributeResolveError`, not a `Deny`. Reporting an
outage as "not authorized" sends whoever's debugging it toward the
permissions table instead of the service that's actually broken.

## `RelationshipResolver`, the graph counterpart

`RelationshipResolver` answers a structurally different question —
"is this subject related to this resource this way?" — and its unwired
default, `RelationshipResolverNever`, has a third answer available that
`AttributeResolver` doesn't need: `"Related"`, `"Unrelated"`, or
`"Unknown"`. `"Unknown"` specifically means *nobody wired a resolver*, kept
distinct from a wired resolver's `"Unrelated"` so a denial can name what it
actually checked rather than claiming a store answered when none was ever
consulted.

For the full service list (nine, seven required), the three-valued
`DecisionHistory` default, and the metrics every resolver call increments,
see
[06 — Services](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/06-services.md)
and
[ADR-QD-010](https://github.com/leaderiop/qadi/blob/main/spec/decisions/010-context-service-and-layers.md).
