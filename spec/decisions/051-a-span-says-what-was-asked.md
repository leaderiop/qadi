# ADR-QD-051 — A span says what was asked, and a tracer is what reads it back

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-051                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-071) |

---

## Context

The devtools Services panel could report that a port was called and how many
times. It could not say for whom, about what, or what came back — so a reviewer
asking "is my attribute store being consulted, and for which attributes?" got a
number.

Two causes, both recorded as gaps in `02-screens.md`. `readAttribute` was a
plain function, so nothing recorded that an attribute had been resolved at all;
and `qadi.acted` and `qadi.hasRelationship` were spans with no attributes on
them.

**Closing them is two decisions, not one, and the second is the one that was
missed.** Annotating a span improves what an OpenTelemetry backend shows and
does nothing for the dock: the devtools model reads `Metric` and only `Metric`,
and there was no `Tracer` code path in it anywhere.

The obvious readers were both already ruled out in this repository, by
`PortMetrics.ts`'s own doc comment:

- **Richer metrics cannot carry it.** The frequencies are keyed on the port name
  — three closed values — deliberately, for cardinality. An attribute name is
  unbounded, and a frequency keyed on one grows a permanent entry per distinct
  attribute ever read, in a structure held for the life of the registry.
- **A per-call sink was rejected** because it "would put a write on the
  evaluation's hot path for a debug view", and per-decision correlation because
  it "risks the short-circuit guarantee for a panel".

## Decision

**Every port call gets a span, and every port span says what it asked.**

| Span | Annotations |
| ---- | ----------- |
| `qadi.attribute` *(new)* | `qadi.attribute`, `qadi.subject_id`, `qadi.resolved` |
| `qadi.acted` | `qadi.subject_id`, `qadi.event`, `qadi.scope`, `qadi.resource_id`, `qadi.answer` |
| `qadi.hasRelationship` | `qadi.subject_id`, `qadi.relation`, `qadi.resource_id`, `qadi.depth`, `qadi.answer` |

**The new span covers the resolver path only.** `readAttribute` consults the
subject first and asks the port on a miss; that miss-only call is what preserves
short-circuiting. A span on the fast path would mean "an attribute was read",
which is not what the gap asks about — it asks what was *resolved* — and it
would charge the commonest branch for a debug view. A subject hit emits nothing,
which also makes the span and `portCallsTotal` agree about what happened rather
than counting two different things.

**Answers are recorded; attribute values are not** ([INV-QD-044](../invariants.md)).
`hasActed` and `hasRelationship` answer with closed three-valued enums. An
attribute resolves to arbitrary data, and a span attribute reaches whatever
backend the host wired — so `qadi.resolved` is a boolean saying a value came
back, never the value. This is the line `dehydrateDecisions` already draws with
`includeTrace`, for the same reason and with the same default.

**The question is annotated before the call, the answer after.** A span whose
port failed still says what it was asking; the alternative is the least useful
span there is. It costs an annotation on a path that would otherwise return
early, and that is the whole cost of the `MissingResourceId` case being legible.

**A collecting tracer is the reader.** `collectPortCalls` returns a
`Tracer.Tracer` layer and a snapshot. The span already exists, so keeping the
object adds nothing to the hot path, and the layer is opt-in by the host rather
than a cost core always pays. The pattern is not new — `Evaluate.test.ts` has
substituted the tracer to assert on spans since URS-QD-012; this promotes that
fixture into a capability.

**It wraps rather than replaces.** `Tracer.Tracer` is a `Context.Reference` with
a default, so a host that wired its own tracer has one in scope, and a panel
that shadowed it would silently turn an application's tracing off for as long as
the dock was mounted. The layer reads the tracer that was there and delegates
every span to it.

## Measurement

Per [ADR-QD-034](./034-the-switch-exception-is-measured.md), which is this
repository's habit: the claim carries a figure. A `resolver miss — one port call`
workload was added to `Evaluate.bench.ts`, because none of the existing ones
could see the change — every attribute in them is a subject hit.

| variant | µs/op |
| ------- | ----- |
| before | 8.69 |
| `Effect.fn` unnamed + annotations | 11.57 |
| named, no annotations | 12.60 |
| **shipped** | **13.35** |

+4.7 µs on a resolver miss: ≈2.1 µs for having a separate effectful function at
all, ≈1.8 µs for the span, ≈0.75 µs for the two annotations. **The annotations
are the cheap part.** Most of the figure is the cost `qadi.acted` and
`qadi.hasRelationship` have paid since they were written, now paid by the third
port too.

`one node` and `matcher-heavy` are unchanged and identical by construction: a
subject hit never evaluates the new function.

That workload's resolver answers from a record synchronously, so the tracing is
as large a fraction of the total as it can ever be — an upper bound rather than
an estimate. Against a store doing any real work it is invisible, and a caller
for whom it is not has a cheaper fix than a flag: **put the attribute on the
subject**, where the measurement says it costs nothing.

## Consequences

**The Services panel can answer its own question.** A count says a store was
asked; a row says what it was asked and what it said. Both are shown, and the
footer says which is which — the counts come from metrics and are process-wide,
the calls come from spans and are the recent ones this reader collected.

**A field a span did not record reads as *not recorded*.** Span attributes are
`unknown` and any producer can write into the `qadi.` namespace, so every read is
a type check and a wrong-typed value reads the same as an absent one. A reader
chasing a wiring problem needs to tell "it said nothing" from "nobody asked".

**The collector is bounded**, at 200 calls, and reports what it dropped. A full
ring looks exactly like a quiet one otherwise.

**Per-decision correlation is still not offered.** Nothing here threads a
collector through `evaluateNode`, so INV-QD-005 is untouched — a branch never
reached performs no lookup and now emits no span either.

## Alternatives considered

**Metrics with an attribute-name label.** Unbounded cardinality in a process-
lifetime structure. This is the objection `PortMetrics.ts` was written around.

**A per-call sink.** A write on the hot path for a debug view, rejected before.

**A span on every attribute read, subject hits included.** Would charge the
commonest branch, and would make the span disagree with the metric about what a
"port call" is.

**Recording the resolved value.** The obvious next request, and the reason
INV-QD-044 is written down rather than left to judgement.
