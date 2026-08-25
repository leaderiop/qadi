import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { AuditStagingError, AuditStagingPort } from "../src/AuditStagingPort.ts";
import { decisionRecord } from "./helpers.ts";

/** Isolates one test's counts from the process-wide registry every other test shares. */
const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );

type CounterSnapshot = Extract<Metric.Metric.Snapshot, { type: "Counter" }>;
type GaugeSnapshot = Extract<Metric.Metric.Snapshot, { type: "Gauge" }>;
const counters = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string): ReadonlyArray<CounterSnapshot> =>
  snapshots.filter((s): s is CounterSnapshot => s.type === "Counter" && s.id === id);
const gaugeOf = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string): GaugeSnapshot | undefined =>
  snapshots.find((s): s is GaugeSnapshot => s.type === "Gauge" && s.id === id);

describe("qadi_audit_writes_total", () => {
  it.effect("a successful write is tagged 'written'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      const rows = counters(snapshots, "qadi_audit_writes_total");
      const written = rows.find((r) => r.attributes?.outcome === "written");
      assert.isDefined(written);
      assert.strictEqual(written?.state.count, 1);
    }));

  it.effect("an unencodable resource is tagged 'encode_failed', not 'written'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord({ resource: { handler: () => "nope" } }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      const rows = counters(snapshots, "qadi_audit_writes_total");
      assert.isDefined(rows.find((r) => r.attributes?.outcome === "encode_failed"));
      assert.isUndefined(rows.find((r) => r.attributes?.outcome === "written"));
    }));

  it.effect("a trail write failure is tagged 'write_failed'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      const rows = counters(snapshots, "qadi_audit_writes_total");
      const failed = rows.find((r) => r.attributes?.outcome === "write_failed");
      assert.isDefined(failed);
      assert.strictEqual(failed?.state.count, 1);
    }));
});

describe("qadi_audit_circuit_breaker_state / _transitions_total", () => {
  it.effect("the gauge reports Open (2) once tripped, and a transition-to-Open is counted", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      const gauge = gaugeOf(snapshots, "qadi_audit_circuit_breaker_state");
      assert.strictEqual(gauge?.state.value, 2);

      const transitions = counters(snapshots, "qadi_audit_circuit_breaker_transitions_total");
      const toOpen = transitions.find((r) => r.attributes?.to === "Open");
      assert.isDefined(toOpen);
      assert.strictEqual(toOpen?.state.count, 1);
    }));
});

describe("qadi_audit_staging_total", () => {
  it.effect("unwired and the breaker open is tagged 'skipped_open'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 6; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const skipped = rows.find((r) => r.attributes?.outcome === "skipped_open");
      assert.isDefined(skipped);
      assert.strictEqual(skipped?.state.count, 1);
    }));

  it.effect("wired but a stage() failure is tagged 'failed', and never blocks the write", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      const { layer: staging } = AuditStagingPortTest({
        failStageWith: (entry) => new AuditStagingError({ entry, cause: "staging store offline" }),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging)),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const failed = rows.find((r) => r.attributes?.outcome === "failed");
      assert.isDefined(failed);
      assert.strictEqual(failed?.state.count, 1);
      // The write itself still went through — staging is best-effort.
      assert.strictEqual(written().length, 1);
    }));

  it.effect("wired and stage() succeeds is tagged 'staged'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const { layer: staging } = AuditStagingPortTest();

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging)),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const staged = rows.find((r) => r.attributes?.outcome === "staged");
      assert.isDefined(staged);
      assert.strictEqual(staged?.state.count, 1);
    }));

  it.effect("a commit defect — not just a typed AuditStagingError — is tagged 'commit_failed', never silent", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      // A caller's own bug, not this package's error type — record() must
      // neither propagate it nor lose it without a trace.
      const brokenStaging = Layer.succeed(AuditStagingPort, {
        stage: () => Effect.succeed("handle"),
        commit: () => Effect.die(new Error("caller's staging store bug")),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(brokenStaging)),
      );

      // The write itself still succeeded — a caller's commit bug must not
      // make record() itself fail or lose the row.
      assert.strictEqual(written().length, 1);

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const commitFailed = rows.find((r) => r.attributes?.outcome === "commit_failed");
      assert.isDefined(commitFailed);
      assert.strictEqual(commitFailed?.state.count, 1);
    }));
});
