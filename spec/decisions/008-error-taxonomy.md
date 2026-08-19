# ADR-QD-008: `Data.TaggedError` with codes derived from tags

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor allocated numeric `ACL###` codes by hand at each error
construction site. Codes collided: `ACL007` was documented as
"PolicyDeserializationFailed" and also assigned to `RoleGateError`, so any log
aggregation keyed on the code conflated two unrelated failures.

## Decision

Every error is a `Data.TaggedError` with a namespaced tag such as
`"AccessDenied"`. The `_tag` is the identity.

Stable numeric codes are derived from the tag by a single map declared
`satisfies Record<QadiError["_tag"], ...>`, so an error without a code is a
compile error and a duplicated code is visible in one place.

## Consequences

**Positive**:

- Collisions are caught by review of one table rather than by chance.
- Errors compose with `Effect.catchTag`, including the v4 array form.
- Adding an error without a code does not compile.

**Negative**:

- Tags are verbose at catch sites.

**Trade-off accepted**: verbosity at a catch site is a fair exchange for
exhaustiveness the compiler enforces.
