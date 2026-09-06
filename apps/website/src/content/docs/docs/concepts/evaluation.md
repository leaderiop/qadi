---
title: Evaluation
description: The single Effect-returning evaluator, its short-circuit default, and the Decision it always returns with a full trace.
---

`evaluate` is the one function that turns a `Policy` into a `Decision`. There is
exactly one evaluator in this library — no separate synchronous path — because a
second evaluation path is precisely what made the predecessor's asynchronous
relationship checks unreachable in practice.

```ts
export const evaluate: (
  policy: Policy,
  options?: EvaluateOptions,
) => Effect.Effect<
  Decision,
  EvaluationError,
  CurrentSubject | AttributeResolver | RelationshipResolver | DecisionHistory | EvaluationId | CustomPredicate | SignatureHistory
>;
```

```ts
import { evaluate, hasPermission, isAllowed, permission } from "@qadi/core";

const decision = evaluate(hasPermission(permission("doc", "read")));
// Effect<Decision, EvaluationError, ...services>
```

## Short-circuit by default

Children of a composite policy are evaluated sequentially, and evaluation stops
as soon as the answer is known: `allOf` stops at its first denying child,
`anyOf` at its first allowing one. An unevaluated branch triggers no attribute
lookup, no relationship check — nothing. `HasAttribute` reads the subject's own
attributes before ever calling out to `AttributeResolver`, and even then, only
at the node that actually needs the value.

