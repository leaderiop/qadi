# ADR-QD-904 — A decision log is a sink and its own history

> **Document Control**
>
> | Property       | Value                                          |
> | -------------- | ---------------------------------------------- |
> | Document ID    | QADI-ADR-904                                   |
> | Revision       | 1.0                                            |
> | Effective Date | 2026-10-05                                     |
> | Status         | Accepted — amends ADR-QD-045, ADR-QD-046, ADR-QD-047, ADR-QD-050 |
> | Author         | Qadi Engineering                               |
> | Classification | Architecture Decision Record                   |
> | Change History | 1.0 (2026-10-05): Initial release (ARCH-11, CCR-QD-905) |

---

## Context

A process's decisions reached a devtools reader through three shallow modules:
`decisionSinkRing` (`@qadi/core`, the past), `decisionSinkFeed` (`@qadi/core`,
the future) and their host-side pairing — `decisionSinkAll([ring.layer,
feed.layer])` to record into both, and `@qadi/devtools`' `sourceFromFeed({
stream, environment, backlog: ring.snapshot })` to read them back as one source.
Each half passed the deletion test alone. The pairing did not. ARCH-11 verified,
at `e0ee958`:

- **C1–C2.** Every host — the example's server and its browser — wired the pairing
  by hand, twice, and reassembled it once more for the reader.
- **C3.** The environment label was stated twice, at the sink and again at the
  reader, with nothing checking they agreed. The reader's label won for every
  live row and the sink's for every backlog row.
- **C4.** Two eviction bounds (500 and 256 by default) were "kept in step" by a
  comment that agreed on the direction and not the number, and devtools'
  `DEFAULT_TIMELINE_CAPACITY = 500` was a third, equal to core's by comment.
- **C6.** INV-QD-039's ordering was written twice — `compareByAt` and `isAfter` —
  and agreed only by a comment.
- **C7.** The example's `/api/backlog` served the ring's in-memory shape, which
  no decoder accepted; nothing consumed it.
- **C8–C9.** `sourceFromEventSource` could have no backlog, and the documented
  ring + feed recipe **lost every record made between reading the ring and
  subscribing to the feed** under the feed's default `replay: 0` — a probe made
  three decisions and the reader saw two.
- **C10.** The aggregator's `ring.ingest(record, "Edge")` reached the ring only.
  The dock read the server only over SSE, the feed behind it never saw an
  ingested record, and the frame carried no environment, so the example page's
  "look for an **Edge** row in the dock's Log" could not come true by any path.

## Decision

**One deep module, the decision log** (D-11-a). `makeDecisionLog({ environment,
capacity? })` returns one value per process: `layer` (the `DecisionSink`),
`ingest`, `snapshot`, `clear`, and one scoped `read` that hands back the backlog
and the live stream together. Every rule a host used to have to get right is
internal: append before publish, subscribe before snapshot, a sequence
high-water mark filtering the live half, sliding `publish`, `Chunk` eviction by
arrival, the prototype-preserving stamp. `ingest` reaches the backlog **and**
every live reader. A reader sees each retained record exactly once
([INV-QD-906](../invariants.md#inv-qd-906-a-log-reader-sees-every-retained-record-exactly-once)).

**Replace, don't layer** (D-11-b). `decisionSinkRing`, `decisionSinkFeed`,
`DEFAULT_RING_CAPACITY`, `DEFAULT_FEED_CAPACITY` and `sourceFromFeed` are removed
in the same minor. `decisionSinkAll`, `decisionSinkForwarding`, `stampRecord` and
the `Stored*` types stay.

**A devtools `Source` is one scoped `read`** (D-11-c): `{ read: Effect<SourceRead,
never, Scope> }` with `SourceRead = { backlog?, live }`. A `DecisionLog` is a
`Source` as it is; no adapter exists, because one would be an identity.

**One bound** (D-11-d): `capacity`, default `DEFAULT_LOG_CAPACITY = 500`, a
positive integer, bounds the retained backlog and a reader's lag alike; zero is
refused because the same number sizes the live buffer. Devtools'
`DEFAULT_TIMELINE_CAPACITY` is defined as it.

**The environment travels in an envelope** (D-11-e): every SSE frame and backlog
element is `StoredRecordJson = { environment, record }`, `record` being the
record wire unchanged (its `version` lives inside it,
[ADR-QD-903](./903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md)).
`encodeStoredRecord`/`decodeStoredRecord` are members of the one codec
([ADR-QD-902](./902-sinkcodec-owns-both-directions.md)), not a second pipeline;
the decode stamps the producer's label, so devtools stamps nothing. An unknown
top-level envelope key is ignored, as on the record (ADR-QD-903 D-15-c). A bare
record is accepted only with the deprecated `legacyEnvironment`, for one minor.

**The backlog travels on the stream, and has a JSON route too** (D-11-f, option
C). `/__decisions` sends the backlog as `event: backlog` frames, one `event:
synced` (`{"backlog":n}`, sent even for zero), then live `message` frames — one
connection, one `read`, one authorization. `decisionBacklogRoute` serves the same
backlog at `/__decisions/backlog` as a JSON array for readers that do not stream
(the [ADR-QD-049](./049-the-second-shell-is-a-cli.md) CLI), guarded the same way,
and says it is not atomic with the stream.

**Resume on reconnect** (D-11-g, option B). Each record frame's SSE `id` is its
`LogCursor`, `<epoch>.<seq>`, the epoch being the `Clock` time the log was made
([ADR-QD-012](./012-deterministic-time-and-ids.md)). A reconnect's
`Last-Event-ID` of this epoch gets only what followed it; anything else gets the
full backlog. `readEntries(after?)` is the one implementation and `read` maps it.

**One order, in core** (D-11-h). `Stamped`, the `Stored*` classes and
`stampRecord` move to `DecisionRecord.ts`, which gains `storedRecordOrder` — the
INV-QD-039 order the log presents its backlog by and devtools' merge and
timeline both read.

**`decisionStreamRoute` takes the log** (D-11-i): its third parameter is a
`DecisionLogReader` (`Pick<DecisionLog, "read" | "readEntries">`), not a bare
`Stream<SinkRecord>`, which could carry neither a backlog nor an environment.

## Consequences

- **Breaking**, in three packages (0.x minors): `@qadi/core` loses the ring and
  the feed; `@qadi/devtools`' `Source` changes shape, `sourceFromFeed` is gone and
  `sourceFromEventSource` takes no `environment`; `@qadi/http`'s
  `decisionStreamRoute` takes a reader and `frame`/`decisionFrames` change
  signature. The changesets carry the migration.
- **Version skew is loud.** A devtools older than the envelope reading a newer
  server reports every frame `not-a-record` through `onMalformed`; a newer reader
  of an older server stamps bare frames with `legacyEnvironment`, or reports them.
- **The pairing bugs are not writable any more.** C9 and C10 were conventions a
  host had to remember; there is now nothing to pair. The example's server and
  browser each name their environment once, and its `Edge` row appears.
- **More protocol than ADR-QD-046 had.** "No protocol of ours" is no longer
  literally true: a prelude, a `synced` marker, an envelope and an optional
  cursor. It is the minimum that makes the reader's past and future one read.
- **The port stays write-only** (ADR-QD-044, BEH-QD-181). The readable surface is
  the log's, an implementation of the port, exactly as ADR-QD-045 said reading
  back would be.
- **Exactly-once is per read.** Across several sources and across reconnects the
  timeline's identity rule (INV-QD-039) still absorbs a repeat; `mergeSources`
  still does not deduplicate (BEH-QD-235).

## Alternatives considered

- **Keep the ring and the feed, add a pairing combinator** (D-11-a B). Layering,
  not deepening: two labels and two bounds remain, and the C9 handoff cannot be
  fixed without reaching into both modules' internals.
- **Make the port readable** (D-11-a C). Violates BEH-QD-181/ADR-QD-044, and every
  sink — forwarding, audit — would have to answer reads.
- **Deprecated adapters for one minor** (D-11-b B). They would have to re-create
  the lossy `replay`-less recipe or silently change its meaning, and two surfaces
  would sit in `spec/overview.md`.
- **An optional `environment` on the record wire** (D-11-e B). Every older
  receiver's strict decode would have refused the record outright, and the label
  is a reader's concern leaking into forwarding and audit.
- **The envelope in a named event, bare `message` frames kept** (D-11-e C). Old
  readers would silently stop seeing labels and frames would double — silence is
  the defect BEH-QD-204 exists to prevent.
- **A JSON backlog route only** (D-11-f B). Not atomic with the live connection
  — C9's gap returns across HTTP — and two authorizations.

## Related

[ADR-QD-012](./012-deterministic-time-and-ids.md),
[ADR-QD-044](./044-an-optional-decision-sink.md),
[ADR-QD-045](./045-the-topology-is-a-choice-of-sink.md),
[ADR-QD-046](./046-a-decision-feed-is-sse-and-guarded.md),
[ADR-QD-047](./047-a-headless-devtools-model.md),
[ADR-QD-049](./049-the-second-shell-is-a-cli.md),
[ADR-QD-902](./902-sinkcodec-owns-both-directions.md),
[ADR-QD-903](./903-the-sink-wire-is-versioned-and-its-outcome-exclusive.md);
[BEH-QD-185](../behaviors/24-decision-sink.md), BEH-QD-188, BEH-QD-906,
[BEH-QD-201](../behaviors/26-decision-stream.md), BEH-QD-202, BEH-QD-907–909,
[BEH-QD-203](../behaviors/27-devtools-timeline.md), BEH-QD-235;
[INV-QD-039](../invariants.md#inv-qd-039-the-timeline-is-ordered-unique-and-independent-of-arrival),
[INV-QD-906](../invariants.md#inv-qd-906-a-log-reader-sees-every-retained-record-exactly-once).
