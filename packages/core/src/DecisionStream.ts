/**
 * The decision stream's order, written and read in one place: a log as transport-free frames, and frames back as a read.
 *
 * A reader of a decision log's stream receives one `backlog` frame per record the
 * log retained, one `synced` frame, then one `message` frame per record made after
 * (ADR-QD-097). {@link encodeDecisionStream} writes that order and
 * {@link decodeDecisionStream} reads it back; a transport carries the frames and
 * states no order of its own.
 *
 * ARCH-60 (a port of the lost commit `6c67e44`): `@qadi/http` used to frame the backlog in
 * `storedRecordOrder` (by `at`) while a resume kept `seq > Last-Event-ID`. When `at`
 * order differs from arrival order — overlapping evaluations, any `Edge` ingest —
 * the last id a reader saw was not its highest position, and a connection cut
 * mid-prelude resumed past records it never received, silently.
 *
 * The stream's words (`DecisionStreamEvent`, `DecisionStreamSynced`) and its
 * cursor text (`formatLogCursor`, `parseLogCursor`) are declared here too, beside
 * the two ends that speak them; `DecisionLog.ts` keeps the cursor itself and
 * imports nothing from this module.
 *
 * **Backlog frames travel in cursor order.** A frame's `id` is a resume position
 * (`<epoch>.<seq>`) and `Last-Event-ID` resumes after it, so ids rise along a
 * connection and a resume is exact. Presentation order is the reader's: it sorts by
 * `storedRecordOrder`, and the timeline is independent of arrival (INV-QD-039).
 *
 * **The seam is a transport-free frame**, `{ event, id?, data }`. `@qadi/http`
 * turns one into SSE bytes, and `@qadi/devtools` hands {@link decodeDecisionStream}
 * what its `EventSource` received. The record's bytes, and the words a refusal is
 * reported in, are the caller's in both directions (`encodeRecord`,
 * `decodeRecord`): this module owns order and cursor only, and imports no codec and
 * no transport. Both directions sit in one file, so the round trip
 * (`decode(encode(log))` is the log's read) and the resume that the old order
 * broke are properties of this module's own tests.
 */
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Queue from "effect/Queue";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type * as Scope from "effect/Scope";
import * as Stream from "effect/Stream";
import type { DecisionLog, LogCursor, LogEntry } from "./DecisionLog.ts";
import { storedRecordOrder } from "./DecisionRecord.ts";
import type { StoredRecord } from "./DecisionRecord.ts";

/**
 * The events a decision log is served as: `backlog` frames, one `synced`, then
 * `message` frames, in protocol order (ADR-QD-097).
 *
 * Declared in core because the writer (`@qadi/http`'s `/__decisions` route) and
 * the reader (`@qadi/devtools`' `sourceFromEventSource`) share only this package
 * (ADR-QD-047), and in this module because {@link encodeDecisionStream} and
 * {@link decodeDecisionStream} are the two ends that speak it (ARCH-60). Each side
 * used to declare its own copy, so a rename compiled on both sides and was caught
 * only by the acceptance scenarios (ARCH-28). A closed union: a reader registers
 * one listener per name.
 */
export const DecisionStreamEvent = Schema.Literals(["backlog", "synced", "message"]);

export type DecisionStreamEvent = typeof DecisionStreamEvent.Type;

/** The events that carry a stored record: every one but `synced`. */
export type DecisionRecordEvent = Exclude<DecisionStreamEvent, "synced">;

/**
 * The `synced` frame's data: how many `backlog` frames preceded it.
 *
 * Its own schema so a reader can decode it as untrusted input. The count is a
 * non-negative integer: it is the backlog frames actually sent, so `-1`, `1.5`
 * and `NaN` are refused rather than accepted (ARCH-28 D-28-d).
 */
export const DecisionStreamSynced = Schema.Struct({
  backlog: Schema.Int.check(Schema.isGreaterThanOrEqualTo(0)),
});

export type DecisionStreamSynced = typeof DecisionStreamSynced.Type;

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

/**
 * One frame of the stream, before any transport has written it.
 *
 * A record frame's `id` is its record's position, `formatLogCursor` of its cursor,
 * which a transport sends back to resume; `data` is what `encodeRecord` made of
 * the record. The `synced` frame has no `id`, so the last id a reader saw is always
 * a record's; its `data` is the `DecisionStreamSynced` JSON.
 */
