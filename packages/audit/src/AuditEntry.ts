/**
 * The durable, persisted form of one `SinkRecord` — what `AuditTrailPort`
 * actually stores.
 *
 * A row is a nominal class only its codec makes ({@link AuditEntry}), and its
 * `record` is `@qadi/core`'s own wire schema, not a second description of it. An
 * `AuditEntry` is durably persisted by the caller's own store and re-parsed later —
 * by a compliance review, a query tool, possibly a different process entirely — so
 * the one route from stored bytes to a row is {@link decodeAuditEntry}, which
 * refuses what it cannot read. The only schema in this module is the private
 * envelope that decode reads a row's top level through. The same trust boundary
 * made `Policy` a schema-derived exception to the hand-written style
 * ([ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md)).
 *
 * **A row carries the encoded wire, not the record's classes.** `record` is a
 * `SinkRecordJson` — `@qadi/core`'s `encodeSinkRecord` output, the same value
 * forwarding's `send` receives — so `JSON.stringify(entry)` puts exactly the
 * bytes the decision stream and forwarding emit for the record into the store,
 * and a store cannot get the encode wrong: there is no encode step left for it
 * to forget. Before ARCH-09 a row held the record's in-memory projection and
 * the store's own `JSON.stringify` did the rest, which wrote an `Error` cause
 * as `{}` and threw on a cyclic one. Read a row back with
 * {@link decodeAuditEntry}, which is depth-guarded and applies every check the
 * core decode applies: a typo'd field inside the embedded policy is refused, not
 * stripped.
 *
 * Built on `@qadi/core`'s own wire schema rather than re-deriving
 * `Policy`/`Trace`/`Obligation` a second time: a wire form for a value crossing
 * a process boundary is exactly what an audit row is. Duplicating it here would
 * be the drift ADR-QD-002's own reasoning warns against; for the same reason a
 * refusal is `@qadi/core`'s `SinkRecordNotEncodable`, the error `encodeSinkRecord`
 * returns, not an audit copy of it (ADR-QD-161).
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { SinkRecord, SinkRecordJson } from "@qadi/core";
import {
  decodeRefusalOf,
  decodeSinkRecordWithJson,
  encodeSinkRecord,
  SinkRecordNotDecodable,
  untrustedDecoder,
} from "@qadi/core";

/**
 * The optional gap-detection field of a row's bytes: a safe integer, so `1.5`,
 * `NaN` and `2 ** 53` are `Malformed` on decode.
 *
 * The one statement of the safe-integer rule. Only {@link decodeAuditEntry}
 * gives a row a number, so every `sequenceNumber` in memory is a safe integer,
 * and `firstBreakIn` (`ArchiveFacts.ts`) never adds one past `2 ** 53`, where
 * `n + 1 === n` would hide a duplicate (ADR-QD-110, ADR-QD-190).
 */
const SequenceNumber = Schema.optional(Schema.Int);

/**
 * A stored audit row: made only by {@link encodeAuditEntry} and
 * {@link decodeAuditEntry}.
 *
 * The writer and the purge read a row's fields as its identity (`holds`,
 * `planPurge`), so only the codec may make one: the class is module-local,
 * exported as a type alone, and its private `nominal` member keeps an object
 * literal or a spread of the same shape from passing for one (ADR-QD-190).
 *
 * `record` is the encoded wire (see this module's doc comment); its `Type` is
 * already JSON-shaped, so a store persists `JSON.stringify(entry)` as it is, and
 * the bytes are the fields and nothing else. `record` is version-2 bytes
 * (`version: 2`, one tagged `outcome`, ADR-QD-096), the only wire version this
 * release reads or writes. A row written before 0.10 carries version-1 bytes (no
 * `version` key, `decided`/`failed`), which 0.11.0 does not read: re-encode such
 * rows with 0.10.x (`decodeAuditEntry` then `encodeAuditEntry` from
 * `@qadi/audit@0.10`) before upgrading, or {@link decodeAuditEntry} refuses them
 * as `UnsupportedVersion`.
 *
 * `sequenceNumber` is the gap-detection field a caller's own store assigns;
 * `@qadi/audit` never invents one. Only the caller's store has cross-restart
 * visibility into a global write order, the same constraint that shapes
 * `AuditStagingPort`. It is a required field holding `undefined` when the store
 * gave none, so every row has the key and an encoded row equals its read-back
 * twin. A number reaches a row only through `decodeAuditEntry({ record,
 * sequenceNumber })`, once the caller has assigned it (an autoincrement column,
 * their own counter) and read the rows back for `verifySequenceIntegrity`
 * ([SequenceIntegrity.ts](./SequenceIntegrity.ts)).
 */
