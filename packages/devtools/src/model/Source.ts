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
 * **A record log is two things, read together.** `backlog` is what a process
 * already decided, and `live` is what it decides next. They come from one scoped
 * `read`, not two fields a consumer runs one after the other, so a source that
 * can answer both — a `DecisionLog` — hands them over atomically: nothing made
 * between the two is lost, and nothing is handed over twice. A `DecisionLog` is
 * a `Source` as it is, with no adapter; the SSE source is the second
 * implementation of the same seam, reading the same `read` over HTTP.
 */
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import type * as Filter from "effect/Filter";
import * as Match from "effect/Match";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import type { DecodeRefusal, StoredRecord } from "@qadi/core";
import { decodeStoredRecordString, storedRecordOrder } from "@qadi/core";

/** What one `read` of a source hands its reader. */
export interface SourceRead {
  /**
   * Records made before the reader started watching, when the source can
   * produce them.
   *
   * Optional rather than an empty default, and the distinction carries meaning:
   * absent is "this source cannot answer for the past", which is true of an
   * older server that sends no backlog, while an empty array is "it can, and
   * there is nothing". A reader can say "no history available" for the first
   * and "no decisions yet" for the second.
   */
  readonly backlog?: ReadonlyArray<StoredRecord>;
  /** Records made after the backlog was taken. Ends when the read's scope closes. */
  readonly live: Stream.Stream<StoredRecord>;
}

/**
 * Where the devtools gets its records: one scoped read of the past and the
 * future together.
 *
 * Scoped, because a live half holds a subscription or a connection, and closing
 * the panel must release it. One read rather than a `backlog` effect beside a
 * `live` stream, because two fields run independently cannot be atomic: a
 * consumer that read the backlog and then subscribed lost whatever happened
 * between (ARCH-11 C9), and one that ran `live` without `backlog` had no way to
 * know.
 */
export interface Source {
  readonly read: Effect.Effect<SourceRead, never, Scope.Scope>;
}

/**
 * A fixed set of records, and nothing live.
 *
 * For tests, for replaying a captured session, and for rendering a snapshot
 * somebody exported. The whole timeline is exercisable without a transport.
 */
export const sourceFromRecords = (records: ReadonlyArray<StoredRecord>): Source => ({
  read: Effect.succeed({ backlog: records, live: Stream.empty }),
});

/**
 * The SSE events `/__decisions` sends (ADR-QD-097): `backlog` frames, one
 * `synced`, then `message` frames. A closed union — the adapter registers one
 * listener per name.
 */
export type DecisionEventName = "backlog" | "synced" | "message";

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
  readonly onEvent: (event: DecisionEventName, handler: (data: string) => void) => void;
  readonly onError: (handler: () => void) => void;
  readonly close: () => void;
}

/** One frame as it arrived, before anything decided what it is. */
interface Frame {
  readonly event: DecisionEventName;
  readonly data: string;
}

/** How long `read` waits for a prelude before deciding the server sends none. */
const DEFAULT_SYNC_TIMEOUT: Duration.Input = "2 seconds";

/**
 * `/__decisions` as a source: one connection, whose prelude is the backlog and
 * whose remainder is the live stream.
 *
 * `read` opens the connection in its scope and waits for the first of three
 * things: `synced`, after which the `backlog` frames received so far are the
 * backlog (an empty one when the server held nothing — not an absent one); a
 * `message` frame first, which is a server older than the prelude, so the
 * backlog is **absent** and that frame is the first live one; or `syncTimeout`
 * passing with neither, a silent older server, so the backlog is absent and the
 * stream still runs. Waiting is on `Effect.sleep`, so `TestClock` drives it.
 *
 * **The environment comes off the wire.** Every frame is a stored-record
 * envelope decoded by `@qadi/core`'s `decodeStoredRecordString`, which stamps
 * the producer's label; this reader states none. A bare record — a server
 * older than the envelope — is stamped with `legacyEnvironment` when given,
 * and reported `not-a-record` otherwise.
 *
 * **Every failure here degrades a row, never the stream.** A frame that is not
 * JSON, a frame that does not decode, a server that goes away — none of them may
 * take down a devtools panel, because the panel is the thing you are looking at
 * when something is already wrong. Each is reported rather than swallowed, on
 * the precedent of `onDropped`, `onUnknownParent` and `onFailure`: silently
 * dropping every frame while looking healthy is the defect, not the drop.
 *
 * `EventSource` reconnects by itself and the server sends its backlog again on
 * the new connection, so the same record can arrive twice — its `backlog`
 * frames then arrive on the live half, and a repeated `synced` is ignored.
 * Deduplication is the timeline's job, not this module's.
 */
