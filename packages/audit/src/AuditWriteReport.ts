/**
 * How the pipeline reports an {@link AuditWriteOutcome}: one pure projection to
 * its metric labels, its log line and its lost-entry label, and one `emit` that
 * applies it.
 *
 * Package-private (ADR-QD-099): the labels and messages are the pipeline's own
 * wire to its operators, not a caller's API. A caller who wants the outcome
 * itself reads it through `AuditDecisionSinkOptions.onOutcome`.
 *
 * The projection is a pure function so a test asserts every leaf exactly, with
 * no registry and no logger; `emit` is the only place a metric is updated or a
 * line logged on the write path. Labels map to the module-scope counters below
 * through closed `Record`s, never a `Metric.withAttributes` built per call: the
 * registry keys on the metric object, so a counter re-declared per call fails
 * silently.
 */
import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Match from "effect/Match";
import * as Metric from "effect/Metric";
import { reportEncodeRefusal } from "@qadi/core";
import type { AuditEntryNotEncodable } from "./AuditEntry.ts";
import type { AuditStagingError } from "./AuditStagingPort.ts";
import type { AuditWriteOutcome, UnwrittenStaging, WrittenStaging } from "./AuditWriteOutcome.ts";

/** `qadi_audit_writes_total`'s `outcome` values. */
export type WritesLabel = "encode_failed" | "written" | "write_failed" | "skipped_open";

/** `qadi_audit_staging_total`'s `outcome` values. */
export type StagingLabel = "staged" | "failed" | "skipped_open" | "failed_open" | "commit_failed";

/** `qadi_audit_entries_lost_total`'s labels: what stopped the write, and what staging did. */
export interface LostLabel {
  readonly after: "write_failed" | "skipped_open";
  readonly staging: "not_wired" | "failed";
}

/** One log line: the level, the exact message, and the cause appended to it, if any. */
export interface LogLine {
  readonly level: "Warn" | "Info";
  readonly message: string;
  readonly cause: Cause.Cause<AuditStagingError> | undefined;
}

/**
 * What one outcome reports. `log` is `"encodeRefusal"` for a refused record,
 * which goes through `@qadi/core`'s `reportEncodeRefusal` (ARCH-25) rather than
 * a line of this package's own.
 */
export interface AuditWriteReport {
  readonly writes: WritesLabel;
  readonly staging: ReadonlyArray<StagingLabel>;
  readonly lost: LostLabel | undefined;
  readonly log: LogLine | "encodeRefusal" | undefined;
}

interface StagingReport {
  readonly staging: ReadonlyArray<StagingLabel>;
  readonly log: LogLine | "encodeRefusal" | undefined;
}

const DROPPED_BREAKER_UNWIRED = "audit entry dropped: circuit breaker open and no staging port wired";
const DROPPED_BREAKER_STAGE_FAILED = "audit entry dropped: circuit breaker open and staging failed";
const DROPPED_WRITE_UNWIRED = "audit entry dropped: trail write failed and no staging port wired";
const DROPPED_WRITE_STAGE_FAILED = "audit entry dropped: trail write failed and staging failed";
const NOT_WRITTEN_STAGED_SUFFIX = "its staged copy is left for reconciliation";
const COMMIT_FAILED =
  "audit staging commit failed: entry is durable in the trail, but its " +
  "staged copy will remain marked uncommitted in the staging store";

// Builders, not literals: a `Match` arm returning an object literal infers
// `string` for its labels, and the closed label unions are the point.
const stagingReport = (staging: ReadonlyArray<StagingLabel>, log: StagingReport["log"]): StagingReport => ({
  staging,
  log,
});
const auditReport = (
  writes: WritesLabel,
  staged: StagingReport,
  lost: LostLabel | undefined,
): AuditWriteReport => ({ writes, staging: staged.staging, lost, log: staged.log });
const lostWord = (w: LostLabel["staging"]): LostLabel["staging"] => w;

const warning = (message: string): LogLine => ({ level: "Warn", message, cause: undefined });
const info = (message: string): LogLine => ({ level: "Info", message, cause: undefined });

