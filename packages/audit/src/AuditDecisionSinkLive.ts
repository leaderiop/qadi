/**
 * The assembled pipeline: audit trail, staging, and the circuit breaker wired
 * into one `DecisionSink` implementation.
 *
 * This is the piece that exists specifically to avoid the defect
 * [ADR-QD-016](../../../spec/decisions/016-gxp-out-of-scope.md) named and
 * that HexDi's own Guard still has: `createWriteAheadLog`,
 * `createCircuitBreaker`, `enforceRetention` and `SignatureServicePort` are
 * all individually implemented there, but none of it is called from the real
 * enforcement path. Every step below is reachable through one call —
 * `DecisionSink.record` — because a companion package that is merely
 * "individually correct" repeats the exact thing this map was chartered to
 * fix.
 *
 * Retention/archival/decommissioning ([Retention.ts](./Retention.ts),
 * [ChainIntegrity.ts](./ChainIntegrity.ts), [AuditArchive.ts](./AuditArchive.ts),
 * [DecommissioningChecklist.ts](./DecommissioningChecklist.ts)) and
 * e-signature capture ([SignatureCapturePort.ts](./SignatureCapturePort.ts))
 * are deliberately **not** part of this pipeline — the former is a
 * caller-invoked, caller-scheduled batch surface, the latter is wired through
 * `Qadi.ts`'s `ObligationHandler`, not `DecisionSink`.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { SinkRecord } from "@qadi/core";
import { DecisionSink } from "@qadi/core";
import { encodeAuditEntry } from "./AuditEntry.ts";
import { AuditTrailPort } from "./AuditTrailPort.ts";
import { AuditStagingPort } from "./AuditStagingPort.ts";
import type { AuditStagingHandle } from "./AuditStagingPort.ts";
import { makeCircuitBreaker } from "./CircuitBreaker.ts";

export interface AuditDecisionSinkOptions {
  /** Consecutive `AuditWriteError`s before the breaker trips. Defaults to 5. */
  readonly failureThreshold?: number;
  /** How long a tripped breaker stays open before allowing one probe write. Defaults to 30 000. */
  readonly resetTimeoutMs?: number;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS = 30_000;

/**
 * Records compiled and refusal volume, by outcome — module scope, mirroring
 * `@qadi/predicate-sql`'s `qadi_predicate_sql_compiled_total`
 * (`Metric.withAttributes` over one base counter, declared once so the
 * registry keys on one object rather than a fresh one per call).
 */
const writesTotal = Metric.counter("qadi_audit_writes_total", {
  description: "SinkRecords the audit pipeline received, tagged by outcome.",
});
const writesEncodeFailed = Metric.withAttributes(writesTotal, { outcome: "encode_failed" });
const writesWritten = Metric.withAttributes(writesTotal, { outcome: "written" });
const writesWriteFailed = Metric.withAttributes(writesTotal, { outcome: "write_failed" });

const stagingTotal = Metric.counter("qadi_audit_staging_total", {
  description: "AuditStagingPort.stage attempts, tagged by outcome.",
});
const stagingStaged = Metric.withAttributes(stagingTotal, { outcome: "staged" });
const stagingFailed = Metric.withAttributes(stagingTotal, { outcome: "failed" });
const stagingSkippedOpen = Metric.withAttributes(stagingTotal, { outcome: "skipped_open" });
/**
 * A `commit` a caller's staging port raised — a typed `AuditStagingError` or
 * an unexpected defect alike. Tracked rather than merely swallowed: `stage`'s
 * own failure gets `stagingFailed`, and a `commit` that fails silently while
 * everything else in this pipeline's outcomes is metered would be the one
 * unobservable way a caller's staging store leaks un-committed rows forever.
 */
const stagingCommitFailed = Metric.withAttributes(stagingTotal, { outcome: "commit_failed" });

/**
 * `Layer.Layer<DecisionSink, never, AuditTrailPort>` — requires `AuditTrailPort`,
 * reads `AuditStagingPort` optionally via `Effect.serviceOption`, never as a
 * `Layer` dependency, so a caller who never wires staging pays nothing for it
 * — the same shape `DecisionSink` itself is read in `Evaluate.ts`.
 */
export const AuditDecisionSinkLive = (
  options?: AuditDecisionSinkOptions,
): Layer.Layer<DecisionSink, never, AuditTrailPort> =>
  Layer.effect(
    DecisionSink,
    Effect.gen(function* () {
      const trailPort = yield* AuditTrailPort;
      const stagingPort = Option.getOrUndefined(yield* Effect.serviceOption(AuditStagingPort));
      const breaker = yield* makeCircuitBreaker({
        failureThreshold: options?.failureThreshold ?? DEFAULT_FAILURE_THRESHOLD,
        resetTimeoutMs: options?.resetTimeoutMs ?? DEFAULT_RESET_TIMEOUT_MS,
      });

      const record = (sinkRecord: SinkRecord): Effect.Effect<void> =>
        Effect.gen(function* () {
          // 1. Encode. A refusal never reaches staging or the trail at all.
          const encoded = yield* Effect.result(encodeAuditEntry(sinkRecord));
          if (Result.isFailure(encoded)) {
            yield* Metric.update(writesEncodeFailed, 1);
            return;
          }
          const entry = encoded.success;

          // 2. Read breaker state, staging identically either way — only
          // whether write() is attempted differs.
          const status = yield* breaker.status;

          let handle: AuditStagingHandle | undefined;
          if (stagingPort !== undefined) {
            const staged = yield* Effect.result(stagingPort.stage(entry));
            if (Result.isSuccess(staged)) {
              handle = staged.success;
              yield* Metric.update(stagingStaged, 1);
            } else {
              yield* Metric.update(stagingFailed, 1);
            }
          } else if (status === "Open") {
            // The one case worth flagging specially: unwired and open means
            // this evaluation's row is genuinely, unrecoverably lost.
            yield* Metric.update(stagingSkippedOpen, 1);
          }

          if (status === "Open") return;

          // 3/4. Attempt the write and react.
          const written = yield* Effect.result(trailPort.write(entry));
          if (Result.isSuccess(written)) {
            yield* breaker.recordSuccess;
            if (handle !== undefined && stagingPort !== undefined) {
              yield* Effect.catchCause(stagingPort.commit(handle), () =>
                Metric.update(stagingCommitFailed, 1),
              );
            }
            yield* Metric.update(writesWritten, 1);
          } else {
            yield* breaker.recordFailure;
            // The staged entry, if any, is left alone — ticket #5's
            // reconciliation contract, not this pipeline's to discard.
            yield* Metric.update(writesWriteFailed, 1);
          }
        });

      return { record };
    }),
  );
