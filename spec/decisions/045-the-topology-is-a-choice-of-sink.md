# ADR-QD-045 — The topology is a choice of sink, and core ships only the seam

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-045                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-064) |

---

## Context

`decisionSinkRing` answers "what did **this process** decide". Qadi runs in six
deployment shapes, and three of them are not served by that at all:

- a **replicated** server has n rings, and a reader reaches whichever instance
  answered its own request — generally not the one that served the decision
  being debugged;
- a **serverless** function's ring dies with the invocation;
- a browser talking to a **separate API origin** is two processes, and the one
  making server-side decisions has no page to show them on.

The devtools design assumed one of these away — its withdrawn transport ADR
described "a dev-only transport in the `@qadi/http` integration" that did not
exist, and the overview it governed recognised a single deployment.

The temptation at this point is to make `@qadi/core` ship a transport: a
WebSocket sink, an HTTP forwarder, something concrete. That is where an
authorization library stops being one.

## Decision

**Core ships the seam, not the transport.**

`decisionSinkForwarding({ send })` projects a record onto the wire
([ADR-QD-044](./044-an-optional-decision-sink.md),
[BEH-QD-199](../behaviors/25-inspection.md)) and hands the encoded value to a
caller-supplied `send`. Everything past that point — which socket, which store,
which framing, which retry policy — belongs to the caller or to a transport
package. `@qadi/core` learns nothing about transports, and gains no dependency
that could pull one in.

`decisionSinkAll` fans out, because the real deployment shape is *both*: a local
ring so the process can answer for itself, and a forwarder to wherever the merged
timeline lives. Merging two `Layer`s for one service does not do this — the later
one wins and the first silently sees nothing — so the fan-out has to be explicit.

`decisionSinkRing(...).ingest` is the receiving half, and takes the environment
as a **parameter**: a merged log holds rows from several processes, and stamping
them with the aggregator's own label would erase the distinction the merge exists
to preserve.

This is the payoff for [BEH-QD-181](../behaviors/24-decision-sink.md) making the
port **write-only**. Reading back was left to implementations precisely so the
topology could be one, and this is the decision that cashes it: choosing a
deployment shape is choosing a sink, never editing the evaluator.

## Alternatives considered

- **Ship a WebSocket sink in core.** Concrete and immediately usable, and wrong:
  it would put a transport dependency inside an authorization library, and the
  first deployment wanting SSE, gRPC, a log shipper, or a file would have to
  route around it. The seam costs one function type.

- **Put forwarding in `@qadi/http`.** Tempting, since that package already owns
  a server boundary. Rejected because the client is a first-class producer of
  decisions too — a browser forwarding to an aggregator is the BFF topology — and
  `@qadi/react` must not depend on the HTTP package to do it.

- **Make `record` fire-and-forget so a slow transport cannot block.** Rejected:
  ADR-QD-044 awaits deliberately, so records stay ordered and reproducible under
  `TestClock`. Forking here would trade a testable guarantee for a problem the
  caller is better placed to solve — by enqueuing in `send`, which the contract
  requires. The obligation is documented and stated as a requirement rather than
  engineered around.

- **Buffer inside `decisionSinkForwarding`.** A queue and a draining fiber would
  make `send` safe to block. Rejected *for now* rather than on principle: it
  needs a scope, fiber supervision and a flush-on-shutdown story, and building
  all three against no real transport would be speculative. Recorded as the known
  follow-up.

## Consequences

- (+) Replicated, serverless and cross-origin deployments become serviceable
  without the evaluator learning anything.
- (+) The transport increment can now be built against a format and a seam that
  are already proven to round-trip, rather than designed alongside them.
- (+) A caller who wants records in a file, a log pipeline or a database writes
  a `send`, and gets the same guarantees a devtools page does.
- (−) `send` carries a contract the type cannot express — "do not block" — and a
  caller who ignores it slows every authorization decision. It is stated in
  BEH-QD-187 and in the doc comment, and buffering remains the follow-up that
  would remove the hazard rather than warn about it.
- (−) Nothing in this repository yet exercises a real socket, so the seam is
  proven against an in-memory `send` only.
