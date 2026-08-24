---
"@qadi/core": minor
"@qadi/devtools": minor
---

See what your ports were asked, not only that they were asked.

`qadi_port_calls_total` could tell you an attribute store had been consulted
ninety-one times and nothing else — its frequency is keyed on the port name, and
deliberately so, because an attribute name is unbounded and a metric keyed on one
grows an entry per distinct attribute for the life of the process.

**In `@qadi/core`**, resolving an attribute through the port now emits a
`qadi.attribute` span, and `qadi.acted` and `qadi.hasRelationship` carry what they
asked and what came back: the subject, the attribute or event or relation, the
resource where there is one, and the answer.

An attribute the **subject** carries emits nothing — that path asks no port, and
charging the commonest branch for a debug view would be the wrong trade. Short-
circuiting is untouched: a branch never reached still performs no lookup and now
emits no span either.

**The resolved value is never recorded.** `hasActed` and `hasRelationship` answer
with closed three-valued enums, safe to report. An attribute resolves to arbitrary
data and a span attribute reaches whatever backend you wired, so `qadi.resolved`
is a boolean saying a value came back — never the value. This is the line
`dehydrateDecisions` already draws with `includeTrace`.

Costs +4.7 µs on a resolver **miss**, measured against a resolver that answers
synchronously from a record — an upper bound, since that port costs nothing. Most
of it is the span rather than the annotations, and it is the same cost the other
two ports have always paid. If it matters to you, the cheapest fix is to put the
attribute on the subject, where it measurably costs nothing.

**In `@qadi/devtools`**, `collectPortCalls()` reads those spans back:

```ts
const collector = collectPortCalls();
// provide `collector.layer` where your evaluations run
const log = yield* collector.snapshot;
```

Hand `log` to `<DevtoolsDock portCalls={log} />` and the Services panel lists what
each port was actually asked, beside the counts it already showed. The two are
differently scoped and the panel says which is which: the counts come from metrics
and are process-wide, the calls come from spans and are the recent ones this
collector saw.

The collector **wraps** the tracer already in scope rather than replacing it, so
mounting the dock does not turn your application's tracing off. It is bounded at
200 calls and reports what it dropped.
