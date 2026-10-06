---
title: Upgrading to 0.11
description: 0.11 reads and writes one wire format. What that breaks, and the migration for audit rows written before 0.10.
---

0.11 drops every wire format older than the ones 0.10 writes. A decision
record is read only as wire version 2, a decision stream is read only as
stored-record envelopes, and a hydration payload is read only as `version: 2`.
0.10 already writes all three, so a deployment that is entirely on 0.10 has
nothing to migrate except **audit rows written before 0.10**.

Nothing older is upgraded or guessed at. Each one is refused, and each refusal
is reported with its own reason, so nothing is lost without a trace.

## Audit rows written before 0.10

A row written by `@qadi/audit` before 0.10 holds a version-1 record: it has no
`version` key, and its outcome is in `decided`/`failed`. 0.11's
`decodeAuditEntry` refuses such a row as `UnsupportedVersion`, with
`version: undefined`. It does not upgrade the row, and it does not skip it.

**Re-encode those rows as version 2 with 0.10.x before you upgrade anything that
reads the store.** 0.10 reads both versions and writes version 2, so the
migration is to read each row with 0.10's `decodeAuditEntry` and write it back
with 0.10's `encodeAuditEntry`. Run it in a one-off script pinned to
`@qadi/audit@0.10` and `@qadi/core@0.10`:

```ts
// Run with @qadi/audit@0.10 and @qadi/core@0.10 — not 0.11, which no longer
// reads the rows this migrates.
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { decodeAuditEntry, encodeAuditEntry } from "@qadi/audit";

const migrateRow = (stored: unknown) =>
  Effect.gen(function* () {
    const read = decodeAuditEntry(stored); // 0.10 reads version 1 and version 2
    if (Result.isFailure(read)) return yield* Effect.fail(read.failure);
    const rewritten = yield* encodeAuditEntry(read.success.record); // writes version 2
    // Keep the store's own sequence number: encodeAuditEntry never sets one.
    return { ...rewritten, sequenceNumber: read.success.entry.sequenceNumber };
  });
```

A row that already has `version: 2` comes back out as the same record, so
running the script twice is safe. An `AuditArchive` bundled before
0.10 is migrated the same way, entry by entry. Its `archiveVersion` stays `"1"`.

A row that is not migrated is still reported once you are on 0.11.
`decodeAuditEntry` returns `UnsupportedVersion` for it, and you can count those
refusals:

```typescript
import * as Result from "effect/Result";
import { decodeAuditEntry } from "@qadi/audit";

const unmigrated = (rows: ReadonlyArray<unknown>): number =>
  rows.filter((row) => {
    const read = decodeAuditEntry(row);
    return Result.isFailure(read) && read.failure.refusal._tag === "UnsupportedVersion";
  }).length;
```

## Peers on 0.9 or earlier

A process on 0.9 or earlier writes version-1 records. That includes a
`decisionSinkForwarding` sender and a server behind `/__decisions`. A 0.11
reader refuses those records as `UnsupportedVersion`, and refuses a 0.9
server's stream frames because they are bare records, not
`{ environment, record }` envelopes. **There is no compatibility path: upgrade
those peers.** Upgrading them to 0.10 or later is enough, because 0.10 already
writes version 2 and envelopes. The order no longer matters within 0.10 and
later.

Each refusal is reported, not swallowed:

- `@qadi/devtools` reports a version-1 record as `"unsupported-version"` and a
  bare frame as `"not-a-record"`, through `onMalformed`.
- An aggregator using `decodeSinkRecordString` gets `UnsupportedVersion`, which
  the example's ingest route answers with a 400 saying the sender predates 0.10.

## Hydration payloads from older servers

`hydrateDecisions` reads `version: 2` payloads only. A payload without a
`version` key is what `@qadi/react` 0.9 and earlier wrote, and 0.10 read it for
one release. 0.11 drops such a payload whole as `UnsupportedPayloadVersion`,
the same reason a newer version gets. The drop is counted and reported, and the
client re-decides those questions itself, so the page flashes once and stays
correct.

A page cached by a 0.9 server goes through this once, until the cache turns
over. If it keeps happening, the server and the client are running different
releases.

## Removed exports

| Package | Removed | Instead |
| - | - | - |
| `@qadi/core` | `DecodeStoredRecordOptions`, and the `options` argument of `decodeStoredRecord`/`decodeStoredRecordString` | an envelope is the only input read |
| `@qadi/core` | version-1 bytes as a member of `SinkRecordJson` | `SinkRecordJson` is version 2 |
| `@qadi/core` | `1` in `WireVersion`/`WIRE_VERSIONS` | `WireVersion` is `2`, `WIRE_VERSIONS` is `[2]` |
| `@qadi/devtools` | `sourceFromEventSource`'s `legacyEnvironment` | — |
| `@qadi/react` | `DehydratedPayload`, `DehydratedDecisionsV1`, `DehydratedEntryV1` | `DehydratedDecisions` |
| `@qadi/audit` | version-1 rows in `AuditEntry.record` | migrate them with 0.10.x, above |

`sourceFromEventSource` still waits up to `syncTimeout` for the server's
prelude. It no longer treats a `message` frame that arrives before `synced` as a
sign of an older server. Every server since 0.10 sends the prelude first, so
such a frame is delivered live, and the backlog is still the prelude's.

The decisions behind this release are the 2026-10-06 amendments to
[ADR-QD-096](https://github.com/leaderiop/qadi/blob/main/spec/decisions/096-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)
(the record wire),
[ADR-QD-097](https://github.com/leaderiop/qadi/blob/main/spec/decisions/097-a-decision-log-is-a-sink-and-its-own-history.md)
(stored-record envelopes) and
[ADR-QD-078](https://github.com/leaderiop/qadi/blob/main/spec/decisions/078-a-seed-is-its-own-type-and-the-payload-is-versioned.md)
(the hydration payload).