export type DecisionStreamFrame =
  | { readonly event: DecisionRecordEvent; readonly id: string; readonly data: string }
  | { readonly event: "synced"; readonly id?: undefined; readonly data: string };

/** What {@link encodeDecisionStream} is told: where to resume, and how a record becomes data. */
export interface EncodeDecisionStreamOptions {
  /**
   * A transport's resume text (`Last-Event-ID`). When it parses as a cursor of
   * this log's epoch the backlog holds only what followed it; anything else gets
   * the whole backlog.
   */
  readonly after?: string | undefined;
  /**
   * One record as frame data: `Some` is the data, `None` drops the record's frame.
   * A refusal is the caller's to report, in its own words, before it answers `None`.
   */
  readonly encodeRecord: (record: StoredRecord) => Effect.Effect<Option.Option<string>>;
}

/**
 * One read of a decision log as frames: each backlog entry as a `backlog` frame in
 * cursor order, one `synced` frame whose count is the backlog frames actually
 * sent, then each live entry as a `message` frame. Every record frame carries its
 * entry's cursor as its `id`.
 *
 * The read opens when the stream is first pulled and closes with the stream's
 * scope, so a subscription lives exactly as long as the response carrying it. The
 * backlog is sorted by `cursor.seq` here whatever order `readEntries` returned, so
 * a structural fake of the log cannot reintroduce the loss. The per-entry steps are
 * plain closures: they run once per record (ADR-QD-073).
 */
export const encodeDecisionStream = (
  log: Pick<DecisionLog, "readEntries">,
  options: EncodeDecisionStreamOptions,
): Stream.Stream<DecisionStreamFrame> => {
  const after = Option.getOrUndefined(Option.flatMap(Option.fromNullishOr(options.after), parseLogCursor));
  const framed =
    (event: DecisionRecordEvent) =>
    (entry: LogEntry): Effect.Effect<Option.Option<DecisionStreamFrame>> =>
      Effect.map(
        options.encodeRecord(entry.record),
        Option.map((data): DecisionStreamFrame => ({ event, id: formatLogCursor(entry.cursor), data })),
      );
  return Stream.unwrap(
    Effect.map(log.readEntries(after), (read) =>
      Stream.unwrap(
        Effect.map(
          Effect.forEach(
            read.backlog.toSorted((a, b) => a.cursor.seq - b.cursor.seq),
            framed("backlog"),
          ),
          (results) => {
            const kept = results.flatMap(Option.toArray);
            const synced: DecisionStreamFrame = {
              event: "synced",
              // A total encode: `kept.length` is a non-negative integer by construction.
              data: JSON.stringify(Schema.encodeSync(DecisionStreamSynced)({ backlog: kept.length })),
            };
            return Stream.fromIterable([...kept, synced]).pipe(
              Stream.concat(
                Stream.filterMapEffect(read.live, (entry) =>
                  Effect.map(framed("message")(entry), (frame) => Result.fromOption(frame, () => undefined))),
              ),
            );
          },
        ),
      )),
  );
};

/**
 * One frame as a reader received it: the event and the data, nothing else.
 *
 * A {@link DecisionStreamFrame} is one, structurally, so the round trip needs no
 * mapping. An `EventSource` hands a reader exactly this much.
 */
export interface ReceivedFrame {
  readonly event: DecisionStreamEvent;
  readonly data: string;
}

/** What {@link decodeDecisionStream} hands its reader. */
export interface DecisionStreamRead {
  /**
   * Records made before the reader started watching, when the stream could
   * produce them.
   *
   * Optional rather than an empty default, and the distinction carries meaning:
   * absent is "this stream cannot answer for the past" — a connection whose
   * prelude did not arrive in time — while an empty array is "it can, and there
   * is nothing". A reader can say "no history available" for the first and "no
   * decisions yet" for the second (BEH-QD-203).
   */
  readonly backlog?: ReadonlyArray<StoredRecord>;
  /** Records made after the backlog was taken. Ends when the frames do, or with the read's scope. */
  readonly live: Stream.Stream<StoredRecord>;
}

/** How long {@link decodeDecisionStream} waits for a prelude before deciding the server sends none. */
const DEFAULT_SYNC_TIMEOUT: Duration.Input = "2 seconds";