export const sourceFromEventSource = (options: {
  readonly url: string;
  readonly withCredentials?: boolean;
  /**
   * The label for a bare record from a server older than the envelope.
   *
   * @deprecated Accepted for one minor so this reader can read an older server
   * (ARCH-11 D-11-e). Remove in the minor after next.
   */
  readonly legacyEnvironment?: string;
  /** How long to wait for the prelude. Defaults to two seconds. */
  readonly syncTimeout?: Duration.Input;
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
  // same reasoning `makeDecisionLog` validates its capacity by.
  if (options.open === undefined && typeof EventSource === "undefined") {
    throw new Error(
      "sourceFromEventSource: this runtime has no global EventSource. " +
        "Supply `open` with an implementation, or pass a `DecisionLog` in-process.",
    );
  }
  const open = options.open ?? openEventSource;
  const withCredentials = options.withCredentials ?? false;
  const decode = decodeFrame(options.legacyEnvironment, options.onMalformed);

  return {
    read: Effect.gen(function* () {
      const frames = yield* Queue.unbounded<Frame>();
      // The connection lives exactly as long as the read's scope, so closing
      // the panel closes it rather than leaving a browser retrying a stream
      // nobody reads.
      yield* Effect.acquireRelease(
        Effect.sync(() => {
          const source = open(options.url, withCredentials);
          for (const event of DECISION_EVENTS) {
            source.onEvent(event, (data) => {
              Queue.offerUnsafe(frames, { event, data });
            });
          }
          source.onError(() => {
            options.onDisconnect?.();
          });
          return source;
        }),
        (source) => Effect.sync(() => source.close()),
      );

      // Frames taken while waiting for the prelude, in arrival order. Kept
      // outside the timed wait, so a timeout loses none of them: they go to
      // the live half.
      const early: Array<Frame> = [];
      const awaitPrelude = (): Effect.Effect<boolean> =>
        Effect.flatMap(Queue.take(frames), (next) => {
          if (next.event === "synced") return Effect.succeed(true);
          early.push(next);
          return next.event === "message" ? Effect.succeed(false) : awaitPrelude();
        });
      const synced = yield* Effect.timeoutOption(awaitPrelude(), options.syncTimeout ?? DEFAULT_SYNC_TIMEOUT);

      const liveAfter = (first: ReadonlyArray<Frame>): Stream.Stream<StoredRecord> =>
        Stream.concat(Stream.fromIterable(first), Stream.fromQueue(frames)).pipe(
          // A `synced` on the live half is a reconnect's: nothing to decode.
          Stream.filter((frame) => frame.event !== "synced"),
          Stream.map((frame) => frame.data),
          Stream.filterMapEffect(decode),
        );

      // No prelude — an older server, or a silent one: the backlog is absent,
      // and whatever arrived while waiting is the start of the live half.
      if (Option.isNone(synced) || !synced.value) return { live: liveAfter([...early]) };

      // The prelude completed, so every early frame is a `backlog` one.
      const backlog: Array<StoredRecord> = [];
      for (const frame of early) {
        const decoded = yield* decode(frame.data);
        if (Result.isSuccess(decoded)) backlog.push(decoded.success);
      }
      return { backlog: backlog.sort(storedRecordOrder), live: liveAfter([]) };
    }),
  };
};

const DECISION_EVENTS: ReadonlyArray<DecisionEventName> = ["message", "backlog", "synced"];

/**
 * Several sources as one.
 *
 * A dock renders **one** timeline, and the deployment that most needs it has two
 * producers: a server deciding during the render and a browser re-checking after
 * it. Their records share an `evaluationId` — which is what
 * `EvaluateOptions.evaluationId` exists for — so pairing them is the point, and
 * `pairedEntries` can only pair what is in one `Timeline`.
 *
 * Each part is read once, in the merged read's scope, so every part keeps its
 * own atomic handoff between backlog and live.
 *
 * **`backlog` is absent when every input's is absent**, and that is the part
 * worth reading twice. `Source` distinguishes absent — "this sink cannot answer
 * for the past" — from empty — "it can, and there was nothing"
 * ([BEH-QD-203](../../../spec/behaviors/27-devtools-timeline.md)). Merging two
 * live-only sources and answering `[]` would claim a history was checked when
 * none could be.
 *
 * Ordered by `at`, because the reader is one chronological table and two
 * processes interleave — by core's `storedRecordOrder`, the one order a stored
record is read in (INV-QD-039), so a merged backlog and the timeline cannot
disagree about where an unknown (`NaN`) time goes; `sort` is stable, so two
unknowns keep their arrival order. **Not** deduplicated: `EventSource` reconnects
 * and re-reads, and the timeline already folds by
 * evaluation id — doing it here as well would be two places to be wrong.
 */
export const mergeSources = (sources: ReadonlyArray<Source>): Source => ({
  read: Effect.map(Effect.forEach(sources, (source) => source.read), (parts) => {
    const backlogs = parts.flatMap((part) => (part.backlog === undefined ? [] : [part.backlog]));
    const live = Stream.mergeAll(
      parts.map((part) => part.live),
      { concurrency: "unbounded" },
    );
    return backlogs.length === 0
      ? { live }
      : { backlog: backlogs.flat().sort(storedRecordOrder), live };
  }),
});

/**
 * Why a frame was dropped, from the codec's own reason.
 *
 * Built once at module scope (AGENTS.md §5a): a frame is decoded per message,
 * and a matcher rebuilt per call is the slower form.
 */
const reasonOf: (refusal: DecodeRefusal) => MalformedReason = Match.type<DecodeRefusal>().pipe(
  Match.tagsExhaustive({
    NotJson: (): MalformedReason => "not-json",
    TooDeep: (): MalformedReason => "too-deep",
    Malformed: (): MalformedReason => "not-a-record",
    UnsupportedVersion: (): MalformedReason => "unsupported-version",
  }),
);

/**
 * One SSE frame to one stored record, or a reported drop.
 *
 * One call to `@qadi/core`'s `decodeStoredRecordString`, which parses, reads
 * the envelope, guards depth, validates and stamps the producer's label; this
 * adds only the report.
 *
 * A `FilterEffect` rather than a map: `Result.fail` skips the element, which is
 * exactly "this frame was not a record" without inventing a placeholder row or
 * failing the stream.
 */
const decodeFrame = (
  legacyEnvironment: string | undefined,
  onMalformed: ((frame: string, reason: MalformedReason) => void) | undefined,
): Filter.FilterEffect<string, StoredRecord, string> =>
(frame) =>
  Result.match(decodeStoredRecordString(frame, { legacyEnvironment }), {
    onSuccess: (record) => Effect.succeed(Result.succeed(record)),
    onFailure: (error) => malformed(frame, reasonOf(error.refusal), onMalformed),
  });

/**
 * Why a frame was dropped.
 *
 * The four are different problems with different fixes and the reader is owed
 * the distinction: `not-json` is a broken transport — a proxy that truncated
 * the stream, a reverse proxy injecting its own body — `too-deep` is JSON
 * nested past the bound every receiver decodes, which a current sender refuses
 * to emit, so it means an older or foreign sender; `not-a-record` is a
 * protocol mismatch, a record no version of the wire describes (a decision
 * naming neither outcome or both, a field of the wrong type); and
 * `unsupported-version` is a sender newer than this panel, writing a wire
 * version its `@qadi/core` does not read — fixed by upgrading this panel, not
 * the far side (ADR-QD-096).
 *
 * A closed union rather than a free string: this is a value a caller branches
 * on, and adding a reason should be a compile error at every consumer.
 */
export type MalformedReason = "not-json" | "too-deep" | "not-a-record" | "unsupported-version";

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
 * The browser's `EventSource`, wrapped down to the three members this uses:
 * one listener per decision event, the error listener, and `close`.
 *
 * Read off the global inside the function rather than at module scope, because
 * `@qadi/devtools`'s root entry point is the headless model and a server-side
 * aggregator importing it must not touch a DOM global at load time.
 */
const openEventSource = (url: string, withCredentials: boolean): DecisionEventSource => {
  const source = new EventSource(url, { withCredentials });
  return {
    onEvent: (event, handler) => source.addEventListener(event, (message) => handler(message.data)),
    onError: (handler) => source.addEventListener("error", () => handler()),
    close: () => source.close(),
  };
};
