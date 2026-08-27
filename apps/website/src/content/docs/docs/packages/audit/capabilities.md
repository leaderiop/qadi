---
title: Capabilities
description: The assembled DecisionSink pipeline, and the retention, chain-integrity, archival and decommissioning functions outside it.
---

## The assembled pipeline

`AuditDecisionSinkLive` is a `Layer<DecisionSink, never, AuditTrailPort>` —
it requires `AuditTrailPort` and reads `AuditStagingPort` optionally, via
`Effect.serviceOption`, so a caller who never wires staging pays nothing for
it. Every capability it composes is reached through `record()`, the one
method `DecisionSink` exposes:

```ts
import { AuditDecisionSinkLive } from "@qadi/audit";

const AppLayer = AuditDecisionSinkLive({ failureThreshold: 5, resetTimeoutMs: 30_000 }).pipe(
  Layer.provide(myAuditTrailPortLive),
);
```

**Audit trail** (`AuditTrailPort`) — one method, `write(entry): Effect<void, AuditWriteError>`.
`AuditEntry` is schema-derived, built on `@qadi/core`'s own `SinkRecordWire`
rather than re-deriving `Policy`/`Trace`/`Obligation` a second time.
`encodeAuditEntry` refuses rather than approximates: a resource carrying a
value with no safe durable representation — a function, a `Symbol`, a
circular reference — fails `AuditEntryNotEncodable` instead of being
stringified or silently dropped.

**Staging** (`AuditStagingPort`, optional) — a best-effort durability
*protocol*, not a write-ahead log: `@qadi/audit` owns no storage of its own,
so it can't promise WAL-style durability. Two methods, `stage`/`commit`, no
`discard` — a staged entry left uncommitted after a write failure is left for
the caller's own reconciliation. An `AuditStagingError` from either method
never blocks or fails the write that follows it; a `commit()` failure is
still tracked, never silently swallowed.

**Circuit breaker** — internal, no port and no public error type. It trips
only on `AuditWriteError`, never on `AuditStagingError`, which is tracked
separately. While open, `record()` still calls `stage()` if staging is wired
but skips `write()` entirely. Every state transition is computed and written
back in one atomic `Ref.modify`, since `filter`/`filterStream` evaluate items
concurrently and concurrent `record()` calls reaching the same breaker are
the ordinary case, not an edge case.

## Structurally outside the pipeline

These are pure functions and data — caller-invoked, caller-scheduled, since
`@qadi/audit` has no scheduler of its own.

**Retention** — `getPurgeableEntries`/`enforceRetention(entries, policy, now)`
partition a set of entries: their union is the input, unchanged, and their
intersection is empty. `now` is a parameter, never `Date.now()`.

**Chain integrity** — `verifyChainIntegrity` fails `ChainIntegrityError` for
any two `sequenceNumber`s, sorted ascending, that aren't exactly one apart —
catching both a gap and a duplicate. An entry with no `sequenceNumber` is
ignored: sequencing is opt-in, assigned only by the caller's own store, never
by `@qadi/audit` itself.

**Archival** — `archiveAuditTrail` sorts entries by `sequenceNumber`, stably,
before setting `metadata.chainIntegrityVerified: true`.

**Decommissioning** — `createDecommissioningChecklist`/
`completeDecommissioningStep` walk a six-step checklist; an unknown step id
fails `UnknownDecommissioningStep` rather than silently no-opping.

```ts
import { enforceRetention, verifyChainIntegrity, createDecommissioningChecklist } from "@qadi/audit";

const kept = enforceRetention(entries, { maxAgeMs: 90 * 24 * 60 * 60 * 1000 }, now);
```
