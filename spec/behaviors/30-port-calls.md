# 30 — Port Calls

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-30                                    |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-071) |

_Previous: [29 — The Subject Simulator](./29-devtools-simulator.md)_

---

What the evaluator asked its ports, and what they said. See
[ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md).

`portCallsTotal` could say a port had been called ninety-one times and nothing
else, and that is not an accident of implementation: its frequency is keyed on
the **port name** for cardinality, so an attribute name could never live in it.

## BEH-QD-227: A port span says what it asked

```ts
// packages/core/src/Evaluate.ts — spans, not exports
"qadi.attribute"        // qadi.attribute, qadi.subject_id, qadi.resolved
"qadi.acted"            // qadi.subject_id, qadi.event, qadi.scope, qadi.resource_id, qadi.answer
"qadi.hasRelationship"  // qadi.subject_id, qadi.relation, qadi.resource_id, qadi.depth, qadi.answer
```

```
REQUIREMENT: An attribute resolved through the port MUST emit a span naming the
             attribute and the subject.
```

`HasAttribute` was the only port-touching leaf without one.

```
REQUIREMENT: A span MUST NOT carry a resolved attribute's value.
```

[INV-QD-044](../invariants.md). `qadi.resolved` is a boolean. The other two
ports answer with closed three-valued enums and are reported in full; an
attribute resolves to arbitrary data and the library cannot know what.

```
REQUIREMENT: An attribute the **subject** carries MUST emit no span.
```

`readAttribute` consults the subject first and asks the port on a miss, and that
miss-only call is what preserves short-circuiting. A span on the fast path would
mean "an attribute was read", which is a different claim — and would make the
span and `portCallsTotal` disagree about what a port call is.

```
REQUIREMENT: A branch that short-circuits MUST emit no span.
```

[INV-QD-005](../invariants.md) is untouched: a branch never reached performs no
lookup and now emits nothing either.

```
REQUIREMENT: A span MUST carry its question even when the port failed, or when
             the call was abandoned before it was made.
```

Annotated before the call rather than after. A `MissingResourceId` is a wiring
error, and a span recording one should say what it wanted a resource id *for*.
An `Any`-scoped history question carries no resource id even where the request
has one, because the span says what was **asked** rather than what was available.

## BEH-QD-228: The calls are read back through a tracer, not a sink

```ts
export const collectPortCalls: (options?: { capacity?: number }) => PortCallCollector;
export type PortCall = AttributeCall | ActedCall | RelationshipCall;
```

```
REQUIREMENT: The collector MUST delegate every span to the tracer already in scope.
```

`Tracer.Tracer` is a `Context.Reference` with a default, so a host that wired its
own tracer has one — and a devtools panel that shadowed it would silently turn an
application's tracing off for as long as the dock was mounted.

```
REQUIREMENT: The collector MUST NOT add work to the evaluation path.
```

The span already exists; keeping the object is the whole of it. A per-call sink
was rejected for the opposite reason, and that rejection is recorded in
`PortMetrics.ts` rather than only in an ADR.

```
REQUIREMENT: The log MUST be bounded, and MUST report what it dropped.
```

A full ring looks exactly like a quiet one otherwise. Ordering is by **start**,
which never reorders a row already on screen and leaves an in-flight call where
the reader last saw it.

```
REQUIREMENT: A call still in flight MUST NOT be reported as taking no time.
```

`durationMillis` is absent, not zero. A zero is a call that finished instantly.

```
REQUIREMENT: A field the span did not record MUST read as absent.
```

Span attributes are `unknown`, and any producer may write into the `qadi.`
namespace — so every read is a type check, and a wrong-typed value reads the same
as a missing one rather than being coerced into something a reader would chase.

## BEH-QD-229: The panel shows the counts and the calls, and says which is which

```
REQUIREMENT: Aggregate counts and individual calls MUST be distinguishable.
```

They answer different questions at different scopes. The counts come from
metrics and are **process-wide**; the calls come from spans and are the recent
ones **this reader** collected. A panel showing both without saying so would
invite a reader to subtract one from the other.

```
REQUIREMENT: An absent collector MUST be named, not left blank.
```

A card with no call list looks exactly like a port nothing asked — the two being
the difference between a finding and a missing layer.
