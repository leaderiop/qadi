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
import * as Result from "effect/Result";
import type { SinkRecordNotEncodable, StoredRecord, StoredRecordJson } from "@qadi/core";
import { encodeStoredRecord, reportEncodeRefusal } from "@qadi/core";

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
