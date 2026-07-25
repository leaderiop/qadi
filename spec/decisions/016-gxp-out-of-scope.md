# ADR-EG-016: GxP compliance is out of scope

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor carried substantial regulated-environment machinery: a
write-ahead log, a circuit breaker, a scope registry with TTL and rate limits, a
completeness monitor, hash-chained audit entries, electronic signatures, meta
audit, retention and decommissioning helpers, and an IQ/OQ/PQ validation
package.

Almost none of it was wired together. `createWriteAheadLog`,
`createCircuitBreaker`, `createScopeRegistry` and `createCompletenessMonitor`
were exported from the index and referenced nowhere else in the source. The one
place an audit write happened called `auditTrail.record()` directly: no WAL
append, no circuit breaker, no completeness tracking. The durability and
resilience guarantees the documentation advertised were available as parts but
never assembled.

The IQ/OQ/PQ package had the same character. Most of its operational
qualification steps were `typeof x === "function"` checks; one step labelled
"signature-related exports are accessible" tested three functions unrelated to
signatures, and another was hardcoded to pass.

## Decision

Regulated-environment support is out of scope. This library provides
authorization: tokens, policies, evaluation, enforcement, field-level
visibility.

## Consequences

**Positive**:

- The surface area shrinks to what is implemented, tested and true.
- No compliance affordance is offered that does not actually hold.

**Negative**:

- Consumers in regulated environments must build audit durability themselves,
  on the tracing pipeline (ADR-EG-009).

**Trade-off accepted**: shipping unassembled compliance primitives and
qualification evidence that asserts more than it tests is worse than shipping
neither. An auditable artefact claiming untested properties is a liability, not
a feature.