The one exception is an `anyOf` with `fieldStrategy: "Union"`, which has to
observe every child in order to merge their visible-field sets — that's a
requirement of the strategy itself, not a missed optimization. An explicit
`Intersection` on `anyOf` is honored rather than silently downgraded to
short-circuiting, too
([ADR-QD-013](https://github.com/leaderiop/qadi/blob/main/spec/decisions/013-short-circuit-default.md)).
Short-circuiting is the default, not the only mode — `EvaluateOptions.concurrency`
is an opt-in escape hatch when a policy genuinely needs several independent
remote lookups and latency matters more than avoiding the ones that turn out to
be unnecessary.

## Failure is not denial

A broken attribute or relationship lookup is an error in `EvaluationError`,
never a `Deny`. Reporting an outage as "not authorized" sends whoever's
debugging it toward the permissions table instead of the backend that's
actually down — so the two stay in different channels all the way through.
This is also why an unwired resolver **denies**: `AttributeResolverNone`,
`RelationshipResolverNever`, and the rest all answer with the fail-closed
default rather than throwing, so a wiring omission shows up as denials in
testing rather than a silent grant in production.

```ts
import { AccessDenied, AttributeResolveError } from "@qadi/core";
// AttributeResolveError propagates as a typed failure.
// AccessDenied is what an *enforcing* call raises on a legitimate Deny —
// see Enforcement.
```

## The Decision and its trace

```ts
export type Decision = Allow | Deny;

export interface Trace {
  readonly policyTag: Policy["_tag"];
  readonly label?: string | undefined;
  readonly allowed: boolean;
  readonly reason?: string | undefined;
  readonly children: ReadonlyArray<Trace>;
  readonly visibleFields?: ReadonlyArray<string> | undefined;
  readonly obligations: ReadonlyArray<Obligation>;
}
```

Every evaluation — allow or deny — produces a full tree of `Trace` nodes, not
just a boolean and a message. That's what lets a denial answer "why" down to
the exact leaf that refused: `renderTrace` turns that tree into readable text,
and `isAllowed(decision)` narrows a `Decision` down to the boolean when that's
genuinely all you need.

<svg viewBox="0 0 560 210" width="100%" style="max-width: 560px" role="img" aria-label="Diagram: the Trace tree for allOf([hasRole('editor'), hasPermission('doc:write')]) evaluated for a subject without the editor role. The root AllOf node denies. Its first child, HasRole('editor'), denies and is the node that actually decided the outcome. Its second child, HasPermission, is never evaluated — short-circuited — shown dashed and dimmed.">
  <defs>
    <marker id="trace-arrow-red" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="oklch(0.65 0.16 25)"/>
    </marker>
    <marker id="trace-arrow-gray" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="200" y="14" width="160" height="36" rx="7" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="280" y="37" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">AllOf → Deny</text>
  <path d="M 250 50 L 150 88" fill="none" stroke="oklch(0.65 0.16 25)" stroke-width="1.5" marker-end="url(#trace-arrow-red)"/>
  <path d="M 310 50 L 410 88" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" stroke-dasharray="3,3" marker-end="url(#trace-arrow-gray)"/>
  <rect x="30" y="90" width="240" height="46" rx="7" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="150" y="110" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">HasRole('editor')</text>
  <text x="150" y="126" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.65 0.16 25)">→ Deny</text>
  <rect x="290" y="90" width="240" height="46" rx="7" fill="none" stroke="var(--sl-color-hairline)" stroke-dasharray="3,3"/>
  <text x="410" y="110" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-gray-3)">HasPermission('doc:write')</text>
  <text x="410" y="126" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">— not evaluated</text>
  <text x="280" y="170" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">allOf stops at its first denying child — the second is never</text>
  <text x="280" y="185" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">evaluated, and triggers no attribute lookup or relationship check.</text>
</svg>

## Concurrency in evaluation

Short-circuiting is the default, not the only mode. `EvaluateOptions.concurrency`
is an opt-in that evaluates a composite's children in parallel instead of one
at a time — worth reaching for when a policy genuinely has several independent
remote lookups and latency matters more than avoiding the ones that turn out
to be unnecessary
([ADR-QD-026](https://github.com/leaderiop/qadi/blob/main/spec/decisions/026-concurrent-evaluation.md)).

It changes which lookups happen and how long they take, and nothing else: the
`Decision` and the whole `Trace` come out identical either way, because both
paths drive the same fold over the policy tree in the same declaration order —
concurrency changes *when* a child's `Effect` starts, never which child comes
first in the trace. What it forfeits is short-circuiting itself: every child
runs, even the ones a sequential evaluation would never have reached.

<svg viewBox="0 0 620 250" width="100%" style="max-width: 620px" role="img" aria-label="Diagram contrasting sequential and concurrent evaluation of the same allOf with two children, where the first child denies. Sequential: only the first child evaluates; the second is skipped. Concurrent: both children evaluate regardless, even though the first child's denial already decides the AllOf.">
  <rect x="20" y="20" width="280" height="210" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="44" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">SEQUENTIAL (default)</text>
  <rect x="40" y="56" width="240" height="40" rx="6" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="160" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.65 0.16 25)">hasAttribute('age', …) → Deny</text>
  <rect x="40" y="106" width="240" height="40" rx="6" fill="none" stroke="var(--sl-color-hairline)" stroke-dasharray="3,3"/>
  <text x="160" y="130" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="var(--sl-color-gray-3)">hasAttribute('clearanceLevel', …)</text>
  <text x="160" y="150" text-anchor="middle" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">— skipped</text>
  <text x="40" y="200" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">One lookup runs. Deny decided</text>
  <text x="40" y="216" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">without ever reaching the second.</text>
  <rect x="320" y="20" width="280" height="210" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="340" y="44" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">CONCURRENT (opt-in)</text>
  <rect x="340" y="56" width="240" height="40" rx="6" fill="oklch(0.19 0.014 260)" stroke="oklch(0.65 0.16 25)"/>
  <text x="460" y="80" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.65 0.16 25)">hasAttribute('age', …) → Deny</text>
  <rect x="340" y="106" width="240" height="50" rx="6" fill="oklch(0.19 0.014 260)" stroke="oklch(0.75 0.14 150)"/>
  <text x="460" y="128" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="10" fill="oklch(0.75 0.14 150)">hasAttribute('clearanceLevel', …)</text>
  <text x="460" y="145" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="oklch(0.75 0.14 150)">→ Allow</text>
  <text x="340" y="200" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">Both lookups run in parallel. Same</text>
  <text x="340" y="216" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">overall Deny — one denying child is enough.</text>
</svg>

```typescript
import { allOf, evaluate, gte, hasAttribute } from "@qadi/core";

const policy = allOf([
  hasAttribute("age", gte(18)),
  hasAttribute("clearanceLevel", gte(3)),
]);

// Sequential (default): stops at the first denying child.
const sequential = evaluate(policy);

// Concurrent: every child evaluates, even once the answer is already known.
const concurrent = evaluate(policy, { concurrency: "unbounded" });
```

For the deterministic-time requirement, the recursion-depth bound
(`PolicyTooDeep`), and the missing-resource/missing-action failure modes, see
[05 — Evaluator](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/05-evaluator.md).
Concurrency is specified in
[ADR-QD-026](https://github.com/leaderiop/qadi/blob/main/spec/decisions/026-concurrent-evaluation.md).
