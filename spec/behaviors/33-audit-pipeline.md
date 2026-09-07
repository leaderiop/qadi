# 33 — Audit Pipeline

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-BEH-33                                    |
> | Revision       | 1.2                                            |
> | Effective Date | 2026-09-07                                     |
> | Status         | Effective                                      |
> | Author         | Qadi Engineering                               |
> | Classification | Functional Specification                       |
> | Change History | 1.2 (2026-09-07): BEH-QD-250 and BEH-QD-251 widened — `isJsonSafe` walks iteratively so a merely-deep (non-cyclic) value no longer risks the same stack exhaustion the circular-reference case was already guarded against; `stage()`/`write()` now run under `Effect.exit` rather than `Effect.result`, so a defect or interruption from either — not just a typed `AuditWriteError`/`AuditStagingError` — reaches the breaker and the metrics the same way a typed failure already did (CCR-QD-113)<br>1.1 (2026-09-06): BEH-QD-254 renamed — `verifyChainIntegrity`/`ChainIntegrityError` read as cryptographic tamper-evidence to a compliance reviewer and are not; renamed to `verifySequenceIntegrity`/`SequenceIntegrityError` (CCR-QD-094)<br>1.0 (2026-08-25): Initial release (CCR-QD-086) |

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_

---

What `@qadi/audit` does with the `SinkRecord`s `DecisionSink`
[24 — Decision Sink](./24-decision-sink.md) already exists to receive. See
[ADR-QD-056](../decisions/056-audit-companion-package.md).

## BEH-QD-249: The assembled pipeline is reachable through one `DecisionSink.record` call

```ts
export const AuditDecisionSinkLive: (
  options?: { readonly failureThreshold?: number; readonly resetTimeoutMs?: number },
) => Layer.Layer<DecisionSink, never, AuditTrailPort>;
```

```
REQUIREMENT: AuditDecisionSinkLive MUST require AuditTrailPort as a Layer
             dependency and MUST read AuditStagingPort only optionally, via
             Effect.serviceOption — never as a Layer dependency, so a caller
             who never wires staging pays nothing for it.
REQUIREMENT: Every capability AuditDecisionSinkLive composes — encoding,
             staging, the circuit breaker, the trail write — MUST be reached
             through record(), the one method DecisionSink exposes. No
             capability may exist only as an export nothing in the assembled
             pipeline calls.
```

This is the piece that exists specifically to avoid the defect
[ADR-QD-016](../decisions/016-gxp-out-of-scope.md) named and that HexDi's own
Guard still has: individually correct, individually tested primitives that
the real enforcement path never calls. Every behavior below is a property of
what `record()` actually does, not of a function that exists beside it.

## BEH-QD-250: A resource with no safe durable representation refuses, cleanly, rather than approximating or crashing

```
REQUIREMENT: encodeAuditEntry MUST fail AuditEntryNotEncodable for a
             DecisionRecord whose resource carries a value with no safe
             durable representation (a function, a Symbol, a circular
             reference) — MUST NOT stringify, drop the field silently, or
             throw an uncaught exception.
```

