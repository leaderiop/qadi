/**
 * An optional durability *protocol*, not durability itself.
 *
 * What the predecessor and HexDi's own Guard (`libs/guard/core/src/guard/wal.ts`)
 * both called a "write-ahead log" ships here under a different name on
 * purpose. HexDi's version is a plain in-memory `Map` whose docstring falsely
 * claims entries "survive logical process restart" — they do not, and
 * nothing backed by process memory could. `@qadi/audit` owns no storage of
 * its own, so it cannot provide that guarantee either; this port exists so a
 * caller who *does* have a durable staging store (a local WAL file, a
 * separate table) can plug it in, and callers who don't pay nothing.
 *
 * Read via `Effect.serviceOption` in [AuditDecisionSinkLive.ts](./AuditDecisionSinkLive.ts),
 * exactly as `DecisionSink` reads `DecisionCache`/`DecisionSink` itself
 * (ADR-QD-031) — absent contributes nothing to the requirements, and
 * "no staging" is the default.
 *
 * **Two methods, not three.** No `discard`: every failure path either never
 * produced a handle to discard (encoding failed, or `stage` itself failed) or
 * deliberately leaves the staged entry alone (the write failed) so the
 * caller's own reconciliation tooling can see it. `@qadi/audit`'s own
 * pipeline never calls one.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Effect from "effect/Effect";
import type { AuditEntry } from "./AuditEntry.ts";

export class AuditStagingError extends Data.TaggedError("AuditStagingError")<{
  readonly entry: AuditEntry;
  readonly cause: unknown;
}> {}

/**
 * Whatever the caller's implementation returns from `stage`, threaded to
 * `commit` and never inspected. `@qadi/audit` has no basis for interpreting
 * it — only the caller's own staging store gives it meaning.
 */
export type AuditStagingHandle = unknown;

export interface AuditStagingPortShape {
  readonly stage: (entry: AuditEntry) => Effect.Effect<AuditStagingHandle, AuditStagingError>;
  readonly commit: (handle: AuditStagingHandle) => Effect.Effect<void, AuditStagingError>;
}

export class AuditStagingPort extends Context.Service<AuditStagingPort, AuditStagingPortShape>()(
  "qadi/audit/AuditStagingPort",
) {
  static stage = (entry: AuditEntry) => AuditStagingPort.use((p) => p.stage(entry));
  static commit = (handle: AuditStagingHandle) => AuditStagingPort.use((p) => p.commit(handle));
}
