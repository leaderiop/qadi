# ADR-QD-126 — An audit store call has a deadline, and the audit doubles answer from a script

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-126                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-11-10                                     |
> | Status         | Accepted — amends ADR-QD-044, ADR-QD-056       |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-11-10): Initial (ARCH-62, CCR-QD-404) |

---

## Context

`evaluate` awaits `DecisionSink.record` ([ADR-QD-044](./044-an-optional-decision-sink.md):
"awaited rather than forked deliberately"), and `AuditDecisionSinkLive` called its three
store methods — `AuditStagingPort.stage`, `AuditTrailPort.write`, `AuditStagingPort.commit` —
with no time limit. A store call that never settled therefore held the decision with it:
`evaluate` and `guard` did not return. The circuit breaker records an outcome only when the
write it admitted ends, so a hung write was never counted and the breaker stayed `Closed`
however many records hung behind it; a hung half-open probe held its claim and the breaker
never left `HalfOpen`. A probe on the base (`b042e56`) reproduced all of it: one shared layer,
`failureThreshold: 1`, a write of `Effect.never`, three decisions each followed by an hour of
`TestClock` — none settled, three writes started, no failure recorded.

That contradicts three records already in the spec. ADR-QD-044 says a sink that does I/O
"should buffer and flush on its own schedule"; [BEH-QD-187](../behaviors/24-decision-sink.md#beh-qd-187-a-sink-can-forward-and-a-forwarder-cannot-break-evaluation)
says a forwarder cannot break evaluation; [INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)
says an observer cannot change the outcome, and "no outcome" is a change. The five
regressions in `packages/audit/test/AuditSinkDeadline.test.ts` were written first and seen
failing on the base, each on its settle assertion.

The test doubles could not express the case. `AuditTrailPortTest` and `AuditStagingPortTest`
took only `failWith`/`failStageWith`/`failCommitWith`, a callback returning a hand-built
error, so every other way a store misbehaves — a defect, a self-interruption, a call that
never settles, one that starts and then hangs — was a hand-written `Layer.succeed(AuditTrailPort, …)`
in the test that needed it: eleven of them in `packages/audit/test`, and `driveExit.ts` kept
its own `"ok" | "fail" | "die"` mode table beside them.

## Decision

The maintainer's answer, recorded before execution (`_DECISIONS.md`, 14-01 T1):

> `A interrupt remove` — 5 s overridable `storeCallTimeout` per store call; script union
> gains `Interrupt` (six modes); remove `failWith`/`failStageWith`/`failCommitWith` (Breaking)

| Decision | Choice |
| -------- | ------ |
| D-02 — the route | **A: one finite default deadline a caller can override.** `AuditDecisionSinkOptions.storeCallTimeout?: Duration.Input`, beside `resetTimeoutMs`, default **5 seconds**; `Duration.infinity` opts out. Optional, so no caller changes |
| Where it applies | **Each store call separately**: `stage`, `write` and `commit` each get their own deadline, so each keeps its own outcome tag. One private `bounded(call, entry, StoreError)` in `AuditDecisionSinkLive.ts` applies `Effect.timeoutOrElse` and builds the port's own error, with a `Cause.TimeoutError` cause naming the deadline |
| D-03 — what a deadline is | **A failed attempt.** The write is bounded inside `admitted.attempt(…)`'s argument, so `CircuitBreaker.ts` records it exactly like a typed `AuditWriteError` (it is one); a stage past it is `StageFailed`, a commit past it `CommitFailed`. No new outcome, no new error class, and `CircuitBreaker.ts` is unchanged |
| D-04 — a caller's interruption | **Still not a failure** ([BEH-QD-251](../behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency)). The sink's own deadline is not a caller's interruption: it fails the call the sink made, inside the attempt. A caller interrupting `record` interrupts the attempt from outside, which still records nothing |
| D-05 — the doubles | **A per-call script.** `AuditTrailPortTestOptions.write`, `AuditStagingPortTestOptions.stage`/`.commit` answer each call with an `AuditPortReply`: the closed union `Ok \| Fail { cause } \| Die { defect } \| Interrupt \| Never \| Latch { latch }` — six modes, `Interrupt` included. `call` is the 0-based index among that method's calls, `undefined` is `Ok`, and `Fail` carries only a cause: the double builds `AuditWriteError`/`AuditStagingError` from the call it answers. One package-private interpreter (`AuditPortReplyInterpreter.ts`, `Match.tagsExhaustive`) serves both doubles |
| Not core's registry | **The audit ports stay out of core's closed five-port registry** ([ADR-QD-094](./094-a-port-is-described-once.md)). `AuditPortReply` is the doubles' own union in the style of core's `scriptedPort`, not core's `PortReply`, and nothing in `@qadi/audit` is a port description |
| D-06 — the hand layers | **Deleted.** All eleven hand-written audit port layers and `driveExit.ts`'s mode table are reply scripts; no hand layer remains |
| Legacy options | **Removed (Breaking).** `AuditTrailPortTestOptions.failWith` and `AuditStagingPortTestOptions.failStageWith`/`failCommitWith` are gone, with the "a script wins over them" branch. The replacement is `write: () => AuditPortReply.Fail({ cause })`, and the same for `stage` and `commit`; a commit `Fail` now carries the entry staged under the handle |
| D-07 — the gate | **Two test-scope budgets in `scripts/check-house-style.mjs`.** `PORT_DOUBLE_BUDGET` now also counts `new AuditWriteError(`/`new AuditStagingError(` in tests, reading the class names from the two audit port modules (one audit entry: `AuditWriteOutcome.test.ts`, a staging error as a value). `AUDIT_HAND_LAYER_BUDGET`, empty, refuses a hand-built `AuditTrailPort`/`AuditStagingPort` layer in a test. Both are checked in both directions; AGENTS.md §6 states them |

`Duration.zero` is pinned rather than chosen: under effect 4.1.2 the store call starts (a
`Latch` reply's latch is open afterwards) and the record settles at once as a failed attempt,
with no clock movement.

## Consequences

- A hung store no longer stalls a decision past `storeCallTimeout` per call it makes, and
  enough hung writes open the breaker, which then skips the write as for any failure. The
  `AuditWriteExits.test.ts` and `Metrics.test.ts` rows for a store that never settles expect
  exactly what their `Fail` twins expect — path, hook calls, rows, every label, the lost count
  and the log line — so a hang is reported the way a failure is.
- **The limit:** `Effect.timeoutOrElse` interrupts the call at the deadline and waits for it
  to end, the same limit as core's `…TimingOut` port wrappers. An adapter that makes itself
  uninterruptible is not bounded by `storeCallTimeout`.
- **A slow but healthy store now fails.** A store call that would have succeeded after the
  deadline is a failed attempt: a write is `WriteFailed`, counts on the breaker, and enough of
  them open it. An operator whose store is legitimately slower raises `storeCallTimeout`, or
  sets `Duration.infinity` to keep the old wait.
- The worst-case latency `record` adds to a decision is now bounded: up to three deadlines
  (stage, write, commit) when staging is wired, one when it is not.
- A test describes a broken audit store with a reply, never a layer, and the gate holds it
  there. `@qadi/audit` has a breaking change for the doubles' three removed options.

## Alternatives considered

- **B: no default, the option required.** Rejected: every existing caller of
  `AuditDecisionSinkLive` would have to change to get the bound everyone needs, and the
  unbounded wait would stay one omitted argument away.
- **C: ADR-QD-044's buffered sink — deferred, not rejected.** `record` would enqueue and a
  fiber of the sink's own would flush to the store on its own schedule. It adds what A cannot:
  no store latency in evaluation at all, not even a bounded one. It costs asynchronous
  delivery (a decision returns before its row exists, so a crash loses what was queued), a
  bounded queue that must refuse loudly when full rather than block or drop silently, and a
  flush fiber whose lifecycle — start, shutdown flush, a flush that itself hangs — is new
  surface. C would need A's per-call deadline anyway, for its flush, so this decision is a step
  towards it, not away. Its bound, overflow policy and shutdown flush are open questions for
  their own decision.
- **Join core's port registry** (`scriptedPort` over an audit port description). Rejected:
  ADR-QD-094's registry is closed over the five evaluation ports, and the audit ports are not
  read during evaluation.
- **Keep `failWith`/`failStageWith`/`failCommitWith` beside the scripts.** Rejected at the
  checkpoint: two ways to fail a call, with a precedence rule between them, and the legacy one
  makes the caller construct the port's error.

## Related

[ADR-QD-044](./044-an-optional-decision-sink.md),
[ADR-QD-056](./056-audit-companion-package.md),
[ADR-QD-094](./094-a-port-is-described-once.md),
[BEH-QD-251](../behaviors/33-audit-pipeline.md#beh-qd-251-a-tripped-circuit-breaker-skips-the-write-not-the-stage-and-its-transitions-are-atomic-under-concurrency),
[BEH-QD-379](../behaviors/33-audit-pipeline.md#beh-qd-379-a-store-call-is-bounded-by-the-sinks-deadline),
[BEH-QD-380](../behaviors/33-audit-pipeline.md#beh-qd-380-the-audit-doubles-answer-each-call-from-a-script),
[INV-QD-035](../invariants.md#inv-qd-035-a-sink-cannot-change-a-decision).
