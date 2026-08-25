---
"@qadi/core": minor
---

The deployment topology is a choice of sink.

`decisionSinkRing` answers "what did *this* process decide", and three of the six
shapes Qadi runs in are not served by that: a replicated server has n rings and a
reader reaches whichever instance answered its own request, a serverless
function's ring dies with the invocation, and a browser talking to a separate API
origin is two processes of which the deciding one has no page.

**`decisionSinkForwarding({ send })`** projects a record onto the wire and hands
the encoded value onward. Which socket, which store, which framing and which
retry policy lie beyond `send` belong to the caller — `@qadi/core` learns nothing
about transports and gains no dependency that could pull one in. That is the
payoff for making the port write-only: reading back was left to implementations
so that the topology could be one.

**`decisionSinkAll([...])`** writes to every sink in order. The real deployment
wants both a local ring and a forwarder, and merging two `Layer`s for one service
does *not* do that — the later one wins and the first silently sees nothing.

**`decisionSinkRing(...).ingest(record, environment?)`** is the receiving half.
`environment` is a parameter rather than the ring's own field because a merged
log holds rows from several processes, and stamping them all with the
aggregator's label would erase the one distinction the merge exists to preserve.

A `send` that fails **or dies** cannot change a decision — a devtools page being
unreachable is the most ordinary thing that can go wrong here, and an
authorization request must not fail because nobody is watching. It is reported
rather than swallowed, through `onFailure` or a warning.

**`send` must not block.** `record` is awaited inside the evaluation, so records
stay ordered and reproducible under `TestClock`; a `send` doing a network round
trip makes every decision wait for it. Enqueue and drain elsewhere. Buffering
inside the forwarder would remove that hazard rather than warn about it, and is
deferred rather than guessed at without a real transport to build against.

See BEH-QD-187, BEH-QD-188, ADR-QD-045.
