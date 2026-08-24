/**
 * Sinks that send records elsewhere, and sinks built from other sinks.
 *
 * The in-process ring answers "what did *this* process decide". Three of the six
 * deployments Qadi runs in cannot be served by that: a replicated server has n
 * rings and a reader reaches whichever one answered its request, a serverless
 * function's ring dies with the invocation, and a browser talking to a separate
 * API origin has two processes and one of them has no page.
 *
 * **The topology is a choice of sink, not a change to the evaluator.** That was
 * the point of making `DecisionSink` write-only
 * ([BEH-QD-181](../../../spec/behaviors/24-decision-sink.md)), and this is the
 * module that cashes it: `decisionSinkForwarding` is the seam, and everything
 * beyond it — which socket, which store, which encoding on the wire — belongs to
 * the caller. `@qadi/core` learns nothing about transports.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import type { DecisionSinkShape } from "./DecisionSink.ts";
import { encodeRecord, toWire } from "./SinkCodec.ts";

/**
 * A sink that projects each record onto the wire and hands it to `send`.
 *
 * **`send` must not block.** `record` is awaited inside the evaluation — a
 * deliberate choice, so records are ordered and reproducible under `TestClock`
 * ([ADR-QD-044](../../../spec/decisions/044-an-optional-decision-sink.md)) — so
 * a `send` that performs a network round trip makes every authorization decision
 * wait for it. Enqueue and drain elsewhere. That warning is the whole of the
 * contract, and it is the reason this takes a `send` rather than a socket: a
 * transport that batches is a better transport, and this module has no business
 * deciding how.
 *
 * A failure to deliver is reported and swallowed, never raised.
 * [INV-QD-035](../../../spec/invariants.md#inv-qd-035-a-sink-cannot-change-a-decision)
 * says an observer cannot change a decision, and a devtools page being
 * unreachable is the most ordinary thing that can go wrong here — an
 * authorization request must not fail because nobody is watching.
 *
 * Reported rather than silent, though: a forwarder dropping every record while
 * looking healthy is the same defect `dehydrateDecisions` had before `onDropped`
 * and `resolveRoleGraph` had before `onUnknownParent`. `onFailure` replaces the
 * default log for a caller who would rather alert.
 */
export const decisionSinkForwarding = (options: {
  /** Hands one encoded record onward. Must return promptly; see above. */
  readonly send: (encoded: unknown) => Effect.Effect<void, unknown>;
  /** Called when a record could not be delivered. Replaces the log. */
  readonly onFailure?: (error: unknown) => void;
}): Layer.Layer<DecisionSink> =>
  Layer.succeed(DecisionSink, {
    record: (record) =>
      encodeRecord(toWire(record)).pipe(
        Effect.flatMap(options.send),
        // `catchCause`, not `catchAll`: `send` is a caller's function, so it can
        // die as easily as it can fail, and either would otherwise reach the
        // decision through a sink that promised it never could.
        Effect.catchCause((cause) => {
          // Captured before the closure so the narrowing survives it — an
          // `options.onFailure?.(...)` inside would be dead defensiveness, and
          // mutation testing flagged it as exactly that.
          const onFailure = options.onFailure;
          return onFailure === undefined
            ? Effect.logWarning("qadi: a decision record could not be forwarded").pipe(
                Effect.annotateLogs({ "qadi.cause": String(cause) }),
              )
            : Effect.sync(() => onFailure(cause));
        }),
      ),
  });

/**
 * One sink that writes to all of them, in order.
 *
 * The shape a server with devtools actually wants: keep a local ring so the
 * process can answer for itself, *and* forward to wherever the merged timeline
 * lives. Merging two `Layer`s for one service would not do it — the later one
 * simply wins — so this builds each and fans out across the shapes.
 *
 * Sequential rather than concurrent, deliberately. These run inside the
 * evaluation, so concurrency here buys latency only if a sink blocks, and a sink
 * that blocks is already violating its contract. Sequential keeps the order a
 * reader sees deterministic.
 *
 * One failing sink cannot stop the others: each is already required to swallow
 * its own failures, and `record`'s `never` error channel means none of them can
 * even express one.
 */
export const decisionSinkAll = (
  sinks: ReadonlyArray<Layer.Layer<DecisionSink>>,
): Layer.Layer<DecisionSink> =>
  Layer.effect(
    DecisionSink,
    Effect.gen(function* () {
      // The same `Layer.build` + `Context.get` shape `attributeResolverBounded`
      // uses to wrap a layer it was handed.
      const shapes: ReadonlyArray<DecisionSinkShape> = yield* Effect.forEach(sinks, (sink) =>
        Layer.build(sink).pipe(Effect.map((context) => Context.get(context, DecisionSink))),
      );

      return {
        record: (record: SinkRecord) =>
          // `discard` because every result is `void`; it changes allocation,
          // not behaviour, so mutation testing reports it as equivalent.
          Effect.forEach(shapes, (shape) => shape.record(record), { discard: true }),
      };
    }),
  );
