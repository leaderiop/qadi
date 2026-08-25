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
import { SinkRecordWire, toWire } from "@qadi/core";

/**
 * A `SinkRecord` this package refuses to persist — a `resource` carrying a
 * value with no safe durable representation (a function, a circular
 * reference, a class instance JSON cannot round-trip), or a value the
 * `AuditEntry` schema itself rejects.
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
 * that shapes `AuditStagingPort`. Present so `verifyChainIntegrity`
 * ([ChainIntegrity.ts](./ChainIntegrity.ts)) has something to check once the
 * caller has assigned it (an autoincrement column, their own counter) and
 * read the rows back.
 */
export const AuditEntry = Schema.Struct({
  record: SinkRecordWire,
  sequenceNumber: Schema.optional(Schema.Number),
});
export type AuditEntry = typeof AuditEntry.Type;

/**
 * Only `resource` holds a caller-supplied `unknown` value — everything else
 * in a `SinkRecord` is already a closed, `Schema`-derived shape. Bounding the
 * safety check to this one entry point mirrors `@qadi/predicate-sql`'s
 * `isSafeValue`: a fixed, explicit allowlist rather than an unbounded walk of
 * every value a caller could ever construct.
 */
// `isJsonSafe`'s only call site already handles `null`, `Date` and arrays
// before ever reaching this — via its own `Array.isArray(value) ||
// isRecord(value)` short-circuit — so excluding them here too would be dead
// code no test could ever exercise, not a second layer of safety.
const isRecord = (value: unknown): value is Readonly<Record<string, unknown>> =>
  typeof value === "object" && value !== null;

/**
 * `seen` tracks the current recursion path, not every value visited overall —
 * removed again after each branch returns, so a value legitimately reachable
 * twice via two different paths (not a cycle) is never falsely refused. A
 * value that *is* its own ancestor is refused rather than walked forever:
 * `Object.values`'s plain recursion has no base case for one, and a caller's
 * resource is arbitrary `unknown` this package does not control the shape of.
 */
const isJsonSafe = (value: unknown, seen: ReadonlySet<object> = new Set()): boolean => {
  if (value === null) return true;
  const t = typeof value;
  if (t === "string" || t === "number" || t === "boolean") return true;
  if (value instanceof Date) return true;
  if (Array.isArray(value) || isRecord(value)) {
    if (seen.has(value)) return false;
    const path = new Set(seen).add(value);
    const children = Array.isArray(value) ? value : Object.values(value);
    return children.every((child) => isJsonSafe(child, path));
  }
  return false;
};

const resourceOf = (record: SinkRecord): Readonly<Record<string, unknown>> | undefined =>
  record._tag === "Decision" ? record.resource : undefined;

/**
 * Translates one `SinkRecord` into the row `AuditTrailPort.write` persists.
 *
 * Refuses rather than approximates: a `resource` carrying an unsafe value
 * fails `AuditEntryNotEncodable` rather than being partially written or
 * silently dropped, the same rule ADR-QD-054 generalized for predicate
 * compilation, one layer further from the wire.
 */
export const encodeAuditEntry = Effect.fn("qadi.audit.encodeAuditEntry")(function* (
  record: SinkRecord,
) {
  const resource = resourceOf(record);
  if (resource !== undefined && !isJsonSafe(resource)) {
    return yield* Effect.fail(
      new AuditEntryNotEncodable({
        recordTag: record._tag,
        reason: "resource carries a value with no safe durable representation",
      }),
    );
  }

  const entry: AuditEntry = { record: toWire(record), sequenceNumber: undefined };
  return entry;
});
