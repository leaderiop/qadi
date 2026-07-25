# ADR-QD-007: Permission tokens and the reserved separator

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

A permission is a resource plus an action. Subjects carry a pre-flattened set of
permission keys so a check is O(1).

The predecessor formatted the key as `` `${resource}:${action}` `` but never
constrained the segments. `{ resource: "a:b", action: "c" }` and
`{ resource: "a", action: "b:c" }` therefore produced the same key, `"a:b:c"`,
and each silently granted the other. Its deserializer compounded this by
splitting on the first colon, so a round trip could relocate the boundary.

## Decision

`Permission` is a hand-written interface with literal type parameters, so
`Permission<"doc", "read">` and `Permission<"doc", "write">` are incompatible at
compile time.

`:` is forbidden in either segment, enforced by a schema pattern
(`/^[^:]+$/`, which also rejects empty segments) at the trust boundary.

The wire format is a struct `{ resource, action }`, not a joined string, so
decoding requires no delimiter parsing at all.

## Consequences

**Positive**:

- Key collisions are unrepresentable.
- Round trips cannot relocate the segment boundary.
- Literal types are preserved for `InferResource` / `InferAction`.

**Negative**:

- Resources cannot use `:` as an internal namespace separator; `/` or `.` must
  be used instead.
- The encoded form is more verbose than a joined string.

**Trade-off accepted**: verbosity is irrelevant in a machine-read format, and
the naming restriction is a small price for eliminating silent cross-grants.
