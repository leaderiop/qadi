# 24 — The Decision Sink

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-24                                    |
> | Revision       | 1.14                                           |
> | Effective Date | 2026-10-08                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.14 (2026-11-15): BEH-QD-566 to BEH-QD-570 new — a failing sink is reported once, naming it; BEH-QD-181 the optional name; BEH-QD-182 a type escape, contained and reported; BEH-QD-185 the log's two catches; BEH-QD-187 a throwing send and hook (ARCH-93, ADR-QD-159, CCR-QD-437)<br>1.13 (2026-11-11): BEH-QD-451 added: an absent optional is an absent key on every record core emits; BEH-QD-183's note names decisionRecordFor (ARCH-71, ADR-QD-135, CCR-QD-413)<br>1.12 (2026-10-08): BEH-QD-187 — a receiver that reads the sent record can refuse it as `Inconsistent` when its decision contradicts its trace; the sender never writes one (ADR-QD-106, CCR-QD-301)<br>1.11 (2026-10-08): the `ObligationRecord` shape note — it names `subjectId`, `action` and `resourceId` (optional, identity not content) (BEH-QD-195, ADR-QD-105, CCR-QD-220)<br>1.10 (2026-10-07): BEH-QD-187 — the default refusal log's annotations come from `encodeRefusalAnnotations`, and an `onFailure` that throws on a refusal is contained (CCR-QD-193)<br>1.9 (2026-10-07): BEH-QD-182 names the single emitter (`SinkEmit.ts`); BEH-QD-183 — a record's request half is projected from the `Question` (ADR-QD-100, CCR-QD-189)<br>1.8 (2026-10-06): BEH-QD-187 — forwarding's `send` receives wire version 2, the one version a 0.11 receiver reads; a 0.9 sender must upgrade (ADR-QD-096 amendment, CCR-QD-182)<br>1.7 (2026-10-05): ARCH-11 — BEH-QD-185 rewritten for `makeDecisionLog` (one positive-integer bound; `decisionSinkRing` removed); BEH-QD-187's example is a log and a forwarder; BEH-QD-188 requires an ingested record to reach live readers; BEH-QD-313 (a reader sees each retained record once, across backlog and live) added (ADR-QD-097, CCR-QD-181)<br>1.6 (2026-10-05): BEH-QD-187 — `send` receives wire version 2; receivers upgrade before senders (ADR-QD-096, CCR-QD-180)<br>1.5 (2026-10-05): BEH-QD-187 — `send` receives a `SinkRecordJson` from `encodeSinkRecord`; an encode refusal never reaches `send` and is reported through `onFailure` as a `SinkRecordNotEncodable` (ADR-QD-095, CCR-QD-179)<br>1.4 (2026-09-08): BEH-QD-183's `DecisionRecord` ts-fence gained the two fields it omitted, `subjectId` and `cache`, matching the real class in `DecisionRecord.ts` (CCR-QD-132)<br>1.3 (2026-09-08): BEH-QD-187 — `onFailure` MUST receive the plain value `send` failed or died with, not an Effect `Cause` wrapping it; `decisionSinkForwarding` was handing the callback the raw `Cause` from `catchCause`, which does not match `error: unknown`'s documented meaning or the sibling `onDropped`/`onUnknownParent` convention (CCR-QD-122)<br>1.2 (2026-09-07): BEH-QD-181's `DecisionSinkShape.record` corrected from `DecisionRecord` to the actual `SinkRecord` (`DecisionRecord \| ObligationRecord`) (CCR-QD-110)<br>1.1 (2026-08-24): BEH-QD-187–188 — forwarding and ingest, so the topology is a choice of sink (CCR-QD-064)<br>1.0 (2026-08-23): Initial release (CCR-QD-060) |

_Previous: [23 — HTTP Enforcement](./23-http.md)_

---

Until this document, **nothing could observe a decision.**
[ADR-QD-009](../decisions/009-observability-via-effect.md) deleted the four ports
that once could, on the correct reasoning that always-on bespoke observability
machinery was worth removing — and what replaced them, Effect's spans and
metrics, cannot carry what a reader of a denial needs. A span attribute is a flat
primitive; a `Trace` is a tree. Metrics are process-wide aggregates; a decision is
one event.

`DecisionSink` closes that gap on the terms
[ADR-QD-031](../decisions/031-decision-cache.md) established for `DecisionCache`:
optional, absent unless wired, contributing nothing to `EvaluationServices`. See
[ADR-QD-044](../decisions/044-an-optional-decision-sink.md).

