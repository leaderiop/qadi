# 26 — The Decision Stream

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-26                                    |
> | Revision       | 1.6                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.6 (2026-10-05): ARCH-11 — BEH-QD-201 rewritten for the decision log's live half; BEH-QD-202 takes a `DecisionLogReader`; BEH-QD-904's frame carries the stored-record envelope; BEH-QD-907 (the backlog travels on the stream, every frame names its producer), BEH-QD-908 (`decisionBacklogRoute`) and BEH-QD-909 (resume on reconnect) added (ADR-QD-904, CCR-QD-905)<br>1.5 (2026-10-05): BEH-QD-201 — the stale `publishUnsafe` sentence corrected to what the code does (`publish`, and why) (CCR-QD-905)<br>1.4 (2026-10-05): BEH-QD-904 — a frame's data is wire version 2 (ADR-QD-903, CCR-QD-904)<br>1.3 (2026-10-05): BEH-QD-904 — one record never ends the feed; a refused record drops only its frame and is reported through `onRefused` or a warning; frames carry `encodeSinkRecordString`'s text (ADR-QD-902, CCR-QD-903)<br>1.2 (2026-10-04): `reauthCheck`'s signature corrected to `EnforcementErrorClass` or `"extraction-failed"` — it has classified an enforcement failure as `denied`, `outage` or `wiringMistake` since GR-01/TS-01, and the standing-services requirement set is now the named `StandingEvaluationServices` (ADR-QD-081, CCR-QD-155)<br>1.1 (2026-09-07): BEH-QD-202 — `decisionStreamRoute`'s optional `reauth`, a periodic re-extraction and re-evaluation against an open connection so a revoked principal's stream ends, documented for the first time (`DecisionStreamOptions`, `reauthCheck`; ADR-QD-046 Rev 1.1) (CCR-QD-110)<br>1.0 (2026-08-24): Initial release (CCR-QD-065) |

_Previous: [25 — Inspection](./25-inspection.md)_

---

The transport, built on the seam
[ADR-QD-045](../decisions/045-the-topology-is-a-choice-of-sink.md) left: a
decision log in `@qadi/core` that is a sink, a backlog and a live stream at once,
and routes in `@qadi/http` that serve it. See
[ADR-QD-046](../decisions/046-a-decision-feed-is-sse-and-guarded.md) and
[ADR-QD-904](../decisions/904-a-decision-log-is-a-sink-and-its-own-history.md).

## BEH-QD-201: A decision log's live half never blocks, and every reader gets its own copy

> **Rewritten in CCR-QD-905 (ARCH-11).** The feed this requirement described,
> `decisionSinkFeed`, is gone: one decision log
> ([BEH-QD-185](./24-decision-sink.md)) is the sink, the backlog and the live
> stream, so the feed's guarantees now belong to the log's live half. Nothing a
> reader could rely on was weakened; the bound became the log's one `capacity`.

```ts
export interface DecisionLog {
  readonly layer: Layer<DecisionSink>;
  readonly read: Effect<DecisionLogRead, never, Scope>;
  // …
}
export interface DecisionLogRead {
  readonly backlog: ReadonlyArray<StoredRecord>;
  readonly live: Stream<StoredRecord>;
}
```

```
REQUIREMENT: Publishing to live readers MUST NOT block or fail, whatever the
             readers are doing — including when there is no reader at all.
```

