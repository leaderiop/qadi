# 30 — Port Calls

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-30                                    |
> | Revision       | 1.4                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.4 (2026-10-07): BEH-QD-227 — each span's attributes are stated once, by its port's description (`attributes`: a question annotated before the call, an answer annotated after, and `disclose`), and `PortAccess.ts` writes through that statement; `qadi.attempts` joins the listing; the list of ports whose answers are closed is corrected (four, not two); BEH-QD-228 — `@qadi/devtools` reads a span through the same description (`decodePortSpan`), a value outside a field's closed union reads as absent, and a row carries `attempts`, and a signature row its `scope` and `resourceId` (ARCH-21, CCR-QD-198)<br>1.3 (2026-10-05): BEH-QD-227 — each span's name is read from its port's description (`span`, `PortSpanName`) by both `PortAccess.ts` and `@qadi/devtools`' collector; BEH-QD-229 — the Services screen shows timeouts beside retries (ADR-QD-094, CCR-QD-177)<br>1.2 (2026-10-04): BEH-QD-227/BEH-QD-228 — the spans move to `PortAccess.ts` and gain `qadi.interpreter`; BEH-QD-267 — `toPredicate`'s port reads are spans too (CCR-QD-153, ADR-QD-077)<br>1.1 (2026-09-08): BEH-QD-227/BEH-QD-228 — add the two missing port-touching leaves, `qadi.hasCustom`/`qadi.hasSignature`, and widen `PortCall` to the real five-member union (CCR-QD-131)<br>1.0 (2026-08-24): Initial release (CCR-QD-071) |

_Previous: [29 — The Subject Simulator](./29-devtools-simulator.md)_

---

What the evaluator asked its ports, and what they said. See
[ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md).

`portCallsTotal` could say a port had been called ninety-one times and nothing
else, and that is not an accident of implementation: its frequency is keyed on
the **port name** for cardinality, so an attribute name could never live in it.

## BEH-QD-227: A port span says what it asked

```ts
// packages/core/src/PortAccess.ts — spans, not exports
"qadi.attribute"        // qadi.attribute, qadi.subject_id, qadi.interpreter, qadi.resolved
"qadi.acted"            // qadi.subject_id, qadi.event, qadi.scope, qadi.resource_id, qadi.interpreter, qadi.answer
"qadi.hasRelationship"  // qadi.subject_id, qadi.relation, qadi.resource_id, qadi.depth, qadi.interpreter, qadi.answer
"qadi.hasCustom"        // qadi.custom_predicate, qadi.subject_id, qadi.interpreter, qadi.answer
"qadi.hasSignature"     // qadi.subject_id, qadi.meaning, qadi.scope, qadi.signer_role, qadi.resource_id, qadi.interpreter, qadi.matched
// and, on every one of them when a retrying wrapper ran the call: qadi.attempts
```

The listing is a reading aid. What a port's span says is **stated once, in its
description** — `PortDescription.attributes` (`PortSpan.ts`): the *question*
annotated before the call, the *answer* annotated after it, and `disclose`, the
projection from what the port returned to what the answer may say. A field's type
is a string, a number or a boolean and nothing else, so a field that could hold
arbitrary data does not compile ([INV-QD-044](../invariants.md)).
`qadi.attempts` is written between the two by the retrying wrappers
(`PortDerivation.ts`), once per call, with the number of times the call ran.

Each name is its port's description's `span` — a member of the closed
`PortSpanName` — and both `PortAccess.ts`, which opens the span, and
`@qadi/devtools`' `collectPortCalls`, which keeps it, read it there, so the two
cannot name different spans ([ADR-QD-094](../decisions/094-a-port-is-described-once.md)).

