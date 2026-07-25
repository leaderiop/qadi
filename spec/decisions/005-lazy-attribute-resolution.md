# ADR-EG-005: Attribute resolution is lazy and per-node

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Resolving an attribute may require I/O. Where that happens determines both cost
and information exposure.

The predecessor walked the whole policy tree collecting attribute names, resolved
every one, then evaluated. A policy of the form `anyOf(cheapRbacCheck,
expensiveAttributeCheck)` paid for the expensive lookup even when the cheap
branch allowed.

## Decision

Attributes are read at the node that needs them. The evaluator checks the
subject's own `attributes` first and calls `AttributeResolver` only on a miss.

## Consequences

**Positive**:

- Unevaluated branches cost nothing. Two tests assert this by counting resolver
  invocations rather than by inspecting timings.
- Fewer lookups means less incidental exposure of which attributes a policy
  consults.

**Negative**:

- Lookups are sequential by default, so a policy needing several attributes
  makes several round trips rather than one batch.

**Trade-off accepted**: `EvaluateOptions.concurrency` exists for callers who
would rather pay for speculative lookups than latency. Correct-and-cheap is the
right default; fast-and-wasteful is the opt-in.