A `PubSub.sliding` drops a reader's oldest unread entry when full, so a slow or
absent reader costs the evaluation nothing — the only acceptable behaviour for
something an authorization decision waits on
([INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).
`publish` rather than `publishUnsafe`: `publishUnsafe` only tries the raw buffer
and returns `false` on a full one without consulting the configured strategy, so
it refused the *newest* record and kept the stale backlog, inverting the
newest-wins policy. Sliding eviction lives in the strategy, which only `publish`
reaches, and for a sliding `PubSub` that path is synchronous throughout, so the
awaited form costs no blocking.

**Sliding rather than dropping.** A reader that falls behind wants the most
recent decisions, not the oldest ones from before it stalled — the same newest
-wins direction the log's backlog evicts by, and now the same *number*: one
`capacity` bounds both, so a reader sees one policy rather than two.

```
REQUIREMENT: Each reader MUST receive its own copy.
```

Two open devtools pages must not steal records from one another: every `read`
subscribes on its own.

The superseded text, kept for the record:

> ## BEH-QD-201: A feed buffers, and publishing never blocks
>
> ```ts
> export const decisionSinkFeed: (options?: {
>   readonly capacity?: number;
>   readonly replay?: number;
> }) => Effect<{ layer: Layer<DecisionSink>; stream: Stream<SinkRecord> }>;
> ```
>
> ```
> REQUIREMENT: Publishing MUST NOT block or fail, whatever the reader is doing —
>              including when there is no reader at all.
> ```
>
> ADR-QD-045 deferred this and said why: `decisionSinkForwarding`'s `send` carries
> a contract the type cannot express, and a buffer removes that hazard rather than
> warning about it, but building one against no transport would have been
> speculative. There is a transport now.
>
> A `PubSub.sliding` drops its oldest entry when full, so a slow or absent reader
> costs the evaluation nothing — the only acceptable behaviour for something an
> authorization decision waits on
> ([INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).
> `publish` rather than `publishUnsafe`: `publishUnsafe` only tries the raw buffer
> and returns `false` on a full one without consulting the configured strategy, so
> it refused the *newest* record and kept the stale backlog, inverting the
> newest-wins policy. Sliding eviction lives in the strategy, which only `publish`
> reaches, and for a sliding `PubSub` that path is synchronous throughout, so the
> awaited form costs no blocking.
>
> > **Corrected in CCR-QD-905.** This paragraph previously read:
> >
> > `publishUnsafe` rather than `publish`, because the awaiting form would reintroduce
> > exactly the blocking this removes.
> >
> > The code had used `publish` since the newest-wins defect was found, and said
> > why in `DecisionSinkFeed.ts`; the spec stated the opposite.
>
> **Sliding rather than dropping.** A reader that reconnects wants the most recent
> decisions, not the oldest ones from before it left — the same reasoning
> `decisionSinkRing` evicts by, and the two agree so a reader sees one policy
> rather than two.
>
> ```
> REQUIREMENT: Each subscriber MUST receive its own copy.
> ```
>
> Two open devtools pages must not steal records from one another.
>
> ```
> REQUIREMENT: `capacity` MUST be a positive integer.
> ```
>
> Positive, not merely non-negative as the ring's is: a zero-capacity `PubSub`
> would accept nothing, so the feed would be silently dead where a zero-capacity
> ring is at least a coherent "keep nothing".
>
> `replay` hands a joining reader that many recent records before live ones, which
> is what a page reconnecting after a dropped connection wants. Without it, pair
> the feed with a `decisionSinkRing` through `decisionSinkAll`.

## BEH-QD-202: The stream is Server-Sent Events, and it is guarded

```ts
export interface DecisionStreamOptions {
  readonly reauth?: {
    readonly interval: Duration.Input;
  };
  readonly onRefused?: (refusal: SinkRecordNotEncodable) => void;
}

export const decisionStreamRoute: (
  permission: Permission,
  policy: Policy,
  log: DecisionLogReader, // Pick<DecisionLog, "read" | "readEntries">
  options?: DecisionStreamOptions,
) => Layer<…>;

export const reauthCheck: (
  request: HttpServerRequest,
  policy: Policy,
  resource: Resource,
) => Effect<void, EnforcementErrorClass | "extraction-failed", StandingEvaluationServices | SubjectExtractor>;
```

```
REQUIREMENT: `/__decisions` MUST be guarded by a policy, and MUST have no
             unguarded variant.
```

`/__permissions` publishes the authorization **topology** and may, with a named
reason, be served open ([BEH-QD-180](./23-http.md)). This publishes
**decisions** — subject ids, verdicts, resources, and whatever a `Trace` names
about why. It is strictly more disclosure, so it takes the same
declare-do-not-infer shape with no opt-out at all.

```
REQUIREMENT: There MUST be no environment-variable gate.
```

An ambient value deciding who may read authorization data is precisely the
inversion [BEH-QD-174](./23-http.md) rejects: authorization comes from a policy,
and a variable that merely happens to be unset must never be what opens a route.
A deployment that wants this off in production does not mount it.

```
REQUIREMENT: The response MUST carry `text/event-stream`, and MUST disable
             proxy buffering.
```

**SSE rather than a WebSocket**, decided by the traffic rather than by taste.
Records flow one way; a reader never sends a decision back. SSE is plain HTTP, so
it passes through the same `HttpRouter`, the same middleware and the same
`guardRoute` as every other route in the package — a socket would need an upgrade
path outside all three and would have to re-answer authorization on its own
terms. `EventSource` reconnects by itself, and a reconnect reads the log again —
the minimal protocol of [BEH-QD-907](#beh-qd-907-the-backlog-travels-on-the-stream-and-every-frame-names-its-producer)
and [BEH-QD-909](#beh-qd-909-a-reconnect-resumes-where-it-left-off), and nothing
more.

> **Amended in CCR-QD-905.** This paragraph previously ended "which pairs with
> `replay` to recover a dropped connection with no protocol of ours". The route
> now serves a decision log (`log: DecisionLogReader`, previously
> `stream: Stream<SinkRecord>`), and what a reader receives, in order, is
> BEH-QD-907's: the backlog, `synced`, then live frames.

Effect's own devtools uses a WebSocket, and that is right for what it is: a
bidirectional RPC channel. This is a feed.

`cache-control: no-cache` and `x-accel-buffering: no` are part of the
requirement, not decoration: without them a proxy buffers the stream and the feed
appears to hang rather than to work slowly.

**`guardRoute` runs once, at connect — and again, periodically, for as long as
the connection stays open, when `reauth` is given.** Without it, a revoked or
logged-out principal whose connection is still open keeps receiving every
decision this process makes for as long as the stream stays up: nothing short
of the client disconnecting or the process restarting would end it. `reauth`
closes that window — this is a revocation problem, not a cosmetic one, which is
why it belongs in this document rather than only in the package's own
comments.

```
REQUIREMENT: When `reauth` is given, the route MUST, on the named interval,
             re-extract the subject from the SAME request and re-evaluate the
             policy against the fresh subject — never reuse whatever the
             extractor answered at connect.
```

Re-extracting, not re-checking a cached subject, is the point: for a real
`SubjectExtractor` backed by a token or session lookup, re-extracting is
exactly where a revocation since connect becomes visible, because the lookup
runs again.

```
REQUIREMENT: A failed re-extraction or a denial on recheck MUST end the
             stream. Neither MAY be silently absorbed.
```

`reauthCheck` runs on `assert`'s semantics — permitted *and* discharged — not
`evaluate` + `isAllowed`. `guardRoute`'s connect-time check already enforces
through `guard`, which refuses an allow carrying an undischarged binding
obligation; a recheck built on the weaker `evaluate` would let a connection
survive past the point connecting fresh would have refused it, the moment a
policy is `Obliged`. `EventSource`'s own automatic reconnect is what recovers
from either failure, going through `guardRoute`'s full check again on the new
connection — no protocol of ours.

```
REQUIREMENT: `reauth` MUST be off by default.
```

It is meaningless without a `SubjectExtractor` whose `lookup` actually
consults something that can change — a real deployment's does; an in-memory
test double does not — so an interval nobody asked for would only be needless
load for a deployment with no revocation source to notice. See
[ADR-QD-046](../decisions/046-a-decision-feed-is-sse-and-guarded.md) Rev 1.1.

## BEH-QD-904: One record never ends the feed, and a refused one is reported

> **Invariant:** [INV-QD-903](../invariants.md#inv-qd-903-the-record-codec-is-total)

```ts
export type DecisionFrameEvent = "backlog" | "message";
export const frame: (
  event: DecisionFrameEvent,
  cursor?: LogCursor,
) => Filter<StoredRecord, string, SinkRecordNotEncodable>;
export const decisionFrames: (
  read: DecisionLogEntries,
  options?: Pick<DecisionStreamOptions, "onRefused">,
) => Stream<string>;
```

```
REQUIREMENT: No record MAY end the feed for any subscriber. A record that
             cannot be framed MUST drop only its own frame.
REQUIREMENT: A refused record MUST be reported — through `onRefused` when
             given, otherwise by a warning naming the refusal, the path it was
             found at, and the evaluation id. It MUST NOT be dropped silently.
REQUIREMENT: A frame's data MUST be the stored record's
             `encodeStoredRecordString` text: `{ environment, record }`, whose
             `record` is the same bytes forwarding sends and an audit row
             stores.
```

> **Amended in CCR-QD-905.** The third requirement previously named
> `encodeSinkRecordString`; a frame now carries the stored-record envelope
> around those same bytes (BEH-QD-907).

Every subscriber reads the same feed, so a throw while framing one record used
to end every open `/__decisions` connection at once. It happened for a reachable
input: an attribute store behind an HTTP client fails with an error whose
`config` and `request` reference each other, the guard of the time did not walk
a resolver's `cause`, and `JSON.stringify` threw. Framing is now one call to
`@qadi/core`'s `encodeSinkRecordString`, which never throws, normalises a
`cause` through `Schema.Defect()` rather than refusing it, and refuses with a
reason whatever else would not round-trip
([ADR-QD-902](../decisions/902-sinkcodec-owns-both-directions.md)). The text is
wire version 2, which a subscriber on a release before the versioned wire
refuses, so subscribers upgrade before the server
([ADR-QD-903](../decisions/903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)).

A refusal was silent before — the frame simply did not appear — against the
precedent of `onFailure`, `onDropped` and `onMalformed`: a feed dropping records
while looking healthy is the defect, not the drop.


## BEH-QD-907: The backlog travels on the stream, and every frame names its producer

> **Invariant:** [INV-QD-906](../invariants.md#inv-qd-906-a-log-reader-sees-every-retained-record-exactly-once)

```ts
export const DecisionStreamSynced: Schema.Struct<{ backlog: Schema.Number }>;
export const syncedFrame: (backlog: number) => string;

// @qadi/core
export const StoredRecordJson: Schema.Struct<{ environment: Schema.String; record: typeof SinkRecordJson }>;
export const encodeStoredRecord: (stored: StoredRecord) => Result<StoredRecordJson, SinkRecordNotEncodable>;
export const decodeStoredRecord: (
  input: unknown,
  options?: { readonly legacyEnvironment?: string },
) => Result<StoredRecord, SinkRecordNotDecodable>;
```

```
REQUIREMENT: Each connection MUST make one read of the log and send, in order:
             one `event: backlog` frame per retained record, in
             `storedRecordOrder`; one `event: synced` frame whose data is
             `{"backlog":n}`, n the backlog frames actually sent — even when
             n is 0; then one default (`message`) frame per record made after.
REQUIREMENT: No record the log retained when the read was taken, or made
             after, MAY be missing from the connection or sent on it twice.
```

Before this, a reader got the past from one place (a ring, over a separate
request nobody consumed) and the future from another (a feed), and the
documented pairing lost every record made between reading the first and
subscribing to the second (ARCH-11 C9). The prelude is the backlog on the *same*
connection as the live stream, read by one `log.read` — subscribe, then
snapshot — so the handoff is the log's to get right, not each reader's. One
connection is also one authorization: `guardRoute` runs once, and `reauth`
covers the prelude as it covers everything else.

`synced` is sent even for an empty backlog, so a reader can tell "this server
holds nothing" (an empty backlog) from "this server sends no prelude" (an older
server: the backlog is absent, [BEH-QD-203](./27-devtools-timeline.md)).

```
REQUIREMENT: Every `backlog` and `message` frame's data MUST be a stored-record
             envelope `{ environment, record }` carrying the producer's label.
             A reader MUST take the environment from the frame, never state it.
```

The label used to be stated twice, once where the sink was built and again where
the reader was, with nothing checking they agreed — and the reader's won for
every live row, so an `Edge` record an aggregator ingested could only ever have
been shown as `Server` (C3, C10). It now travels on the wire, stamped once by
the producing log. The envelope wraps the record wire rather than adding a field
to it, so forwarding and `@qadi/audit`, which read the record wire and never
asked for a label, are untouched; the record's own `version`
([ADR-QD-903](../decisions/903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md))
lives inside `record`. An unknown top-level envelope key is ignored, as one on
the record is.

```
REQUIREMENT: A reader given `legacyEnvironment` MUST accept a bare record — a
             server older than the envelope — and stamp it with that label.
             Without it, a bare record MUST be refused as `Malformed`, never
             given the reader's label silently.
```

`legacyEnvironment` is deprecated and kept for one minor. The other direction —
a reader older than the envelope reading a newer server — reports every frame
as `not-a-record` through its `onMalformed` ([BEH-QD-204](./27-devtools-timeline.md)):
loud, not silently mislabelled.

## BEH-QD-908: The backlog is readable without a stream

```ts
export const decisionBacklogRoute: (
  permission: Permission,
  policy: Policy,
  log: Pick<DecisionLog, "snapshot">,
  options?: Pick<DecisionStreamOptions, "onRefused">,
) => Layer<…>;
```

```
REQUIREMENT: `GET /__decisions/backlog` MUST answer a permitted caller with a
             JSON array of stored-record envelopes, one per retained record in
             `storedRecordOrder`, with `cache-control: no-store`; a record the
             codec refuses MUST be left out and reported, never half-built.
REQUIREMENT: It MUST be guarded by a policy, MUST have no unguarded variant,
             and MUST register with `PermissionRegistry`.
```

For a reader that does not stream: the CLI shell
[ADR-QD-049](../decisions/049-the-second-shell-is-a-cli.md)
describes, an operator's script, a support bundle. It discloses what
`/__decisions` does, so it takes BEH-QD-202's guard verbatim. It is **not**
atomic with `/__decisions` — two requests are two reads, and a record made
between them is in neither — so a reader that wants the past and the future
without a gap uses the stream's prelude.

## BEH-QD-909: A reconnect resumes where it left off

```ts
export interface LogCursor { readonly epoch: number; readonly seq: number }
export const formatLogCursor: (cursor: LogCursor) => string; // "<epoch>.<seq>"
export const parseLogCursor: (text: string) => Option<LogCursor>;
readonly readEntries: (after?: LogCursor) => Effect<DecisionLogEntries, never, Scope>;
```

```
REQUIREMENT: Every `backlog` and `message` frame MUST carry its record's cursor
             as its SSE `id`; `synced` MUST carry none.
REQUIREMENT: Given a `Last-Event-ID` that parses as a cursor of this log's
             epoch, the prelude MUST hold only the retained records after it.
             An unparseable header, or another epoch's, MUST get the full
             backlog.
```

`EventSource` reconnects by itself and sends the last `id` it saw back as
`Last-Event-ID`. Without a cursor every reconnect re-sent up to `capacity`
frames the reader already had; the timeline absorbed them, at the cost of a
decode and an O(n) ingest scan each. With one, a reconnect costs what was
missed. The epoch is the `Clock` time the log was made
([ADR-QD-012](../decisions/012-deterministic-time-and-ids.md)), so a restarted
process's sequence numbers are never mistaken for the old one's. The cursor
text is strict — two non-negative safe integers — because it is a request header
a client controls.

---

_Previous: [25 — Inspection](./25-inspection.md)_
