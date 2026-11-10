/**
 * Drives `AuditDecisionSinkLive` through one exit of `record` with scripted
 * ports and reports what the target record did — the ARCH-35 harness that ties
 * what the pipeline emits to what `describeAuditWriteOutcome` says it should.
 */
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";
import * as TestClock from "effect/testing/TestClock";
import { DecisionSink } from "@qadi/core";
import { collectingLogger, isolatedMetrics } from "@qadi/testing";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { AuditPortReply } from "../src/AuditPortReply.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import { LOST_COUNTERS, STAGING_COUNTERS, WRITES_COUNTERS } from "../src/AuditWriteReport.ts";
import type { StagingLabel, WritesLabel } from "../src/AuditWriteReport.ts";
import { decisionRecord } from "./helpers.ts";

/** One exit of `record`, described by how each port answers the target record. */
export interface ExitSpec {
  readonly wired: boolean;
  /** The breaker is Open when the target arrives: a first record has already tripped it. */
  readonly open: boolean;
  readonly encode: "ok" | "refused";
  readonly stage: AuditPortReply;
  readonly write: AuditPortReply;
  readonly commit: AuditPortReply;
}

/** The harness's own deadline, explicit so a hung row's clock adjustment is read off it. */
const STORE_CALL_TIMEOUT = "5 seconds";
/** Past one deadline, well inside the 30 s reset timeout. */
const PAST_DEADLINE = "6 seconds";

const hangs = (reply: AuditPortReply): boolean => reply._tag === "Never" || reply._tag === "Latch";

export type LabelCounts<K extends string> = { readonly [P in K]: number };

export interface ObservedLog {
  readonly level: string;
  readonly message: string;
  readonly evaluationId: unknown;
}

export interface ExitObservation {
  readonly outcome: AuditWriteOutcome;
  readonly writes: LabelCounts<WritesLabel>;
  readonly staging: LabelCounts<StagingLabel>;
  readonly lost: number;
  /** The `after/staging` label pairs the lost-entry counter moved for, e.g. `"write_failed/not_wired"`. */
  readonly lostLabels: ReadonlyArray<string>;
  readonly logs: ReadonlyArray<ObservedLog>;
  readonly rows: number;
  readonly hookCalls: number;
}

/** Every audit counter series, read through its export (ADR-QD-123). */
const readCounts = Effect.gen(function* () {
  const count = (series: Metric.Counter<number>) => Effect.map(Metric.value(series), (v) => v.count);
  return {
    writes: {
      encode_failed: yield* count(WRITES_COUNTERS.encode_failed),
      written: yield* count(WRITES_COUNTERS.written),
      write_failed: yield* count(WRITES_COUNTERS.write_failed),
      skipped_open: yield* count(WRITES_COUNTERS.skipped_open),
    } satisfies LabelCounts<WritesLabel>,
    staging: {
      staged: yield* count(STAGING_COUNTERS.staged),
      failed: yield* count(STAGING_COUNTERS.failed),
      skipped_open: yield* count(STAGING_COUNTERS.skipped_open),
      failed_open: yield* count(STAGING_COUNTERS.failed_open),
      commit_failed: yield* count(STAGING_COUNTERS.commit_failed),
    } satisfies LabelCounts<StagingLabel>,
    lost: {
      "write_failed/not_wired": yield* count(LOST_COUNTERS.write_failed.not_wired),
      "write_failed/failed": yield* count(LOST_COUNTERS.write_failed.failed),
      "skipped_open/not_wired": yield* count(LOST_COUNTERS.skipped_open.not_wired),
      "skipped_open/failed": yield* count(LOST_COUNTERS.skipped_open.failed),
    },
  };
});

type Counts = Effect.Success<typeof readCounts>;

const lostTotal = (counts: Counts): number => Object.values(counts.lost).reduce((sum, n) => sum + n, 0);

const lostLabelsMoved = (before: Counts, after: Counts): ReadonlyArray<string> =>
  Record.keys(after.lost).filter((label) => after.lost[label] > before.lost[label]);

export const driveExit = (spec: ExitSpec): Effect.Effect<ExitObservation> =>
  Effect.gen(function* () {
    const outcomes: Array<AuditWriteOutcome> = [];
    const isTarget = (entry: AuditEntry) => entry.record.evaluationId === "target";

    // Any other entry is the `open` row's tripping record: its write fails.
    const trail = AuditTrailPortTest({
      write: (entry) => (isTarget(entry) ? spec.write : AuditPortReply.Fail({ cause: "trip" })),
    });
    const staging = AuditStagingPortTest({
      stage: (entry) => (isTarget(entry) ? spec.stage : undefined),
      commit: () => spec.commit,
    });
    const { lines, layer: logger } = collectingLogger();
    const sinkLayer = Layer.provideMerge(
      AuditDecisionSinkLive({
        failureThreshold: 1,
        storeCallTimeout: STORE_CALL_TIMEOUT,
        onOutcome: (o) => void outcomes.push(o),
      }),
      Layer.mergeAll(trail.layer, spec.wired ? staging.layer : Layer.empty, logger),
    );
    const target =
      spec.encode === "ok"
        ? decisionRecord({ evaluationId: "target" })
        : decisionRecord({ evaluationId: "target", resource: { tags: new Set(["x"]) } });

    return yield* isolatedMetrics(
      Effect.gen(function* () {
        const sink = yield* DecisionSink;
        if (spec.open) yield* sink.record(decisionRecord({ evaluationId: "trip" }));
        const before = yield* readCounts;
        const logsBefore = lines.length;
        const outcomesBefore = outcomes.length;
        // A hung reply settles only at the sink's deadline, so the clock is moved past it.
        if (hangs(spec.stage) || hangs(spec.write) || hangs(spec.commit)) {
          const fiber = yield* Effect.forkChild(sink.record(target));
          yield* TestClock.adjust(PAST_DEADLINE);
          yield* Fiber.join(fiber);
        } else {
          yield* sink.record(target);
        }
        const after = yield* readCounts;
        const writes = (label: WritesLabel) => after.writes[label] - before.writes[label];
        const stagingOf = (label: StagingLabel) => after.staging[label] - before.staging[label];
        const outcome = outcomes[outcomes.length - 1];
        if (outcome === undefined) return yield* Effect.die(new Error("onOutcome was never called"));
        const observation: ExitObservation = {
          outcome,
          writes: {
            encode_failed: writes("encode_failed"),
            written: writes("written"),
            write_failed: writes("write_failed"),
            skipped_open: writes("skipped_open"),
          },
          staging: {
            staged: stagingOf("staged"),
            failed: stagingOf("failed"),
            skipped_open: stagingOf("skipped_open"),
            failed_open: stagingOf("failed_open"),
            commit_failed: stagingOf("commit_failed"),
          },
          lost: lostTotal(after) - lostTotal(before),
          lostLabels: lostLabelsMoved(before, after),
          logs: lines.slice(logsBefore).map(
            (line): ObservedLog => ({
              level: line.level,
              message: String(Array.isArray(line.message) ? line.message[0] : line.message),
              evaluationId: line.annotations["evaluationId"],
            }),
          ),
          rows: trail.written().filter(isTarget).length,
          hookCalls: outcomes.length - outcomesBefore,
        };
        return observation;
      }).pipe(Effect.provide(sinkLayer)),
    );
  });
