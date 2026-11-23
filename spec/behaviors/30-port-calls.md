# 30 — Port Calls

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-30                                    |
> | Revision       | 1.11                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.11 (2026-11-23): BEH-QD-711 to BEH-QD-715 new: the evaluate family's spans carry their question on every path, the outcome is one key, and every key is declared once; the intro covers the spans around a question (ARCH-122, ADR-QD-188, CCR-QD-467)<br>1.10 (2026-11-16): a row's resourceId is classified by tag like its own, an unlisted tag gets never (review iteration 2 IN-02)<br>1.9 (2026-11-16): BEH-QD-588 new: the leaf-needs table states which leaves ask about one resource, and readScoped enforces it (ARCH-97, CCR-QD-441)<br>1.8 (2026-11-16): BEH-QD-574 new: one checked row builder, PortCall derived from the registry; BEH-QD-228's listing shows the derived form (ARCH-94, CCR-QD-438)<br>1.7 (2026-11-11): BEH-QD-227 — a missing resource id leaves the port's span and nothing else; BEH-QD-445 (a missing resource id fails the same way on every scoped port) (ARCH-70, ADR-QD-134, CCR-QD-412)<br>1.6 (2026-11-08): BEH-QD-227 — a span's question is the description's pose and its answer disclose, written by one read body; a local and a served span agree apart from the interpreter; onFile is on neither (ARCH-47, ADR-QD-109, CCR-QD-386)<br>1.5 (2026-10-08): BEH-QD-227 — `qadi.interpreter` gains `"remote"` for a served read; `PortCall.interpreter` follows (ARCH-31, CCR-QD-382)<br>1.4 (2026-10-07): BEH-QD-227 — each span's attributes are stated once, by its port's description (`attributes`: a question annotated before the call, an answer annotated after, and `disclose`), and `PortAccess.ts` writes through that statement; `qadi.attempts` joins the listing; the list of ports whose answers are closed is corrected (four, not two); BEH-QD-228 — `@qadi/devtools` reads a span through the same description (`decodePortSpan`), a value outside a field's closed union reads as absent, and a row carries `attempts`, and a signature row its `scope` and `resourceId` (ARCH-21, CCR-QD-198)<br>1.3 (2026-10-05): BEH-QD-227 — each span's name is read from its port's description (`span`, `PortSpanName`) by both `PortAccess.ts` and `@qadi/devtools`' collector; BEH-QD-229 — the Services screen shows timeouts beside retries (ADR-QD-094, CCR-QD-177)<br>1.2 (2026-10-04): BEH-QD-227/BEH-QD-228 — the spans move to `PortAccess.ts` and gain `qadi.interpreter`; BEH-QD-267 — `toPredicate`'s port reads are spans too (CCR-QD-153, ADR-QD-077)<br>1.1 (2026-09-08): BEH-QD-227/BEH-QD-228 — add the two missing port-touching leaves, `qadi.hasCustom`/`qadi.hasSignature`, and widen `PortCall` to the real five-member union (CCR-QD-131)<br>1.0 (2026-08-24): Initial release (CCR-QD-071) |

_Previous: [29 — The Subject Simulator](./29-devtools-simulator.md)_

---

What the evaluator asked its ports, and what they said, and the spans around a
question. See [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md) and
[ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md).

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

`qadi.interpreter` is `"evaluate"`, `"toPredicate"` or `"remote"` (a closed set of three, stated once in
`PortInterpreter.ts`): the span says which interpreter asked, or that the host was answering another
process ([BEH-QD-332](./34-remote-ports.md)). `qadi.hasRelationship`, `qadi.hasCustom` and
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
REQUIREMENT: A port span's question MUST be its description's `pose(request)` and
             its answer `disclose(answer, request)`, both written by `PortAccess.ts`'s
             one read body (`readPort`), and a local read and a served read of the
             same request MUST carry the same span attributes, `qadi.interpreter`
             aside.
