# ADR-QD-129 — A replay miss is an outage on every port

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-129                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — reads ADR-QD-094, ADR-QD-109 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-65, CCR-QD-407) |

---

## Context

`@qadi/devtools` replays a Snapshot from the answers a live run captured, keyed by each
port description's `key` ([INV-QD-043](../invariants.md#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered)).
A what-if sweep edits the input, so a replay can ask a request the capture never saw.
Until this decision, what a miss answered was a closed per-port table in `Capture.ts`,
`UNSEEN_REQUEST_IS_AN_OUTAGE`:

- `SignatureHistory` failed with `SignatureHistoryUnavailable`. Code review WR-04 found
  that its empty list denied `hasSignature` and so granted `not(hasSignature)`.
- `AttributeResolver`, `RelationshipResolver`, `DecisionHistory` and `CustomPredicate`
  answered their `none` (`undefined`, `Unknown`, `Unknown`, `false`). INV-QD-043 recorded
  the result as known and not closed: a `none` denies the leaf and so grants `not(leaf)`,
  the fail-open [INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed) forbids.

ARCH-65 made the request key injective (the ADR-QD-094 amendment of the same date), which
made a miss a real miss rather than a collision. The four ports still needed a policy.

## Options

As the decision checkpoint (17-01, D-04) stated them:

- **A.** Every port's unseen request is an outage (fail closed), like signatures.
- **B.** Per port, with a stated reason for each.
- **C.** Keep the four `none` answers and document them.

What A changes, stated at the checkpoint: a replay of a partial capture shows more errors.

## Decision

**A.** The phase's decision record answers D-04 with "`A` + key confirmed":

> Every port's unseen replay request is an outage (fail closed); `PortDescription.key`
> returns `Result<string, KeyRefusal>` (Breaking) — confirmed

`UNSEEN_REQUEST_IS_AN_OUTAGE` is deleted. `unseenReply(port)` returns
`PortReply.fail("the capture holds no answer for this <Port> request (not captured)")`,
which `replayLayer`'s `scriptedPort` turns into the port's own typed error through its
description's `failure`. There is no table left to extend, so a sixth port in
`@qadi/core`'s registry fails closed on a miss with no edit. A request whose key is refused
([BEH-QD-410](../behaviors/06-services.md#beh-qd-410-a-request-the-key-refuses-fails-closed))
is never captured and fails on replay the same way.

The second half of the answer, `key` returning `Result<string, KeyRefusal>`, is recorded in
ADR-QD-094's ARCH-65 amendment.

## Consequences

- A replay never decides from a miss: under a leaf and under `not(leaf)` the miss is
  `Failed` with the port's error tag, so it can never show an allow the capture cannot
  back. `@qadi/devtools`' release note calls this a security fix.
- A Snapshot sweep shows a failed row for every question the live run did not ask. That is
  the cost A was chosen with: the row says "not captured", which is what is known.
- A miss is not re-keyed by fewer arguments to find a near answer. A store may answer on
  any argument, so a coarser key would replay one request's answer for another, in the
  direction that allows.
- `packages/devtools/test/model/Capture.test.ts` runs one row per `PortName`, typed as a
  mapped type over the registry, so a new port is a compile error there until its expected
  error is written.

## Alternatives considered

- **B, per port.** Rejected. No port had a reason to answer `none` on a miss that survived
  `not(...)`: every `none` is a denial, and every denial negates to a grant.
- **C, document the fail-open.** Rejected. It keeps a known fail-open in a tool whose job is
  to show what a policy would decide.

## Related

[ADR-QD-094](./094-a-port-is-described-once.md),
[ADR-QD-109](./109-a-ports-span-is-projected-once-and-every-read-is-one-body.md),
[BEH-QD-221](../behaviors/29-devtools-simulator.md#beh-qd-221-a-capture-records-answers-and-a-replay-reproduces-them),
[BEH-QD-411](../behaviors/29-devtools-simulator.md#beh-qd-411-a-replay-miss-is-an-outage-on-every-port),
[INV-QD-007](../invariants.md#inv-qd-007-defaults-fail-closed),
[INV-QD-043](../invariants.md#inv-qd-043-a-snapshot-answers-what-the-live-layer-answered).
