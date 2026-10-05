/**
 * A bounded, in-memory `DecisionSink` that keeps the most recent records.
 *
 * The default implementation, and the one a devtools overlay reads: decisions
 * accumulate in the process that made them, oldest dropped first once
 * `capacity` is reached.
 *
 * Bounded by **default**, unlike `decisionCacheLayer`, and the asymmetry is
 * deliberate. A cache is normally scoped to one request and dies with it; a
 * record log exists to be read later, so it is by nature long-lived, and an
 * unbounded default would be a memory leak in every application that wired one.
 * The number is a display buffer, not a retention policy — a caller who wants
 * durable history writes a sink that forwards somewhere durable.
 */
import * as Chunk from "effect/Chunk";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { stampRecord } from "./DecisionRecord.ts";
import type { SinkRecord, StoredRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";

export const DEFAULT_RING_CAPACITY = 500;

/**
 * A fresh record log, plus the layer that feeds it.
 *
 * `environment` is **required**: a merged server/client timeline whose rows are
 * unlabelled is the one thing this record log exists to prevent, and defaulting
 * it would let that happen silently.
 *
 * The state lives in this function's closure rather than in the layer's, so
 * `snapshot` can read what the layer wrote — the shape `recordingPort` uses in
 * `PortDoubles.ts`. Providing the returned layer more than once
 * therefore shares one log, which is what a reader wants.
 */
export const decisionSinkRing = (options: {
  readonly environment: string;
  /** How many records to keep. Defaults to `DEFAULT_RING_CAPACITY`. */
  readonly capacity?: number;
}): {
  readonly layer: Layer.Layer<DecisionSink>;
  readonly snapshot: Effect.Effect<ReadonlyArray<StoredRecord>>;
  readonly clear: Effect.Effect<void>;
  readonly ingest: (record: SinkRecord, environment?: string) => Effect.Effect<void>;
} => {
  const capacity = options.capacity ?? DEFAULT_RING_CAPACITY;
  // Checked here, at construction, for the reason `decisionCacheLayer` gives:
  // a negative capacity makes the drop loop's exit condition unsatisfiable and
  // a `NaN` one makes it always false, silently unbounding a log that was asked
  // to be bounded. Both are better as a throw at the call site than as either
  // of those two failures much later.
  if (!(Number.isInteger(capacity) && capacity >= 0)) {
    throw new Error(
      `decisionSinkRing: capacity must be a non-negative integer, got ${options.capacity}`,
    );
  }

  // A `Chunk`, not an `Array`, for the reason the cache's `insertionOrder`
  // gives: this drops from the head on every append once full, and
  // `Array.prototype.shift` re-indexes every remaining element.
  //
  // Directly reassigned rather than `Ref`-wrapped, also as the cache does:
  // Effect reorders fibers only at `yield*` boundaries, never mid-callback, so
  // a reassignment inside `Effect.sync` is exactly as atomic as `Ref.modify`.
  let records: Chunk.Chunk<StoredRecord> = Chunk.empty();

  const append = (record: SinkRecord, environment: string): void => {
    // No special case for `capacity === 0`: appending then dropping
    // leaves the log empty, which is the right answer, and a guard for it
    // was dead code — mutation testing removed it and every test still
    // passed.
    records = Chunk.append(records, stampRecord(record, environment));
    if (Chunk.size(records) > capacity) {
      records = Chunk.drop(records, 1);
    }
  };

  return {
    layer: Layer.succeed(DecisionSink, {
      record: (record) =>
        Effect.sync(() => {
          append(record, options.environment);
        }),
    }),
    snapshot: Effect.sync(() => Chunk.toReadonlyArray(records)),
    clear: Effect.sync(() => {
      records = Chunk.empty();
    }),
    /**
     * Adds a record this process did not make.
     *
     * The receiving half of `decisionSinkForwarding`. A replica forwards, an
     * aggregator ingests, and one merged timeline exists somewhere that a reader
     * can actually reach — which is the whole reason the port is write-only and
     * the topology is a choice of sink.
     *
     * `environment` is a parameter here rather than the ring's own, and that is
     * the point: a merged log holds rows from several processes, and stamping
     * them all with the aggregator's label would erase the one distinction the
     * merge exists to preserve. It falls back to the ring's own label for a
     * caller ingesting its own records.
     */
    ingest: (record, environment) =>
      Effect.sync(() => {
        append(record, environment ?? options.environment);
      }),
  };
};
