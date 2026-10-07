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
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import type { SinkRecord } from "@qadi/core";
import { DecisionSink } from "@qadi/core";
import { encodeAuditEntry } from "./AuditEntry.ts";
import type { AuditEntry, AuditEntryNotEncodable } from "./AuditEntry.ts";
import { AuditTrailPort } from "./AuditTrailPort.ts";
import { AuditStagingPort } from "./AuditStagingPort.ts";
import type { AuditStagingError } from "./AuditStagingPort.ts";
import { AuditWriteOutcome, durabilityOf, UnwrittenStaging, WrittenStaging } from "./AuditWriteOutcome.ts";
import { emitWriteOutcome, outcomePath } from "./AuditWriteReport.ts";
import { makeCircuitBreaker } from "./CircuitBreaker.ts";
import type { Permit } from "./CircuitBreaker.ts";

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
  /**
   * Called with the refusal when a record cannot be encoded for the trail.
   * Replaces the warning the pipeline logs otherwise; the
   * `qadi_audit_writes_total{outcome="encode_failed"}` counter increments
   * either way. A hook that throws is logged, never a defect (INV-QD-035).
   */
  readonly onRefused?: (refusal: AuditEntryNotEncodable) => void;
  /**
   * Called once per record with what became of it, after its metrics are
   * updated and its line is logged. Never replaces either; `onRefused` still
   * replaces the encode-refusal warning, and this is called for that outcome
   * too.
   *
   * Every non-refused outcome carries the encoded entry, so a caller can
   * dead-letter an entry whose `durabilityOf` is `"Lost"`, or write the gap
   * marker ADR-QD-056 leaves open: the library decides neither. A hook that
   * throws is logged as `qadi/audit: an onOutcome hook threw` with the
   * `evaluationId`, never a defect and never a failed record (INV-QD-035).
   */
  readonly onOutcome?: (outcome: AuditWriteOutcome) => void;
}

const DEFAULT_FAILURE_THRESHOLD = 5;
const DEFAULT_RESET_TIMEOUT_MS: Duration.Input = Duration.millis(30_000);

/**
 * How a stage attempt went and — only when it succeeded — how to commit it.
 * One value rather than a handle plus a `stagingPort !== undefined` check that
 * must always agree: `commit` is defined exactly when `staging` is `Staged`.
 */
interface StageResult {
  readonly staging: UnwrittenStaging;
  readonly commit: (() => Effect.Effect<void, AuditStagingError>) | undefined;
}

/**
 * `Layer.Layer<DecisionSink, never, AuditTrailPort>` — requires `AuditTrailPort`,
 * reads `AuditStagingPort` optionally via `Effect.serviceOption`, never as a
 * `Layer` dependency, so a caller who never wires staging pays nothing for it
 * — the same shape `DecisionSink` itself is read in `Evaluate.ts`.
 *
 * Each record has exactly one {@link AuditWriteOutcome}: the port calls below
 * produce it and report nothing; `AuditWriteReport.ts` turns it into metrics,
 * a log line and the `onOutcome` hook (ARCH-35).
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
      const emitOptions = { onRefused: options?.onRefused, onOutcome: options?.onOutcome };
      const emit = (outcome: AuditWriteOutcome) => emitWriteOutcome(outcome, emitOptions);

      // Stages the entry, identically whether or not the breaker admitted it —
      // only whether write() is attempted differs. `Effect.exit`, not
      // `Effect.result`: a `stage()` that defects (a misbehaving adapter
      // throwing rather than failing with its typed `AuditStagingError`) must
      // land in the same outcome a typed failure does, not unwind out of
      // `record()` unreported.
      const stageEntry = (entry: AuditEntry): Effect.Effect<StageResult> =>
        Effect.gen(function* () {
          if (stagingPort === undefined) {
            return { staging: UnwrittenStaging.NotWired(), commit: undefined };
          }
          const staged = yield* Effect.exit(stagingPort.stage(entry));
          if (Exit.isFailure(staged)) {
            return { staging: UnwrittenStaging.StageFailed(), commit: undefined };
          }
          const handle = staged.value;
          return { staging: UnwrittenStaging.Staged(), commit: () => stagingPort.commit(handle) };
        });

      // A staged copy is committed only once the trail write succeeded; a
      // commit that fails or dies is the staging store's bookkeeping, never the
      // entry.
      const writtenStaging = (staged: StageResult): Effect.Effect<WrittenStaging> =>
        staged.commit === undefined
          ? Effect.succeed(
              staged.staging._tag === "StageFailed" ? WrittenStaging.StageFailed() : WrittenStaging.NotWired(),
            )
          : staged.commit().pipe(
              Effect.as(WrittenStaging.Committed()),
              Effect.catchCause((cause) => Effect.succeed(WrittenStaging.CommitFailed({ cause }))),
            );

      // The port calls, and nothing else: no metric is updated and no line is
      // logged here. `attempt` runs the write under `Effect.exit` and records
      // the result on the breaker (ticket #47: a defecting adapter must reach
      // the breaker the same as a typed `AuditWriteError`). A *caller's*
      // interruption is not folded, so `withPermit` releases a probe claim
      // itself. A staged entry whose write failed is left alone — ticket #5's
      // reconciliation contract, not this pipeline's to discard.
      const attemptWrite = (entry: AuditEntry, permit: Permit): Effect.Effect<AuditWriteOutcome> =>
        Effect.gen(function* () {
          const staged = yield* stageEntry(entry);
          return yield* Match.value(permit).pipe(
            Match.tagsExhaustive({
              Refused: () => Effect.succeed(AuditWriteOutcome.Skipped({ entry, staging: staged.staging })),
              Admitted: (admitted) =>
                Effect.gen(function* () {
                  const written = yield* admitted.attempt(trailPort.write(entry));
                  if (Exit.isFailure(written)) {
                    return AuditWriteOutcome.WriteFailed({ entry, staging: staged.staging });
                  }
                  return AuditWriteOutcome.Written({ entry, staging: yield* writtenStaging(staged) });
                }),
            }),
          );
        });

      const record = Effect.fn("qadi.audit.record")(function* (sinkRecord: SinkRecord) {
        // 1. Encode. A refusal never reaches staging or the trail at all.
        const encoded = yield* Effect.result(encodeAuditEntry(sinkRecord));
        // 2. Ask the breaker for a permit. The admission protocol (one probe
        // per half-open window, the lost-claim re-read, release on every exit)
        // lives in `CircuitBreaker.ts`'s `withPermit`. The outcome is emitted
        // inside it, so its metrics land in the scope they always did.
        const outcome = yield* Result.isFailure(encoded)
          ? Effect.succeed(AuditWriteOutcome.Refused({ refusal: encoded.failure })).pipe(Effect.tap(emit))
          : breaker.withPermit((permit) => attemptWrite(encoded.success, permit).pipe(Effect.tap(emit)));
        yield* Effect.annotateCurrentSpan({
          "qadi.audit.outcome": outcomePath(outcome),
          "qadi.audit.durability": durabilityOf(outcome),
        });
      });

      return { record };
    }),
  );
