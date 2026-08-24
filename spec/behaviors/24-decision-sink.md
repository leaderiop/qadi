# 24 — The Decision Sink

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-24                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-08-23                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-08-24): BEH-QD-187–188 — forwarding and ingest, so the topology is a choice of sink (CCR-QD-064)<br>1.0 (2026-08-23): Initial release (CCR-QD-060) |

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
  readonly record: (record: DecisionRecord) => Effect.Effect<void>;
}
export class DecisionSink extends Context.Service<DecisionSink, DecisionSinkShape>()(…) {}
```

```
REQUIREMENT: `DecisionSink` MUST be read through `Effect.serviceOption`, and MUST
             NOT appear in `EvaluationServices`.
```

```
REQUIREMENT: An application that provides no sink MUST behave exactly as it did
             before one existed.
```

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
channel — which makes a failing sink **unrepresentable**, not merely
discouraged: `Effect.fail` is not assignable to it, so a sink that reports
failure cannot be written at all. (This is stronger than first claimed for it,
and the merge gate is what established it, by rejecting a test that tried to
build one.)

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
the subversion BEH-QD-175 recorded. So `evaluate` wraps the call in
`Effect.catchCause`, and a dying sink is swallowed whole.

This is the inverse of the `Effect.orDie` [AGENTS.md §4](../../AGENTS.md) forbids
on evaluation paths, not an instance of it. That turns a failure into a defect;
this stops a bystander's defect from becoming an authorization outcome. **An
observer must never be able to deny.**

## BEH-QD-183: A record is complete

> **Invariant:** [INV-QD-036](../invariants.md#inv-qd-036-a-decision-record-is-complete)

```ts
export interface DecisionRecord {
  readonly evaluationId: string;
  readonly at: number;
  readonly policy: Policy;
  readonly resource?: Resource | undefined;
  readonly action?: string | undefined;
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

```
REQUIREMENT: A record MUST NOT claim an environment.
```

Core cannot know whether it runs in a browser, on a server, or at an edge, and a
field it must guess at is a field that is wrong somewhere. The environment is
stamped by the sink implementation, which does know — see BEH-QD-185.

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

## BEH-QD-185: The record ring is bounded by default

```ts
export const decisionSinkRing: (options: {
  readonly environment: string;
  readonly capacity?: number;
}) => { layer: Layer<DecisionSink>; snapshot: Effect<ReadonlyArray<StoredRecord>>; clear: Effect<void> };
```

```
REQUIREMENT: `decisionSinkRing` MUST be bounded by default, and MUST reject a
             capacity that is not a non-negative integer.
```

Bounded by default, **unlike `decisionCacheLayer`**, and the asymmetry is the
point: a cache is normally scoped to one request and dies with it, while a record
log exists to be read later and so is long-lived by nature. An unbounded default
would be a memory leak in every application that wired one. Oldest records are
dropped first.

A capacity that is negative makes the drop condition unsatisfiable and a `NaN`
one makes it always false — silently unbounding a log that was asked to be
bounded — so both are rejected at construction, as
[BEH-QD-166](./21-decision-cache.md) requires of the cache.

```
REQUIREMENT: `environment` MUST be required.
```

A merged server/client timeline whose rows are unlabelled is the thing a
cross-environment record log most exists to prevent, and a default would let that
happen silently. It is a plain `string`, not a closed union, because nothing
branches on it: it is a label a reader sees, not an input a decision is computed
from. Closed unions are reserved here for values that decide something.

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
  readonly send: (encoded: unknown) => Effect<void, unknown>;
  readonly onFailure?: (error: unknown) => void;
}) => Layer<DecisionSink>;
export const decisionSinkAll: (sinks: ReadonlyArray<Layer<DecisionSink>>) => Layer<DecisionSink>;
```

```
REQUIREMENT: A `send` that fails OR dies MUST NOT change the decision, and MUST
             be reported.
```

The in-process ring answers "what did *this* process decide", and three of the
six deployments Qadi runs in cannot be served by that: a replicated server has
n rings and a reader reaches whichever one answered, a serverless function's ring
dies with the invocation, and a browser talking to a separate API origin has two
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
local ring *and* a forwarder, so the fan-out is explicit. Sequential, because
these run inside the evaluation and a sink that would benefit from concurrency is
one already violating the rule above.

## BEH-QD-188: A log can ingest what another process decided

```ts
readonly ingest: (record: SinkRecord, environment?: string) => Effect<void>;
```

```
REQUIREMENT: `ingest` MUST stamp the environment it is given, not the ring's own.
```

The receiving half of forwarding: a replica forwards, an aggregator ingests, and
one merged timeline exists somewhere a reader can actually reach.

`environment` is a parameter rather than the ring's own field precisely because a
merged log holds rows from several processes — stamping them all with the
aggregator's label would erase the one distinction the merge exists to preserve.
It falls back to the ring's label for a caller ingesting its own records.

```
REQUIREMENT: An ingested record MUST respect `capacity` like any other.
```

An aggregator taking records from n replicas is where an unbounded log would hurt
most, so there is one bound and one eviction path for both routes in.

---

_Previous: [23 — HTTP Enforcement](./23-http.md)_