class AuditEntry extends Data.Class<{
  readonly record: SinkRecordJson;
  readonly sequenceNumber: number | undefined;
}> {
  /**
   * Makes the type nominal, so an object literal of the same shape is not an
   * `AuditEntry`. Declared only: it has no slot at run time.
   */
  declare private readonly nominal: never;
}

export type { AuditEntry };

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
 * with `@qadi/core`'s `SinkRecordNotEncodable`, exactly as `encodeSinkRecord`
 * returns it, never partially written or silently dropped (ADR-QD-161).
 *
 * Written as wire version 2 (ADR-QD-096), which every reader since 0.10.0
 * reads; a reader of the store older than 0.10 must upgrade first.
 */
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (
  record: SinkRecord,
) {
  const json = yield* Effect.fromResult(encodeSinkRecord(record));
  return new AuditEntry({ record: json, sequenceNumber: undefined });
});

/**
 * The row's envelope, decoded as untrusted through `UntrustedDecode.ts`: an
 * excess property at the row's top level, or a `sequenceNumber` that is not a
 * safe integer, is `Malformed`, and a row nested past the decode bound outside
 * its record is `TooDeep`. `record` is unwalked, and `unknown` here, because
 * `decodeSinkRecordWithJson` reads it from its own root (INV-QD-306).
 */
const decodeRow = untrustedDecoder(
  Schema.Struct({ record: Schema.Unknown, sequenceNumber: SequenceNumber }),
  { unknownKeys: "refuse", unwalked: ["record"] },
).decode;

/**
 * Reads a stored row back: the row as an `AuditEntry`, and its record rebuilt.
 *
 * The guarded reader for rows a store re-parses (a compliance review, a query
 * tool, another process), and the one route a store's sequence number reaches a
 * row. The envelope is read first, as untrusted with `record` unwalked, so a
 * non-object, an unknown top-level key or a `sequenceNumber` that is not a safe
 * integer is refused with the strict decoder's own message, as core's stored
 * record read does (ADR-QD-190). The record then goes through `@qadi/core`'s
 * `decodeSinkRecordWithJson`, which refuses input nested past the decode bound
 * before the schema recurses into it; decoding a row with the schema alone died
 * with a `RangeError` on a deeply nested stored policy. A refusal is a value,
 * never a throw.
 *
 * The record is decoded once, by core's strict reader, and the entry holds that
 * decode's JSON form, so a field inside the record this version does not declare
 * is refused by the decode itself rather than dropped by a second lenient read
 * (ADR-QD-110, ADR-QD-153).
 *
 * Reads wire version 2 only (ADR-QD-096's 2026-10-06 amendment), and whatever
 * leniency and strictness `decodeSinkRecordWithJson` applies, a record of any
 * other `version` refused as `UnsupportedVersion`, applies here too. That
 * includes a row written before 0.10, whose record has no `version` at all: it
 * is refused as `UnsupportedVersion` with `version: undefined`, never upgraded.
 * Such rows are re-encoded with 0.10.x before upgrading, which reads both
 * versions and writes version 2.
 */
export const decodeAuditEntry = (
  input: unknown,
): Result.Result<
  { readonly entry: AuditEntry; readonly record: SinkRecord },
  SinkRecordNotDecodable
> => {
  const row = decodeRow(input);
  if (Result.isFailure(row)) {
    const refusal = decodeRefusalOf(row.failure);
    return Result.fail(new SinkRecordNotDecodable({ refusal }));
  }
  const decoded = decodeSinkRecordWithJson(row.success.record);
  if (Result.isFailure(decoded)) return Result.fail(decoded.failure);
  const { sequenceNumber } = row.success;
  const entry = new AuditEntry({ record: decoded.success.json, sequenceNumber });
  return Result.succeed({ entry, record: decoded.success.record });
};
