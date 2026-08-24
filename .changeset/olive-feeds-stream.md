---
"@qadi/core": minor
"@qadi/http": minor
---

A live decision feed, and the route that serves it.

**`decisionSinkFeed`** is the buffering sink ADR-QD-045 deferred — deferred then
because building one against no transport would have been speculative, built now
because there is one. Publishing **never blocks and never fails**, whatever the
reader is doing and including when there is none: a `PubSub.sliding` with
`publishUnsafe` drops its oldest entry rather than waiting. That is the only
acceptable behaviour for something an authorization decision waits on.

Sliding rather than dropping, so a reader that reconnects gets the most recent
decisions — matching how `decisionSinkRing` evicts, so a reader sees one policy
rather than two. `replay` hands a joining reader recent records before live ones.

**`decisionStreamRoute(permission, policy, stream)`** serves `/__decisions` as
Server-Sent Events.

**Guarded, with no unguarded variant** — unlike `/__permissions`, and the
asymmetry is the disclosure. A topology is a map; decisions are the traffic on
it, including subject ids, verdicts, resources and whatever a `Trace` names about
why something refused.

There is deliberately **no `NODE_ENV` gate**. An ambient value deciding who may
read authorization data is precisely the inversion BEH-QD-174 rejects:
authorization comes from a policy, and a variable that merely happens to be unset
must never be what opens a route. A deployment that wants this off does not mount
it.

**SSE rather than a WebSocket**, decided by the traffic. Records flow one way, so
SSE keeps the route on plain HTTP and therefore inside the same router,
middleware and `guardRoute` as everything else here; a socket's upgrade path sits
outside all three and would re-answer authorization on its own terms.
`EventSource` reconnects by itself, which pairs with `replay`.

Recorded as a cost rather than hidden: SSE is one-way, so a devtools that later
wants to send something — a replay request, a filter — needs a second channel.

See BEH-QD-201, BEH-QD-202, ADR-QD-046.
