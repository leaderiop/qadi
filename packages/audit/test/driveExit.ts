/**
 * Drives `AuditDecisionSinkLive` through one exit of `record` with scripted
 * ports and reports what the target record did — the ARCH-35 harness that ties
 * what the pipeline emits to what `describeAuditWriteOutcome` says it should.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import { DecisionSink } from "@qadi/core";
import { collectingLogger, isolatedMetrics } from "@qadi/testing";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { AuditStagingError, AuditStagingPort } from "../src/AuditStagingPort.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import type { StagingLabel, WritesLabel } from "../src/AuditWriteReport.ts";
import { decisionRecord } from "./helpers.ts";

export type Mode = "ok" | "fail" | "die";

/** One exit of `record`, described by what each port does for the target record. */
export interface ExitSpec {
  readonly wired: boolean;
  /** The breaker is Open when the target arrives: a first record has already tripped it. */
  readonly open: boolean;
  readonly encode: "ok" | "refused";
  readonly stage: Mode;
  readonly write: Mode;
  readonly commit: Mode;
}

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

const failOrDie = <E>(mode: Mode, error: E): Effect.Effect<void, E> =>
  mode === "ok" ? Effect.void : mode === "fail" ? Effect.fail(error) : Effect.die(new Error("port bug"));

const countOf = (
  snapshots: ReadonlyArray<Metric.Metric.Snapshot>,
  id: string,
  outcome: string,
): number => {
  for (const s of snapshots) {
    if (s.type === "Counter" && s.id === id && s.attributes?.outcome === outcome) return Number(s.state.count);
  }
  return 0;
};

const lostCount = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>): number => {
  let total = 0;
  for (const s of snapshots) {
    if (s.type === "Counter" && s.id === "qadi_audit_entries_lost_total") total += Number(s.state.count);
  }
  return total;
};

const lostLabelsMoved = (
  before: ReadonlyArray<Metric.Metric.Snapshot>,
  after: ReadonlyArray<Metric.Metric.Snapshot>,
): ReadonlyArray<string> => {
  const labels: Array<string> = [];
  for (const s of after) {
    if (s.type !== "Counter" || s.id !== "qadi_audit_entries_lost_total") continue;
    const key = `${s.attributes?.after}/${s.attributes?.staging}`;
    const prior = before.find(
      (b) => b.type === "Counter" && b.id === s.id && b.attributes?.after === s.attributes?.after && b.attributes?.staging === s.attributes?.staging,
    );
    const priorCount = prior?.type === "Counter" ? Number(prior.state.count) : 0;
    if (Number(s.state.count) > priorCount) labels.push(key);
  }
  return labels;
};

const healthyEntry: AuditEntry = Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "target" })));

export const driveExit = (spec: ExitSpec): Effect.Effect<ExitObservation> =>
  Effect.gen(function* () {
    const rows: Array<AuditEntry> = [];
    const outcomes: Array<AuditWriteOutcome> = [];
    const isTarget = (entry: AuditEntry) => entry.record.evaluationId === "target";

    const trail = Layer.succeed(AuditTrailPort, {
      write: (entry) =>
        isTarget(entry)
          ? failOrDie(spec.write, new AuditWriteError({ entry, cause: "offline" })).pipe(
              Effect.tap(() => Effect.sync(() => void rows.push(entry))),
            )
          : Effect.fail(new AuditWriteError({ entry, cause: "trip" })),
    });
    const staging = Layer.succeed(AuditStagingPort, {
      stage: (entry) =>
        isTarget(entry)
          ? failOrDie(spec.stage, new AuditStagingError({ entry, cause: "stage offline" })).pipe(
              Effect.as("handle"),
            )
          : Effect.succeed("handle"),
      commit: () => failOrDie(spec.commit, new AuditStagingError({ entry: healthyEntry, cause: "commit offline" })),
    });
    const { lines, layer: logger } = collectingLogger();
    const sinkLayer = Layer.provideMerge(
      AuditDecisionSinkLive({ failureThreshold: 1, onOutcome: (o) => void outcomes.push(o) }),
      Layer.mergeAll(trail, spec.wired ? staging : Layer.empty, logger),
    );
    const target =
      spec.encode === "ok"
        ? decisionRecord({ evaluationId: "target" })
        : decisionRecord({ evaluationId: "target", resource: { tags: new Set(["x"]) } });

    return yield* isolatedMetrics(
      Effect.gen(function* () {
        const sink = yield* DecisionSink;
        if (spec.open) yield* sink.record(decisionRecord({ evaluationId: "trip" }));
        const before = yield* Metric.snapshot;
        const logsBefore = lines.length;
        const outcomesBefore = outcomes.length;
        yield* sink.record(target);
        const after = yield* Metric.snapshot;
        const writes = (label: WritesLabel) =>
          countOf(after, "qadi_audit_writes_total", label) - countOf(before, "qadi_audit_writes_total", label);
        const stagingOf = (label: StagingLabel) =>
          countOf(after, "qadi_audit_staging_total", label) - countOf(before, "qadi_audit_staging_total", label);
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
          lost: lostCount(after) - lostCount(before),
          lostLabels: lostLabelsMoved(before, after),
          logs: lines.slice(logsBefore).map(
            (line): ObservedLog => ({
              level: line.level,
              message: String(Array.isArray(line.message) ? line.message[0] : line.message),
              evaluationId: line.annotations["evaluationId"],
            }),
          ),
          rows: rows.length,
          hookCalls: outcomes.length - outcomesBefore,
        };
        return observation;
      }).pipe(Effect.provide(sinkLayer)),
    );
  });