/**
 * Frames as a reader received them, read back as a log's read: a backlog, or
 * none, and a live stream.
 *
 * Waits for one of two things: `synced`, after which the `backlog` frames
 * received so far are the backlog, presented in `storedRecordOrder` (an empty
 * one when the server held nothing — not an absent one); or `syncTimeout`
 * passing first — a server that has not delivered its prelude yet, being
 * unreachable, or buffered by a proxy — so the backlog is **absent** and the
 * live half still runs, with every frame taken while waiting at its start. Frames
 * that end before `synced` are the same answer. Waiting is on `Effect.sleep`, so
 * `TestClock` drives it (ADR-QD-012).
 *
 * A `message` frame before `synced` is a live record, kept in arrival order on
 * the live half, and the wait continues. A `synced` on the live half is a
 * reconnect's and is skipped, its `backlog` frames arriving live: the same record
 * can arrive twice, and deduplication is the timeline's job.
 *
 * **`synced`'s count is not read** (ARCH-28 D-28-e). Inside one connection the
 * transport delivers every frame the writer sent, and `decodeRecord` reports each
 * one it cannot read; across connections a reader cannot attribute frames to
 * connections. The loss this module was written to end — a reconnect mid-backlog
 * resuming past records it never received — arrived with a per-connection count
 * that was correct, so a check of it could not have caught it. The writer's law,
 * that the count is the backlog frames sent, is pinned by the round-trip property
 * in core's tests instead.
 *
 * **Never fails:** a record frame `decodeRecord` answers `None` for is left out,
 * and reporting it is the caller's, in its own words. The frames are consumed in
 * the caller's scope, which also ends the consumption.
 */
export const decodeDecisionStream = Effect.fn("qadi.decisionStream.decode")(function* (
  frames: Stream.Stream<ReceivedFrame>,
  options: {
    /** How long to wait for the prelude. Defaults to two seconds. */
    readonly syncTimeout?: Duration.Input | undefined;
    /**
     * One record frame's data as a record: `None` leaves the frame out. A refusal
     * is the caller's to report, in its own words, before it answers `None`.
     */
    readonly decodeRecord: (data: string) => Effect.Effect<Option.Option<StoredRecord>>;
  },
): Effect.fn.Return<DecisionStreamRead, never, Scope.Scope> {
  // A queue, not a pulled stream, so frames that arrive in the same chunk as
  // `synced` start the live half in order rather than being dropped or filed as
  // backlog.
  const queue = yield* Stream.toQueue(frames, { capacity: "unbounded" });
  const decode = (frame: ReceivedFrame) =>
    Effect.map(options.decodeRecord(frame.data), (record) => Result.fromOption(record, () => undefined));

  // Frames taken while waiting for the prelude, in arrival order. Kept outside
  // the timed wait, so a timeout loses none of them: they go to the live half.
  const early: Array<ReceivedFrame> = [];
  const awaitPrelude = (): Effect.Effect<boolean> =>
    Effect.flatMap(
      Effect.orElseSucceed(Queue.take(queue), () => undefined),
      (next) => {
        // The frames ended before a prelude: the same as none arriving.
        if (next === undefined) return Effect.succeed(false);
        if (next.event === "synced") return Effect.succeed(true);
        early.push(next);
        return awaitPrelude();
      },
    );
  const synced = yield* Effect.timeoutOption(awaitPrelude(), options.syncTimeout ?? DEFAULT_SYNC_TIMEOUT);

  const liveAfter = (first: ReadonlyArray<ReceivedFrame>): Stream.Stream<StoredRecord> =>
    Stream.concat(Stream.fromIterable(first), Stream.fromQueue(queue)).pipe(
      // A `synced` on the live half is a reconnect's: nothing to decode.
      Stream.filter((frame) => frame.event !== "synced"),
      Stream.filterMapEffect(decode),
    );

  // No prelude in time — a server not yet reachable, or buffered: the backlog
  // is absent, and whatever arrived while waiting is the start of the live half.
  if (!Option.exists(synced, (preluded) => preluded)) return { live: liveAfter(early) };

  // The prelude completed: its `backlog` frames are the backlog, and a `message`
  // frame that arrived before `synced` is live, not history.
  const backlog = yield* Effect.forEach(early.filter((frame) => frame.event === "backlog"), (frame) =>
    options.decodeRecord(frame.data));
  return {
    backlog: backlog.flatMap(Option.toArray).toSorted(storedRecordOrder),
    live: liveAfter(early.filter((frame) => frame.event === "message")),
  };
});
