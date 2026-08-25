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

## Amendment (2026-08-23, CCR-QD-060)

`EvaluateOptions.evaluationId` lets a caller supply the identifier instead of
minting one. This does not weaken the decision above: the id still comes from a
service on every path, `EvaluationId.next` is still read whether or not the
option is present, and the default — a fresh id per call, cache hit or miss — is
untouched.

What it admits is that "one evaluation, one identifier" and "one *question*, one
identifier" are different rules, and the evaluator was enforcing the first while
callers needed the second. A decision made on the server, dehydrated, and
re-checked on the client is one question answered twice; with a freshly minted id
at each end nothing joins the two, and the re-check reads as unrelated work.
`Evaluate.ts` argues against a *cached* decision reusing an id — two log lines
claiming to be the same event — and that argument still holds, because a cache
hit is a repeat rather than a continuation. Only a caller can tell the two apart,
so only a caller may say.

See [ADR-QD-044](./044-an-optional-decision-sink.md) and
[BEH-QD-186](../behaviors/24-decision-sink.md).
