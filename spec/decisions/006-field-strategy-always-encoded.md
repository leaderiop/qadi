# ADR-QD-006: `fieldStrategy` is required and always encoded

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

Composite policies merge the visible-field sets of their children. The strategy
— intersection, union, or first — materially changes what a caller may read.

In the predecessor it was an optional property that the serializer never wrote,
so it silently reverted to the default on reload.

## Decision

`fieldStrategy` is a required field on `AllOf` and `AnyOf` in the schema, so it
is always encoded and always decoded. The combinators supply a default at
construction (`Intersection` for `allOf`, `First` for `anyOf`), which means
callers still need not think about it, but the value is concrete from that point
on.

## Consequences

**Positive**:

- The strategy survives a round trip; the verified defect cannot recur.
- A stored policy is fully self-describing.

**Negative**:

- Encoded policies are slightly larger, and hand-written policy JSON must
  include the field.

**Trade-off accepted**: a few bytes against a silent, security-relevant change
in behaviour is not a close call.
