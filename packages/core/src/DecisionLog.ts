/**
 * A decision log: one bounded sink that is also a readable history and a live
 * feed, with every record a reader is handed delivered exactly once.
 *
 * It replaces the ring sink (the past) and the feed sink (the future) this
 * package used to export, and the host-side pairing of the two through
 * `decisionSinkAll` and a devtools adapter (ARCH-11). Each half passed the
 * deletion test alone; the pairing did not. A host stated the environment label twice (sink and reader)
 * with nothing checking they agreed, kept two bounds in step by comment, and
 * could not avoid losing a record made between reading the ring and subscribing
 * to the feed — the recommended `replay: 0` lost every one (ARCH-11 C9). An
 * ingested record reached the ring and never the feed, so an aggregator's
 * `Edge` row could not reach a live reader by any path (C10).
 *
 * **What the log hides, so no host can get it wrong.** Append before publish,
 * and subscribe before snapshot, with a sequence number filtering the live half
 * at the snapshot's high-water mark: a record lands in a reader's backlog, or in
 * its live stream, never both and never neither (INV-QD-100). Sliding `publish`,
 * so the newest record wins on a full buffer and the evaluation never waits on a
 * reader. `Chunk` head-eviction by arrival. The prototype-preserving stamp. One
 * capacity, validated once, bounding both the retained backlog and each reader's
 * lag.
 *
 * **Still an optional, write-only `DecisionSink`** (ADR-QD-044). The port does
 * not become readable; this is one implementation of it that also happens to be
 * readable — which is exactly what ADR-QD-045 said reading back would be.
 *
 * A display buffer, not a retention policy: a caller who wants durable history
 * writes a sink that forwards somewhere durable (`@qadi/audit`).
 */