```

The projection used to be stated twice, once on the span attributes and once on the
port's wire, and the two disagreed for the signature port: the served span lacked the
asker's `qadi.meaning` and `qadi.signer_role` and the `qadi.matched` answer that the
local span carried, so `@qadi/devtools` showed a served signature call as "not recorded,
no answer" ([ADR-QD-109](../decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
ARCH-47, [INV-QD-244](../invariants.md#inv-qd-244-a-ports-span-says-the-same-thing-whoever-asked)).
The asker's requirement crosses to a served read as part of the signature question, so both
spans can say it. `qadi.on_file` is recorded on **neither** span: the answer is `matched` only,
and a count of the records on file is kept off a span as a disclosure decision of its own
(ARCH-21). The wire states only JSON ([BEH-QD-332](./34-remote-ports.md)).

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

A `MissingResourceId` leaves the **port's own span and nothing else**, on every
resource-scoped port (`DecisionHistory` at Resource scope, `RelationshipResolver`,
`SignatureHistory`): the span carries the question and ends with the failure, no
helper span opens beside it, and the port is not called
([BEH-QD-445](#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port),
[ADR-QD-134](../decisions/134-a-resource-scoped-port-read-is-one-read.md)).

## BEH-QD-711: The evaluate span carries its question on every path

> **See:** [ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md),
> [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)
>
> **Invariant:** [INV-QD-395](../invariants.md#inv-qd-395-a-span-of-the-evaluate-family-carries-its-question-on-every-path-that-reaches-its-work)

```ts
// packages/core/src/EvaluationSpan.ts — package-private
"qadi.evaluate"  // question: qadi.subject_id, qadi.evaluation_id, qadi.policy_tag, qadi.action (when supplied)
```

```
REQUIREMENT: `qadi.evaluate` MUST carry `qadi.subject_id`, `qadi.evaluation_id`
             and `qadi.policy_tag`, and `qadi.action` when the question
             supplied one, annotated before the cache lookup and so before
             anything that can fail.
```

A failed evaluation used to carry only its outcome and its error tag, because the
question was annotated after the decision was made. A tracer filtering by subject
or by evaluation id therefore missed every evaluation that failed. The question is
now annotated first, so an allow, a denial, a cache hit and a failure all say who
asked what; the span of a failed evaluation is a question with an outcome of
`Failed` and an error tag, never a bare failure.

Pinned by `packages/core/test/EvaluationSpan.contract.test.ts` ("a failed evaluation carries exactly its question, outcome Failed and error tag", "a failed evaluation with an action carries exactly its question and error tag", "an allow carries exactly its question and outcome Allow", "a cache hit carries exactly its question and outcome", "each qadi.evaluate span in a batch carries exactly its question and outcome") and `packages/core/test/Evaluate.test.ts` ("a failed evaluation annotates qadi.evaluate with its question and error tag").

## BEH-QD-712: The outcome of an evaluation is one key on every path

> **See:** [ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md),
> [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)
>
> **Invariant:** [INV-QD-396](../invariants.md#inv-qd-396-one-fact-has-one-key-across-the-evaluate-family)

```ts
// packages/core/src/EvaluationSpan.ts — package-private
"qadi.evaluate"  // answer: qadi.outcome ("Allow" | "Deny" | "Failed"), qadi.error_tag (Failed only), qadi.obligations (an allow that owes some)
```

```
REQUIREMENT: The outcome of `qadi.evaluate` MUST be `qadi.outcome`, one of
             `Allow`, `Deny` and `Failed`, on every path. `qadi.error_tag`
             MUST appear only on `Failed`, and `qadi.obligations`, the ids
             comma-joined, only on an allow that owes some. `qadi.decision`
             MUST be written nowhere.
