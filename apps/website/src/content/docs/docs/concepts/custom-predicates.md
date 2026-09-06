---
title: Custom Predicates
description: hasCustom — the policy tree's one escape hatch for logic no built-in matcher expresses, and why an unregistered name errors instead of denying.
---

Every other policy leaf is declarative: `hasAttribute`, `hasRelationship`,
and the rest compare a value against a fixed vocabulary of matchers
(`eq`, `gte`, `contains`, and so on). That closedness is what lets a policy
serialize, explain itself, and compile down to a SQL predicate — but some
conditions genuinely don't reduce to a single comparison: a cross-check
against an external system, a computation over more than one field, logic an
application already owns.

`hasCustom` is the deliberate way out, and it's narrower than it sounds:

```ts
export const hasCustom: (name: string, params?: unknown, options?: FieldOptions) => Policy;
```

A `HasCustom` node carries a **name** and optional JSON-safe `params` —
never a function. The logic itself lives behind a `CustomPredicate` service,
registered once at the edge of your application, the same place an
`AttributeResolver` implementation lives. That's the difference between this
and a raw `(subject, resource) => boolean` closure passed into a policy: a
closure can't be written to JSON, can't be explained, and can't be compiled
to a predicate — reintroducing it would undo the reason [the policy
ADT](/docs/concepts/policy-adt/) is schema-derived in the first place. A name
round-trips through `toJson`/`fromJson` exactly like every other node.

## Registered vs. unregistered is not allow vs. deny

<svg viewBox="0 0 680 280" width="100%" style="max-width: 680px" role="img" aria-label="Diagram: hasCustom names a check by string, resolved through the CustomPredicate registry at evaluation time. If the name is registered, the function runs and its boolean result becomes Allow or Deny. If the name has no entry, evaluation fails with CustomPredicateError — never a Deny — because a populated registry missing one entry is a wiring mistake, not a legitimate answer.">
  <defs>
    <marker id="cp-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
      <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--sl-color-gray-3)"/>
    </marker>
  </defs>
  <rect x="200" y="8" width="280" height="34" rx="7" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="340" y="30" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="12" fill="var(--sl-color-white)">hasCustom("isAuthor")</text>
  <path d="M 280 42 L 160 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#cp-arrow)"/>
  <path d="M 400 42 L 520 68" fill="none" stroke="var(--sl-color-gray-3)" stroke-width="1" marker-end="url(#cp-arrow)"/>
  <rect x="20" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">REGISTERED</text>
  <rect x="40" y="110" width="240" height="50" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="160" y="140" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">isAuthor(subject, resource)</text>
  <line x1="40" y1="180" x2="280" y2="180" stroke="var(--sl-color-hairline)"/>
  <text x="40" y="202" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.75 0.14 150)">true → Allow</text>
  <text x="40" y="224" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="oklch(0.65 0.16 25)">false → Deny</text>
  <rect x="380" y="70" width="280" height="190" rx="8" fill="none" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="94" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" font-weight="500" style="letter-spacing:0.1em" fill="var(--sl-color-accent-high)">NOT REGISTERED</text>
  <rect x="400" y="110" width="240" height="50" rx="6" fill="oklch(0.19 0.014 260)" stroke="var(--sl-color-hairline-light)"/>
  <text x="520" y="140" text-anchor="middle" font-family="var(--sl-font-mono, 'IBM Plex Mono', monospace)" font-size="11" fill="var(--sl-color-white)">no entry for "isAuthor"</text>
  <line x1="400" y1="180" x2="640" y2="180" stroke="var(--sl-color-hairline)"/>
  <text x="400" y="202" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-white)">CustomPredicateError</text>
  <text x="400" y="224" font-family="var(--sl-font, 'IBM Plex Sans', sans-serif)" font-size="10" fill="var(--sl-color-gray-3)">propagates as a failure — never Deny</text>
</svg>

Note that the right-hand outcome isn't drawn in Deny red on purpose. No
registry wired at all is an intentional fail-closed default —
`CustomPredicateNone` answers every name `false`, the same shape every other
unwired required service answers with. A registry that **is** wired but has
no entry for this particular name is different: almost certainly a typo in
`hasCustom`'s own `name` argument, and that's a wiring mistake, not a
legitimate "no". Reporting it as a denial would send whoever reads the
decision to go audit permissions instead of the typo — the same
"failure is not denial" rule that keeps a broken `AttributeResolver` lookup
from turning into a silent `Deny`.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  customPredicateFromRecord,
  DecisionHistoryUnknown,
  enforceProjected,
  EvaluationIdLive,
  fromRoles,
  hasCustom,
  RelationshipResolverNever,
} from "@qadi/core";

// The policy names a check by string; the check itself lives in the registry
// below, never in the policy.
const canReadOwnDraft = hasCustom("isAuthor");

const isAuthor = customPredicateFromRecord({
  isAuthor: (subject, resource) => Effect.succeed(resource?.["authorId"] === subject.id),
});

const services = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  isAuthor,
);

declare const loadDraft: (id: string) => Effect.Effect<{ id: string; authorId: string }>;

const program = loadDraft("draft-1").pipe(
  enforceProjected(canReadOwnDraft),
  Effect.provide(currentSubjectLayer(fromRoles({ id: "u1", roles: [] }))),
  Effect.provide(services),
);
// → { id: "draft-1", authorId: "u1" } when u1 wrote it; fails AccessDenied otherwise.
```

Two more boundaries worth knowing before reaching for this: `explain()`
renders a `HasCustom` node as an honest, opaque leaf — it names the check
without pretending to decompose logic it can't see — and `toPredicate`
refuses the node outright with `PolicyNotTranslatable` rather than
approximating it, since folding opaque logic to a resource-independent
expression could return rows a real evaluation would have denied. A policy
that reaches for `hasCustom` opts out of SQL/Prisma pushdown for that branch,
which is the cost of the escape hatch, not a bug in it.

For the full requirement set and the invariant backing the error-not-denial
split, see
[32 — Custom Predicates](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/32-custom-predicates.md)
and
[ADR-QD-055](https://github.com/leaderiop/qadi/blob/main/spec/decisions/055-a-named-registered-custom-predicate.md).
