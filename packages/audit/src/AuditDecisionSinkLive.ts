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
          //
          // A half-open breaker admits exactly one concurrent probe write:
          // every other `record()` call racing this one while the breaker
          // is half-open must behave as though it were still `Open`, or a
          // recovering store would receive the whole of a `filter`/
          // `filterStream` fan-out at once the instant `resetTimeoutMs`
          // elapses, not the one trial write the option's own doc promises.
          //
          // A lost `claimProbe` has two distinct causes a single `"Open"`
          // fallback would conflate: another caller already holds this
          // half-open window's one slot (still `HalfOpen`), or the breaker
          // moved on entirely while this call was in flight — most notably,
          // the prober's write just succeeded and closed it. Re-reading
          // `status` tells them apart: a `Closed` read means this entry can
          // just write normally, rather than being logged and metered below
          // as lost to a breaker that, by the time this line runs, is not
          // open at all. Anything else (still `HalfOpen`, or re-`Open`ed by
          // the prober's own failure) still means "not my probe to attempt",
          // so it collapses to `"Open"` exactly as before.
          const initialStatus = yield* breaker.status;
          let status = initialStatus;
          if (initialStatus === "HalfOpen" && !(yield* breaker.claimProbe)) {
            const current = yield* breaker.status;
            status = current === "Closed" ? "Closed" : "Open";
          }
          // This call holds the half-open window's one probe claim exactly
          // when `status` is still `"HalfOpen"` here: the branch above only
          // ever reassigns it away (to `"Closed"` or `"Open"`) when
          // `claimProbe` was lost to another caller. See the write attempt
          // below (ticket #38 / H4) for why this distinction matters.
          const isProbe = status === "HalfOpen";

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
            // does, not unwind straight out of `record()` unmetered. See
            // `attemptWrite` below for the identical reasoning on `write()`.
            const staged = yield* Effect.exit(stagingPort.stage(entry));
            if (Exit.isSuccess(staged)) {
              const handle = staged.value;
              commitStaged = () => stagingPort.commit(handle);
              yield* Metric.update(stagingStaged, 1);
            } else if (status === "Open") {
              // Staging failed and the breaker is Open, so the write below
              // never runs either — this entry has no path to durability at
              // all, the wired counterpart of the unwired-and-open case.
              yield* Effect.logWarning(
                "audit entry dropped: circuit breaker open and staging failed",
              ).pipe(Effect.annotateLogs({ evaluationId: entry.record.evaluationId }));
              yield* Metric.update(stagingFailedOpen, 1);
            } else {
              yield* Metric.update(stagingFailed, 1);
            }
          } else if (status === "Open") {
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

          if (status === "Open") return;

          // 3/4. Attempt the write and react.
          //
          // `Effect.exit`, not `Effect.result` (ticket #47): the latter only
          // catches `trailPort.write`'s own `E` channel, so a defecting store
          // adapter — the same class of problem `commitStaged`'s
          // `Effect.catchCause` above already guards against for `commit` —
          // used to unwind straight past the `else` branch below, leaving
          // both `breaker.recordFailure` and `writesWriteFailed` unrun. A
          // write that never resolves observably is exactly what the breaker
          // exists to detect, so a defect has to reach `recordFailure` the
          // same as a typed `AuditWriteError` does — not disappear into an
          // unhandled defect the breaker and the metrics both stay blind to.
          // The `Effect.onExit` around this whole block (below) still runs
          // regardless, as a second line of defense for the probe claim
          // specifically — `releaseProbe` is a no-op once `recordFailure`
          // has already turned the half-open window back to `Open` itself.
          const attemptWrite = Effect.gen(function* () {
            const written = yield* Effect.exit(trailPort.write(entry));
            if (Exit.isSuccess(written)) {
              yield* breaker.recordSuccess;
              if (commitStaged !== undefined) {
                yield* Effect.catchCause(commitStaged(), () => Metric.update(stagingCommitFailed, 1));
              }
              yield* Metric.update(writesWritten, 1);
            } else {
              yield* breaker.recordFailure;
              // The staged entry, if any, is left alone — ticket #5's
              // reconciliation contract, not this pipeline's to discard.
              yield* Metric.update(writesWriteFailed, 1);
            }
          });

          // Ticket #38 (H4), narrowed by ticket #47. `trailPort.write`
          // itself now runs under `Effect.exit` (above), so a write that
          // defects or is interrupted already reaches `recordFailure` — and,
          // for the one call holding the half-open probe, `recordFailure`
          // reopens the breaker exactly as `releaseProbe` would, leaving
          // `releaseProbe` nothing to do. What this `Effect.onExit` still
          // guards against is narrower than it was before #47: `written`'s
          // `Exit` is only ever captured *after* `trailPort.write` itself has
          // settled, so `recordSuccess`/`recordFailure`, `commitStaged`'s
          // `Effect.catchCause`, and the metric updates that follow are all
          // still ordinary interruptible steps a fiber can be cut off inside
          // — e.g. interrupted after `written` resolves but before
          // `recordFailure`'s own `Ref.modify` completes. `Effect.onExit`
          // guarantees a finalizer on every path `attemptWrite` can end on
          // regardless of where inside it that happens (confirmed by this
          // file's own interruption test, and already relied on the same way
          // in `DecisionCache.ts`) — unlike a plain `Effect.exit` followed by
          // more steps, which a fiber interrupted mid-`attemptWrite` would
          // never return to run. `breaker.releaseProbe` is itself a no-op
          // once `attemptWrite` already settled normally, so this costs
          // nothing on the ordinary path.
          yield* isProbe
            ? Effect.onExit(attemptWrite, (exit) =>
                Exit.isFailure(exit) ? breaker.releaseProbe : Effect.void,
              )
            : attemptWrite;
        });

      return { record };
    }),
  );
