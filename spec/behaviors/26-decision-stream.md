# 26 — The Decision Stream

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-26                                    |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-09-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.1 (2026-09-07): BEH-QD-202 — `decisionStreamRoute`'s optional `reauth`, a periodic re-extraction and re-evaluation against an open connection so a revoked principal's stream ends, documented for the first time (`DecisionStreamOptions`, `reauthCheck`; ADR-QD-046 Rev 1.1) (CCR-QD-110)<br>1.0 (2026-08-24): Initial release (CCR-QD-065) |

_Previous: [25 — Inspection](./25-inspection.md)_

---

The transport, built on the seam
[ADR-QD-045](../decisions/045-the-topology-is-a-choice-of-sink.md) left: a
buffering sink in `@qadi/core`, and one route in `@qadi/http` that serves what it
holds. See [ADR-QD-046](../decisions/046-a-decision-feed-is-sse-and-guarded.md).

## BEH-QD-201: A feed buffers, and publishing never blocks

```ts
export const decisionSinkFeed: (options?: {
  readonly capacity?: number;
  readonly replay?: number;
}) => Effect<{ layer: Layer<DecisionSink>; stream: Stream<SinkRecord> }>;
```

```
REQUIREMENT: Publishing MUST NOT block or fail, whatever the reader is doing —
             including when there is no reader at all.
```

ADR-QD-045 deferred this and said why: `decisionSinkForwarding`'s `send` carries
a contract the type cannot express, and a buffer removes that hazard rather than
warning about it, but building one against no transport would have been
speculative. There is a transport now.

A `PubSub.sliding` drops its oldest entry when full, so a slow or absent reader
costs the evaluation nothing — the only acceptable behaviour for something an
authorization decision waits on
([INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).
`publishUnsafe` rather than `publish`, because the awaiting form would reintroduce
exactly the blocking this removes.

**Sliding rather than dropping.** A reader that reconnects wants the most recent
decisions, not the oldest ones from before it left — the same reasoning
`decisionSinkRing` evicts by, and the two agree so a reader sees one policy
rather than two.

```
REQUIREMENT: Each subscriber MUST receive its own copy.
```

Two open devtools pages must not steal records from one another.

```
REQUIREMENT: `capacity` MUST be a positive integer.
```

Positive, not merely non-negative as the ring's is: a zero-capacity `PubSub`
would accept nothing, so the feed would be silently dead where a zero-capacity
ring is at least a coherent "keep nothing".

`replay` hands a joining reader that many recent records before live ones, which
is what a page reconnecting after a dropped connection wants. Without it, pair
the feed with a `decisionSinkRing` through `decisionSinkAll`.

## BEH-QD-202: The stream is Server-Sent Events, and it is guarded

```ts
export interface DecisionStreamOptions {
  readonly reauth?: {
    readonly interval: Duration.Input;
  };
}

export const decisionStreamRoute: (
  permission: Permission,
  policy: Policy,
  stream: Stream<SinkRecord>,
  options?: DecisionStreamOptions,
) => Layer<…>;

export const reauthCheck: (
  request: HttpServerRequest,
  policy: Policy,
  resource: Resource,
) => Effect<void, "denied" | "extraction-failed", Exclude<EvaluationServices, CurrentSubject> | SubjectExtractor>;
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
terms. `EventSource` reconnects by itself, which pairs with `replay` to recover a
dropped connection with no protocol of ours.

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

---

_Previous: [25 — Inspection](./25-inspection.md)_
