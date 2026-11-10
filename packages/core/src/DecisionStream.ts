/**
 * The decision stream's order, written in one place: a log read as transport-free frames.
 *
 * A reader of a decision log's stream receives one `backlog` frame per record the
 * log retained, one `synced` frame, then one `message` frame per record made after
 * (ADR-QD-097). {@link encodeDecisionStream} writes that order; a transport carries
 * the frames and states no order of its own.
 *
 * ARCH-60 (a port of the lost ARCH-54): `@qadi/http` used to frame the backlog in
 * `storedRecordOrder` (by `at`) while a resume kept `seq > Last-Event-ID`. When `at`
 * order differs from arrival order — overlapping evaluations, any `Edge` ingest —
 * the last id a reader saw was not its highest position, and a connection cut
 * mid-prelude resumed past records it never received, silently.
 *
 * **Backlog frames travel in cursor order.** A frame's `id` is a resume position
 * (`<epoch>.<seq>`) and `Last-Event-ID` resumes after it, so ids rise along a
 * connection and a resume is exact. Presentation order is the reader's: it sorts by
 * `storedRecordOrder`, and the timeline is independent of arrival (INV-QD-039).
 *
 * **The seam is a transport-free frame**, `{ event, id?, data }`. `@qadi/http`
 * turns one into SSE bytes. The record's bytes, and the words a refusal is reported
 * in, are the caller's (`encodeRecord`): this module owns order and cursor only,
 * and imports no codec and no transport.
 */
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { DecisionStreamSynced, formatLogCursor, parseLogCursor } from "./DecisionLog.ts";
import type { DecisionLog, DecisionRecordEvent, LogEntry } from "./DecisionLog.ts";
import type { StoredRecord } from "./DecisionRecord.ts";

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
                  Effect.map(framed("message")(entry), (frame) => Result.fromOption(frame, () => entry))),
              ),
            );
          },
        ),
      )),
  );
};
