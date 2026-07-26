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
