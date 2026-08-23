# Draft (withdrawn) — Devtools is a sink consumer, never an evaluator dependency

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | never allocated                                |
> | Revision       | 0.2                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | **Withdrawn before allocation — superseded by [ADR-QD-044](../decisions/044-an-optional-decision-sink.md)** |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record (draft)           |
> | Change History | 0.2 (2026-08-24): Withdrawn; the audit that withdrew it recorded here (CCR-QD-060)<br>0.1 (2026-08-22): Initial draft from devtools design session |

---

**Do not implement this document.** It is kept, rather than deleted, because
what it got wrong is worth knowing and because its *intent* survived into the
decision that replaced it.

## What this draft decided

That the devtools would consume Effect's own tracing stream and add no evaluator
surface at all:

> **Client**: an in-page subscriber over the runtime's span/event stream;
> mounting the devtools adds a consumer, changes nothing about evaluation.
> **Server**: a dev-only transport in the `@qadi/http` integration forwards the
> same span data to the page.

## Why it was withdrawn

Audited against the code, it **could not deliver its own feature set**. Three
findings, each independently fatal:

**A span cannot carry what six of the seven screens need.** Span attributes are
flat primitives; a `Trace` is a tree. The denial `reason`, `visibleFields` and
the `resource` are on no span at all — and `Evaluate.ts` already documents a
deliberate cardinality objection to putting even the `reason` on one. Exactly one
screen, the decision log, was reachable this way, and it was missing a column.

**"Mounting the devtools adds a consumer" is false.** `Tracer.Tracer` is a
`Context.Reference` read *per span, from the fiber*, so a tracer must be in
context before evaluation runs. There is no `PubSub`, `Stream` or subscriber
registry for spans anywhere in `effect`. Effect's own devtools proves the shape:
`effect/unstable/devtools` ships `layer`, `layerSocket` and `layerWebSocket` —
three layer constructors and no `attach()`. React mount is structurally too late,
since `makeQadiAtoms(layer)` captures its layer at module scope. **Layering** adds
a consumer, at runtime construction, by the app author. Wiring is mandatory and
must be documented as such rather than promised away.

**The "dev-only transport in the `@qadi/http` integration" did not exist**, and
this draft described it as though it did. `packages/http/src` contains no
streaming, SSE, WebSocket or forwarding code of any kind.

A fourth, smaller: this draft's own stated consequence — "the devtools can only
show what spans carry" — was correct but badly understated. It reads as a limit
on richness. It was a limit on feasibility.

## What survived

The *principle* was right and is preserved verbatim in ADR-QD-044: **the devtools
must never become something evaluation depends on.** ADR-QD-009's deletion of
`AuditTrailPort`, `QadiEventSink`, `QadiSpanSink` and `QadiInspector` still
stands, and no bespoke always-on port came back.

What changed is the mechanism. `DecisionSink` is optional, read through
`Effect.serviceOption`, absent from `EvaluationServices`, one method, and — by
the type and by a guard at the call site — incapable of altering a decision. An
application that wires none is unaffected.

So the title of this draft turned out to be right by accident: the devtools *is*
a sink consumer. It consumes a Qadi sink, not Effect's tracing stream.

The claim that the simulator adds no second interpreter also survived, unchanged,
and is not restated in ADR-QD-044 because nothing challenged it.

See [ADR-QD-044](../decisions/044-an-optional-decision-sink.md) and
[24 — The Decision Sink](../behaviors/24-decision-sink.md).
