# ADR-QD-132 — A shared computation is joinable only while somebody waits on it

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-132                                   |
> | Revision       | 1.1                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — reads ADR-QD-031                    |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.1 (2026-11-12): Amendment: a reset supersedes its claims; the staleness rule moves into SharedComputation (ARCH-79, CCR-QD-422)<br>1.0 (2026-11-10): Initial (ARCH-68, CCR-QD-410) |

---

## Context

`decisionCacheLayer` ([ADR-QD-031](./031-decision-cache.md)) runs one computation per
question however many fibers ask at once. Every waiter is settled with that computation's
exit, and one waiter that leaves (a timeout, a cancelled request) detaches only itself. The
last waiter to leave interrupts the computation, because nobody wants its answer any more.

Issue #64 asked whether a fresh ask could join in the gap between the last leave and the
interrupt. When the computation is idle and interruptible, it cannot: `effect` runs the
interrupt and the computation's exit in the leaver's own call stack, and the two
"REGRESSION PIN for issue #64" tests in `DecisionCache.test.ts` race a fresh joiner against
that cascade without ever seeing it fail.

The premise fails when the computation is parked inside a port's uninterruptible region:
a connection checkout, an `Effect.acquireUseRelease` acquire, a finalizer. There,
`Fiber.interrupt` only records the interrupt and delivers it when the region ends. The
abandoned claim stayed in the in-flight table with no waiters, so a fresh ask for the same
question joined it and, when the region ended, received an interruption it was never sent.
`DecisionCache.test.ts`'s "issue #64, uninterruptible regime" test reproduced this through
`evaluate` on every one of 20 runs.

The in-flight table lived inside `DecisionCache.ts` with the generation counter, the FIFO
eviction and the metric, so the regime could only be tested through a real walk. It now
lives in a package-private module, `packages/core/src/SharedComputation.ts`, generic over
its key; `DecisionCache` is its one adapter and keeps its interface.

## Options

The old doc comment above `awaitShared` listed three ways out:

- **A.** Do not join a claim that is abandoned: a fresh ask starts its own computation.
- **B.** Deliver the last leave to the computation as a typed abandon failure instead of an
  interruption, and let a joiner tell the two apart.
- **C.** Keep the regime as it was and pin it as a known limit.

## Decision

**A, taken at the moment of abandonment rather than at the moment of joining.**

1. **A claim is joinable only while somebody waits on it.** The synchronous step that sees
   the waiter count reach zero marks the claim abandoned and removes it from the in-flight
   table (only if it is still the claim for that key) before it interrupts the computation.
   A fresh ask after that step finds nothing in flight and claims afresh.
2. **An abandoned computation's exit is dropped.** Its settle is never called, so nothing is
   cached from it, whatever its exit. Nobody asked for it any more, and a fresh claim may
   already be computing the same question: writing both would append the key to the FIFO
   insertion order twice, the defect BEH-QD-166's claim-window requirement exists to prevent.
3. **`DecisionCache`'s interface, its metric order and its existing tests are unchanged.**

## Consequences

- An ask that was never interrupted never receives an interruption, whether or not a port
  holds the shared computation in an uninterruptible region
  ([BEH-QD-439](../behaviors/21-decision-cache.md#beh-qd-439-a-shared-computation-answers-everyone-still-waiting-and-nobody-else)).
  An interruption is not an answer a hit or a miss can differ by
  ([INV-QD-025](../invariants.md#inv-qd-025-a-cache-hit-differs-from-a-miss-only-in-speed-and-identity)).
- The question may be computed twice: once by the abandoned computation still parked in its
  region, once by the fresh claim. Only the fresh one is cached or answered. A port whose
  uninterruptible region is expensive pays for it twice in that window.
- **The stated cost.** `Fiber.interrupt` awaits its target's exit, so the last waiter to
  leave still waits until a computation parked uninterruptibly leaves that region, exactly as
  before. Only the fresh ask stops waiting on it.
- No error type is added and no public type changes; the release is a patch.

## Alternatives considered

- **B, a typed abandon failure.** Rejected. It adds an error to the computation's channel
  that no caller of `evaluate` can be asked to handle, and a joiner would still wait on a
  computation nobody wants before learning it must start again.
- **C, pin the limit.** Rejected. It reproduced every time, and the ask that receives the
  interruption is one nobody cancelled: a cancelled request elsewhere becomes a failure here.
- **A, decided at the join.** Rejected. A join would have to read the computation fiber's
  pending-interrupt state; deciding at the last leave needs only the waiter count the module
  already keeps, and the join needs no knowledge of the computation fiber at all.
- **Cache the abandoned computation's exit unless a fresher claim exists.** Rejected. It
  needs the adapter to compare claims, and in the window where both settle it would still
  append the key twice.

## Amendment (2026-11-12, CCR-QD-422, ARCH-79)

A reset is a second way a claim stops being current. Before, `reset` only forgot the
in-flight table, so a forgotten claim that somebody still awaited settled into the adapter
anyway, and `DecisionCache` closed that with a counter of its own, read when a claim was
made and compared when it settled. The staleness rule was a second mechanism for a fact the
module already holds, which claims are in flight.

A claim now has one closed standing: Live, Superseded or Abandoned. `reset` supersedes every
in-flight claim in the same synchronous step that empties the table, and only a Live claim's
exit reaches the adapter, through a `settle(key, exit)` hook that replaces the hook that
returned a closure when the claim was made. A superseded claim is treated as decisions 1 and
2 treat an abandoned one: it is not joinable, its exit is dropped, it still answers every
waiter, and it is interrupted when its last waiter leaves. `DecisionCache` keeps no counter;
`clear` empties its entries and insertion order and calls `reset`.

Decision 3 still holds: the interface, the metric order and `DecisionCache.test.ts` are
unchanged. The rule is stated as
[BEH-QD-491](../behaviors/21-decision-cache.md#beh-qd-491-a-stale-answer-never-re-enters-a-cleared-cache)
and
[INV-QD-307](../invariants.md#inv-qd-307-a-superseded-claims-exit-never-settles-and-its-waiters-are-still-answered-exactly-once).
A separate record, ADR-QD-144, was reserved for this and is unused: a claim stops being
joinable and its exit stops reaching the adapter when it stops being current, and a reset is
a second cause of that, so an amendment keeps one record.
