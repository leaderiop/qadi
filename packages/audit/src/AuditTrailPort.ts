/**
 * The storage a caller supplies for durable audit rows.
 *
 * Mirrors how `@qadi/predicate-sql`/`@qadi/predicate-prisma` stay
 * dependency-free (ADR-QD-054): `@qadi/audit` never opens a connection or
 * assumes a schema, so it names one method a caller implements against
 * whatever store they already run — Postgres, an S3 object per entry, a
 * managed log service.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type { AuditEntry } from "./AuditEntry.ts";

/**
 * Encoding succeeded, but the caller's store rejected the write — a real I/O
 * failure, distinct from `AuditEntryNotEncodable`.
 *
 * Kept as its own type rather than folded into one error with a `reason`
 * discriminant: a caller — and the circuit breaker
 * ([CircuitBreaker.ts](./CircuitBreaker.ts)) — needs to react to the two
 * differently. A malformed record is not retriable; a store outage might be.
 */
export class AuditWriteError extends Data.TaggedError("AuditWriteError")<{
  readonly entry: AuditEntry;
  readonly cause: unknown;
}> {}

export interface AuditTrailPortShape {
  readonly write: (entry: AuditEntry) => Effect.Effect<void, AuditWriteError>;
}

export class AuditTrailPort extends Context.Service<AuditTrailPort, AuditTrailPortShape>()(
  "qadi/audit/AuditTrailPort",
) {
  static write = (entry: AuditEntry) => AuditTrailPort.use((p) => p.write(entry));
}
