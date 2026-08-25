/**
 * Where the devtools gets its records, and the three ways one is wired.
 *
 * Everything downstream of this module reads a `Source` and never a transport,
 * so the timeline, the pairing and the screens are all testable against arrays
 * of records. That mirrors the split `DecisionSink` already made in the other
 * direction: core knows nothing about transports because the port is write-only,
 * and the devtools knows nothing about them because a `Source` is the only shape
 * it consumes.
 *
 * **A record log is two things, not one.** `backlog` is what a process already
 * decided, and `live` is what it decides next. A `decisionSinkRing` can answer
 * the first and not the second; a `decisionSinkFeed` answers the second and only
 * answers the first when it was built with `replay`. The pair is separate here
 * because the honest shape of the underlying sinks is a pair, and collapsing
 * them would force one of the two to be faked.
 */
import * as Effect from "effect/Effect";
import type * as Filter from "effect/Filter";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Stream from "effect/Stream";
import type { SinkRecord, StoredRecord } from "@qadi/core";
import { decodeRecord } from "@qadi/core";

export interface Source {
  /**
   * Records made before the devtools started watching, when the sink can
   * produce them.
   *
   * Optional rather than an empty default, and the distinction carries meaning:
   * absent is "this sink cannot answer for the past", which is true of a bare
   * feed, while an empty array is "it can, and there is nothing". A reader can
   * say "no history available" for the first and "no decisions yet" for the
   * second.
   */
  readonly backlog?: Effect.Effect<ReadonlyArray<StoredRecord>>;
  readonly live: Stream.Stream<StoredRecord>;
}

/**
 * A fixed set of records, and nothing live.
 *
 * For tests, for replaying a captured session, and for rendering a snapshot
 * somebody exported. The whole timeline is exercisable without a transport.
 */
export const sourceFromRecords = (records: ReadonlyArray<StoredRecord>): Source => ({
  backlog: Effect.succeed(records),
  live: Stream.empty,
});

/**
 * A `decisionSinkFeed`'s stream, stamped with where it ran.
 *
 * The stamping happens here because core does not do it: `decisionSinkFeed`
 * yields `SinkRecord`, deliberately, since core cannot know whether it is in a
 * browser, on a server or at an edge. This is the same stamping
 * `decisionSinkRing` performs, at the same boundary, for the same reason.
 */
export const sourceFromFeed = (options: {
  readonly stream: Stream.Stream<SinkRecord>;
  readonly environment: string;
  /** Usually a paired `decisionSinkRing`'s `snapshot`. */
  readonly backlog?: Effect.Effect<ReadonlyArray<StoredRecord>>;
}): Source => ({
  ...(options.backlog === undefined ? {} : { backlog: options.backlog }),
  live: Stream.map(options.stream, (record) => stamp(record, options.environment)),
});

/** A record plus where it ran. The one place the badge is applied. */
const stamp = (record: SinkRecord, environment: string): StoredRecord => ({
  ...record,
  environment,
});

/**
 * The part of `EventSource` this module uses.
 *
 * A structural subset rather than the DOM type, so the SSE adapter can be
 * driven by a fake in a test that renders nothing — the same reason
 * `@qadi/react`'s atom tests do not mount components. It also keeps the model
 * free of a hard dependency on a browser global, which matters because the
 * backlog-and-merge path is exactly what a *server-side* aggregator would run.
 */
export interface DecisionEventSource {
  readonly onMessage: (handler: (data: string) => void) => void;
  readonly onError: (handler: () => void) => void;
  readonly close: () => void;
}

/**
 * `/__decisions` as a source.
 *
 * **Every failure here degrades a row, never the stream.** A frame that is not
 * JSON, a frame that does not decode, a server that goes away — none of them may
 * take down a devtools panel, because the panel is the thing you are looking at
 * when something is already wrong. Both are reported rather than swallowed, on
 * the precedent of `onDropped`, `onUnknownParent` and `onFailure`: silently
 * dropping every frame while looking healthy is the defect, not the drop.
 *
 * `EventSource` reconnects by itself and the server may be replaying, so the
 * same record can arrive twice. Deduplication is the timeline's job, not this
 * module's.
 */
export const sourceFromEventSource = (options: {
  readonly url: string;
  readonly environment: string;
  readonly withCredentials?: boolean;
  /** Replaces the browser `EventSource`. Supply one to test without a network. */
  readonly open?: (url: string, withCredentials: boolean) => DecisionEventSource;
  /** A frame arrived that is not a record. Replaces the default log. */
  readonly onMalformed?: (frame: string, reason: MalformedReason) => void;
  /** The connection dropped. `EventSource` will retry on its own. */
  readonly onDisconnect?: () => void;
}): Source => {
  // Checked here, at construction, rather than when the stream is first pulled:
  // a devtools panel that mounts cleanly and then produces a defect from inside
  // a stream the moment someone opens it is the worst place to learn this. The
  // same reasoning `decisionSinkFeed` validates its capacity by.
  if (options.open === undefined && typeof EventSource === "undefined") {
    throw new Error(
      "sourceFromEventSource: this runtime has no global EventSource. " +
        "Supply `open` with an implementation, or use `sourceFromFeed` in-process.",
    );
  }
  const open = options.open ?? openEventSource;
  const withCredentials = options.withCredentials ?? false;

  const frames = Stream.callback<string>((queue) =>
    Effect.gen(function* () {
      const source = open(options.url, withCredentials);
      source.onMessage((data) => {
        Queue.offerUnsafe(queue, data);
      });
      source.onError(() => {
        options.onDisconnect?.();
      });
      // Registered against the stream's scope, so closing the panel closes the
      // connection rather than leaving a browser retrying a feed nobody reads.
      yield* Effect.addFinalizer(() => Effect.sync(() => source.close()));
    }),
  );

  return {
    live: Stream.filterMapEffect(frames, decodeFrame(options.environment, options.onMalformed)),
  };
};

