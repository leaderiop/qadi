import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import { DecisionSink } from "@qadi/core";
import { isolatedMetrics } from "@qadi/testing";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { driveExit } from "./driveExit.ts";
import type { ExitSpec } from "./driveExit.ts";
import { decisionRecord } from "./helpers.ts";

type CounterSnapshot = Extract<Metric.Metric.Snapshot, { type: "Counter" }>;
type FrequencySnapshot = Extract<Metric.Metric.Snapshot, { type: "Frequency" }>;
const counters = (snapshots: ReadonlyArray<Metric.Metric.Snapshot>, id: string): ReadonlyArray<CounterSnapshot> =>
  snapshots.filter((s): s is CounterSnapshot => s.type === "Counter" && s.id === id);
const frequencyOf = (
  snapshots: ReadonlyArray<Metric.Metric.Snapshot>,
  id: string,
): FrequencySnapshot | undefined =>
  snapshots.find((s): s is FrequencySnapshot => s.type === "Frequency" && s.id === id);

describe("qadi_audit_writes_total", () => {
  it.effect("carries its documented description", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const rows = counters(snapshots, "qadi_audit_writes_total");
      assert.strictEqual(rows[0]?.description, "SinkRecords the audit pipeline received, tagged by outcome.");
    }));
});

describe("qadi_audit_circuit_breaker_transitions_total", () => {
  // Issue #107: the `0 = Closed, 1 = HalfOpen, 2 = Open` gauge this describe
  // block used to assert on is gone, replaced by this one tagged frequency
  // (`CircuitBreaker.ts`'s own doc comment on `transitionsTotal` explains the
  // trade). "Current state" is still checked below, through
  // `AuditDecisionSinkLive`'s own `breaker.status` read where a test needs
  // it — the channel that trade-off comment says is the right one for that
  // question, not a metrics-registry snapshot.

  it.effect("tripping to Open counts exactly one transition to 'Open'", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const transitions = frequencyOf(snapshots, "qadi_audit_circuit_breaker_transitions_total");
      assert.strictEqual(transitions?.state.occurrences.get("Open"), 1);
    }));

  it.effect(
    "the breaker also trips on a write defect, not just a typed AuditWriteError (ticket #47)",
    () =>
      Effect.gen(function* () {
        // Every write dies rather than failing with the port's own typed
        // error — before ticket #47, `Effect.result` around `trailPort.write`
        // let this unwind past `breaker.recordFailure` entirely, so the
        // breaker would never trip no matter how unhealthy the store was.
        const brokenTrail = Layer.succeed(AuditTrailPort, {
          write: () => Effect.die(new Error("caller's trail store bug")),
        });

        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const sink = yield* DecisionSink;
            for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
            return yield* Metric.snapshot;
          }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), brokenTrail))),
        );

        const transitions = frequencyOf(snapshots, "qadi_audit_circuit_breaker_transitions_total");
        assert.strictEqual(transitions?.state.occurrences.get("Open"), 1);
      }),
  );

  it.effect("carries its documented description, and every status is pre-registered at zero", () =>
    Effect.gen(function* () {
      // A single trip to Open is what materializes the metric in this test's
      // isolated registry at all — `Metric.update` is what registers a metric
      // Effect's own registry, not merely being defined at module scope, so a
      // breaker that never transitions (the sibling test below) never
      // populates this frequency's entry either. Once materialized,
      // `preregisteredWords` is what puts `Closed`/`HalfOpen` in the snapshot
      // at zero alongside the one word that actually fired.
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const transitions = frequencyOf(snapshots, "qadi_audit_circuit_breaker_transitions_total");
      assert.strictEqual(
        transitions?.description,
        "Circuit breaker state transitions, by the state transitioned to.",
      );
      assert.deepStrictEqual(
        [...(transitions?.state.occurrences.entries() ?? [])].sort(([a], [b]) => a.localeCompare(b)),
        [
          ["Closed", 0],
          ["HalfOpen", 0],
          ["Open", 1],
        ],
      );
    }));

  it.effect("closing from half-open counts a transition to 'HalfOpen' and one to 'Closed'", () =>
    Effect.gen(function* () {
      // Only the first five writes fail — the recovery write must succeed,
      // or the breaker reopens instead of closing.
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) =>
          entry.record.evaluationId.startsWith("fail-")
            ? new AuditWriteError({ entry, cause: "offline" })
            : undefined,
      });

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
          yield* TestClock.adjust("30 seconds");
          // A status read transitions Open -> HalfOpen; the next successful
          // write then closes it.
          yield* sink.record(decisionRecord({ evaluationId: "recovers" }));
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const transitions = frequencyOf(snapshots, "qadi_audit_circuit_breaker_transitions_total");
      assert.strictEqual(transitions?.state.occurrences.get("HalfOpen"), 1);
      assert.strictEqual(transitions?.state.occurrences.get("Closed"), 1);
    }));

  it.effect("a success on an already-closed breaker announces no transition at all", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();

      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      // `announceTransition` never ran at all — not even once, to record a
      // zero — so the metric was never touched in this test's isolated
      // registry and does not appear in the snapshot. See the "documented
      // description" test above for the case where it does.
      const transitions = frequencyOf(snapshots, "qadi_audit_circuit_breaker_transitions_total");
      assert.isUndefined(transitions);
    }));
});

describe("qadi_audit_staging_total", () => {
  it.effect("carries its documented description", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const { layer: staging } = AuditStagingPortTest();
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging)))),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      assert.strictEqual(rows[0]?.description, "AuditStagingPort.stage attempts, tagged by outcome.");
    }));
});

describe("qadi_audit_entries_lost_total", () => {
  it.effect("carries its documented description", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
          return yield* Metric.snapshot;
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const rows = counters(snapshots, "qadi_audit_entries_lost_total");
      assert.strictEqual(rows[0]?.description, "Audit entries in neither the trail nor staging, by what failed.");
    }));

  const base: ExitSpec = { wired: false, open: false, encode: "ok", stage: "ok", write: "ok", commit: "ok" };
  const cases: ReadonlyArray<{ readonly name: string; readonly spec: ExitSpec; readonly labels: ReadonlyArray<string> }> = [
    { name: "unwired, write failed", spec: { ...base, write: "fail" }, labels: ["write_failed/not_wired"] },
    { name: "unwired, breaker open", spec: { ...base, open: true }, labels: ["skipped_open/not_wired"] },
    {
      name: "wired, stage and write failed",
      spec: { ...base, wired: true, stage: "fail", write: "fail" },
      labels: ["write_failed/failed"],
    },
    {
      name: "wired, breaker open, stage failed",
      spec: { ...base, wired: true, open: true, stage: "fail" },
      labels: ["skipped_open/failed"],
    },
    { name: "wired, staged, write failed (recoverable)", spec: { ...base, wired: true, write: "fail" }, labels: [] },
    { name: "wired, breaker open, staged (recoverable)", spec: { ...base, wired: true, open: true }, labels: [] },
    { name: "written (never lost)", spec: base, labels: [] },
  ];
  for (const c of cases) {
    it.effect(`${c.name}: moves ${c.labels.length === 0 ? "nothing" : c.labels.join(", ")}`, () =>
      driveExit(c.spec).pipe(Effect.map((observed) => assert.deepStrictEqual(observed.lostLabels, c.labels))),
    );
  }
});
