---
"@qadi/react": minor
---

Fix a client-side authorization bypass in decision hydration.

A server-rendered decision was seeded directly into the decision atom, where
`AtomRegistry` preserves a seeded value over the one the node computes. An
asynchronous evaluation escaped that by publishing on a later turn; a
**synchronous** one publishes by returning, and was discarded. Every policy that
needs no resolver evaluates synchronously, so a subject could keep a
server-issued allow they no longer qualified for, for the life of the page.

A seed now lives in its own atom, and the decision a consumer reads consults it
only while this client has never answered. Once it has — allow, deny or failure —
that answer is authoritative, including while a later re-check is in flight.

Behaviour change: for a synchronously-evaluated policy the client answers on the
first read, so the seed is not observed and the `evaluationId` reported is the
client's own rather than the server's. The correlation guarantee of BEH-QD-148
still holds of the payload and of the seeded decision, and remains observable
wherever the seed is what is being read.

See ADR-QD-039, INV-QD-028, BEH-QD-151.