/**
 * Several sources as one.
 *
 * A dock renders **one** timeline, and the deployment that most needs it has two
 * producers: a server deciding during the render and a browser re-checking after
 * it. Their records share an `evaluationId` — which is what
 * `EvaluateOptions.evaluationId` exists for — so pairing them is the point, and
 * `pairedEntries` can only pair what is in one `Timeline`.
 *
 * There was no way to get them there. `decisionSinkRing.ingest` takes a record
 * from elsewhere, but a ring answers for the past and not for the future, so a
 * second **live** stream had nowhere to go and the SSR topology's "pairs shown"
 * was unreachable through the public API.
 *
 * **`backlog` is absent when every input's is absent**, and that is the part
 * worth reading twice. `Source` distinguishes absent — "this sink cannot answer
 * for the past" — from empty — "it can, and there was nothing"
 * ([BEH-QD-203](../../../spec/behaviors/27-devtools-timeline.md)). Merging two
 * bare feeds and answering `[]` would claim a history was checked when none
 * could be.
 *
 * Ordered by `at`, because the reader is one chronological table and two
 * processes interleave. **Not** deduplicated: a feed built with `replay`
 * re-delivers and `EventSource` reconnects, and the timeline already folds by
 * evaluation id — doing it here as well would be two places to be wrong.
 */
export const mergeSources = (sources: ReadonlyArray<Source>): Source => {
  const backlogs = sources.flatMap((source) =>
    source.backlog === undefined ? [] : [source.backlog]
  );

  const backlog = backlogs.length === 0
    ? undefined
    : Effect.map(Effect.all(backlogs), (parts) => parts.flat().sort((a, b) => a.at - b.at));

  return {
    ...(backlog === undefined ? {} : { backlog }),
    live: Stream.mergeAll(sources.map((source) => source.live), { concurrency: "unbounded" }),
  };
};

/**
 * One SSE frame to one record, or a reported drop.
 *
 * A `FilterEffect` rather than a map: `Result.fail` skips the element, which is
 * exactly "this frame was not a record" without inventing a placeholder row or
 * failing the stream.
 */
const decodeFrame = (
  environment: string,
  onMalformed: ((frame: string, reason: MalformedReason) => void) | undefined,
): Filter.FilterEffect<string, StoredRecord, string> =>
(frame) =>
  Effect.gen(function* () {
    const parsed = parseJson(frame);
    if (Result.isFailure(parsed)) return yield* malformed(frame, "not-json", onMalformed);

    const decoded = yield* Effect.result(decodeRecord(parsed.success));
    if (Result.isFailure(decoded)) return yield* malformed(frame, "not-a-record", onMalformed);

    return Result.succeed(stamp(decoded.success, environment));
  });

/**
 * Why a frame was dropped.
 *
 * The two are different problems with different fixes and the reader is owed
 * the distinction: `not-json` is a broken transport — a proxy that truncated
 * the stream, a reverse proxy injecting its own body — while `not-a-record` is
 * a protocol mismatch, usually a `@qadi/core` on the far side that does not
 * agree with this one about the wire form.
 *
 * A closed union rather than a free string: this is a value a caller branches
 * on, and adding a third reason should be a compile error at every consumer.
 */
export type MalformedReason = "not-json" | "not-a-record";

/** Reports the drop, then filters the frame out. */
const malformed = (
  frame: string,
  reason: MalformedReason,
  onMalformed: ((frame: string, reason: MalformedReason) => void) | undefined,
): Effect.Effect<Result.Result<never, string>> =>
  Effect.as(
    onMalformed === undefined
      ? Effect.logWarning("qadi/devtools: a frame was not a decision record").pipe(
        Effect.annotateLogs({ "qadi.frame": frame, "qadi.reason": reason }),
      )
      : Effect.sync(() => onMalformed(frame, reason)),
    Result.fail(frame),
  );

/**
 * `JSON.parse` throws, and a `try`/`catch` is the honest wrapper for it — the
 * same shape `SinkCodec`'s `renderCause` uses for the same reason.
 */
const parseJson = (frame: string): Result.Result<unknown, string> => {
  try {
    const value: unknown = JSON.parse(frame);
    return Result.succeed(value);
  } catch {
    return Result.fail(frame);
  }
};

/**
 * The browser's `EventSource`, wrapped down to the three members this uses.
 *
 * Read off the global inside the function rather than at module scope, because
 * `@qadi/devtools`'s root entry point is the headless model and a server-side
 * aggregator importing it must not touch a DOM global at load time.
 */
const openEventSource = (url: string, withCredentials: boolean): DecisionEventSource => {
  const source = new EventSource(url, { withCredentials });
  return {
    onMessage: (handler) => source.addEventListener("message", (event) => handler(event.data)),
    onError: (handler) => source.addEventListener("error", () => handler()),
    close: () => source.close(),
  };
};
