# ADR-EG-003: `_tag` is the discriminant

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor discriminated its policy union on a `kind` property. Effect's
ecosystem conventions — `Data.TaggedError`, `Schema.TaggedStruct`,
`Effect.catchTag`, `Match.tag` — are all built around `_tag`.

## Decision

Every discriminated union in this library uses `_tag`.

## Consequences

**Positive**:

- `Schema.TaggedStruct` and `Schema.Union` work without adaptation.
- Errors compose with `Effect.catchTag` directly.
- Pattern matching is available through `Match`.

**Negative**:

- A serialized policy from the predecessor cannot be read by this library.

**Trade-off accepted**: this is a ground-up rewrite with no compatibility
obligation. A migration script is cheaper than permanently swimming against the
ecosystem's conventions.
