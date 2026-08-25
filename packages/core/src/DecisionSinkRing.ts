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
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import { DecisionRecord, ObligationRecord } from "./DecisionRecord.ts";
import type { SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";

/** Where an evaluation ran. Stamped by the sink, never claimed by core. */
export interface Stamped {
  /**
   * Where this evaluation happened — `"Server"`, `"Client"`, whatever a caller
   * names its runtime.
   *
   * A plain `string`, not a closed union, and the distinction from the rest of
   * this library is worth stating: nothing branches on this value. It is a
   * label a reader sees, not an input a decision is computed from, so an
   * unrecognised one degrades to an unfamiliar badge rather than to a wrong
   * answer. Closed unions are reserved here for values that decide something.
   */
  readonly environment: string;
}

/**
 * A record as this sink stores it: whatever core reported, plus where it ran.
 *
 * Two sibling `Data.TaggedClass`es reusing `DecisionRecord`/`ObligationRecord`'s
 * own constructor parameter types, rather than one flat interface or a
 * `SinkRecord & Stamped` intersection: a consumer still narrows on `_tag` and
 * gets `policy` on a `Decision` and `obligationIds` on an `Obligations` — a
 * widened struct carrying both as optional would hand every reader a "cannot
 * happen" branch — and a plain `{ ...record, environment }` spread of a
 * `Data.TaggedClass` instance would silently place the result on
 * `Object.prototype`, losing `.pipe`/`Equal.equals`/`Hash`. `new` always sets
 * the correct prototype, so a real class per tag needs no such spread at all.
 */
export class StoredDecisionRecord extends Data.TaggedClass("Decision")<
  ConstructorParameters<typeof DecisionRecord>[0] & Stamped
> {}

export class StoredObligationRecord extends Data.TaggedClass("Obligations")<
  ConstructorParameters<typeof ObligationRecord>[0] & Stamped
> {}

export type StoredRecord = StoredDecisionRecord | StoredObligationRecord;

/**
 * Stamps a record with where it ran, preserving the record's own prototype.
 *
 * A plain `{ ...record, environment }` spread would place the result on
 * `Object.prototype`: `DecisionRecord`/`ObligationRecord` are `Data.TaggedClass`
 * instances, and spread only copies own enumerable keys, not the prototype
 * chain those classes hang `.pipe`, `Equal.equals` and `Hash.hash` from.
 * TypeScript does not catch this — the spread's type-level operator carries
 * `.pipe`'s signature into the result type regardless of whether the runtime
 * value has a working `.pipe` — so a `StoredRecord` built that way would
 * quietly stop honestly satisfying its own type. Spreading `record`'s fields
 * into a fresh class's constructor, below, is a different operation: `new`
 * builds a genuinely new instance with the right prototype, so nothing is lost.
 */
export const stampRecord = (record: SinkRecord, environment: string): StoredRecord =>
  Match.value(record).pipe(
    Match.tagsExhaustive({
      Decision: (r) => new StoredDecisionRecord({ ...r, environment }),
      Obligations: (r) => new StoredObligationRecord({ ...r, environment }),
    }),
  );

export const DEFAULT_RING_CAPACITY = 500;

/**
 * A fresh record log, plus the layer that feeds it.
 *
 * `environment` is **required**: a merged server/client timeline whose rows are
 * unlabelled is the one thing this record log exists to prevent, and defaulting
 * it would let that happen silently.
 *
 * The state lives in this function's closure rather than in the layer's, so
 * `snapshot` can read what the layer wrote — the shape `recordingAttributeResolver`
 * already uses in `@qadi/testing`. Providing the returned layer more than once
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
