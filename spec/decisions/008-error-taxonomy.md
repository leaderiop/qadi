# ADR-QD-008: `Data.TaggedError` with codes derived from tags

> **Status:** Accepted — narrowed by ADR-QD-060/ADR-QD-072 for wire-crossing errors
> **Date:** 2026-07-25
> **Change history:** 2026-09-19 — status annotated to point forward. ADR-QD-060
> (2026-09-08) and ADR-QD-072 (2026-09-08) moved eleven of `QadiError`'s tags — the
> nine `EvaluationError`s that cross a process boundary, plus `AccessDenied` and
> `UndischargedObligation` — from `Data.TaggedError` to `Schema.TaggedError`, so
> this ADR's blanket "every error is a `Data.TaggedError`" decision no longer holds
> for them. The index already recorded this pattern for ADR-QD-060/072's own
> narrowing of ADR-QD-060 by ADR-QD-072; this entry had received no equivalent
> forward pointer despite being superseded in substance for the same eleven tags
> (100-lens audit, john-a-de-goes JD-04).

## Context

The predecessor allocated numeric `ACL###` codes by hand at each error
construction site. Codes collided: `ACL007` was documented as
"PolicyDeserializationFailed" and also assigned to `RoleGateError`, so any log
aggregation keyed on the code conflated two unrelated failures.

## Decision

Every error is a `Data.TaggedError` with a stable, plain tag such as
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
