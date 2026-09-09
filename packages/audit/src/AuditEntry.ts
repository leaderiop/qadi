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
 * Built on `@qadi/core`'s own `SinkRecordWire` rather than re-deriving
 * `Policy`/`Trace`/`Obligation` schemas a second time: a wire form for a
 * value crossing a process boundary is exactly what an audit row is, and
 * `SinkCodec.ts`'s round-trip property already proves that shape faithful.
 * Duplicating it here would be the drift ADR-QD-002's own reasoning warns
 * against, not an instance of "each companion package owns its shape" — that
 * principle covers *error* types (ADR-QD-054), not re-deriving a schema
 * `@qadi/core` already publishes for this exact purpose.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { SinkRecord } from "@qadi/core";
import { isRecordJsonSafe, SinkRecordWire, toWire } from "@qadi/core";

/**
 * A `SinkRecord` this package refuses to persist — `resource`, or `policy`'s
 * `HasCustom.params`, carrying a value with no safe durable representation
 * (a function, a circular reference, a `BigInt`, a class instance JSON
 * cannot round-trip), or a value the `AuditEntry` schema itself rejects.
 *
 * Never thrown; a typed `Effect` failure, the same shape
 * `@qadi/predicate-sql`'s `PredicateNotRenderable` uses, declared here rather
 * than shared, per ADR-QD-054: `@qadi/core` has no reason to know this error
 * exists.
 */
export class AuditEntryNotEncodable extends Data.TaggedError("AuditEntryNotEncodable")<{
  readonly recordTag: SinkRecord["_tag"];
  readonly reason: string;
}> {}

/**
 * One persisted row.
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
  record: SinkRecordWire,
  sequenceNumber: Schema.optional(Schema.Number),
});
export type AuditEntry = typeof AuditEntry.Type;

/**
 * Translates one `SinkRecord` into the row `AuditTrailPort.write` persists.
 *
 * Refuses rather than approximates: a record carrying an unsafe value —
 * `resource`, or `policy`'s `HasCustom.params` (ADR-QD-055's escape hatch) —
 * fails `AuditEntryNotEncodable` rather than being partially written or
 * silently dropped, the same rule ADR-QD-054 generalized for predicate
 * compilation, one layer further from the wire.
 *
 * Guards the whole record via `isRecordJsonSafe` (`@qadi/core`'s
 * `SinkCodec.ts`) rather than `resource` alone. This package used to check
 * only `resource`, on the premise that it was the sole caller-supplied
 * `unknown` a `SinkRecord` could carry — `isRecordJsonSafe`'s own doc comment
 * names this file as one of the two real-world call sites written against
 * that since-corrected premise. A circular or `BigInt`-valued `HasCustom.params`
 * sailed past the narrow guard and only failed later, uncaught, at the
 * store's own `JSON.stringify`.
 */
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (
  record: SinkRecord,
) {
  if (!isRecordJsonSafe(record)) {
    return yield* Effect.fail(
      new AuditEntryNotEncodable({
        recordTag: record._tag,
        reason: "record carries a value with no safe durable representation",
      }),
    );
  }

  const entry: AuditEntry = { record: toWire(record), sequenceNumber: undefined };
  return entry;
});
