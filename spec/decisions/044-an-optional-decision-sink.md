# ADR-QD-044 — An optional decision sink: what ADR-QD-009 deleted, and what it did not

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-044                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-23): Initial release (CCR-QD-060) |

---

## Context

A devtools design proposed seven screens for inspecting authorization at
runtime, governed by a draft decision that the devtools would "consume the same
Effect tracing stream everything else does" and add no evaluator surface. An
audit of that draft against the code found it could not deliver its own feature
list, for three compounding reasons.

**Nothing in `@qadi/core` could observe a decision at all.** No `PubSub`, no
`Queue`, no callback, no sink. `DecisionHistory` is a *read* port whose header
rejects the write direction outright — an evaluator that writes is no longer
reproducible. The complete set of post-decision emissions was: six span
attributes, three process-global metrics, and one `logDebug` on denial.

**A span cannot carry what a reader of a denial needs.** Span attributes are flat
primitives; a `Trace` is a tree. The denial `reason`, `visibleFields`, and the
`resource` are on none of them — and `Evaluate.ts` already documents a deliberate
cardinality objection to putting even the reason on a span. Of the seven screens,
exactly one was reachable through spans, and that one was missing a column.

**An `EvaluationError` reached no observer whatsoever** — no span attribute, no
metric, no log. So the rule the devtools most needed to honour, *ERROR is not
DENY* ([ADR-QD-008](./008-error-taxonomy.md)), was unimplementable by any
consumer.

The obstacle is not incidental. [ADR-QD-009](./009-observability-via-effect.md)
deleted `AuditTrailPort`, `QadiEventSink`, `QadiSpanSink` and `QadiInspector`,
and a new sink looks exactly like undoing that.

## Decision

Add **`DecisionSink`**: one optional, write-only port, read through
`Effect.serviceOption` exactly as `DecisionCache` is
([ADR-QD-031](./031-decision-cache.md)).

This is not what ADR-QD-009 deleted, and the distinction is precise. What it
removed was *always-on, bespoke, parallel observability machinery* — four ports,
present in every application whether or not anything consumed them, duplicating
what Effect already provided. `DecisionSink` is:

- **absent unless wired.** It contributes nothing to `EvaluationServices`; an
  application that never provides one pays one `serviceOption` read.
- **one method**, not four ports.
- **not a duplicate of Effect's channels.** It carries the whole `Decision` and
  the `Policy` that produced it, which spans and metrics structurally cannot.
- **incapable of affecting evaluation** — see below.

ADR-QD-009's reasoning is preserved, not overturned: spans and metrics remain the
observability story for aggregate and cross-service concerns. The sink answers a
different question — "what exactly did this one evaluation decide, and why" —
that tracing was never going to answer.

Three properties make it safe to add:

**A sink cannot change a decision.** `record` returns `Effect<void>`, which makes
a failing sink *unrepresentable* — `Effect.fail` is not assignable to it. This is
the opposite call from [BEH-QD-175](../behaviors/23-http.md), where `never` on
`SubjectExtractorShape.extract` was a defect — an extractor's failure *must*
change the response, a sink's must not. The type leaves one gap, and it is the
one that finding named: a **defect** is still assignable, as `Effect.die` or as
any body that throws inside `Effect.sync`. So `evaluate` also wraps the call in
`Effect.catchCause`. Enforced twice, because the type alone was already proven
insufficient in this codebase.

**A record is complete.** It carries the `policy`, `resource`, `action` and start
time that `Decision` never did. The policy in particular is what makes `explain`
reachable from a decision — previously the explanation of a denial could not be
obtained from the denial.

**A failure is a distinct outcome.** `DecisionOutcome` is `Decided | Failed`, so
a broken dependency can never be recorded as, or mistaken for, a denial
([INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)).

`EvaluateOptions.evaluationId` is added alongside, opt-in, so a client re-check
can name the server decision it continues. The default — a fresh id per call —
is unchanged; see the amendment to [ADR-QD-012](./012-deterministic-time-and-ids.md).

## Alternatives considered

- **Enrich span attributes.** The draft's own proposal. Rejected on a hard
  ceiling rather than a preference: a `Trace` is a tree and span attributes are
  flat, so serializing one would be unbounded high-cardinality data that every
  APM backend truncates. `Evaluate.ts` had already rejected putting the far
  smaller `reason` on a span for that reason.

- **A `Tracer` layer that collects spans.** Workable for a log of verdicts, and
  genuinely additive. Rejected as the *primary* mechanism because it inherits the
  same ceiling — no tree, no reason, no resource — and because it must be layered
  at runtime construction anyway, so it is no cheaper to wire than a sink while
  delivering strictly less.

- **Reinstate `QadiEventSink` as it was.** Rejected: always-on, and it is what
  ADR-QD-009 removed on reasoning that still holds.

- **Keep it out of core, in `@qadi/react` only.** `DecisionEntry` there already
  pairs a policy with a decision, so a client-only devtools was the cheapest
  path. Rejected because it abandons every server-side deployment —
  `@qadi/http` is a shipped package and a backend-only service is a first-class
  topology.

## Consequences

- (+) A decision is observable, completely, for the first time.
- (+) `explain` becomes reachable from a decision, which is the whole
  explanation feature working end to end.
- (+) An `EvaluationError` becomes observable at all — independently valuable to
  any deployment, not only to a devtools.
- (+) The transport question stays out of core: an out-of-process sink serves the
  replicated and serverless topologies without the evaluator learning anything.
- (−) One more optional service, and optional services are the ones that get
  missed — `DecisionCache` was omitted from `spec/overview.md` for exactly that
  reason. `scripts/check-api-surface.mjs`, gate 13, now names this one.
- (−) A sink runs inside the evaluation, so a slow sink slows evaluation. It is
  awaited rather than forked deliberately: a fire-and-forget record would be
  unordered under `TestClock` and untestable. A sink that must do I/O should
  buffer and flush on its own schedule.