`qadi.interpreter` is `"evaluate"` or `"toPredicate"` (a closed pair): the span
says which interpreter asked. `qadi.hasRelationship`, `qadi.hasCustom` and
`qadi.hasSignature` are only ever emitted by `evaluate`, because translation
refuses those nodes before it would ask
([BEH-QD-123](./16-predicates.md#beh-qd-123-untranslatable-fails-nothing-is-approximated)),
so their value is always `"evaluate"`.

```
REQUIREMENT: `PortAccess.ts` MUST write a port span's attributes through the
             port's description, and `@qadi/devtools` MUST read them through the
             same description. No other module spells a port span's key.
```

Before ARCH-21 the writer and the reader each spelled thirteen keys and their
types, and the two drifted twice: a signature span's `qadi.scope` and
`qadi.resource_id`, and every retried call's `qadi.attempts`, were written and
never read. `scripts/check-house-style.mjs`'s `no-port-span-key-literals` refuses
a `"qadi.<key>"` literal in `PortAccess.ts`, `PortDerivation.ts` and devtools'
`PortCalls.ts`; the wire itself is pinned by the literal-key assertions in
`Evaluate.test.ts` and `Predicate.test.ts`, which a round trip through the codec
could not see.

```
REQUIREMENT: An attribute resolved through the port MUST emit a span naming the
             attribute and the subject.
```

`HasAttribute` was the only port-touching leaf without one.

```
REQUIREMENT: A span MUST NOT carry a resolved attribute's value.
```

[INV-QD-044](../invariants.md). `qadi.resolved` is a boolean. The other four
ports answer with closed enums (`DecisionHistory`, `RelationshipResolver`) or
booleans (`CustomPredicate`, and `SignatureHistory`'s `matched`) and are reported
in full; an attribute resolves to arbitrary data and the library cannot know what.
`attributeResolverPort.attributes.disclose` is the only path from a resolved value
to a span.

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

## BEH-QD-267: Translation's port reads are spans too

> **See:** [ADR-QD-077](../decisions/077-both-interpreters-read-ports-through-one-module.md)

```
REQUIREMENT: `toPredicate`'s reads of `AttributeResolver` and `DecisionHistory`
             MUST emit the same `qadi.attribute` / `qadi.acted` spans the
             evaluator emits, annotated `qadi.interpreter: "toPredicate"`, under
             the `qadi.toPredicate` span.
```

[ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md) decided that every
port call gets a span while the evaluator was the only caller. Translation reads
the same two ports through the same module (`PortAccess.ts`), so the same rule
holds: a deployment leaning on `toPredicate` for row-level security otherwise had
port load nothing could see. The interpreter annotation is what keeps the two
apart in a trace — without it a translation's reads would read as the evaluator's.

```
REQUIREMENT: An attribute the subject carries MUST emit no span under
             `toPredicate` either, and a resolved value MUST NOT be recorded.
```

[BEH-QD-227](#beh-qd-227-a-port-span-says-what-it-asked)'s subject-hit and
no-value requirements are properties of the read, not of who asked.

## BEH-QD-228: The calls are read back through a tracer, not a sink

```ts
export const collectPortCalls: (options?: { capacity?: number }) => PortCallCollector;
export type PortCall =
  | AttributeCall
  | ActedCall
  | RelationshipCall
  | CustomPredicateCall
  | SignatureHistoryCall;
```

Every `PortCall` carries an `interpreter` — `"evaluate"`, `"toPredicate"`, or
`undefined` when the span did not record one (an older `@qadi/core`, or a value
outside the pair), which reads as *not recorded* like every other field.

`CustomPredicateCall` and `SignatureHistoryCall` reuse the same `Effect.fn`
span-and-collect pattern as the other three: `askCustom` and `askSignature` in
`PortAccess.ts` are `Effect.fn("qadi.hasCustom")` /
`Effect.fn("qadi.hasSignature")` just as `askRelationship` is, and
`PortCalls.ts`'s single collector loop and per-port row table handle all five
span names uniformly — there is no second mechanism for the two custom/signature
leaves.

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
The check is the description's: `decodePortSpan(description, attributes)` decodes
each field on its own, so one wrong-typed attribute costs that field and not the
row, and a value outside a closed union (`scope` is `"Any"` or `"Resource"`, a
history answer is `"Acted"`, `"NotActed"` or `"Unknown"`) reads as absent exactly
as a wrong type does.

```
REQUIREMENT: A row MUST carry every fact its span records: a retried call's
             `attempts`, and a signature call's `scope` and `resourceId`.
```

Both were written and not read before ARCH-21. The Services screen says which
resource a signature lookup was about (or that it was about any), and how many
times a retried call ran.

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

```
REQUIREMENT: A port's card MUST show its timeouts (`qadi_port_timeouts_total`)
             beside its retries when there were any, and a port reached only by
             a timeout MUST still appear.
```

With every port able to carry a deadline, a timeout is the signal that tells a
slow store from a down one; until ARCH-10 nothing read the metric at all.
