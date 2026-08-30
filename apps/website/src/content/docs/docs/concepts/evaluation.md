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

For the deterministic-time requirement, the recursion-depth bound
(`PolicyTooDeep`), and the missing-resource/missing-action failure modes, see
[05 — Evaluator](https://github.com/leaderiop/qadi/blob/main/spec/behaviors/05-evaluator.md).
