# ADR-QD-010: `Context.Service` with standalone layer constants

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Effect v4 offers several ways to declare a service. The reference projects in
this ecosystem use `Context.Service<Self, Shape>()("ns/Id")` uniformly, with
layers as top-level constants in their own files, and use neither
`Effect.Service` nor `Context.Tag`.

## Decision

Services follow that form. Shapes are separately exported `…Shape` interfaces.
Layers are exported constants; there are no `static layer` members and no
auto-generated `.Default`.

One documented departure from the reference: it uses `static current = X.use((x) => x)`
as an identity accessor. That only typechecks when the service Shape is itself
an `Effect`. Our shapes are plain records, so `use` is instead used as a
one-step method accessor: `AttributeResolver.use((r) => r.resolve(...))`. This
was found by the API canary test, not by reading.

## Consequences

**Positive**:

- Consistent with the surrounding ecosystem.
- Swapping an implementation is providing a different layer; nothing else changes.
- Test doubles are ordinary layers.

**Negative**:

- More boilerplate than `Effect.Service`, which generates a default layer.

**Trade-off accepted**: a library should not presume a default implementation
for services like `RelationshipResolver`, where the only safe default is to deny
everything. Being explicit is correct here.
