/**
 * Drives `AuditDecisionSinkLive` through one outcome leaf and reports everything it emits for the target record.
 *
 * Written on the ARCH-95 phase base so that the change can be judged against values set down before it.
 * `driveExit.ts` does not see a line's annotation set or cause, the span, or the refusal payload, and
 * `collectingLogger` records no cause (its core twin is held equal by `test-helper-twin`, so it is not
 * extended): this file reads all of them from one call, and names its path and series itself rather than
 * through the projection the phase edits.
 */
import type * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Metric from "effect/Metric";
import * as References from "effect/References";
import type * as Tracer from "effect/Tracer";
import { DecisionSink } from "@qadi/core";
import { collectingTracer, isolatedMetrics } from "@qadi/testing";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditDecisionSinkOptions } from "../src/AuditDecisionSinkLive.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { AuditPortReply } from "../src/AuditPortReply.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import { LOST_COUNTERS, STAGING_COUNTERS, WRITES_COUNTERS } from "../src/AuditWriteReport.ts";
import type { InvalidAuditSinkOption } from "../src/InvalidAuditSinkOption.ts";
import type { ExitSpec } from "./driveExit.ts";
import { decisionRecord } from "./helpers.ts";

/** The eleven outcome leaves, named as BEH-QD-252's table names them. */
export type LeafPath =
  | "Refused"
  | "Written.NotWired"
  | "Written.StageFailed"
  | "Written.Committed"
  | "Written.CommitFailed"
  | "WriteFailed.NotWired"
  | "WriteFailed.Staged"
  | "WriteFailed.StageFailed"
  | "Skipped.NotWired"
  | "Skipped.Staged"
  | "Skipped.StageFailed";

const ok = AuditPortReply.Ok();
const stageFails = AuditPortReply.Fail({ cause: "stage offline" });
const writeFails = AuditPortReply.Fail({ cause: "write offline" });
const commitFails = AuditPortReply.Fail({ cause: "commit offline" });

const base: ExitSpec = {
  wired: false,
  open: false,
  encode: "ok",
  stage: ok,
  write: ok,
  commit: ok,
};

/** How each leaf is driven: which ports are wired, whether the breaker is open, and how each store answers. */
export const LEAF_SPECS: { readonly [P in LeafPath]: ExitSpec } = {
  Refused: { ...base, encode: "refused" },
  "Written.NotWired": base,
  "Written.StageFailed": { ...base, wired: true, stage: stageFails },
  "Written.Committed": { ...base, wired: true },
  "Written.CommitFailed": { ...base, wired: true, commit: commitFails },
  "WriteFailed.NotWired": { ...base, write: writeFails },
  "WriteFailed.Staged": { ...base, wired: true, write: writeFails },
  "WriteFailed.StageFailed": { ...base, wired: true, stage: stageFails, write: writeFails },
  "Skipped.NotWired": { ...base, open: true },
  "Skipped.Staged": { ...base, wired: true, open: true },
  "Skipped.StageFailed": { ...base, wired: true, open: true, stage: stageFails },
};

const isLeafPath = (key: string): key is LeafPath => Object.hasOwn(LEAF_SPECS, key);

/** The eleven leaves, read off {@link LEAF_SPECS}'s keys, so a list built from it cannot drop one. */
export const LEAF_PATHS: ReadonlyArray<LeafPath> = Object.keys(LEAF_SPECS).filter(isLeafPath);

/** The thirteen audit counter series, as `<family>.<label>` (the lost ones as `lost.<after>.<staging>`). */
export type SeriesKey =
  | "writes.encode_failed"
  | "writes.written"
  | "writes.write_failed"
  | "writes.skipped_open"
  | "staging.staged"
  | "staging.failed"
  | "staging.skipped_open"
  | "staging.failed_open"
  | "staging.commit_failed"
  | "lost.write_failed.not_wired"
  | "lost.write_failed.failed"
  | "lost.skipped_open.not_wired"
  | "lost.skipped_open.failed";

/** One emitted log line with everything a logger can see of it. */
export interface ObservedLine {
  readonly level: string;
  readonly message: unknown;
  readonly annotations: Readonly<{ readonly [key: string]: unknown }>;
  readonly cause: Cause.Cause<unknown>;
}

/** What the refusal hook receives; read off the option so the file compiles on both sides of ARCH-95. */
export type RefusalPayload = Parameters<NonNullable<AuditDecisionSinkOptions["onRefused"]>>[0];

/** Everything the target record emitted. */
export interface LeafObservation {
  readonly outcome: AuditWriteOutcome;
  readonly path: string;
  readonly stagingKeys: ReadonlyArray<string>;
  readonly lines: ReadonlyArray<ObservedLine>;
  readonly span: Readonly<{ readonly [key: string]: unknown }>;
  readonly counters: { readonly [K in SeriesKey]: number };
  readonly refusals: ReadonlyArray<RefusalPayload>;
  readonly rows: number;
}