const writtenStagingReport: (self: WrittenStaging) => StagingReport = Match.type<WrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => stagingReport([], undefined),
    StageFailed: () => stagingReport(["failed"], undefined),
    Committed: () => stagingReport(["staged"], undefined),
    CommitFailed: (s) =>
      stagingReport(["staged", "commit_failed"], { level: "Warn", message: COMMIT_FAILED, cause: s.cause }),
  }),
);

const writeFailedStagingReport: (self: UnwrittenStaging) => StagingReport = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => stagingReport([], warning(DROPPED_WRITE_UNWIRED)),
    Staged: () =>
      stagingReport(["staged"], info(`audit entry not written: trail write failed; ${NOT_WRITTEN_STAGED_SUFFIX}`)),
    StageFailed: () => stagingReport(["failed"], warning(DROPPED_WRITE_STAGE_FAILED)),
  }),
);

const skippedStagingReport: (self: UnwrittenStaging) => StagingReport = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => stagingReport(["skipped_open"], warning(DROPPED_BREAKER_UNWIRED)),
    Staged: () =>
      stagingReport(["staged"], info(`audit entry not written: circuit breaker open; ${NOT_WRITTEN_STAGED_SUFFIX}`)),
    StageFailed: () => stagingReport(["failed_open"], warning(DROPPED_BREAKER_STAGE_FAILED)),
  }),
);

const lostStaging: (self: UnwrittenStaging) => LostLabel["staging"] | undefined = Match.type<UnwrittenStaging>().pipe(
  Match.tagsExhaustive({
    NotWired: () => lostWord("not_wired"),
    Staged: () => undefined,
    StageFailed: () => lostWord("failed"),
  }),
);

const lostLabel = (after: LostLabel["after"], staging: UnwrittenStaging): LostLabel | undefined => {
  const stagingLabel = lostStaging(staging);
  return stagingLabel === undefined ? undefined : { after, staging: stagingLabel };
};

/**
 * What one outcome reports — pure, one arm per leaf, exhaustive by
 * construction (BEH-QD-252's table).
 */
export const describeAuditWriteOutcome: (self: AuditWriteOutcome) => AuditWriteReport = Match.type<AuditWriteOutcome>().pipe(
  Match.tagsExhaustive({
    Refused: () => auditReport("encode_failed", stagingReport([], "encodeRefusal"), undefined),
    Written: (o) => auditReport("written", writtenStagingReport(o.staging), undefined),
    WriteFailed: (o) =>
      auditReport("write_failed", writeFailedStagingReport(o.staging), lostLabel("write_failed", o.staging)),
    Skipped: (o) =>
      auditReport("skipped_open", skippedStagingReport(o.staging), lostLabel("skipped_open", o.staging)),
  }),
);

/** The leaf as a closed word — `"Refused"` or `"<Case>.<Staging>"` — for a span attribute. */
export const outcomePath = (self: AuditWriteOutcome): string =>
  self._tag === "Refused" ? self._tag : `${self._tag}.${self.staging._tag}`;

/**
 * Records received, by what became of them. Every record `record()` is handed
 * is counted exactly once, including those the breaker refused (`skipped_open`)
 * — module scope, mirroring `@qadi/predicate-sql`'s
 * `qadi_predicate_sql_compiled_total`.
 */
const writesTotal = Metric.counter("qadi_audit_writes_total", {
  description: "SinkRecords the audit pipeline received, tagged by outcome.",
});

const WRITES_COUNTERS: Record<WritesLabel, Metric.Counter<number>> = {
  encode_failed: Metric.withAttributes(writesTotal, { outcome: "encode_failed" }),
  written: Metric.withAttributes(writesTotal, { outcome: "written" }),
  write_failed: Metric.withAttributes(writesTotal, { outcome: "write_failed" }),
  skipped_open: Metric.withAttributes(writesTotal, { outcome: "skipped_open" }),
};

const stagingTotal = Metric.counter("qadi_audit_staging_total", {
  description: "AuditStagingPort.stage attempts, tagged by outcome.",
});

