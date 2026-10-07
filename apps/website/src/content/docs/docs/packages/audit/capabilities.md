---
title: Capabilities
description: The assembled DecisionSink pipeline, and the retention, sequence-integrity, archival and purge-planning functions outside it.
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

## What the pipeline reports

Every record `record()` receives ends as exactly one outcome, and each outcome is
reported once: `qadi_audit_writes_total` counts it (every record, including those
the breaker refused), `qadi_audit_staging_total` counts what staging did, and the
line below is logged with the record's `evaluationId` and nothing else from the
entry. `AuditDecisionSinkOptions.onOutcome` receives the same outcome as a value
(`AuditWriteOutcome`), with the encoded entry, so you can dead-letter a lost entry
or record a gap marker yourself; `durabilityOf(outcome)` says whether it was
`Trail`, `StagingOnly`, `Lost` or `Refused`.

| Outcome | Where the entry is | `writes_total` | `staging_total` | Log |
| ------- | ------------------ | -------------- | --------------- | --- |
| `Refused` | nowhere (never encodable) | `encode_failed` | | `onRefused`, else a warning naming the refusal |
| `Written` | the trail | `written` | `staged` (committed), `staged` + `commit_failed`, `failed`, or none | a warning only if the commit failed |
| `WriteFailed`, unwired | **lost** | `write_failed` | none | warning: `audit entry dropped: trail write failed and no staging port wired` |
| `WriteFailed`, staged | staging only | `write_failed` | `staged` | info: `audit entry not written: trail write failed; its staged copy is left for reconciliation` |
| `WriteFailed`, stage failed | **lost** | `write_failed` | `failed` | warning: `audit entry dropped: trail write failed and staging failed` |
| `Skipped`, unwired | **lost** | `skipped_open` | `skipped_open` | warning: `audit entry dropped: circuit breaker open and no staging port wired` |
| `Skipped`, staged | staging only | `skipped_open` | `staged` | info: `audit entry not written: circuit breaker open; its staged copy is left for reconciliation` |
| `Skipped`, stage failed | **lost** | `skipped_open` | `failed_open` | warning: `audit entry dropped: circuit breaker open and staging failed` |

`qadi_audit_entries_lost_total{after, staging}` counts the four **lost** rows.

## Structurally outside the pipeline

These are pure functions and data — caller-invoked, caller-scheduled, since
`@qadi/audit` has no scheduler of its own.

**Retention** — `planRetention(entries, policy, now)` is the age rule: it splits
a set of entries into `retained` and `expired` (their union is the input,
unchanged, and their intersection is empty) and lists the `undated` rows, or
returns a `RetentionInputInvalid` naming the bad input. `now` is a parameter,
never `Date.now()`. A row is expired only with a finite `at` past a valid limit:
a non-finite `at` is retained, and a non-finite `now` or a `maxAgeMs` that is
`NaN` or negative expires nothing. `expired` is a report, not a purge selection.

**Purge** — `planPurge(entries, policy, now, archive)` is the only function that
returns rows to delete. A row is purged only when it is expired and the
`archive` holds it; an expired row the archive does not hold is retained and
listed in `unarchived`. Two identical rows need two archived copies. The
`archive` is a `VerifiedArchive`, which only `readAuditArchive` produces from a
stored bundle (see Archival), so a purge depends on what your store handed back.
It proves what those bytes say and nothing more: not that the store is durable,
that the bytes are untampered, or that the trail is complete.

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
`readAuditArchive(input)` reads a stored bundle back. It refuses, each with its own
`ArchiveRefusal` in an `ArchiveNotVerified`, a bundle that is not an archive, has
another `archiveVersion`, holds an entry that does not decode, declares a count
it does not hold, has a sequence gap or duplicate, is out of the order
`archiveAuditTrail` writes, or claims a verification it cannot back. It never
sorts or repairs the bundle.

**Retiring an audited system** is a list you follow, not something the library
enforces beyond the archive, read-back and purge steps: record the final audit
entry before you export; read the full trail; `archiveAuditTrail` it; write the
bundle to long-term storage; read it back with `readAuditArchive`; `planPurge`
against it and delete `purge`; then revoke signing keys and notify whoever your
process requires.

```ts
import { archiveAuditTrail, planPurge, readAuditArchive } from "@qadi/audit";

const bundle = await Effect.runPromise(archiveAuditTrail(entries, now));
await store.put(JSON.stringify(bundle));
const archive = readAuditArchive(JSON.parse(await store.get()));
if (Result.isSuccess(archive)) {
  const plan = planPurge(entries, { maxAgeMs: 90 * 24 * 60 * 60 * 1000 }, now, archive.success);
  // delete Result.getOrThrow(plan).purge from the trail
}
```