```

The outcome sat under two keys: `qadi.decision` on an allow or a denial and
`qadi.outcome` on a failure. A failure is not a decision, so `qadi.decision:
"Failed"` would say something false, and the record of a decision already calls
the same fact `outcome`. Nothing is written under both keys, so a tracer query on
`qadi.decision` moves to `qadi.outcome`.

Pinned by `packages/core/test/EvaluationSpan.contract.test.ts` ("an allow carries exactly its question and outcome Allow", "a denial carries exactly its question and outcome Deny", "an allow owing obligations carries exactly its question, outcome and ids", "an allow owing nothing carries no qadi.obligations key"), `packages/core/test/EvaluationSpan.test.ts` ("each of the three outcomes decodes and any other value reads as absent", "only the evaluate span carries the outcome key") and `packages/core/test/EvaluationSpan.tst.ts` ("the outcome is a decision tag or Failed").

## BEH-QD-713: A translation span carries its question before translating and its answer after

> **See:** [ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md),
> [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)
>
> **Invariant:** [INV-QD-395](../invariants.md#inv-qd-395-a-span-of-the-evaluate-family-carries-its-question-on-every-path-that-reaches-its-work)

```ts
// packages/core/src/EvaluationSpan.ts — package-private
"qadi.toPredicate"  // question: qadi.subject_id, qadi.policy_tag, qadi.action (when supplied)
                    // answer:   qadi.predicate_tag on success, qadi.error_tag on failure
```

```
REQUIREMENT: `qadi.toPredicate` MUST carry its question, the subject, the
             policy's tag and the action when supplied, before it admits the
             policy, and after it `qadi.predicate_tag` on success or
             `qadi.error_tag` on any failure.
```

`toPredicate` annotated nothing when a translation failed. It now answers an
error tag for every way a translation can end: a policy too deep, a fields
restriction, an untranslatable node or a port failure
([BEH-QD-123](./16-predicates.md#beh-qd-123-untranslatable-fails-nothing-is-approximated),
[BEH-QD-264](./16-predicates.md#beh-qd-264-a-defecting-port-fails-translation-typed-not-dead)).
It has no resource, because a translation answers for rows not yet loaded.

Pinned by `packages/core/test/EvaluationSpan.contract.test.ts` ("a translation carries its subject, policy tag and predicate tag, exactly", "a translation with an action carries exactly its question and predicate tag", "a policy too deep to translate carries exactly its question and PolicyTooDeep", "a fields restriction carries exactly its question and PolicyNotTranslatable", "an untranslatable node carries exactly its question and PolicyNotTranslatable", "a port failure in translation carries exactly its question and error tag").

## BEH-QD-714: The probe and the batch spans carry their questions

> **See:** [ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md),
> [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)
>
> **Invariant:** [INV-QD-395](../invariants.md#inv-qd-395-a-span-of-the-evaluate-family-carries-its-question-on-every-path-that-reaches-its-work)

```ts
// packages/core/src/EvaluationSpan.ts — package-private
"qadi.guardHealthCheck"      // question: qadi.subject_id, qadi.policy_tag, qadi.action (when supplied)
                             // answer:   qadi.healthy, qadi.error_tag (when unhealthy)
"qadi.decideSubjects"        // question: qadi.subject_count, qadi.policy_tag, qadi.action (when supplied)
"qadi.decideSubjectsStream"  // question: qadi.policy_tag, qadi.action (when supplied)
"qadi.decideSubject"         // keyless: the qadi.evaluate it opens carries the question
```

```
REQUIREMENT: `qadi.guardHealthCheck` MUST carry its question before the walk and
             answer `qadi.healthy` and, when unhealthy, `qadi.error_tag`.
             `qadi.decideSubjects` MUST carry `qadi.subject_count` and
             `qadi.policy_tag`, and `qadi.decideSubjectsStream`
             `qadi.policy_tag`, each with `qadi.action` when supplied.
