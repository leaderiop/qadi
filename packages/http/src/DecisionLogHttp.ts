/**
 * The decision log's HTTP wire: a stored record as an SSE frame or a JSON array
 * element, and what happens to one that cannot cross.
 *
 * ARCH-50 (CCR-QD-389): the two decision-log routes each held a refusal reporter
 * and an encode-or-report loop that differed only in their words, and the next
 * adapter would have copied a third. This module is the one owner of both.
 *
 * The refusal policy itself (the hook or the warning, a throwing hook contained,
 * the annotations) is `@qadi/core`'s `reportEncodeRefusal` (ADR-QD-095 D-09-e,
 * CCR-QD-193); each route keeps its own words here. The module is package-private
 * (ADR-QD-099) and is not in the barrel.
 */
import * as Effect from "effect/Effect";
import type * as Filter from "effect/Filter";
import type * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Sse from "effect/encoding/Sse";
import type {
  DecisionRecordEvent,
  DecisionStreamFrame,
  LogCursor,
  LogEntry,
  SinkRecordNotEncodable,
  StoredRecord,
  StoredRecordJson,
} from "@qadi/core";
import { encodeStoredRecord, encodeStoredRecordString, formatLogCursor, reportEncodeRefusal } from "@qadi/core";

/**
 * What a decision-log route is told about serving: the hook for a refused record.
 *
 * `onRefused` is called once for each record that cannot be encoded (framed for
 * the stream, or served in the backlog) in place of the default warning. The
 * record is left out either way, and the rest are still served: one record never
 * ends the feed or empties the response.
 */
export interface DecisionLogServeOptions {
  readonly onRefused?: (refusal: SinkRecordNotEncodable) => void;
}

/**
 * Builds the one refusal reporter, in a route's own words: `onRefused` when the
 * caller supplied one, otherwise a warning naming the refusal, where in the
 * record it was found, and the evaluation.
 *
 * Runs only on the refusal branch, so an encoded record pays for no span. The
 * words are per route because ADR-QD-095 D-09-e keeps each adapter's message and
 * two route tests pin them.
 */
const reportRefused = (words: { readonly span: string; readonly message: string }) =>
  Effect.fn(words.span)(function* (
    refusal: SinkRecordNotEncodable,
    onRefused: ((refusal: SinkRecordNotEncodable) => void) | undefined,
  ) {
    yield* reportEncodeRefusal(refusal, { message: words.message, onRefused });
  });

const reportRefusedJson = reportRefused({
  span: "qadi.http.decisionBacklog.refused",
  message: "qadi/http: a decision record could not be served in the backlog",
});

const reportRefusedSse = reportRefused({
  span: "qadi.http.decisionStream.refused",
  message: "qadi/http: a decision record could not be framed",
});

/**
 * One encode-or-report, for every framing: a success is kept, a refusal is
 * reported and then becomes the filter's failure value, which drops the element.
 *
 * A plain function: it runs once per record, and neither path opens a span of
 * its own (the reporter's runs only on a refusal).
 */
const encodeOrReport =
  <I, A>(
    encode: (item: I) => Result.Result<A, SinkRecordNotEncodable>,
    report: (
      refusal: SinkRecordNotEncodable,
      onRefused: ((refusal: SinkRecordNotEncodable) => void) | undefined,
    ) => Effect.Effect<void>,
    onRefused: ((refusal: SinkRecordNotEncodable) => void) | undefined,
  ): Filter.FilterEffect<I, A, SinkRecordNotEncodable> =>
  (item) =>
    Result.match(encode(item), {
      onSuccess: (value) => Effect.succeed(Result.succeed(value)),
      onFailure: (refusal) => Effect.as(report(refusal, onRefused), Result.fail(refusal)),
    });

/** Runs a filter over every item, in order, and keeps what passed it. */
const keepEncoded = <I, A>(
  items: ReadonlyArray<I>,
  filter: Filter.FilterEffect<I, A, SinkRecordNotEncodable>,
): Effect.Effect<ReadonlyArray<A>> =>
  Effect.map(Effect.forEach(items, (item) => filter(item)), (results) =>
    results.flatMap((result) => (Result.isSuccess(result) ? [result.success] : [])),
  );

/**
 * The stored records as stored-record envelopes, for a JSON array: a record the
 * codec refuses is left out and reported, so one record never empties the body.
 * Never fails.
 */
export const jsonElements = (
  records: ReadonlyArray<StoredRecord>,
  options?: DecisionLogServeOptions,
): Effect.Effect<ReadonlyArray<StoredRecordJson>> =>
  keepEncoded(records, encodeOrReport(encodeStoredRecord, reportRefusedJson, options?.onRefused));

