/**
 * A sink that buffers, and a stream that drains it.
 *
 * [ADR-QD-045](../../../spec/decisions/045-the-topology-is-a-choice-of-sink.md)
 * deferred this and said why: `decisionSinkForwarding`'s `send` carries a
 * contract the type cannot express — it must not block, because `record` is
 * awaited inside the evaluation — and a buffer would *remove* that hazard rather
 * than warn about it, but building one against no real transport would have been
 * speculative. There is a transport now, so this is that follow-up rather than a
 * change of mind.
 *
 * **Publishing never blocks and never fails.** A `PubSub.sliding` drops its
 * oldest entry when full, so a slow or absent reader costs the evaluation
 * nothing — which is the only acceptable behaviour for something an
 * authorization decision waits on
 * ([INV-QD-035](../../../spec/invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)).
 *
 * Sliding rather than dropping, deliberately: a devtools reader that reconnects
 * wants the most recent decisions, not the oldest ones from before it left. That
 * is the same reasoning `decisionSinkRing` uses to evict, and the two agree so a
 * reader sees one policy rather than two.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as PubSub from "effect/PubSub";
import * as Stream from "effect/Stream";
import type { SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";

export const DEFAULT_FEED_CAPACITY = 256;

/**
 * A buffering sink, and the stream a transport reads it through.
 *
 * The piece that lets a transport exist at all without putting one in core: the
 * evaluation writes into the buffer synchronously, and whatever drains the
 * stream — an SSE route, a socket, a file writer — runs on its own fiber and at
 * its own pace.
 *
 * By default a subscriber gets every record published **after it subscribed** —
 * a live feed, with the simplest contract. `replay` hands a joining reader that
 * many recent records first, which is what a devtools page reconnecting after a
 * dropped socket actually wants; without it, pair this with a
 * `decisionSinkRing` through `decisionSinkAll` and serve the backlog separately.
 *
 * An `Effect` rather than a plain handle, unlike `decisionSinkRing`: allocating
 * a `PubSub` is one, and pretending otherwise would mean running it
 * synchronously at construction.
 */
export const decisionSinkFeed = (options?: {
  /** Records held for a slow reader before the oldest is dropped. */
  readonly capacity?: number;
  /** Recent records a new subscriber receives before live ones. Defaults to 0. */
  readonly replay?: number;
}): Effect.Effect<{
  readonly layer: Layer.Layer<DecisionSink>;
  readonly stream: Stream.Stream<SinkRecord>;
}> => {
  const capacity = options?.capacity ?? DEFAULT_FEED_CAPACITY;
  if (!(Number.isInteger(capacity) && capacity > 0)) {
    // Positive, not merely non-negative, unlike the ring's: a zero-capacity
    // `PubSub` would accept nothing and the feed would be silently dead, where a
    // zero-capacity ring is at least a coherent "keep nothing".
    throw new Error(
      `decisionSinkFeed: capacity must be a positive integer, got ${options?.capacity}`,
    );
  }

  return Effect.map(
    PubSub.sliding<SinkRecord>({ capacity, replay: options?.replay ?? 0 }),
    (pubsub) => ({
      layer: Layer.succeed(DecisionSink, {
        record: (record) =>
          Effect.sync(() => {
            // `publishUnsafe`, not `publish`: the awaiting form would make the
            // evaluation wait on a full buffer, which is the exact hazard this
            // module exists to remove. Sliding means it always accepts.
            PubSub.publishUnsafe(pubsub, record);
          }),
      }),
      stream: Stream.fromPubSub(pubsub),
    }),
  );
};