```

A probe never said which subject or policy it probed, and a batch never said which
action. A stream has no subject count, because its length is not known before the
first element runs and may not be finite. A batch span answers nothing of its own:
each subject's decision is its own `qadi.evaluate` span
([BEH-QD-317](./05-evaluator.md#beh-qd-317-a-readiness-probe-asks-the-ports-every-time)).

Pinned by `packages/core/test/EvaluationSpan.contract.test.ts` ("a healthy probe carries exactly its question and qadi.healthy true", "an unhealthy probe carries exactly its question, healthy false and error tag", "a probe with an action carries exactly its question and qadi.healthy", "a batch with an action carries exactly its count, policy tag and action", "a streamed batch with an action carries exactly its policy tag and action") and `packages/core/test/GuardHealthCheck.test.ts` ("the probe span says what it asked and whether it was healthy").

## BEH-QD-715: Every key of the evaluate family is declared once and written only through its declaration

> **See:** [ADR-QD-188](../decisions/188-the-evaluate-familys-spans-are-declared-once-and-a-failed-span-says-what-was-asked.md),
> [ADR-QD-109](../decisions/109-a-ports-span-is-projected-once-and-every-read-is-one-body.md)
>
> **Invariant:** [INV-QD-396](../invariants.md#inv-qd-396-one-fact-has-one-key-across-the-evaluate-family)

```ts
// packages/core/src/EvaluationSpan.ts — package-private
evaluateSpan, toPredicateSpan, guardHealthCheckSpan,
decideSubjectsSpan, decideSubjectsStreamSpan  // each { name, question, answer }, built with spanStruct
denialEvent                                   // qadi.policy_tag, qadi.subject_id, qadi.reason
annotateSpan(struct, value)                   // the one way a writer annotates a struct
```

```
REQUIREMENT: Every key of the evaluate family MUST be spelled once, in
             `EvaluationSpan.ts`, with `qadi.subject_id` read from the port
             spans' `sharedQuestionKeys`. The four writers and the denial log
             line MUST write keys only through that declaration.
```

A tracer filtering on `qadi.subject_id` finds the port spans and the evaluate
family's under one key. A key typed by hand in library source is refused by
`[span-key-source]`, and one typed by hand in a test outside its counted goldens by
`[span-key-literal]`, both in `scripts/check-house-style.mjs`. The denial log line
keeps its message and its annotations, built from `denialEvent`, and stays a debug
log, so the reason sentence is not copied onto a span's attributes.

Pinned by `packages/core/test/EvaluationSpan.contract.test.ts` ("a denial logs policy denied with exactly its policy tag, subject and reason"), `packages/core/test/EvaluationSpan.test.ts` ("the question and the answer of each span share no key", "every span that asks shares one subject, policy tag and action field", "the three answers that can fail share one error tag field and key", "every field of every struct reads back what it wrote") and `packages/core/test/EvaluationSpan.tst.ts` ("every field of the family holds only span values", "each span name is a span key").

## BEH-QD-445: A missing resource id fails the same way on every scoped port

> **See:** [ADR-QD-134](../decisions/134-a-resource-scoped-port-read-is-one-read.md),
> [ADR-QD-051](../decisions/051-a-span-says-what-was-asked.md)
>
> **Invariant:** [INV-QD-288](../invariants.md#inv-qd-288-a-scoped-port-read-never-reaches-its-port-without-a-resource-id)

```
REQUIREMENT: A read of a resource-scoped port (`DecisionHistory` at Resource
             scope, `RelationshipResolver`, `SignatureHistory`) whose resource is
             absent, has no `id`, or has an `id` that is not a string MUST fail
             with `MissingResourceId`, whose `relation` is the name the leaf asks
             (the event, the relation or the meaning).

REQUIREMENT: That read MUST leave exactly one span, the port's own, carrying the
             question the leaf asked (the description's `pose`, with
             `qadi.scope` `"Resource"` where the span has one, and
             `qadi.interpreter`) and ending with the failure. No other span MAY
             open: there is no helper span, whichever port was asked.

REQUIREMENT: The port MUST NOT be called, and no call MUST be counted in
             `qadi_port_calls_total` or its sibling for the interpreter.
