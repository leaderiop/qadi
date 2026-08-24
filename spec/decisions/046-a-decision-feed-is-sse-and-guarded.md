# ADR-QD-046 — A decision feed is Server-Sent Events, and it is guarded like any other route

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-046                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-08-24                                     |
> | Status         | Accepted                                       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-08-24): Initial release (CCR-QD-065) |

---

## Context

[ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md) left a seam and said core
would ship no transport. Two questions remained, and they are not independent:
which protocol carries records to a reader, and what stops the wrong reader from
getting them. The second constrains the first, so it is settled first.

A decision feed carries subject ids, verdicts, resources, actions, and whatever a
`Trace` names about *why* a policy refused. That is materially more disclosure
than `/__permissions`, which carries the topology only — and that route was
itself found shipping unguarded (CCR-QD-062).

## Decision

**Guarded by a policy, with no unguarded variant.**

`/__permissions` has `permissionRegistryRouteUnguarded(reason)`, because a
topology on a local development machine is a defensible thing to serve open.
Decisions are not: they are per-subject data, and a reader authorized to watch
one subject's decisions sees everyone's. So `decisionStreamRoute(permission,
policy, stream)` is the only constructor, and there is no sibling.

**No environment-variable gate.** A `NODE_ENV` check deciding who may read
authorization data is precisely the inversion
[BEH-QD-174](../behaviors/23-http.md) rejects — authorization comes from a
policy, and an ambient value that merely happens to be unset must never be what
opens a route. A deployment that wants this off in production does not mount it,
which is a decision visible in its wiring rather than in its environment.

**Server-Sent Events**, decided by the traffic. Records flow one way; a reader
never sends a decision back. SSE is plain HTTP, so the route passes through the
same `HttpRouter`, the same middleware, and the same `guardRoute` as every other
route in the package — which is what makes the paragraph above cheap to honour
rather than something to reimplement. `EventSource` reconnects on its own, and
that pairs with the feed's `replay` to recover a dropped connection with no
protocol of ours.

## Alternatives considered

- **A WebSocket.** What Effect's own devtools uses, and right for what that is: a
  bidirectional RPC channel. Rejected here because the traffic is one-way, and
  because an upgrade path sits outside the router, the middleware and the guard —
  so the authorization story would have to be rebuilt on the socket's own terms,
  which is exactly the kind of second path this library removes elsewhere.

- **Long-polling.** Works everywhere and needs no streaming response. Rejected:
  it turns a live feed into repeated queries, each re-running the guard, and the
  reconnection semantics `EventSource` gives free would have to be written.

- **An unguarded variant for local development.** Consistent with
  `/__permissions`, and rejected on the difference in what is disclosed. A
  topology is a map; decisions are the traffic on it, including subject
  identifiers.

- **A `NODE_ENV` gate instead of a policy.** Familiar, and the exact shape of the
  defect BEH-QD-174 records: absence of a signal meaning "open".

## Consequences

- (+) The feed reuses the package's enforcement, status mapping and subject
  extraction rather than restating them; a denial is 403 and a broken subject
  store is 502 because `guardRoute` already says so.
- (+) A reader reconnects without any protocol of ours.
- (−) SSE is one-way, so a future devtools that wants to *send* something — a
  replay request, a filter — needs a second channel. That is the right trade
  while the traffic is one-way, and revisiting it is a new decision rather than a
  regret.
- (−) No unguarded variant means a developer running locally must still wire a
  permission and a policy. That is a real cost, accepted deliberately: the thing
  being served is other people's authorization decisions.
