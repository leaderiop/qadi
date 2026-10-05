/**
 * The durable, persisted form of one `SinkRecord` — what `AuditTrailPort`
 * actually stores.
 *
 * `Schema`-derived, diverging deliberately from `@qadi/predicate-sql`'s and
 * `@qadi/predicate-prisma`'s fully hand-written style. Those types are
 * produced and consumed in the same process; an `AuditEntry` is durably
 * persisted by the caller's own store and re-parsed later — by a compliance
 * review, a query tool, possibly a different process entirely — which is the
 * same condition [ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md)
 * used to make `Policy` the hand-written-interface exception.
 *
 * **A row carries the encoded wire, not the record's classes.** `record` is a
 * `SinkRecordJson` — `@qadi/core`'s `encodeSinkRecord` output, the same value
 * forwarding's `send` receives — so `JSON.stringify(entry)` puts exactly the
 * bytes the decision stream and forwarding emit for the record into the store,
 * and a store cannot get the encode wrong: there is no encode step left for it
 * to forget. Before ARCH-09 a row held the record's in-memory projection and
 * the store's own `JSON.stringify` did the rest, which wrote an `Error` cause
 * as `{}` and threw on a cyclic one. Read a row back with
 * {@link decodeAuditEntry}, which is depth-guarded.
 *
 * Built on `@qadi/core`'s own wire schema rather than re-deriving
 * `Policy`/`Trace`/`Obligation` a second time: a wire form for a value crossing
 * a process boundary is exactly what an audit row is. Duplicating it here would
 * be the drift ADR-QD-002's own reasoning warns against, not an instance of
 * "each companion package owns its shape" — that principle covers *error*
 * types (ADR-QD-054), not re-deriving a schema `@qadi/core` already publishes
 * for this exact purpose.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { EncodeRefusal, SinkRecord } from "@qadi/core";
import {
  DecodeRefusal,
  decodeSinkRecord,
  encodeSinkRecord,
  SinkRecordJson,
  SinkRecordNotDecodable,
  UNTRUSTED_DECODE_OPTIONS,
} from "@qadi/core";

/**
 * A `SinkRecord` this package refuses to persist, and why.
 *
 * `refusal` is `@qadi/core`'s `EncodeRefusal`: a value with no safe durable
 * representation — a function, a `Symbol`, a `bigint`, a circular reference, a
 * `Map`/`Set`/`RegExp`/binary array JSON renders as `{}`, a policy deeper than a
 * reader will decode — anywhere in the record, with the path it was found at.
 * `reason` is that refusal as a sentence, for a log line. A resolver error's
 * `cause` is never a reason: it crosses through `Schema.Defect()`.
 *
 * Never thrown; a typed `Effect` failure, the same shape
 * `@qadi/predicate-sql`'s `PredicateNotRenderable` uses, declared here rather
 * than shared, per ADR-QD-054: `@qadi/core` has no reason to know this error
 * exists.
 */
export class AuditEntryNotEncodable extends Data.TaggedError("AuditEntryNotEncodable")<{
  readonly recordTag: SinkRecord["_tag"];
  readonly refusal: EncodeRefusal;
  readonly reason: string;
}> {}

/** `resource.tags`, or `the record` for a refusal found at the root. */
const where = (path: ReadonlyArray<string | number>): string =>
  path.length === 0 ? "the record" : path.join(".");

/** One sentence per refusal, for `AuditEntryNotEncodable.reason`. */
const describeRefusal: (refusal: EncodeRefusal) => string = Match.type<EncodeRefusal>().pipe(
  Match.tagsExhaustive({
    Circular: (refusal) => `${where(refusal.path)}: a circular reference has no JSON form`,
    TooDeep: (refusal) =>
      `${where(refusal.path)}: nested deeper than ${refusal.maxDepth} levels, past what a reader will decode`,
    NonFinite: (refusal) => `${where(refusal.path)}: a non-finite number or invalid Date has no JSON form`,
    Unrepresentable: (refusal) => `${where(refusal.path)}: a ${refusal.kind} has no JSON form`,
    Opaque: (refusal) => `${where(refusal.path)}: a ${refusal.brand} has no JSON form`,
    EncodeFailed: (refusal) => `the record could not be encoded: ${refusal.message}`,
  }),
);

/**
 * One persisted row.
 *
 * `record` is the encoded wire (see this module's doc comment); its `Type` is
 * already JSON-shaped, so a store persists `JSON.stringify(entry)` as it is.
 *
 * `sequenceNumber` is the optional gap-detection field a caller's own store
 * assigns — `@qadi/audit` never populates it. Only the caller's store has
 * cross-restart visibility into a global write order, the same constraint
 * that shapes `AuditStagingPort`. Present so `verifySequenceIntegrity`
 * ([SequenceIntegrity.ts](./SequenceIntegrity.ts)) has something to check once the
 * caller has assigned it (an autoincrement column, their own counter) and
 * read the rows back.
 */
export const AuditEntry = Schema.Struct({
  record: SinkRecordJson,
  sequenceNumber: Schema.optional(Schema.Number),
});
export type AuditEntry = typeof AuditEntry.Type;

/**
 * Translates one `SinkRecord` into the row `AuditTrailPort.write` persists.
 *
 * One call to `@qadi/core`'s `encodeSinkRecord`, which guards the whole encoded
 * record — `resource`, `policy` (including `HasCustom.params`, ADR-QD-055's
 * escape hatch) and the outcome — so nothing reaches a store that its
 * `JSON.stringify` would throw on or render as something it is not. That
 * closes the defect where a cyclic resolver `cause` reached the store, threw,
 * counted as a write failure and tripped the breaker during an outage
 * (ARCH-09). Refuses rather than approximates: an unsafe record fails
 * `AuditEntryNotEncodable`, never partially written or silently dropped.
 */
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (
  record: SinkRecord,
) {
  const json = yield* Effect.fromResult(encodeSinkRecord(record)).pipe(
    Effect.mapError(
      (error) =>
        new AuditEntryNotEncodable({
          recordTag: record._tag,
          refusal: error.refusal,
          reason: describeRefusal(error.refusal),
        }),
    ),
  );
  const entry: AuditEntry = { record: json, sequenceNumber: undefined };
  return entry;
});

const decodeEntry = Schema.decodeUnknownResult(AuditEntry, UNTRUSTED_DECODE_OPTIONS);

const malformed = (message: string) =>
  Result.fail(new SinkRecordNotDecodable({ refusal: DecodeRefusal.Malformed({ message }) }));

/**
 * Reads a stored row back: the row as an `AuditEntry`, and its record rebuilt.
 *
 * The guarded reader for rows a store re-parses — a compliance review, a query
 * tool, another process. The record goes through `@qadi/core`'s
 * `decodeSinkRecord` first, which refuses input nested past the decode bound
 * before the schema recurses into it; decoding a row with the schema alone
 * died with a `RangeError` on a deeply nested stored policy. Only then is the
 * whole row decoded, now safe. A refusal is a value, never a throw.
 */
export const decodeAuditEntry = (
  input: unknown,
): Result.Result<{ readonly entry: AuditEntry; readonly record: SinkRecord }, SinkRecordNotDecodable> => {
  if (!Predicate.hasProperty(input, "record")) return malformed("an audit row has no record");
  const record = decodeSinkRecord(input.record);
  if (Result.isFailure(record)) return Result.fail(record.failure);
  const entry = decodeEntry(input);
  if (Result.isFailure(entry)) return malformed(entry.failure.message);
  return Result.succeed({ entry: entry.success, record: record.success });
};
