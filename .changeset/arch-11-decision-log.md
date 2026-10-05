---
"@qadi/core": minor
"@qadi/http": minor
"@qadi/devtools": minor
---

One decision log replaces the ring, the feed and their pairing: a process's sink, its backlog and its live stream in one value, with every retained record reaching a reader exactly once (ADR-QD-904, INV-QD-906).

**Rollout.** `/__decisions` frames are now `{ environment, record }` envelopes. A devtools panel older than this release reads every frame from a newer server as `not-a-record` (reported through `onMalformed`, never shown mislabelled): upgrade the panel with the server. A newer panel reading an older server's bare frames labels them with `legacyEnvironment` when given, and reports them otherwise.

- **`@qadi/core` — `makeDecisionLog({ environment, capacity? })`** returns a `DecisionLog`: `layer` (the `DecisionSink`), `ingest`, `snapshot`, `clear`, a scoped `read` (`{ backlog, live }`) and `readEntries(after?)` (each record with its `LogCursor`). One `capacity` (default `DEFAULT_LOG_CAPACITY = 500`, a positive integer — zero is refused) bounds the backlog and a reader's lag. `ingest` reaches live readers as well as the backlog, which is what makes an aggregator's `Edge` record visible to a reader already watching. A record made while a reader connects is never lost or repeated; the documented ring + feed recipe lost every such record.
- **`@qadi/core` — the stored-record envelope.** `StoredRecordJson`, `encodeStoredRecord`/`encodeStoredRecordString` and `decodeStoredRecord`/`decodeStoredRecordString` (with `DecodeStoredRecordOptions.legacyEnvironment`, deprecated, kept for one minor) carry the producer's environment beside the unchanged record wire. Also new: `storedRecordOrder` (the one order a stored record is read in), `LogCursor`, `LogEntry`, `DecisionLogEntries`, `formatLogCursor`, `parseLogCursor`, `DecisionLogRead`, `DecisionLogReader`. `Stamped`, `StoredRecord`, `StoredDecisionRecord`, `StoredObligationRecord` and `stampRecord` now live in `DecisionRecord.ts`; their import from `@qadi/core` is unchanged.
- **Breaking (`@qadi/core`):** `decisionSinkRing`, `decisionSinkFeed`, `DEFAULT_RING_CAPACITY` and `DEFAULT_FEED_CAPACITY` are removed.

  ```ts
  // before
  const ring = decisionSinkRing({ environment: "Server", capacity: 500 });
  const feed = Effect.runSync(decisionSinkFeed({ capacity: 256, replay: 32 }));
  const sink = decisionSinkAll([ring.layer, feed.layer]);
  // after
  const log = Effect.runSync(makeDecisionLog({ environment: "Server", capacity: 500 }));
  const sink = log.layer; // ring.snapshot → log.snapshot, ring.ingest → log.ingest
  ```

- **Breaking (`@qadi/http`):** `decisionStreamRoute(permission, policy, log, options?)` takes a `DecisionLogReader` (a `DecisionLog`), not a `Stream`: `decisionStreamRoute(p, policy, feed.stream)` becomes `decisionStreamRoute(p, policy, log)`. Each connection receives the log's backlog as `event: backlog` frames, one `event: synced` frame (`{"backlog":n}`, `DecisionStreamSynced`), then live frames; every record frame carries its cursor as its SSE `id`, and a reconnect's `Last-Event-ID` from the same log is sent only what it missed. `frame(event, cursor?)` and `decisionFrames(entries, options?)` change signature accordingly; `DecisionFrameEvent` and `syncedFrame` are new.
- **`@qadi/http` — `decisionBacklogRoute(permission, policy, log, options?)`** serves the backlog as a JSON array of envelopes at `/__decisions/backlog`, guarded with no unguarded variant and listed by `/__permissions`.
- **Breaking (`@qadi/devtools`):** a `Source` is one scoped `read` — `{ read: Effect<SourceRead, never, Scope> }` with `SourceRead = { backlog?, live }` — so the past and the future are handed over together. A `DecisionLog` is a `Source` as it is, and `sourceFromFeed` is removed: `sourceFromFeed({ stream, environment, backlog })` becomes the log itself. `sourceFromEventSource` loses `environment` (each frame names its producer), gains `legacyEnvironment` (deprecated) and `syncTimeout` (default two seconds), reads the server's prelude as its backlog, and its `DecisionEventSource` registers `onEvent` per `DecisionEventName` (`"backlog" | "synced" | "message"`) instead of `onMessage`. A hand-built `Source` (`{ backlog: Effect, live }`) becomes `{ read: Effect.succeed({ backlog, live }) }`. `DEFAULT_TIMELINE_CAPACITY` is `DEFAULT_LOG_CAPACITY`.