/**
 * One stored record as an SSE frame of the given event — `event: backlog` /
 * `data: <envelope>`, or `data: <envelope>` alone for `message`, with an `id:`
 * line when a cursor is given (ARCH-11 D-11-g) — produced by
 * `effect/encoding/Sse`'s own `encoder.write` rather than a hand-built template
 * string (H6, ADR-QD-072). That is the same encoder `HttpApiBuilder`'s
 * `HttpApiSchema.StreamSse` machinery calls internally; the machinery itself is
 * inseparable from the full `HttpApi` pipeline, and the stream route's `reauth`
 * recheck is a `Stream.mergeEffect` over the response stream with no
 * `HttpApiMiddleware` equivalent, so the encoder is reused directly.
 *
 * For `message`, `Sse.encoder.write` omits the `event:` line, so a live frame
 * is `data: <json>\n\n` — what an `EventSource`'s `message` listener reads.
 *
 * **One call, to `@qadi/core`'s `encodeStoredRecordString`.** The frame's data
 * is the stored-record envelope `{ environment, record }`, whose `record` is the
 * same bytes forwarding sends and an audit row stores; every rule about what can
 * cross lives in the codec, over the whole encoded record (ARCH-09). A refused
 * record drops only its own frame: the refusal is the filter's failure value,
 * reported by {@link frameEntry}, and the stream carries on.
 *
 * A `Filter`: `Result.succeed` keeps a value, `Result.fail` drops it
 * (`effect/Filter`'s own doc comment). Exported so the refusal can be tested
 * directly against a plain record, and public through `DecisionStreamRoute.ts`.
 */
export const frame =
  (event: DecisionRecordEvent, cursor?: LogCursor): Filter.Filter<StoredRecord, string, SinkRecordNotEncodable> =>
  (stored) =>
    Result.map(encodeStoredRecordString(stored), (data) =>
      Sse.encoder.write({
        _tag: "Event",
        event,
        id: cursor === undefined ? undefined : formatLogCursor(cursor),
        data,
      }),
    );

/**
 * One log entry as an SSE frame, or its refusal reported and dropped: what a
 * live stream filters through (`Stream.filterMapEffect`).
 *
 * The frame carries the entry's cursor as its SSE `id`, and a refused record
 * drops only its own frame. This and {@link jsonElements} encode through the same
 * encode-or-report, so both framings keep, drop and report alike (LOGH-01).
 */
export const frameEntry = (
  event: DecisionRecordEvent,
  options?: DecisionLogServeOptions,
): Filter.FilterEffect<LogEntry, string, SinkRecordNotEncodable> =>
  encodeOrReport(
    (entry: LogEntry) => frame(event, entry.cursor)(entry.record),
    reportRefusedSse,
    options?.onRefused,
  );

/**
 * Log entries as SSE frames, in order, each refused record reported and left
 * out: the stream's backlog prelude. Never fails.
 */
export const frameEntries = (
  event: DecisionRecordEvent,
  entries: ReadonlyArray<LogEntry>,
  options?: DecisionLogServeOptions,
): Effect.Effect<ReadonlyArray<string>> => keepEncoded(entries, frameEntry(event, options));

/**
 * One record as stream frame data, in the stream's own words: `Some` with the
 * stored-record envelope (`@qadi/core`'s `encodeStoredRecordString`), or `None`
 * once a refusal has been reported (`onRefused`, else the "could not be framed"
 * warning). What `@qadi/core`'s `encodeDecisionStream` is given as `encodeRecord`:
 * the order is core's, the bytes and the refusal words stay here.
 */
export const recordData = (
  options?: DecisionLogServeOptions,
): ((record: StoredRecord) => Effect.Effect<Option.Option<string>>) => {
  const filter = encodeOrReport(encodeStoredRecordString, reportRefusedSse, options?.onRefused);
  return (record) => Effect.map(filter(record), Result.getSuccess);
};

/**
 * One stream frame as SSE text, through `effect/encoding/Sse`'s own
 * `encoder.write`.
 *
 * For `message`, `Sse.encoder.write` omits the `event:` line, so a live frame is
 * `id: <cursor>` / `data: <json>` — what an `EventSource`'s `message` listener
 * reads. `synced` has no `id:` line.
 */
export const sseText = (frame: DecisionStreamFrame): string =>
  Sse.encoder.write({ _tag: "Event", event: frame.event, id: frame.id, data: frame.data });
