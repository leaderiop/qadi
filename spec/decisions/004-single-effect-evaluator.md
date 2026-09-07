# ADR-QD-004: One `Effect`-returning evaluator

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor had two evaluators. `evaluate` was synchronous and pure.
`evaluateAsync` resolved every attribute in the policy tree up front and then
delegated to the synchronous one.

Two consequences followed, both defects:

1. Short-circuiting was destroyed. An `anyOf` whose first branch allowed still
   paid for every attribute lookup in every other branch.
2. The asynchronous relationship API was unreachable. `RelationshipResolver`
   declared both `check` and `checkAsync`, but since evaluation ultimately ran
   synchronously, `checkAsync` was never called by anything.

## Decision

There is one evaluator. It returns
`Effect<Decision, EvaluationError, CurrentSubject | AttributeResolver | RelationshipResolver | EvaluationId>`.

Resolvers return `Effect`, so a resolver backed by a database or a remote
service is a first-class implementation rather than an unreachable branch.

## Consequences

**Positive**:

- Short-circuiting is restored and is asserted by tests that count resolver
  invocations.
- ReBAC checks can genuinely perform I/O.
- One code path to reason about and to test.

**Negative**:

- Callers who want a boolean must run an Effect; there is no pure synchronous
  entry point, which costs React a little ceremony (see ADR-QD-014).

**Trade-off accepted**: a synchronous fast path for RBAC-only policies would
reintroduce exactly the fork that produced the dead `checkAsync` API. One path
is worth the ceremony.

## Amendment (2026-09-07)

The canonical signature above names four environment services. The evaluator
has grown since: `evaluate` now returns
`Effect<Decision, EvaluationError, EvaluationServices>`, where

```ts
export type EvaluationServices =
  | CurrentSubject
  | AttributeResolver
  | RelationshipResolver
  | DecisionHistory
  | EvaluationId
  | CustomPredicate
  | SignatureHistory;
```

— seven services in total, added one at a time by later ADRs
([ADR-QD-012](./012-deterministic-time-and-ids.md) for `EvaluationId`,
[ADR-QD-020](./020-decision-history-port.md) for `DecisionHistory`,
[ADR-QD-055](./055-a-named-registered-custom-predicate.md) for `CustomPredicate`,
and [ADR-QD-058](./058-hassignature-a-ninth-service-and-a-decomposable-leaf.md)
for `SignatureHistory`). This does not change the
decision above — there is still exactly one evaluator, and it still returns a
single `Effect` rather than forking a synchronous path — it only updates the
type this document quotes to match `packages/core/src/Evaluate.ts` as it
stands today, rather than as it stood the day this ADR was written. The
original four-service signature is left above, unedited, as a record of what
was true then.