## BEH-QD-181: The sink is optional, and write-only

> **Invariant:** [INV-QD-036](../invariants.md#inv-qd-036-a-decision-record-is-complete)

```ts
export interface DecisionSinkShape {
  readonly name?: string | undefined;
  readonly record: (record: SinkRecord) => Effect.Effect<void>;
}
export class DecisionSink extends Context.Service<DecisionSink, DecisionSinkShape>()(…) {}
```

`SinkRecord` is `DecisionRecord | ObligationRecord` ([DecisionRecord.ts](../../packages/core/src/DecisionRecord.ts)):
what happened at the obligation gate is a distinct record from the decision
itself, and a sink is written to for both. An `ObligationRecord` names the
question it concerns by identity, never by content: `subjectId`, and `action` and
`resourceId` when the question had them (BEH-QD-195). The resource itself is on
the `DecisionRecord` only.

```
REQUIREMENT: `DecisionSink` MUST be read through `Effect.serviceOption`, and MUST
             NOT appear in `EvaluationServices`.
```

```
REQUIREMENT: An application that provides no sink MUST behave exactly as it did
             before one existed.
```

A sink may **name itself** (`name`, optional): a label a report carries, never an
input to a decision ([BEH-QD-567](#beh-qd-567-a-sink-may-name-itself-and-a-report-names-it-or-says-unnamed)).

The port is **write-only**: one method, taking a record and returning nothing.
Reading records back is a property of an implementation, never of this contract.
That is what lets a replicated or serverless deployment forward records
out-of-process without `@qadi/core` learning anything about transports — the
topology becomes a choice of sink, not a change to the evaluator.

## BEH-QD-182: A sink cannot change a decision

> **Invariant:** [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)

```
REQUIREMENT: Neither a sink that FAILS nor a sink that DIES may change the
             verdict, the trace, or the error a caller receives.
```

This is the invariant the whole design rests on, and it is enforced twice
because once was already proven insufficient.

**First, in the type.** `record` returns `Effect<void>` — a `never` error
channel — which makes a failing sink **unrepresentable except through a type
escape**, not merely discouraged: `Effect.fail` is not assignable to it, so a sink
that reports failure cannot be written without one — a predicate that claims
`never`, say. (This is stronger than first claimed for it, and the merge gate is
what established it, by rejecting a test that tried to build one.)

Note this is the *opposite* call from
[BEH-QD-175](./23-http.md#beh-qd-175-a-credential-store-that-breaks-is-an-outage),
where `never` on `SubjectExtractorShape.extract` was a defect. The difference is
which way the failure should propagate: an extractor that cannot reach its token
store *must* change the answer, so denying it an error channel forced implementors
into `Effect.die` or a false `anonymous`. A sink is the reverse — whatever happens
to it must never reach the decision — so it is given no way to say otherwise.

**Second, at the call site**, because the type leaves one gap. A **defect** is
still assignable: `Effect.die`, and — the realistic case — any implementation
whose body throws, since `Effect.sync` converts that into one. That is precisely
the subversion BEH-QD-175 recorded. So the one emitter, `sinkEmitter` in `SinkEmit.ts` (used by `evaluate` and by the obligation gate), suspends the call and wraps it in
`Effect.catchCause`: a sink that dies, throws, interrupts itself or leaks a typed
failure through a type escape does not reach the decision. The cause is contained
and **reported once** ([BEH-QD-566](#beh-qd-566-a-sink-that-fails-is-reported-once-for-every-record-it-loses)),
not swallowed: a sink that lost a record leaves a line saying so.

This is the inverse of the `Effect.orDie` [AGENTS.md §4](../../AGENTS.md) forbids
on evaluation paths, not an instance of it. That turns a failure into a defect;
this stops a bystander's defect from becoming an authorization outcome. **An
observer must never be able to deny.**

## BEH-QD-566: A sink that fails is reported once, for every record it loses

> **Invariant:** [INV-QD-337](../invariants.md#inv-qd-337-a-contained-sink-failure-is-reported-exactly-once-per-lost-record-naming-the-sink)
>
> **See:** [ADR-QD-159](../decisions/159-the-sink-emitter-reports-what-it-contains.md)

```
REQUIREMENT: Every cause the emitter contains — a defect, a throw (including one
             before `record` returns an effect), a self-interruption, a typed
             failure leaked through a type escape — MUST produce exactly one
             `Warn` line, `qadi: a decision sink failed; the record was not
             delivered`, per lost record, in the order the records were emitted.
```

```
REQUIREMENT: The line MUST be annotated `qadi.sink`, `qadi.record_tag`,
             `evaluationId` and `qadi.cause`, and MUST NOT annotate a subject, a
             resource, a resource id, a policy or an action.
```

The message is `qadi: a decision sink failed; the record was not delivered`. A sink
that loses nothing is not reported: a sink that records, and no sink at all, each
produce no line. `qadi.cause` renders the cause as the shipped sinks
already did, so a sink's own error text reaches the log. The order is the order
the records were emitted: an allow with duties reaches the sink twice, the
decision first and then the obligation record, and a sink that dies on both is
reported twice, in that order. Before ARCH-93 the emitter contained every cause
and reported none, so a failing sink lost its records and left no trace.

## BEH-QD-567: A sink may name itself, and a report names it or says unnamed

> **Invariant:** [INV-QD-337](../invariants.md#inv-qd-337-a-contained-sink-failure-is-reported-exactly-once-per-lost-record-naming-the-sink)
>
> **See:** [ADR-QD-159](../decisions/159-the-sink-emitter-reports-what-it-contains.md)

```
REQUIREMENT: A report MUST carry the sink's `name` as given, the empty string
             included, or `unnamed` when it has none.
```

```
REQUIREMENT: The name MUST be read only when a failure is reported, and a name
             that cannot be read MUST be reported as `unnamed`.
```

The name is a label a reader sees and nothing branches on it, as with
`AttributeResolverShape.name`. It is read on the failure path only, so a sink that
never fails costs nothing for having one, and it is read inside the containment,
so a getter that throws cannot end the report. `??`, not `||`: the empty string is
a name the sink chose.

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { DecisionSink } from "@qadi/core";

// A sink that names itself: a failure of it is reported as `qadi.sink = "billing-audit"`.
export const BillingAuditSink = Layer.succeed(DecisionSink, {
  name: "billing-audit",
  record: (record) => Effect.logDebug(`audited a ${record._tag}`),
});
```

The shipped sinks name themselves: `decisionSinkForwarding`, `decisionSinkAll`,
`decisionLog` (a log's sink), `evaluationEnvironment.shadow` (the sink a simulation
installs, which discards) and `AuditDecisionSinkLive`.

## BEH-QD-568: A report cannot change an outcome

> **Invariant:** [INV-QD-338](../invariants.md#inv-qd-338-no-report-on-the-sink-path-can-change-an-outcome-or-stop-a-later-fan-out-member),
> [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)
>
> **See:** [ADR-QD-159](../decisions/159-the-sink-emitter-reports-what-it-contains.md)

```
REQUIREMENT: A logger that throws, a `name` getter that throws, or a cause whose
             rendering throws MUST leave the verdict, the trace and the error a
             caller receives as they would be with no sink.
```

The report is built lazily and contained for the reason the sink is: an observer
must never be able to deny, and a report is the observer's own failure. A report
that could change an outcome would put back, one step later, the subversion the
emitter exists to close.

## BEH-QD-183: A record is complete

> **Note (CCR-QD-189).** A record's request half (`subjectId`, `policy`, `resource`, `action`) is projected from the `Question` by `decisionRecordFor` (`SinkEmit.ts`, which replaced `failedRecord` and `decidedRecord`, ARCH-71), so it cannot disagree with what was asked; an optional the question did not have is an absent key, never an `undefined`-valued one ([BEH-QD-451](#beh-qd-451-an-absent-optional-is-an-absent-key-on-every-record-core-emits)). `maxDepth` is deliberately not on the wire (ADR-QD-096).

> **Invariant:** [INV-QD-036](../invariants.md#inv-qd-036-a-decision-record-is-complete)

```ts
export interface DecisionRecord {
  readonly evaluationId: string;
  readonly at: number;
  readonly subjectId: SubjectId;
  readonly policy: Policy;
  readonly resource?: Resource | undefined;
  readonly action?: string | undefined;
  readonly cache?: CacheOutcome | undefined;
  readonly outcome: DecisionOutcome;
}
```

```
REQUIREMENT: A record MUST identify its policy, resource, action and start time,
             so that no consumer needs a side channel to interpret it.
```

A `Decision` alone cannot be interpreted, and the gaps are specific:

- **No action, no resource.** Both are `EvaluateOptions` inputs, consumed and
  dropped. A reader could not reconstruct the question that was asked.
- **No wall-clock time.** `evaluate` reads `Clock.currentTimeMillis` to compute
  `durationMillis` and then discards the start. Records could not be ordered.
- **No policy.** `Decision` carries `trace.policyTag`, a string, while `explain`
  takes a `Policy` — so *the explanation of a denial was unreachable from the
  denial*, which is the failure this library exists to prevent.

`at` comes from `Clock`, not `Date.now()`, so records are reproducible under
`TestClock` for the reason [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)
gives. It is the **start** time, so record order matches ask order; the end is
`at + durationMillis`.

`subjectId` is top-level rather than read off `Decision`'s own payload, because
a `Failed` record has no `Decision` to read it from — `evaluate` resolves
`CurrentSubject` before the code that can fail, so a consumer reads one field
regardless of outcome. `cache` is optional and observability-only: **absent**
means no `DecisionCache` was consulted at all, a different fact from a recorded
`"miss"`, which means one was asked and did not have it — a hit still produces
the same verdict, trace and fields as a miss
([INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)).

```
REQUIREMENT: A record MUST NOT claim an environment.
```

Core cannot know whether it runs in a browser, on a server, or at an edge, and a
field it must guess at is a field that is wrong somewhere. The environment is
stamped by the sink implementation, which does know — see BEH-QD-185.

## BEH-QD-451: An absent optional is an absent key on every record core emits

> **See:** [ADR-QD-135](../decisions/135-sink-record-fields-stated-once.md),
> [BEH-QD-183](#beh-qd-183-a-record-is-complete)
>
> **Invariant:** [INV-QD-096](../invariants.md#inv-qd-096-whatever-the-record-codec-emits-it-accepts)

```
REQUIREMENT: A record `evaluate` or an enforcing entry point emits MUST omit an
             optional field the question did not have: a `DecisionRecord` has no
             own `resource`, `action` or `cache` key when the question carried no
             resource, no action, or when no cache was consulted (or the outcome is
             `Failed`), and an `ObligationRecord` has no own `action` or `resourceId`
             key when the question had none. No emitted record carries an
             `undefined`-valued own key.
REQUIREMENT: A record so emitted MUST be `Equal` to the record its own wire
             form decodes to.
```

`obligationRecordFor` always omitted an absent identity key; the two decision
projections it sat beside passed `resource`, `action` and `cache` through as
possibly-`undefined` values, so a decision record carried `undefined`-valued own keys
and `Equal.equals` told it from its own round trip (`{ b: undefined }` is not `{}`).
`decisionRecordFor` (`SinkEmit.ts`) is the one projection of a question into a decision
record now, and leaves each absent one absent. A sink that reads `record.action` sees
`undefined` either way; one that tests `Object.hasOwn`, enumerates keys or compares
with `Equal.equals` sees the difference. The wire is unchanged: it never carried an
`undefined`-valued key, and the encoded value and the JSON text are the same
(INV-QD-096's named normalisation of an `undefined`-valued property as absent stays for
records a caller builds by hand).

## BEH-QD-184: A failure is recorded as a failure, never as a denial

> **Invariant:** [INV-QD-006](../invariants.md#inv-qd-006-failure-is-not-denial)

```ts
export type DecisionOutcome = Decided | Failed;
```

```
REQUIREMENT: An evaluation that raises MUST produce a `Failed` record, and the
             error MUST reach the caller unchanged.
```

```
REQUIREMENT: A denial MUST produce a `Decided` record.
```

An `EvaluationError` previously reached **no** observer: no span attribute, no
metric, no log. A deployment watching `qadi_decisions_total` saw a broken
attribute store as a *drop in traffic* — the one reading that sends an operator
somewhere other than the failing dependency.

Two consequences follow. `qadi_evaluation_errors_total` is added, a frequency
keyed on the error `_tag` (closed and small, for the cardinality reason
[BEH-QD-045](./06-services.md) gives for keying denials on the policy tag). And
the outcome is a closed two-tag union rather than an optional decision beside an
optional error: exactly one is always present, and a shape permitting both or
neither would push a "cannot happen" branch onto every consumer.

## BEH-QD-185: A decision log is bounded by default, with one bound

```ts
export const DEFAULT_LOG_CAPACITY: 500;
export const makeDecisionLog: (options: {
  readonly environment: string;
  readonly capacity?: number;
}) => Effect<DecisionLog>;
export interface DecisionLog {
  readonly environment: string;
  readonly capacity: number;
  readonly layer: Layer<DecisionSink>;
  readonly ingest: (record: SinkRecord, environment?: string) => Effect<void>;
  readonly snapshot: Effect<ReadonlyArray<StoredRecord>>;
  readonly clear: Effect<void>;
  readonly read: Effect<DecisionLogRead, never, Scope>;
  readonly readEntries: (after?: LogCursor) => Effect<DecisionLogEntries, never, Scope>;
}
```

```
REQUIREMENT: A decision log MUST be bounded by default, by one `capacity` that
             bounds both the retained backlog and how far a live reader may
             lag, and MUST reject a capacity that is not a positive integer.
```

Bounded by default, **unlike `decisionCacheLayer`**, and the asymmetry is the
point: a cache is normally scoped to one request and dies with it, while a record
log exists to be read later and so is long-lived by nature. An unbounded default
would be a memory leak in every application that wired one. The oldest
**arrival** is dropped first; `snapshot` and a reader's backlog are presented in
`storedRecordOrder`.

**One bound, not two.** The ring and the feed this replaced each had their own
(500 and 256 by default), kept "in step" by a comment that agreed on the
direction of eviction and not on the number — so which bound a reader met
depended on whether a row came through the backlog or the live stream. Devtools'
`DEFAULT_TIMELINE_CAPACITY` is now defined as `DEFAULT_LOG_CAPACITY`, not a
literal kept equal to it.

**Zero is refused.** The same number sizes the live buffer, and a zero-capacity
`PubSub` accepts nothing, so a log of zero would be a sink that silently keeps and
streams nothing. A negative capacity makes eviction's exit condition
unsatisfiable and a `NaN` one makes it always false — silently unbounding a log
that was asked to be bounded — so all are rejected at construction, as
[BEH-QD-166](./21-decision-cache.md) requires of the cache.

```
REQUIREMENT: `environment` MUST be required, and stated nowhere else.
```

A merged server/client timeline whose rows are unlabelled is the thing a
cross-environment record log most exists to prevent, and a default would let that
happen silently. It is stated once, at the producer: a reader takes it off each
record, and over SSE off each frame
([BEH-QD-314](./26-decision-stream.md#beh-qd-314-the-backlog-travels-on-the-stream-and-every-frame-names-its-producer)).
It is a plain `string`, not a closed union, because nothing branches on it: it is
a label a reader sees, not an input a decision is computed from. Closed unions
are reserved here for values that decide something.

The log is still one **implementation** of the write-only port
([BEH-QD-181](#beh-qd-181-the-sink-is-optional-and-write-only)): `layer` provides
`DecisionSink`, and the readable surface belongs to the log, never to the port
([ADR-QD-097](../decisions/097-a-decision-log-is-a-sink-and-its-own-history.md)).

**The log's two catches name the half that failed (ARCH-93).** `isolate("append")`
and `isolate("publish")` each report which half of the record path died and swallow
it. They do not let the other half run: the publish half's catch sits inside the
append half's, so an append defect skips the publish, and a publish defect comes
after the append. The publish catch is kept though nothing reaches it (`PubSub.publish`
on the sliding pubsub a log builds neither fails nor dies): without it the append
half's catch would report a publish defect as the append half. The half's name is
what the emitter cannot say ([BEH-QD-569](#beh-qd-569-a-shipped-sink-keeps-only-the-reports-that-change-behaviour-or-say-something-else)).

> **Rewritten in CCR-QD-181 (ARCH-11).** This requirement described
> `decisionSinkRing`, removed with `decisionSinkFeed` when one decision log
> replaced both. The superseded text:
>
> ## BEH-QD-185: The record ring is bounded by default
>
> ```ts
> export const decisionSinkRing: (options: {
>   readonly environment: string;
>   readonly capacity?: number;
> }) => { layer: Layer<DecisionSink>; snapshot: Effect<ReadonlyArray<StoredRecord>>; clear: Effect<void> };
> ```
>
> ```
> REQUIREMENT: `decisionSinkRing` MUST be bounded by default, and MUST reject a
>              capacity that is not a non-negative integer.
> ```
>
> Bounded by default, **unlike `decisionCacheLayer`**, and the asymmetry is the
> point: a cache is normally scoped to one request and dies with it, while a record
> log exists to be read later and so is long-lived by nature. An unbounded default
> would be a memory leak in every application that wired one. Oldest records are
> dropped first.
>
> A capacity that is negative makes the drop condition unsatisfiable and a `NaN`
> one makes it always false — silently unbounding a log that was asked to be
> bounded — so both are rejected at construction, as
> [BEH-QD-166](./21-decision-cache.md) requires of the cache.
>
> ```
> REQUIREMENT: `environment` MUST be required.
> ```
>
> A merged server/client timeline whose rows are unlabelled is the thing a
> cross-environment record log most exists to prevent, and a default would let that
> happen silently. It is a plain `string`, not a closed union, because nothing
> branches on it: it is a label a reader sees, not an input a decision is computed
> from. Closed unions are reserved here for values that decide something.

## BEH-QD-186: An evaluation id may be supplied

> **See:** [ADR-QD-012](../decisions/012-deterministic-time-and-ids.md), amended

```
REQUIREMENT: `EvaluateOptions.evaluationId`, when supplied, MUST become the
             decision's id.
```

```
REQUIREMENT: When it is absent, the default MUST be unchanged — a fresh id per
             call, cache hit or miss.
```

The default is right for a *repeat* of a question and wrong for a *continuation*
of one. A decision made on the server, dehydrated
([ADR-QD-028](../decisions/028-decision-hydration.md)), and re-checked on the
client is one story told in two places; with a freshly minted id at each end
there is nothing to join them by. Supplying the server's id makes that pair
expressible with no new correlation protocol.

Opt-in, so it is only ever a caller stating a relationship it knows about — Qadi
cannot infer one. `EvaluationId.next` is still read on both paths rather than
skipped, so whether a given call correlates cannot shift the ids the calls around
it receive.

## BEH-QD-187: A sink can forward, and a forwarder cannot break evaluation

```ts
export const decisionSinkForwarding: (options: {
  readonly send: (encoded: SinkRecordJson) => Effect<void, unknown>;
  readonly onFailure?: (error: unknown) => void;
}) => Layer<DecisionSink>;
export const decisionSinkAll: (sinks: ReadonlyArray<Layer<DecisionSink>>) => Layer<DecisionSink>;
```

```
REQUIREMENT: A `send` that fails OR dies MUST NOT change the decision, and MUST
             be reported.
```

```
REQUIREMENT: When `onFailure` is supplied, it MUST receive the plain value
             `send` failed or died with — not an Effect `Cause` wrapping it.
```

The default log for an encode refusal annotates `qadi.refusal`, `qadi.path` and
`evaluationId` through `@qadi/core`'s `encodeRefusalAnnotations`, the same three
every reporter uses (INV-QD-104); `onFailure` is called through
`reportEncodeRefusal`, so one that throws is logged, never this decision's defect.

The record `send` receives agrees with itself: its decision's verdict, fields, duties and reason are its trace root's, because `evaluate` builds the decision from the trace (`makeDecision`). A receiver's `decodeSinkRecord` refuses a record that does not, as `Inconsistent`, which a sender on this release never produces (INV-QD-170).

**Corrected in CCR-QD-122.** `onFailure` is typed `(error: unknown) => void`
and documented above as "Called when a record could not be delivered", which
reads as "you get the error" — the same convention `dehydrateDecisions`'
`onDropped` and `resolveRoleGraph`'s `onUnknownParent` both keep, handing their
callback a plain, meaningful value rather than an Effect-internal type. The
implementation instead passed `catchCause`'s raw `Cause.Cause<unknown>`
straight through, so a caller writing `onFailure: (error) =>
Sentry.captureException(error)` got a `Cause` object with no `.message`,
however `send` actually failed. `Cause.squash` now unwraps it before the
callback sees it.

**A throwing `send` and a throwing hook (ARCH-93).** A `send` that throws before it
returns an effect is a send failure: it reaches `onFailure` as the thrown error, or
the no-hook warning, as a `send` that fails or dies does. An `onFailure` that throws
is not the forwarder's to catch a second time: the emitter reports it once, naming
`decisionSinkForwarding`, so the forwarder's own outer catch, which wrote the same
line as the no-hook warning, is removed. The member line of `decisionSinkAll` names
the member that failed ([BEH-QD-570](#beh-qd-570-a-fan-out-names-the-member-that-failed-and-every-member-is-isolated)).

```
REQUIREMENT: `send` MUST receive the record as `encodeSinkRecord` produced it.
             A record `encodeSinkRecord` refuses MUST NOT reach `send`, and MUST
             be reported through `onFailure` as a `SinkRecordNotEncodable`, or,
             with no `onFailure`, by a log line distinct from a send failure's.
```

An encode refusal is not a delivery failure. Before ARCH-09 the encode ran
inside the same `catchCause` as `send`, so a record whose policy was nested too
deep for the schema encode — or one a receiver would refuse — was reported as
"could not be forwarded", and a `PolicyTooDeep` record, exactly the one an
operator wants to see, never left the process with nothing saying why. Now the
refusal names its reason and its path, and `send` only ever sees a value that
`JSON.stringify` renders and a receiver's `decodeSinkRecord` accepts
([ADR-QD-095](../decisions/095-sinkcodec-owns-both-directions.md)).

`send` receives wire version 2, the one version a receiver reads since 0.11.0.
A receiver older than 0.10 reads only version 1, so it upgrades before the
sender; and a 0.11 receiver refuses a 0.9 sender's version-1 records as
`UnsupportedVersion`, so that sender upgrades too — there is no compatibility
path ([ADR-QD-096](../decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)
and its 2026-10-06 amendment).

The in-process decision log answers "what did *this* process decide", and three
of the six deployments Qadi runs in cannot be served by that: a replicated server
has n logs and a reader reaches whichever one answered, a serverless function's
log dies with the invocation, and a browser talking to a separate API origin has two
processes of which one has no page.

**The topology is a choice of sink, not a change to the evaluator**
([ADR-QD-045](../decisions/045-the-topology-is-a-choice-of-sink.md)). This is
what makes the write-only port worth having: `send` is the seam, and which
socket, which store and which framing lie beyond it belong to the caller.

The failure rule is [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)
applied where it matters most — a devtools page being unreachable is the most
ordinary thing that can go wrong here, and an authorization request must not fail
because nobody is watching. Reported rather than silent, though: a forwarder
dropping every record while looking healthy is the defect `dehydrateDecisions`
had before `onDropped`.

```
REQUIREMENT: `send` MUST NOT block.
```

`record` is awaited inside the evaluation, deliberately, so records stay ordered
and reproducible under `TestClock`. A `send` performing a network round trip
therefore makes every decision wait for it. It must enqueue and drain elsewhere —
which is also why this takes a `send` rather than a socket: a transport that
batches is a better transport, and this layer has no business deciding how.

```
REQUIREMENT: `decisionSinkAll` MUST write to every sink given, in order.
```

Merging two `Layer`s for one service does **not** do this — the later simply
wins, and the first sink silently sees nothing. A server with devtools wants a
local decision log *and* a forwarder, so the fan-out is explicit. (A log is no
longer paired with a feed this way: one log is both
([BEH-QD-313](#beh-qd-313-a-reader-sees-each-retained-record-once-across-backlog-and-live)).) Sequential, because
these run inside the evaluation and a sink that would benefit from concurrency is
one already violating the rule above.

## BEH-QD-569: A shipped sink keeps only the reports that change behaviour or say something else

> **Invariant:** [INV-QD-337](../invariants.md#inv-qd-337-a-contained-sink-failure-is-reported-exactly-once-per-lost-record-naming-the-sink)
>
> **See:** [ADR-QD-159](../decisions/159-the-sink-emitter-reports-what-it-contains.md)

```
REQUIREMENT: A shipped sink MUST NOT report a failure the emitter also reports.
             It keeps its own catch only where the catch changes behaviour or
             names something the emitter cannot.
```

One failure, one line. Every warning on a sink's record path was classified, and
each decision is pinned by a test that counts the lines:

| # | Warning | Decision |
| - | ------- | -------- |
| W1 | the forwarder's encode refusal line | kept: it says something else (a refusal, not a delivery failure) |
| W2 | "an encode-refusal hook threw" | kept: it names the hook the sink was handed |
| W3 | the forwarder's no-hook "could not be forwarded" | kept: the sink handled the failure and returns success |
| W3b | the forwarder's `onFailure` call | kept: behaviour (BEH-QD-187), it logs nothing |
| W4 | the forwarder's outer catch for a throwing `onFailure` | **removed**: pure containment, so the emitter's report is the only one |
| W5 | the fan-out's member line | kept: it changes behaviour (later members still run), and gains `qadi.sink` |
| W6 | the log's append-half line | kept: it says which half died |
| W7 | the log's publish-half line | kept: without it the append half would be blamed (unreachable by a test) |
| W8 | the audit sink's outcome line | kept: a report, not containment |
| W9 | "an onOutcome hook threw" | kept: it names the caller's hook |
| W10 | the audit sink's commit failure | kept: a value, an outcome, not a line |

A sink that keeps a catch returns success, so the emitter sees nothing to report.

## BEH-QD-570: A fan-out names the member that failed, and every member is isolated

> **Invariant:** [INV-QD-338](../invariants.md#inv-qd-338-no-report-on-the-sink-path-can-change-an-outcome-or-stop-a-later-fan-out-member)
>
> **See:** [ADR-QD-159](../decisions/159-the-sink-emitter-reports-what-it-contains.md)

```
REQUIREMENT: A member that fails, including one that throws before returning an
             effect, MUST be reported once by the fan-out, `qadi: a fanned-out
             decision sink failed unexpectedly`, with `qadi.sink` naming the
             member or `unnamed`.
```

```
REQUIREMENT: A member that fails MUST NOT stop the members after it, whatever the
             logger does; a fan-out inside a fan-out MUST report at the
             innermost level only, and the emitter MUST NOT report it again.
```

The member's line is `qadi: a fanned-out decision sink failed unexpectedly`, annotated
`qadi.sink` and `qadi.cause`. The fan-out reports and returns success, so the emitter sees nothing. A member
whose `name` getter throws is reported as `unnamed`, and a logger that throws
while a member is reported does not stop the next member. An empty fan-out reports
nothing.

## BEH-QD-188: A log can ingest what another process decided

```ts
readonly ingest: (record: SinkRecord, environment?: string) => Effect<void>;
```

```
REQUIREMENT: `ingest` MUST stamp the environment it is given, not the log's own.
REQUIREMENT: An ingested record MUST reach every live reader of the log, as well
             as its backlog.
```

> **Amended in CCR-QD-181 (ARCH-11).** The first requirement said "not the
> ring's own". The second is new: the ring an aggregator ingested into reached
> no live reader, so an `Edge` record could not reach a devtools dock by any
> path (C10).

The receiving half of forwarding: a replica forwards, an aggregator ingests, and
one merged timeline exists somewhere a reader can actually reach.

`environment` is a parameter rather than the log's own field precisely because a
merged log holds rows from several processes — stamping them all with the
aggregator's label would erase the one distinction the merge exists to preserve.
It falls back to the log's label for a caller ingesting its own records.

```
REQUIREMENT: An ingested record MUST respect `capacity` like any other.
```

An aggregator taking records from n replicas is where an unbounded log would hurt
most, so there is one bound and one eviction path for both routes in.


## BEH-QD-313: A reader sees each retained record once, across backlog and live

> **Invariant:** [INV-QD-100](../invariants.md#inv-qd-100-a-log-reader-sees-every-retained-record-exactly-once)

```ts
export interface DecisionLogRead {
  readonly backlog: ReadonlyArray<StoredRecord>;
  readonly live: Stream<StoredRecord>;
}
readonly read: Effect<DecisionLogRead, never, Scope>;
```

```
REQUIREMENT: A `read` MUST hand over, together, every record the log retained
             when it was taken (`backlog`) and every record appended after
             (`live`), with no record lost between the two and none in both.
REQUIREMENT: `backlog` MUST be presented in `storedRecordOrder`; eviction MUST
             be by arrival.
REQUIREMENT: The guarantee MUST hold whatever other fibers record, ingest or
             read concurrently.
```

A host used to assemble this from two modules — read a ring's snapshot, then
subscribe to a feed — and lost every record made between the two under the
feed's default, or repeated its replay window otherwise (ARCH-11 C9). Neither
outcome was something a host could fix from outside: the handoff needs a
sequence number shared by the backlog and the stream. The log keeps it, and the
order of two steps is the whole mechanism — it appends before it publishes, and
a reader subscribes before it snapshots — so a record that lands between a
reader's subscription and its snapshot is in the snapshot and filtered out of the
live half by the snapshot's high-water mark.

A `DecisionLog` is a devtools `Source` as it is
([BEH-QD-203](./27-devtools-timeline.md)), and `/__decisions` serves the same
`read` per connection
([BEH-QD-314](./26-decision-stream.md#beh-qd-314-the-backlog-travels-on-the-stream-and-every-frame-names-its-producer)).
Exactly-once is per read: across several sources, or a reconnect, the timeline's
identity rule still absorbs a repeat
([INV-QD-039](../invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival)).

---

_Previous: [23 — HTTP Enforcement](./23-http.md)_
