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
 * [SequenceIntegrity.ts](./SequenceIntegrity.ts), [AuditArchive.ts](./AuditArchive.ts),
 * [DecommissioningChecklist.ts](./DecommissioningChecklist.ts)) and
 * e-signature capture ([SignatureCapturePort.ts](./SignatureCapturePort.ts))
 * are deliberately **not** part of this pipeline — the former is a
 * caller-invoked, caller-scheduled batch surface, the latter is wired through
 * `Qadi.ts`'s `ObligationHandler`, not `DecisionSink`.
 */
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { SinkRecord } from "@qadi/core";
import { DecisionSink } from "@qadi/core";
import { encodeAuditEntry } from "./AuditEntry.ts";
import { AuditTrailPort } from "./AuditTrailPort.ts";
import { AuditStagingPort } from "./AuditStagingPort.ts";
import type { AuditStagingError } from "./AuditStagingPort.ts";
import { makeCircuitBreaker } from "./CircuitBreaker.ts";

export interface AuditDecisionSinkOptions {
  /** Consecutive `AuditWriteError`s before the breaker trips. Defaults to 5. */
  readonly failureThreshold?: number;
  /**
   * How long a tripped breaker stays open before allowing one probe write.
   * Defaults to 30 000 (milliseconds).
   *
   * `Duration.Input`, not a bare `number` — see `CircuitBreaker.ts`'s
   * `CircuitBreakerOptions.resetTimeoutMs` doc comment (issue #107). A plain
   * millisecond number, as every existing caller passes, is unaffected.
   */
  readonly resetTimeoutMs?: Duration.Input;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS: Duration.Input = Duration.millis(30_000);

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
/**
 * `stage()` failed while the breaker was **not** Open, so `record`'s write
 * attempt below still runs — this entry is recoverable through the trail
 * even though staging never got a copy of it. Kept distinct from
 * `stagingFailedOpen` because the two have different operator responses: this
 * one says "staging is unhealthy", that one says "this entry is gone".
 */
const stagingFailed = Metric.withAttributes(stagingTotal, { outcome: "failed" });
const stagingSkippedOpen = Metric.withAttributes(stagingTotal, { outcome: "skipped_open" });
/**
 * `stage()` failed while the breaker **was** Open — the wired sibling of
 * `stagingSkippedOpen`. Neither staging nor the trail write (skipped below
 * because the breaker is Open) will ever hold this entry, so it is lost as
 * unrecoverably as the unwired case, and gets the same loud
 * `Effect.logWarning` rather than being folded into the generic `"failed"`
 * outcome, which also covers writes the trail still catches.
 */
const stagingFailedOpen = Metric.withAttributes(stagingTotal, { outcome: "failed_open" });
/**
 * A `commit` a caller's staging port raised — a typed `AuditStagingError` or
 * an unexpected defect alike. Tracked rather than merely swallowed: `stage`'s
 * own failure gets `stagingFailed`, and a `commit` that fails silently while
 * everything else in this pipeline's outcomes is metered would be the one
 * unobservable way a caller's staging store leaks un-committed rows forever.
 *
 * **This is a staging-side cleanup failure, not a compliance-record loss** —
 * unlike `stagingFailedOpen`/`stagingSkippedOpen` below, both of which fire
 * only when `trailPort.write` never ran at all. `commitStaged` is only ever
 * called after `trailPort.write` has already **succeeded**
 * (`record`'s `Exit.isSuccess(written)` branch), so the entry is
 * already durable in the trail by the time this can fire; what is lost is
 * only the staging store's own bookkeeping (the row stays marked
 * uncommitted, per the "leaks... forever" note above), not the entry.
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

          // 2. Ask the breaker for a permit, staging identically either way —
          // only whether write() is attempted differs. The admission protocol
          // (one probe per half-open window, the lost-claim re-read, release on
          // every exit) lives in `CircuitBreaker.ts`'s `withPermit`.
          yield* breaker.withPermit((permit) =>
            Effect.gen(function* () {
              const refused = permit._tag === "Refused";

              // Ties "was staged" and "how to commit it" to one value, rather
              // than a `handle` and a `stagingPort !== undefined` check that
              // must always agree with each other — one Optional value the type
              // checker can narrow on its own, instead of two variables a later
              // edit could let drift apart.
              let commitStaged: (() => Effect.Effect<void, AuditStagingError>) | undefined;
              if (stagingPort !== undefined) {
                // `Effect.exit`, not `Effect.result`: a `stage()` that defects —
                // a misbehaving staging adapter throwing rather than failing with
                // its typed `AuditStagingError` — must land in the same
                // `stagingFailed`/`stagingFailedOpen` metric a typed failure
                // does, not unwind straight out of `record()` unmetered. The
                // write below is folded the same way.
                const staged = yield* Effect.exit(stagingPort.stage(entry));
                if (Exit.isSuccess(staged)) {
                  const handle = staged.value;
                  commitStaged = () => stagingPort.commit(handle);
                  yield* Metric.update(stagingStaged, 1);
                } else if (refused) {
                  // Staging failed and the write below never runs either — this
                  // entry has no path to durability at all, the wired
                  // counterpart of the unwired-and-open case.
                  yield* Effect.logWarning(
                    "audit entry dropped: circuit breaker open and staging failed",
                  ).pipe(Effect.annotateLogs({ evaluationId: entry.record.evaluationId }));
                  yield* Metric.update(stagingFailedOpen, 1);
                } else {
                  yield* Metric.update(stagingFailed, 1);
                }
              } else if (refused) {
                // The one case worth flagging specially: unwired and open means
                // this evaluation's row is genuinely, unrecoverably lost. A
                // metric alone is indistinguishable from an encode failure on a
                // dashboard that only samples counters — a compliance-flavored
                // pipeline should make this the loudest failure mode it has, not
                // one requiring an operator to already suspect it. `evaluationId`
                // only: a correlation handle, not the subject/resource/policy the
                // entry itself carries.
                yield* Effect.logWarning(
                  "audit entry dropped: circuit breaker open and no staging port wired",
                ).pipe(Effect.annotateLogs({ evaluationId: entry.record.evaluationId }));
                yield* Metric.update(stagingSkippedOpen, 1);
              }

              // 3/4. Attempt the write and react. `attempt` runs the write
              // under `Effect.exit` and records the outcome on the breaker
              // (ticket #47: a defecting adapter must reach the breaker the same
              // as a typed `AuditWriteError`). A *caller's* interruption is not
              // folded, so `withPermit` releases a probe claim itself.
              yield* Match.value(permit).pipe(
                Match.tagsExhaustive({
                  Refused: () => Effect.void,
                  Admitted: (admitted) =>
                    Effect.gen(function* () {
                      const written = yield* admitted.attempt(trailPort.write(entry));
                      if (Exit.isSuccess(written)) {
                        if (commitStaged !== undefined) {
                          yield* Effect.catchCause(commitStaged(), (cause) =>
                            Effect.logWarning(
                              "audit staging commit failed: entry is durable in the trail, but its " +
                                "staged copy will remain marked uncommitted in the staging store",
                              cause,
                            ).pipe(
                              Effect.annotateLogs({ evaluationId: entry.record.evaluationId }),
                              Effect.andThen(Metric.update(stagingCommitFailed, 1)),
                            ),
                          );
                        }
                        yield* Metric.update(writesWritten, 1);
                      } else {
                        // The staged entry, if any, is left alone — ticket #5's
                        // reconciliation contract, not this pipeline's to discard.
                        yield* Metric.update(writesWriteFailed, 1);
                      }
                    }),
                }),
              );
            }),
          );
        });

      return { record };
    }),
  );