/**
 * One counter per {@link StagingLabel}.
 *
 * - `failed`: `stage()` failed while the write was (or could still be)
 *   attempted. The entry is recoverable through the trail only if that write
 *   then succeeds; if it fails, it is lost, and `WriteFailed.StageFailed` logs
 *   and counts it as such.
 * - `failed_open`: `stage()` failed while the breaker was Open, so neither
 *   staging nor the trail will ever hold the entry. Kept distinct from
 *   `failed` because the operator responses differ: that one says "staging is
 *   unhealthy", this one says "this entry is gone".
 * - `commit_failed`: a `commit` raised, typed or defect. A staging-side cleanup
 *   failure, not a compliance-record loss: `commit` only runs after the trail
 *   write succeeded, so the entry is already durable.
 */
const STAGING_COUNTERS: Record<StagingLabel, Metric.Counter<number>> = {
  staged: Metric.withAttributes(stagingTotal, { outcome: "staged" }),
  failed: Metric.withAttributes(stagingTotal, { outcome: "failed" }),
  skipped_open: Metric.withAttributes(stagingTotal, { outcome: "skipped_open" }),
  failed_open: Metric.withAttributes(stagingTotal, { outcome: "failed_open" }),
  commit_failed: Metric.withAttributes(stagingTotal, { outcome: "commit_failed" }),
};

const entriesLostTotal = Metric.counter("qadi_audit_entries_lost_total", {
  description: "Audit entries in neither the trail nor staging, by what failed.",
});

const LOST_COUNTERS: Record<LostLabel["after"], Record<LostLabel["staging"], Metric.Counter<number>>> = {
  write_failed: {
    not_wired: Metric.withAttributes(entriesLostTotal, { after: "write_failed", staging: "not_wired" }),
    failed: Metric.withAttributes(entriesLostTotal, { after: "write_failed", staging: "failed" }),
  },
  skipped_open: {
    not_wired: Metric.withAttributes(entriesLostTotal, { after: "skipped_open", staging: "not_wired" }),
    failed: Metric.withAttributes(entriesLostTotal, { after: "skipped_open", staging: "failed" }),
  },
};

/** The caller-supplied hooks `emit` calls. */
export interface AuditWriteEmitOptions {
  readonly onRefused: ((refusal: AuditEntryNotEncodable) => void) | undefined;
  readonly onOutcome: ((outcome: AuditWriteOutcome) => void) | undefined;
}

const evaluationIdOf = (outcome: AuditWriteOutcome): string =>
  outcome._tag === "Refused" ? outcome.refusal.evaluationId : outcome.entry.record.evaluationId;

/**
 * Applies {@link describeAuditWriteOutcome}: updates the metrics, logs the line,
 * then calls `onOutcome`.
 *
 * Never fails and never dies: a hook that throws is a caller's bug, and one
 * record's report must not fail a decision (INV-QD-035). A log line annotates
 * `evaluationId` only — a correlation handle, never the subject, resource or
 * policy the entry carries (INV-QD-104).
 */
export const emitWriteOutcome = Effect.fn("qadi.audit.emitWriteOutcome")(function* (
  outcome: AuditWriteOutcome,
  options: AuditWriteEmitOptions,
) {
  const report = describeAuditWriteOutcome(outcome);
  const evaluationId = evaluationIdOf(outcome);

  if (outcome._tag === "Refused") {
    yield* reportEncodeRefusal(outcome.refusal, {
      message:
        "qadi/audit: a decision record could not be encoded for the audit trail; no row was written",
      onRefused: options.onRefused,
    });
  } else if (report.log !== undefined && report.log !== "encodeRefusal") {
    const { level, message, cause } = report.log;
    yield* Effect.logWithLevel(level)(...(cause === undefined ? [message] : [message, cause])).pipe(
      Effect.annotateLogs({ evaluationId }),
    );
  }

  yield* Metric.update(WRITES_COUNTERS[report.writes], 1);
  for (const label of report.staging) yield* Metric.update(STAGING_COUNTERS[label], 1);
  if (report.lost !== undefined) {
    yield* Metric.update(LOST_COUNTERS[report.lost.after][report.lost.staging], 1);
  }

  const hook = options.onOutcome;
  if (hook !== undefined) {
    yield* Effect.sync(() => hook(outcome)).pipe(
      Effect.catchCause((cause) =>
        Effect.logWarning("qadi/audit: an onOutcome hook threw").pipe(
          Effect.annotateLogs({ evaluationId, "qadi.cause": String(cause) }),
        ),
      ),
    );
  }
});