```

The check is one function, `readScoped` (`PortAccess.ts`), so the three ports cannot
disagree. Before it the check was written three times and the trace depended on the
copy: two reads opened a nested `qadi.requireScopedResourceId` span and the third
inlined the check to avoid it. `PortAccess.test.ts` checks the span list, the
question and `MissingResourceId.relation` for every scoped port in one table closed
over the three scoped ports, written out as a union so a fourth is a decision and not a side effect.

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
export type PortCall = { readonly [K in PortName]: PortCallOf<K> }[PortName];
```

`PortCall` is derived from the registry, so a sixth port is a member without an
edit here; the five named aliases (`AttributeCall`, `ActedCall`, `RelationshipCall`,
`CustomPredicateCall`, `SignatureHistoryCall`) are each `PortCallOf<…>` of their
port and stay.

Every `PortCall` carries an `interpreter` — `"evaluate"`, `"toPredicate"`, `"remote"`, or
`undefined` when the span did not record one (an older `@qadi/core`, or a value
outside the set), which reads as *not recorded* like every other field.

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

## BEH-QD-574: Call rows are built by one checked row builder, and PortCall is derived from the registry

```
REQUIREMENT: `ROWS` MUST hold one entry per port, each built by one monomorphic,
             fully type-checked row builder from the port's description, with
             no implementation type widened to `unknown`. `PortCall` MUST be
             derived from the registry, and the five named call aliases MUST
             stay.
```

A registry-wide builder cannot be typed without a widened implementation type:
`PortCallOf<K>` for a generic `K` holds a deferred conditional that no generic
expression is assignable to, and the way around it is an `unknown` the compiler
then stops checking. The builder is monomorphic per call site instead
(`rowOf(PORTS.AttributeResolver)`), so every entry is checked against its own
`PortCallOf<K>`. The five aliases stay because a caller names the call it
handles. A sixth port is one compiler-flagged line in `ROWS`
([BEH-QD-575](./28-devtools-screens.md#beh-qd-575-a-new-port-asks-devtools-only-for-what-the-compiler-names)).
Pinned by `PortCalls.test.ts` and the typecheck.

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

## BEH-QD-588: The leaf-needs table states which leaves ask about one resource; readScoped enforces it

> **See:** [ADR-QD-163](../decisions/163-what-a-leaf-needs-from-the-request-is-stated-once.md),
> [ADR-QD-134](../decisions/134-a-resource-scoped-port-read-is-one-read.md)
>
> **Invariant:** [INV-QD-288](../invariants.md#inv-qd-288-a-scoped-port-read-never-reaches-its-port-without-a-resource-id)

```
REQUIREMENT: `LEAF_NEEDS` MUST state, per leaf, whether it asks a port about one
             resource: `HasRelationship` always, `HasActed`, `HasNotActed` and
             `HasSignature` when their scope is Resource, no other leaf. A leaf
             the table says asks about one resource MUST fail with
             `MissingResourceId` when its resource has no id, as
             `readScoped` decides.

REQUIREMENT: `readScoped` MUST remain the one point that enforces it: it records
             the question on the port's own span first, then fails with the
             `MissingResourceId` that `errorOf` builds, so the read still leaves
             that one span and nothing else
             ([BEH-QD-445](#beh-qd-445-a-missing-resource-id-fails-the-same-way-on-every-scoped-port)).
```

The table is the statement and `readScoped` is the enforcement, so the question
is on the span before the failure, which a check in the leaf's arm would have
lost. `LeafNeeds.test.ts` ties each row's `resourceId` to what `readScoped` does,
and `LeafNeedOf` ties it to the leaf's tag: a row's `resourceId` comes from closed
tag lists in which an unlisted tag gets `never`, so a row that states the wrong
one, or a leaf no list names, does not compile (`LeafNeeds.tst.ts`). `readScoped`
does not read the column.