import * as Chunk from "effect/Chunk";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import * as PubSub from "effect/PubSub";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import { stampRecord, storedRecordOrder } from "./DecisionRecord.ts";
import type { SinkRecord, StoredRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";

/**
 * How many records a log keeps, and how far a live reader may lag, by default.
 *
 * Bounded by **default**, unlike `decisionCacheLayer`: a cache is normally
 * scoped to one request and dies with it, while a log exists to be read later,
 * so it is long-lived by nature and an unbounded default would be a memory leak
 * in every application that wired one. Devtools' `DEFAULT_TIMELINE_CAPACITY` is
 * defined as this, so a reader is not bounded twice by two numbers.
 */
export const DEFAULT_LOG_CAPACITY = 500;

/** What one `read` hands a reader: the past and the future, together. */
export interface DecisionLogRead {
  /**
   * Every record the log retained when the reader subscribed, in
   * `storedRecordOrder`.
   *
   * Never absent: a log can always answer for its past, even when the answer is
   * empty. That makes a `DecisionLog` a devtools `Source` as it is, whose
   * `backlog` is optional only because a bare live transport cannot answer.
   */
  readonly backlog: ReadonlyArray<StoredRecord>;
  /**
   * Every record made after the backlog was taken, in arrival order, once.
   *
   * Ends when the `read`'s scope closes. A reader slower than `capacity` records
   * loses the oldest it has not pulled, never the newest.
   */
  readonly live: Stream.Stream<StoredRecord>;
}

/**
 * Where one record sits in one log: the log's epoch and the record's sequence
 * number in it.
 *
 * The epoch is the `Clock` time the log was made (ADR-QD-012: read from
 * `Clock`, so a `TestClock` fixes it), which makes a restarted process's
 * sequence numbers unambiguous — a cursor from a log that no longer exists
 * names a different epoch and is not mistaken for a position in this one. It
 * is what `/__decisions` sends as each frame's SSE `id`, and what a
 * reconnecting `EventSource` sends back as `Last-Event-ID`.
 */
export interface LogCursor {
  readonly epoch: number;
  readonly seq: number;
}

/** One retained record and where it sits in its log. */
export interface LogEntry {
  readonly cursor: LogCursor;
  readonly record: StoredRecord;
}

/** What one `readEntries` hands a reader: `read`'s halves, each record with its cursor. */
export interface DecisionLogEntries {
  readonly backlog: ReadonlyArray<LogEntry>;
  readonly live: Stream.Stream<LogEntry>;
}

/** A cursor as text: `<epoch>.<seq>`, both non-negative integers. */
export const formatLogCursor = (cursor: LogCursor): string => `${cursor.epoch}.${cursor.seq}`;

const CURSOR = /^(\d+)\.(\d+)$/;

/**
 * A cursor from text, or `None` when the text is not exactly `<epoch>.<seq>`.
 *
 * Strict, because the text is a request header a client controls: anything
 * else — a sign, an exponent, a fraction, an integer past
 * `Number.MAX_SAFE_INTEGER`, a third segment — is not a cursor, and a reader
 * that sent one gets the full backlog rather than a guess.
 */
export const parseLogCursor = (text: string): Option.Option<LogCursor> => {
  const match = CURSOR.exec(text);
  if (match === null) return Option.none();
  const epoch = Number(match[1]);
  const seq = Number(match[2]);
  return Number.isSafeInteger(epoch) && Number.isSafeInteger(seq) ? Option.some({ epoch, seq }) : Option.none();
};

export interface DecisionLog {
  /**
   * Where this process runs — `"Server"`, `"Client"`, whatever a caller names
   * its runtime — stamped on every record it makes.
   *
   * Stated once, here, at the producer. A reader never states it again: it
   * arrives on each record, and over SSE inside each frame's envelope.
   */
  readonly environment: string;
  /** The one bound: records retained, and how far a live reader may lag. */
  readonly capacity: number;
  /**
   * The sink half. Providing it more than once shares one log, which is what a
   * reader wants: the state lives in the log, not in the layer.
   */
  readonly layer: Layer.Layer<DecisionSink>;
  /**
   * Adds a record this process did not make — the receiving half of
   * `decisionSinkForwarding`. It reaches the backlog **and** every live reader.
   *
   * `environment` is a parameter rather than the log's own: a merged log holds
   * rows from several processes, and stamping them all with the aggregator's
   * label would erase the one distinction the merge exists to preserve. It falls
   * back to the log's own label for a caller ingesting its own records.
   */
  readonly ingest: (record: SinkRecord, environment?: string) => Effect.Effect<void>;
  /** The retained records, in `storedRecordOrder`. A copy, not a live view. */
  readonly snapshot: Effect.Effect<ReadonlyArray<StoredRecord>>;
  /**
   * Empties the backlog. The sequence is not reset, so a reader already
   * subscribed keeps a monotonic high-water mark.
   */
  readonly clear: Effect.Effect<void>;
  /**
   * The backlog and the live stream, read together so each retained record
   * reaches the reader exactly once. Scoped: the subscription lives as long as
   * the scope does.
   */
  readonly read: Effect.Effect<DecisionLogRead, never, Scope.Scope>;
  /**
   * `read`, with each record's cursor — and, given a cursor from this log, only
   * what followed it.
   *
   * A reconnecting reader passes the cursor of the last record it received, so
   * it is sent only what it missed rather than the whole backlog again. A
   * cursor from another epoch (another log, or this process before a restart)
   * says nothing about this log, so the backlog is whole. `read` is this
   * without a cursor, mapped to records: there is one implementation.
   */
  readonly readEntries: (after?: LogCursor) => Effect.Effect<DecisionLogEntries, never, Scope.Scope>;
}

/**
 * The part of a log a reader needs. `decisionStreamRoute` takes this, so a test
 * passes a structural fake and a route cannot write to the log it serves.
 */
export type DecisionLogReader = Pick<DecisionLog, "read" | "readEntries">;

/** Entries in `storedRecordOrder` of their records: how a backlog is presented. */
const byRecord = (a: LogEntry, b: LogEntry) => storedRecordOrder(a.record, b.record);

const presented = (entries: Chunk.Chunk<LogEntry>): ReadonlyArray<LogEntry> =>
  Chunk.toReadonlyArray(entries).toSorted(byRecord);

/**
 * A log's half died: reported, and the other half still runs (INV-QD-035).
 *
 * The `decisionSinkAll` member-isolation shape. Neither half can fail by its
 * type, so this catches only a defect — a library bug — that would otherwise
 * end the evaluation that called `record`.
 */
const isolate = (half: "append" | "publish") =>
  Effect.catchCause((cause) =>
    Effect.logWarning(`qadi: a decision log's ${half} half failed`).pipe(
      Effect.annotateLogs({ "qadi.cause": String(cause) }),
    ),
  );

/**
 * A fresh decision log.
 *
 * `environment` is **required**: a merged timeline whose rows are unlabelled is
 * the one thing a record log exists to prevent, and defaulting it would let that
 * happen silently.
 *
 * An `Effect`, because allocating the `PubSub` behind the live half is one.
 * Hosts at module scope run it with `Effect.runSync`, which is safe: it only
 * allocates.
 *
 * **Throws** at the call site when `capacity` is not a positive integer. Zero is
 * refused, not read as "keep nothing": the same number bounds the live lag, and
 * a zero-capacity `PubSub` accepts nothing, so a log of zero would be a sink
 * that silently keeps and streams nothing. A negative bound makes eviction's
 * exit condition unsatisfiable and a `NaN` one makes it always false; both are
 * better as a throw here than as an unbounded log much later.
 */
export const makeDecisionLog = (options: {
  readonly environment: string;
  /** Records retained, and a reader's lag. Defaults to `DEFAULT_LOG_CAPACITY`. */
  readonly capacity?: number;
}): Effect.Effect<DecisionLog> => {
  const capacity = options.capacity ?? DEFAULT_LOG_CAPACITY;
  if (!(Number.isInteger(capacity) && capacity > 0)) {
    throw new Error(
      `makeDecisionLog: capacity must be a positive integer, got ${options.capacity} — ` +
        "zero is refused because the same bound sizes the live buffer, and a log of zero " +
        "would silently keep and stream nothing",
    );
  }

  return Effect.gen(function* () {
    // Read once, here: a log's epoch is when it was made (ADR-QD-012). The
    // record path itself reads no clock.
    const epoch = yield* Clock.currentTimeMillis;
    const pubsub = yield* PubSub.sliding<LogEntry>({ capacity });
    // A `Chunk`, not an `Array`: this drops from the head on every append once
    // full, and `Array.prototype.shift` re-indexes every remaining element.
    //
    // Directly reassigned rather than `Ref`-wrapped, as `decisionCacheLayer`
    // does: Effect reorders fibers only at `yield*` boundaries, never
    // mid-callback, so a reassignment inside `Effect.sync` is exactly as atomic
    // as `Ref.modify`. That is what lets `append` number and retain a record in
    // one step, and `read` take its snapshot and high-water mark in another.
    let entries: Chunk.Chunk<LogEntry> = Chunk.empty();
    let seq = 0;

    const append = (record: SinkRecord, environment: string): LogEntry => {
      seq += 1;
      const entry: LogEntry = { cursor: { epoch, seq }, record: stampRecord(record, environment) };
      entries = Chunk.append(entries, entry);
      if (Chunk.size(entries) > capacity) entries = Chunk.drop(entries, 1);
      return entry;
    };

    // Append, **then** publish — the order is load-bearing. A reader that
    // subscribes between the two finds the record in its snapshot, and its
    // high-water mark drops the live copy. Publishing first would let a reader
    // subscribe after the publish and snapshot before the append, and the record
    // would be in neither.
    //
    // Plain closures returning `Effect`, not `Effect.fn`: this runs once per
    // decision, and a named span here costs ≈2.8 µs a call (ADR-QD-073).
    const accept = (record: SinkRecord, environment: string): Effect.Effect<void> =>
      Effect.sync(() => append(record, environment)).pipe(
        Effect.flatMap((entry) =>
          // `publish`, not `publishUnsafe`. `publishUnsafe` only tries the raw
          // ring buffer and returns `false` on a full one without ever
          // consulting the pubsub's configured strategy — sliding eviction
          // lives entirely in `SlidingStrategy.handleSurplus`, which only
          // `publish` reaches. That made `publishUnsafe` refuse the *newest*
          // record on a full buffer and keep the stale backlog, inverting this
          // module's documented newest-wins policy. `publish` still never
          // blocks here: for a `PubSub.sliding` — the only kind this module
          // builds — `handleSurplus` is `Effect.sync` all the way down
          // (`slidingPublishUnsafe` evicts and republishes synchronously), so
          // switching to the awaited form costs nothing.
          PubSub.publish(pubsub, entry).pipe(Effect.asVoid, isolate("publish")),
        ),
        isolate("append"),
      );

    const readEntries = (after?: LogCursor): Effect.Effect<DecisionLogEntries, never, Scope.Scope> =>
      Effect.gen(function* () {
        // Subscribe, **then** snapshot. Every record appended after this point
        // is published after it too, so it reaches this subscription; every
        // record appended before the snapshot is in it. `seq` at the snapshot
        // is the line between the two: nothing at or below it may arrive live.
        const subscription = yield* PubSub.subscribe(pubsub);
        const { retained, highWater } = yield* Effect.sync(() => ({ retained: presented(entries), highWater: seq }));
        // A cursor from this epoch has already seen everything at or below it.
        const resumeAfter = after !== undefined && after.epoch === epoch ? after.seq : 0;
        return {
          backlog: retained.filter((entry) => entry.cursor.seq > resumeAfter),
          live: Stream.fromSubscription(subscription).pipe(
            Stream.filter((entry) => entry.cursor.seq > highWater),
          ),
        };
      });

    return {
      environment: options.environment,
      capacity,
      layer: Layer.succeed(DecisionSink, {
        record: (record) => accept(record, options.environment),
      }),
      ingest: (record, environment) => accept(record, environment ?? options.environment),
      snapshot: Effect.sync(() => presented(entries).map((entry) => entry.record)),
      clear: Effect.sync(() => {
        entries = Chunk.empty();
      }),
      read: Effect.map(readEntries(), ({ backlog, live }) => ({
        backlog: backlog.map((entry) => entry.record),
        live: Stream.map(live, (entry) => entry.record),
      })),
      readEntries,
    };
  });
};
