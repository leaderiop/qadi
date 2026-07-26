# ADR-QD-013: Sequential short-circuit by default

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

There is **an opt-out**, and it is opt-in:
`EvaluateOptions.concurrency` ([ADR-QD-026](./026-concurrent-evaluation.md)).

*Restated in CCR-QD-029.* This paragraph read "there is currently **no** opt-out.
Parallel evaluation is planned but unimplemented; until it is designed properly,
this document does not pretend it exists." It exists now, and the shape matters
here more than elsewhere: supplying it changes which lookups happen and nothing
else. The decision and the whole trace are identical either way, so this
document's subject — that short-circuiting is the default — is unchanged, and
[INV-QD-005](../invariants.md#inv-qd-005-short-circuit-preservation) is scoped to
the default rather than repealed.

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
