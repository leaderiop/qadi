# ADR-QD-012: Time and identifiers come from services

> **Status:** Accepted
> **Date:** 2026-07-25

## Context

The predecessor's evaluator called `performance.now()`, `new Date()` and
`crypto.randomUUID()` directly. Every decision therefore carried values that no
test could predict, so its evaluation traces — the feature that justified
building traces at all — could not be asserted on.

## Decision

Durations come from Effect's `Clock`. Evaluation identifiers come from an
`EvaluationId` service.

`EvaluationId.ts` is the single sanctioned location for `crypto.randomUUID()`,
recorded as an explicit exemption in `scripts/check-house-style.mjs`. Everywhere
else the checker fails the build on ambient clock or UUID access.

## Consequences

**Positive**:

- Under `TestClock` and `evaluationIdSequential()` a decision is fully
  reproducible, so tests assert `evaluationId === "eval-1"` rather than merely
  that a string exists.
- The nondeterminism boundary is one named file rather than a convention.

**Negative**:

- Callers must provide an `EvaluationId` layer even for trivial checks.

**Trade-off accepted**: `EvaluationIdLive` is one line to provide, and the
alternative is traces that cannot be tested — which is how the predecessor
shipped a trace feature with no assertions on its content.
