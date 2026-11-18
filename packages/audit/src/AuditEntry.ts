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
 * {@link decodeAuditEntry}, which is depth-guarded and applies every check the
 * core decode applies — never with this schema alone, which under `Schema`'s
 * default options strips a typo'd field inside the embedded policy rather than
 * refusing it.
 *
 * Built on `@qadi/core`'s own wire schema rather than re-deriving
 * `Policy`/`Trace`/`Obligation` a second time: a wire form for a value crossing
 * a process boundary is exactly what an audit row is. Duplicating it here would
 * be the drift ADR-QD-002's own reasoning warns against; for the same reason a
 * refusal is `@qadi/core`'s `SinkRecordNotEncodable`, the error `encodeSinkRecord`
 * returns, not an audit copy of it (ADR-QD-161).
 */
import * as Effect from "effect/Effect";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import type { SinkRecord } from "@qadi/core";
import {
  DecodeRefusal,
  decodeRefusalOf,
  decodeSinkRecordWithJson,
  encodeSinkRecord,
  SinkRecordJson,
  SinkRecordNotDecodable,
  untrustedDecoder,
} from "@qadi/core";

/**
 * The optional gap-detection field, declared once for the row schema and the
 * row decode: a safe integer, so `1.5`, `NaN` and `2 ** 53` are `Malformed` on
 * decode. `archiveFacts` (`ArchiveFacts.ts`) states the same domain with the
 * same `Schema.Int`, so `verifySequenceIntegrity` and `archiveAuditTrail` fail
 * `SequenceNumberInvalid` for any one such number and never archive a row this
 * decode would refuse (ADR-QD-110).
 */
const SequenceNumber = Schema.optional(Schema.Int);

/**
 * One persisted row.
 *
 * `record` is the encoded wire (see this module's doc comment); its `Type` is
 * already JSON-shaped, so a store persists `JSON.stringify(entry)` as it is.
 *
 * `record` is version-2 bytes (`version: 2`, one tagged `outcome`,
 * ADR-QD-096) — the only wire version this release reads or writes. A row
 * written before 0.10 carries version-1 bytes (no `version` key,
 * `decided`/`failed`), which 0.11.0 no longer reads: re-encode such rows with
 * 0.10.x (`decodeAuditEntry` then `encodeAuditEntry` from `@qadi/audit@0.10`)
 * before upgrading, or {@link decodeAuditEntry} refuses them as
 * `UnsupportedVersion`.
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
  sequenceNumber: SequenceNumber,
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
  const entry: AuditEntry = { record: json, sequenceNumber: undefined };
  return entry;
});

/**
 * The row's own fields, decoded as untrusted through `UntrustedDecode.ts`: an
 * excess property at the row's top level, or a `sequenceNumber` that is not a
 * number, is `Malformed`, and a row nested past the decode bound outside its
 * record is `TooDeep`. `record` is unwalked, and `unknown` here, because
 * `decodeSinkRecordWithJson` has already read it from its own root (INV-QD-306).
 */
const decodeRow = untrustedDecoder(
  Schema.Struct({ record: Schema.Unknown, sequenceNumber: SequenceNumber }),
  { unknownKeys: "refuse", unwalked: ["record"] },
).decode;

const malformed = (message: string) =>
  Result.fail(new SinkRecordNotDecodable({ refusal: DecodeRefusal.Malformed({ message }) }));

/**
 * Reads a stored row back: the row as an `AuditEntry`, and its record rebuilt.
 *
 * The guarded reader for rows a store re-parses — a compliance review, a query
 * tool, another process. The record goes through `@qadi/core`'s
 * `decodeSinkRecordWithJson` first, which refuses input nested past the decode bound
 * before the schema recurses into it; decoding a row with the schema alone
 * died with a `RangeError` on a deeply nested stored policy. Only then is the
 * rest of the row decoded, now safe. A refusal is a value, never a throw.
 *
 * The record is decoded once, by core's strict reader, and the entry holds that
 * decode's JSON form, so an envelope key this version does not declare is dropped
 * by the decode itself rather than by a second lenient read (ADR-QD-110,
 * ADR-QD-153).
 *
 * Reads wire version 2 only (ADR-QD-096's 2026-10-06 amendment), and
 * whatever leniency and strictness `decodeSinkRecordWithJson` applies — an unknown
 * envelope key ignored, a typo inside the embedded policy refused, a record of
 * any other `version` refused as `UnsupportedVersion` — applies here too. That
 * includes a row written before 0.10, whose record has no `version` at all: it
 * is refused as `UnsupportedVersion` with `version: undefined`, never upgraded.
 * Such rows are re-encoded with 0.10.x before upgrading, which reads both
 * versions and writes version 2.
 */
export const decodeAuditEntry = (
  input: unknown,
): Result.Result<{ readonly entry: AuditEntry; readonly record: SinkRecord }, SinkRecordNotDecodable> => {
  if (!Predicate.hasProperty(input, "record")) return malformed("an audit row has no record");
  const decoded = decodeSinkRecordWithJson(input.record);
  if (Result.isFailure(decoded)) return Result.fail(decoded.failure);
  const row = decodeRow(input);
  if (Result.isFailure(row)) return Result.fail(new SinkRecordNotDecodable({ refusal: decodeRefusalOf(row.failure) }));
  const entry: AuditEntry = { record: decoded.success.json, sequenceNumber: row.success.sequenceNumber };
  return Result.succeed({ entry, record: decoded.success.record });
};