/** Every series, read through its export (ADR-QD-123). */
const readSeries = Effect.gen(function* () {
  const count = (series: Metric.Counter<number>) => Effect.map(Metric.value(series), (v) => v.count);
  return {
    "writes.encode_failed": yield* count(WRITES_COUNTERS.encode_failed),
    "writes.written": yield* count(WRITES_COUNTERS.written),
    "writes.write_failed": yield* count(WRITES_COUNTERS.write_failed),
    "writes.skipped_open": yield* count(WRITES_COUNTERS.skipped_open),
    "staging.staged": yield* count(STAGING_COUNTERS.staged),
    "staging.failed": yield* count(STAGING_COUNTERS.failed),
    "staging.skipped_open": yield* count(STAGING_COUNTERS.skipped_open),
    "staging.failed_open": yield* count(STAGING_COUNTERS.failed_open),
    "staging.commit_failed": yield* count(STAGING_COUNTERS.commit_failed),
    "lost.write_failed.not_wired": yield* count(LOST_COUNTERS.write_failed.not_wired),
    "lost.write_failed.failed": yield* count(LOST_COUNTERS.write_failed.failed),
    "lost.skipped_open.not_wired": yield* count(LOST_COUNTERS.skipped_open.not_wired),
    "lost.skipped_open.failed": yield* count(LOST_COUNTERS.skipped_open.failed),
  } satisfies { readonly [K in SeriesKey]: number };
});

/** The leaf's name, written here from the value's own tags and not through the report's path function. */
const pathOf = (outcome: AuditWriteOutcome): string =>
  "staging" in outcome ? `${outcome._tag}.${outcome.staging._tag}` : outcome._tag;

const stagingKeysOf = (outcome: AuditWriteOutcome): ReadonlyArray<string> =>
  "staging" in outcome ? Object.keys(outcome.staging).sort() : [];

/**
 * Drive the real sink through one leaf and observe the target record alone: the trip record of an open-breaker
 * leaf is sent first and its lines, span and counters are never attributed to the target.
 */
export const observeLeaf = (
  leaf: LeafPath,
  hooks: { readonly onRefused: boolean },
): Effect.Effect<LeafObservation, InvalidAuditSinkOption> =>
  Effect.gen(function* () {
    const spec = LEAF_SPECS[leaf];
    const outcomes: Array<AuditWriteOutcome> = [];
    const refusals: Array<RefusalPayload> = [];
    const lines: Array<ObservedLine> = [];
    const spans: Array<Tracer.Span> = [];
    const isTarget = (entry: AuditEntry) => entry.record.evaluationId === "target";

    // Any other entry is the open leaves' tripping record: its write fails.
    const trail = AuditTrailPortTest({
      write: (entry) => (isTarget(entry) ? spec.write : AuditPortReply.Fail({ cause: "trip" })),
    });
    const staging = AuditStagingPortTest({
      stage: (entry) => (isTarget(entry) ? spec.stage : undefined),
      commit: () => spec.commit,
    });
    const logger = Logger.layer([
      Logger.make((o) => {
        lines.push({
          level: o.logLevel,
          message: o.message,
          annotations: o.fiber.getRef(References.CurrentLogAnnotations),
          cause: o.cause,
        });
      }),
    ]);
    const sinkLayer = Layer.provideMerge(
      AuditDecisionSinkLive({
        failureThreshold: 1,
        storeCallTimeout: "5 seconds",
        onOutcome: (o) => void outcomes.push(o),
        ...(hooks.onRefused ? { onRefused: (r: RefusalPayload) => void refusals.push(r) } : {}),
      }),
      Layer.mergeAll(trail.layer, spec.wired ? staging.layer : Layer.empty, logger, collectingTracer(spans)),
    );
    const target =
      spec.encode === "ok"
        ? decisionRecord({ evaluationId: "target" })
        : decisionRecord({ evaluationId: "target", resource: { tags: new Set(["x"]) } });

    return yield* isolatedMetrics(
      Effect.gen(function* () {
        const sink = yield* DecisionSink;
        if (spec.open) yield* sink.record(decisionRecord({ evaluationId: "trip" }));
        const before = yield* readSeries;
        const linesBefore = lines.length;
        const spansBefore = spans.length;
        const outcomesBefore = outcomes.length;
        const refusalsBefore = refusals.length;
        yield* sink.record(target);
        const after = yield* readSeries;
        const outcome = outcomes[outcomes.length - 1];
        if (outcomes.length === outcomesBefore || outcome === undefined) {
          return yield* Effect.die(new Error("onOutcome was never called for the target"));
        }
        const span = spans
          .slice(spansBefore)
          .filter((s) => s.name === "qadi.audit.record")
          .pop();
        if (span === undefined) return yield* Effect.die(new Error("no qadi.audit.record span for the target"));
        const delta = (key: SeriesKey) => after[key] - before[key];
        const observation: LeafObservation = {
          outcome,
          path: pathOf(outcome),
          stagingKeys: stagingKeysOf(outcome),
          lines: lines.slice(linesBefore),
          span: Object.fromEntries(span.attributes),
          counters: {
            "writes.encode_failed": delta("writes.encode_failed"),
            "writes.written": delta("writes.written"),
            "writes.write_failed": delta("writes.write_failed"),
            "writes.skipped_open": delta("writes.skipped_open"),
            "staging.staged": delta("staging.staged"),
            "staging.failed": delta("staging.failed"),
            "staging.skipped_open": delta("staging.skipped_open"),
            "staging.failed_open": delta("staging.failed_open"),
            "staging.commit_failed": delta("staging.commit_failed"),
            "lost.write_failed.not_wired": delta("lost.write_failed.not_wired"),
            "lost.write_failed.failed": delta("lost.write_failed.failed"),
            "lost.skipped_open.not_wired": delta("lost.skipped_open.not_wired"),
            "lost.skipped_open.failed": delta("lost.skipped_open.failed"),
          },
          refusals: refusals.slice(refusalsBefore),
          rows: trail.written().filter(isTarget).length,
        };
        return observation;
      }).pipe(Effect.provide(sinkLayer)),
    );
  });
