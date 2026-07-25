# ADR-EG-009: Observability comes from Effect

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor carried three parallel notification mechanisms — an
`AuditTrailPort`, a `GuardEventSink` and a `GuardSpanSink` — plus a devtools
inspector. Each had its own interface, no-op implementation and wiring, and none
was connected to the others.

## Decision

Authorization decisions are reported through Effect's built-in tracing, logging
and metrics. `evaluate` runs inside a `guard.evaluate` span annotated with the
decision, subject id, evaluation id and policy tag.

`AuditTrailPort`, `GuardEventSink`, `GuardSpanSink`, `GuardInspector` and
`ClockSource` are all deleted.

## Consequences

**Positive**:

- Authorization appears in whatever tracing backend the application already
  uses, with no bespoke adapter.
- Four interfaces and their no-op implementations removed.

**Negative**:

- Consumers needing a durable, tamper-evident audit trail must build it on the
  tracing pipeline rather than getting a purpose-built port.

**Trade-off accepted**: a tamper-evident audit trail is a regulated-environment
concern, and regulated environments are explicitly out of scope
(ADR-EG-016). Shipping a port that only pretended to provide that guarantee was
worse than not shipping one.
