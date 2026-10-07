---
title: Capabilities
description: The assembled DecisionSink pipeline, and the retention, sequence-integrity, archival and decommissioning functions outside it.
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
`AuditEntry` is schema-derived, built on `@qadi/core`'s own record codec
rather than re-deriving `Policy`/`Trace`/`Obligation` a second time. An audit
row's `record` is the same JSON the decision stream and forwarding emit for
that record (`encodeSinkRecord`'s output), so a store persists
`JSON.stringify(entry)` as it is; read rows back with `decodeAuditEntry`, the
depth-guarded reader.

Rows are versioned. A row's `record` is wire version 2, with `version: 2` and
the decision's outcome as one tagged `outcome`. It is the only version 0.11
reads or writes. A row written before 0.10 is wire version 1: it has no
`version` key, and `decodeAuditEntry` refuses it as `UnsupportedVersion`.
Re-encode such rows with 0.10.x before upgrading; see
[Upgrading to 0.11](/docs/reference/upgrading/#audit-rows-written-before-010).
Read rows back with
`decodeAuditEntry`, not with the `AuditEntry` schema alone, which under
`Schema`'s default options silently strips a typo inside the stored policy. `encodeAuditEntry` refuses rather than approximates: a
record carrying a value with no safe durable representation — a function, a
`Symbol`, a circular reference, a `Map`/`Set`/`RegExp` — fails
`AuditEntryNotEncodable`, naming the refusal and its path, instead of being
stringified or silently dropped. The refusal is reported, not only counted: it reaches
`AuditDecisionSinkLive`'s `onRefused` when you pass one, otherwise it is logged as a
warning naming the refusal, its path and the record's `evaluationId`.

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
intersection is empty. `now` is a parameter, never `Date.now()`. A row is
purgeable only with a finite `at` past a valid limit: a non-finite `at` is
retained, and a non-finite `now` or a `maxAgeMs` that is `NaN` or negative
purges nothing. `planRetention(entries, policy, now)` returns the same split
plus the `undated` rows, or a `RetentionInputInvalid` naming the bad input —
prefer it when a silently idle purge job would be a problem.

**Sequence integrity** — `verifySequenceIntegrity` fails `SequenceIntegrityError`
for any two `sequenceNumber`s, sorted ascending, that aren't exactly one apart —
catching both a gap and a duplicate. An entry with no `sequenceNumber` is
ignored: sequencing is opt-in, assigned only by the caller's own store, never
by `@qadi/audit` itself. This is gap-and-duplicate detection, not cryptographic
tamper-evidence: there is no per-entry hash and nothing links one entry to the
next, so an attacker able to modify stored rows can renumber them and defeat
this check entirely.

**Archival** — `archiveAuditTrail` sorts entries by `sequenceNumber`, stably,
before setting `metadata.sequenceIntegrityVerified: true`. Entries with no
`sequenceNumber` follow the sequenced ones, in the order given.

**Decommissioning** — `makeDecommissioningChecklist`/
`completeDecommissioningStep` walk a six-step checklist; an unknown step id
fails `UnknownDecommissioningStep` rather than silently no-opping.

```ts
import { enforceRetention, verifySequenceIntegrity, makeDecommissioningChecklist } from "@qadi/audit";

const kept = enforceRetention(entries, { maxAgeMs: 90 * 24 * 60 * 60 * 1000 }, now);
```
