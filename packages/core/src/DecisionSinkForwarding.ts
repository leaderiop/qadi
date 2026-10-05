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
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import type { SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import type { DecisionSinkShape } from "./DecisionSink.ts";
import type { SinkRecordNotEncodable } from "./Errors.ts";
import { encodeSinkRecord } from "./SinkCodec.ts";
import type { SinkRecordJson } from "./SinkCodec.ts";

/**
 * The log annotations a refused record is reported with: which refusal, where
 * in the record, and which evaluation. Shared with nothing on purpose — each
 * adapter reports in its own words — but every adapter names the same three.
 */
const refusalAnnotations = (refusal: SinkRecordNotEncodable) => ({
  "qadi.refusal": refusal.refusal._tag,
  "qadi.path": "path" in refusal.refusal ? refusal.refusal.path.join(".") : "",
  evaluationId: refusal.evaluationId,
});

/**
 * A sink that encodes each record for the wire and hands it to `send`.
 *
 * **`send` receives a value already verified to round-trip.** Each record goes
 * through `encodeSinkRecord` (`SinkCodec.ts`), so what `send` gets is a
 * `SinkRecordJson`: `JSON.stringify` renders it without throwing, and a
 * receiver's `decodeSinkRecord` accepts it. A record that cannot be encoded so
 * — a cyclic or opaque value in its resource, a policy deeper than a receiver
 * will read — never reaches `send`; it is reported as a refusal instead.
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
 * **"Records are ordered" holds within one evaluation, not across concurrent
 * ones** (LL-05) — the same scoping `DecisionRecord.ts`'s own `at` field
 * doc comment already gives its claim, extended here to arrival order.
 * `Qadi.ts`'s `filter`/`filterStream` evaluate items concurrently, so two
 * evaluations' `record` calls race, and *arrival* order at `send` is then
 * completion order, not the order the two questions were asked — a record
 * carrying `at: 1000` can arrive after one carrying `at: 1005`. A consumer
 * that needs the true order sorts by `(at, evaluationId)`, the same
 * cross-process reconstruction ADR-QD-056 already requires of `@qadi/audit`'s
 * readers, rather than trusting arrival order within one process either.
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
 * default log for a caller who would rather alert. It receives either the
 * value `send` failed or died with, or — for a record that was never sent — the
 * `SinkRecordNotEncodable` saying why (BEH-QD-187). The default log keeps the
 * two apart: an encode refusal has its own message, never "could not be
 * forwarded".
 */
export const decisionSinkForwarding = (options: {
  /** Hands one encoded record onward. Must return promptly; see above. */
  readonly send: (encoded: SinkRecordJson) => Effect.Effect<void, unknown>;
  /** Called when a record could not be encoded or delivered. Replaces the log. */
  readonly onFailure?: (error: unknown) => void;
}): Layer.Layer<DecisionSink> => {
  // Captured once so the narrowing survives the closures below — an
  // `options.onFailure?.(...)` inside would be dead defensiveness, and
  // mutation testing flagged it as exactly that.
  const onFailure = options.onFailure;

  // Runs only on the refusal branch, so an accepted record pays for no span.
  const reportRefusal = Effect.fn("qadi.decisionSinkForwarding.refused")(function* (
    refusal: SinkRecordNotEncodable,
  ) {
    if (onFailure !== undefined) return yield* Effect.sync(() => onFailure(refusal));
    yield* Effect.logWarning("qadi: a decision record could not be encoded for forwarding").pipe(
      Effect.annotateLogs(refusalAnnotations(refusal)),
    );
  });

  const reportSendFailure = (cause: Cause.Cause<unknown>) =>
    onFailure === undefined
      ? Effect.logWarning("qadi: a decision record could not be forwarded").pipe(
          Effect.annotateLogs({ "qadi.cause": String(cause) }),
        )
      : // `Cause.squash`, not the raw `cause`: `onFailure` is typed and
        // documented as receiving `error: unknown` — the value `send`
        // failed or died with — matching `onDropped`/`onUnknownParent`'s
        // sibling conventions, both of which hand their callback a plain
        // domain value rather than an Effect-internal `Cause`. A caller
        // otherwise gets a `Cause` object with no `.message`, however
        // `send` actually failed (BEH-QD-187, CCR-QD-122).
        Effect.sync(() => onFailure(Cause.squash(cause)));

  return Layer.succeed(DecisionSink, {
    record: (record) =>
      Effect.sync(() => encodeSinkRecord(record)).pipe(
        Effect.flatMap(
          Result.match({
            onFailure: reportRefusal,
            // `catchCause`, not `catchAll`: `send` is a caller's function, so it
            // can die as easily as it can fail, and either would otherwise reach
            // the decision through a sink that promised it never could.
            onSuccess: (json) => options.send(json).pipe(Effect.catchCause(reportSendFailure)),
          }),
        ),
        // Defence in depth for INV-QD-035: the encode never throws and `send`'s
        // failures are caught above, but `onFailure` is a caller's callback too,
        // and one that throws must not become this decision's defect.
        Effect.catchCause((cause) =>
          Effect.logWarning("qadi: a decision record could not be forwarded").pipe(
            Effect.annotateLogs({ "qadi.cause": String(cause) }),
          ),
        ),
      ),
  });
};

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
 * One failing sink cannot stop the others, and not merely by convention
 * (JA-02, corrected — this previously said the `never` error channel alone
 * was enough, which is a documented contract each member is *supposed* to
 * uphold, not a mechanism that holds if one doesn't). Each member's
 * `record(record)` call is individually wrapped in `Effect.catchCause` below,
 * so a member that dies anyway — a bug in its own `record`, not the ordinary
 * delivery failure `never` already promises it swallows — is reported and
 * skipped rather than stopping `Effect.forEach` and, with it, every sink
 * after it in `sinks`.
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
          Effect.forEach(
            shapes,
            (shape) =>
              shape.record(record).pipe(
                // Each member's `record` is *documented* — by `never` in its
                // own error channel — to swallow its own failures, but a
                // documented contract is not a mechanism: a member that dies
                // anyway (a bug in its own `record`, not the ordinary
                // delivery failure it already catches) must not stop this
                // `forEach` and, with it, delivery to every sink after it in
                // `sinks` (JA-02). Report-and-continue, the same shape
                // `decisionSinkForwarding`'s own `send` handler above uses,
                // for the identical reason: one member's fate must not
                // become every member's fate.
                Effect.catchCause((cause) =>
                  Effect.logWarning("qadi: a fanned-out decision sink failed unexpectedly").pipe(
                    Effect.annotateLogs({ "qadi.cause": String(cause) }),
                  ),
                ),
              ),
            { discard: true },
          ),
      };
    }),
  );