A `Predicate`'s `Compare`/`MemberOf` values are `unknown`, and
[BEH-QD-238](./31-predicate-compilation.md#beh-qd-238-an-unsafe-value-refuses-rather-than-binds-blind)
already refuses rather than approximates one layer of that; a `resource` is
the same shape of caller-supplied `unknown` one layer further out, and gets
the same discipline. A circular reference is refused the same way as a
function — not merely stringified badly, and not left to overflow the call
stack: the safety walk tracks its own ancestor path and returns "unsafe"
the moment a value is found to be its own ancestor, rather than recursing
forever.

`isJsonSafe` (`SinkCodec.ts`) walks with an explicit array-backed stack
rather than function recursion, so this holds for a merely-deep, entirely
non-cyclic value too — not only a cycle. Before this, the walk itself
recursed one call frame per level of nesting and could exhaust the call
stack on adversarial-but-acyclic input before ever reaching the "unsafe"
verdict this requirement promises; the ancestor-tracking `Set` was also
copied whole at every level along the way, making the walk quadratic in
depth even on ordinary input. Both are fixed together: the stack is bounded
by heap rather than call-stack depth, and the ancestor set is one mutable
`Set` pushed to and popped from as the walk descends and backtracks, so both
time and space are linear in the number of nodes visited.

## BEH-QD-251: A tripped circuit breaker skips the write, not the stage, and its transitions are atomic under concurrency

> **Invariant:** [INV-QD-052](../invariants.md#inv-qd-052-once-a-circuit-breaker-trips-write-is-never-attempted-again-until-reset)

```
REQUIREMENT: The breaker MUST trip on any AuditTrailPort.write failure — a
             typed AuditWriteError or an unexpected defect/interruption from
             a misbehaving store adapter alike — and MUST NOT trip on
             AuditStagingError, which is tracked separately.
REQUIREMENT: While open, record() MUST still call stage() if AuditStagingPort
             is wired, and MUST skip write() entirely.
REQUIREMENT: A state transition MUST be computed and written back to the
             breaker's Ref as one atomic step. Two concurrent record() calls
             MUST NOT be able to read the same stale consecutive-failure
             count and both write back an update, losing one.
REQUIREMENT: No public error type MAY be constructed for a tripped breaker.
             Trip state is a check record() makes internally before
             attempting a write.
```

`Qadi.ts`'s `filter`/`filterStream` evaluate items concurrently, so
concurrent `record()` calls reaching the same breaker are the ordinary case
for a caller batch-authorizing a collection, not an edge case. A `Ref.get`
followed by a later `Ref.set` lets two fibers both observe the same count
before either writes back — a lost update that lets the breaker take longer
than `failureThreshold` to trip, or a double-counted transition in
`qadi_audit_circuit_breaker_transitions_total`. `CircuitBreaker.ts` closes
this by computing every transition inside a single `Ref.modify` call.

No public error type, unlike a first instinct borrowed from HexDi's
`CircuitOpenError`: that type is modeled in HexDi's own error union and never
thrown by its real enforcement path — reachable only in principle, the exact
defect this whole package exists to avoid repeating.

`AuditDecisionSinkLive.ts`'s `record()` runs `AuditTrailPort.write` under
`Effect.exit`, not `Effect.result`: the latter only catches `write`'s own
typed `E` channel, so a defect or an interruption from a misbehaving store
adapter used to unwind straight past `breaker.recordFailure` and the
`qadi_audit_writes_total` `write_failed` counter alike — a store that never
resolves observably, and never tripped the one mechanism that exists to
detect it. `Effect.exit` folds every way `write` can conclude — success,
typed failure, defect, interruption — into one `Exit` value the same code
path branches on, so a defect reaches `recordFailure` exactly as a typed
`AuditWriteError` does.

## BEH-QD-252: Staging is best-effort, and provably non-observable in the happy path

> **Invariant:** [INV-QD-051](../invariants.md#inv-qd-051-staging-presence-or-absence-never-changes-the-committed-audit-entries)

```
REQUIREMENT: An AuditStagingError from stage() or commit() MUST NOT block or
             fail record() — the write (or the skip, while the breaker is
             open) proceeds exactly as it would have if AuditStagingPort had
             never been wired.
REQUIREMENT: record() MUST NOT call discard on AuditStagingPort — the port
             has no such method. A staged entry left uncommitted after a
             write failure is left alone, for the caller's own reconciliation.
REQUIREMENT: A commit() failure — a typed AuditStagingError or an unexpected
             defect alike — MUST be tracked (qadi_audit_staging_total,
             outcome commit_failed) rather than silently discarded with no
             trace at all.
REQUIREMENT: A stage() failure — a typed AuditStagingError or an unexpected
             defect alike — MUST be tracked (qadi_audit_staging_total,
             outcome failed or failed_open) exactly as a typed failure is,
             rather than unwinding past both outcomes unmetered.
```

"WAL" is deliberately not this port's name: `@qadi/audit` owns no storage of
its own, so it cannot promise database-WAL-style durability the way HexDi's
`createWriteAheadLog` falsely claimed to (its own docstring said entries
"survive logical process restart" — a plain in-memory `Map` never could).
`AuditStagingPort` is a durability *protocol* a caller with a real durable
staging store can plug into; a caller who does not wire one pays nothing and
observes nothing different.

`stage()`, like `write()` above, runs under `Effect.exit` rather than
`Effect.result` — the same reasoning `commit()`'s own `Effect.catchCause`
already applied to `commit_failed`, extended to `stage()`'s two outcomes
(`failed`, `failed_open`) instead of leaving them the one path in this
pipeline still blind to a defecting adapter.

## BEH-QD-253: Retention partitions entries, by construction

> **Invariant:** [INV-QD-053](../invariants.md#inv-qd-053-retained-and-purged-partition-entries)

```
REQUIREMENT: For any entries, RetentionPolicy and now, the sets
             enforceRetention(entries, policy, now) and
             getPurgeableEntries(entries, policy, now) MUST partition
             entries: their union is entries, unchanged and undeduplicated;
             their intersection is empty.
```

Computed in one pass over one shared predicate rather than by two
independent `.filter()` calls that could drift out of agreement with each
other — retention/archival/decommissioning are pure functions and data,
caller-invoked and caller-scheduled, since `@qadi/audit` has no scheduler of
its own.

## BEH-QD-254: Sequence-integrity verification detects a gap or a duplicate, and trusts neither write order

> **Invariant:** [INV-QD-054](../invariants.md#inv-qd-054-verifysequenceintegrity-detects-every-gap-and-duplicate-sequence-number)

```
REQUIREMENT: verifySequenceIntegrity MUST fail SequenceIntegrityError for any
             two sequence numbers, sorted ascending, that are not exactly one
             apart — catching both a gap (a jump past the expected next
             number) and a duplicate (the same number twice).
REQUIREMENT: An entry carrying no sequenceNumber MUST be ignored by
             verifySequenceIntegrity — sequencing is opt-in, assigned only by
             the caller's own store, never by @qadi/audit.
REQUIREMENT: archiveAuditTrail MUST store entries sorted by sequenceNumber,
             stably, before setting metadata.sequenceIntegrityVerified: true —
             never the caller-supplied array order verifySequenceIntegrity
             happens to tolerate.
```

No `scopeId`-style grouping key, unlike HexDi's version: Qadi has no "scope"
concept in its domain model, so sequencing is a single flat, global
sequence, checked as one. `sequenceNumber` is never populated by
`@qadi/audit` itself — only the caller's own store has cross-restart
visibility into a real write order, the same constraint that shapes
`AuditStagingPort` ([BEH-QD-252](#beh-qd-252-staging-is-best-effort-and-provably-non-observable-in-the-happy-path)).

Named for the mechanism, not for what a compliance reviewer might infer from
a stronger name: this is gap-and-duplicate detection over caller-assigned
sequence numbers, with no per-entry hash and nothing linking one entry to the
next. An attacker able to modify already-persisted rows can renumber them
and pass verification — the check protects against accidental loss or
duplication in the caller's own store, not deliberate tampering.

## BEH-QD-255: No e-signature default ships — an unwired obligation already fails closed

```
REQUIREMENT: @qadi/audit MUST NOT export a default SignatureCapturePort
             implementation, including a no-op one.
```

`Qadi.enforce`'s existing behavior on an unwired obligation —
`UndischargedObligation` — already is the safe default; a `Noop` capture
service, the kind HexDi ships ("always validates successfully," for
non-regulated environments only), would only manufacture the risk of someone
forgetting to swap it out in one that is regulated. This is the specific
false-compliance affordance [ADR-QD-016](../decisions/016-gxp-out-of-scope.md)
rejected, applied to a single port rather than a whole subsystem.

## BEH-QD-256: A signature obligation handler calls `capture` exactly once, and the discharge record matches its outcome

> **Invariant:** [INV-QD-055](../invariants.md#inv-qd-055-signatureobligationhandler-calls-capture-exactly-once-and-the-obligationrecord-matches)

```
REQUIREMENT: signatureObligationHandler(port, meaning) MUST call port.capture
             exactly once per discharge, with a request derived from the
             current subject and the obligations being discharged — never
             once per obligation in the array.
REQUIREMENT: The ObligationRecord DecisionSink observes for that discharge
             MUST report Discharged exactly when capture succeeded, and
             HandlerFailed exactly when it failed — never the reverse, and
             never a third outcome for this path.
```

Signature capture is a condition of enforcement, so it is wired through
`Qadi.ts`'s `ObligationHandler` — the only mechanism that exists for
enforcement-time custom logic — never through `DecisionSink`. This is the
piece that makes `SignatureCapturePort` actually reachable, in contrast to
HexDi's `SignatureServicePort`, which is unwired the same way its WAL and
circuit breaker are: no reference anywhere in `guard.ts`'s real enforcement
path.

## BEH-QD-257: Worked example

```typescript
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolverNone,
  currentSubjectLayer,
  CustomPredicateNone,
  DecisionHistoryUnknown,
  evaluate,
  EvaluationIdLive,
  hasPermission,
  makeSubject,
  permission,
  RelationshipResolverNever,
  SignatureHistoryNone,
} from "@qadi/core";
import { AuditDecisionSinkLive, AuditTrailPortTest } from "@qadi/audit";

const read = permission("doc", "read");
const alice = makeSubject({ id: "alice", permissions: ["doc:read"] });

const { layer: auditTrail, written } = AuditTrailPortTest();

// AuditDecisionSinkLive() itself requires AuditTrailPort — provided by a
// second Effect.provide, not merged alongside it: Layer.mergeAll combines
// what layers provide, it does not thread one's output into a sibling's
// unmet requirement the way a second Effect.provide does.
const services = Layer.mergeAll(
  currentSubjectLayer(alice),
  AttributeResolverNone,
  RelationshipResolverNever,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  CustomPredicateNone,
  SignatureHistoryNone,
);

const program = evaluate(hasPermission(read)).pipe(
  Effect.provide(services),
  Effect.provide(AuditDecisionSinkLive()),
  Effect.provide(auditTrail),
);

// The evaluation and the audit write both happen from this one call —
// nothing separate had to be remembered.
void program;
// → an Allow decision; written().length === 1 once program has run.
```

---

_Previous: [32 — Custom Predicates](./32-custom-predicates.md)_
