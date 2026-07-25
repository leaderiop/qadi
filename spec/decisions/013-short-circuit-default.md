# ADR-EG-013: Sequential short-circuit by default

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Composite policies could evaluate children concurrently. Concurrency lowers
latency but forfeits short-circuiting: every child starts, so every resolver
call happens whether or not its result is needed.

## Decision

Children are evaluated sequentially, stopping at the first denying child of an
`allOf` and the first allowing child of an `anyOf`.

The one exception is `fieldStrategy: "Union"` on an `anyOf`, which must see
every child in order to merge their field sets. This is a semantic requirement
of the strategy, not a performance choice, and is documented as such.

There is currently **no** opt-out. Parallel evaluation is
[planned](../roadmap.md#concurrent-evaluation) but unimplemented; until it is
designed properly, this document does not pretend it exists.

**`anyOf` honours an explicit `Intersection`** rather than silently downgrading
it to `First`. The predecessor special-cased only `"union"` and treated every
other value as short-circuit, so an explicit intersection was accepted by the
type system and then ignored.

## Consequences

**Positive**:

- Unevaluated branches cost nothing.
- Least-surprising semantics: a strategy the caller states is the strategy used.

**Negative**:

- A policy needing several independent remote lookups is slower than it could
  be, and until concurrent evaluation lands there is no way to opt out.

**Trade-off accepted**: authorization is on the request path, but so is the cost
of speculative lookups. Defaulting to the safe behaviour and leaving the fast
one unbuilt is the right order: a wrong-but-fast default cannot be fixed
compatibly, whereas adding an opt-in later can.
