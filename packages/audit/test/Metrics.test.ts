import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as Metric from "effect/Metric";
import * as References from "effect/References";
import * as TestClock from "effect/testing/TestClock";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { AuditStagingError, AuditStagingPort } from "../src/AuditStagingPort.ts";
import { decisionRecord, isolatedMetrics } from "./helpers.ts";

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
  it.effect("a successful write is tagged 'written'", () =>
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
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
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
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const rows = counters(snapshots, "qadi_audit_writes_total");
      const failed = rows.find((r) => r.attributes?.outcome === "write_failed");
      assert.isDefined(failed);
      assert.strictEqual(failed?.state.count, 1);
    }));

  it.effect(
    "a write defect — not just a typed AuditWriteError — is tagged 'write_failed', never silent (ticket #47)",
    () =>
      Effect.gen(function* () {
        // A caller's own bug (a thrown error, not the port's typed
        // `AuditWriteError`), the same class of thing `trailPort.commit`'s
        // `Effect.catchCause` already guards against below. Before ticket
        // #47, `record()` ran `trailPort.write` under `Effect.result`, which
        // only catches the typed `E` channel — a defect unwound straight
        // past both `writesWriteFailed` and the breaker's `recordFailure`.
        const brokenTrail = Layer.succeed(AuditTrailPort, {
          write: () => Effect.die(new Error("caller's trail store bug")),
        });

        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const sink = yield* DecisionSink;
            yield* sink.record(decisionRecord());
            return yield* Metric.snapshot;
          }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), brokenTrail))),
        );

        // record() itself must not defect — Metric.snapshot above only ran
        // because the whole pipeline completed normally.
        const rows = counters(snapshots, "qadi_audit_writes_total");
        const failed = rows.find((r) => r.attributes?.outcome === "write_failed");
        assert.isDefined(failed);
        assert.strictEqual(failed?.state.count, 1);
      }),
  );

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
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const skipped = rows.find((r) => r.attributes?.outcome === "skipped_open");
      assert.isDefined(skipped);
      assert.strictEqual(skipped?.state.count, 1);
    }));

  it.effect(
    "unwired and the breaker open also logs the actual drop warning, not just the metric",
    () =>
      Effect.gen(function* () {
        const { layer: trail } = AuditTrailPortTest({
          failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
        });
        const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];

        yield* Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 6; i++) yield* sink.record(decisionRecord({ evaluationId: `e-${i}` }));
        }).pipe(
          Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, Logger.layer([
              Logger.make((o) => {
                logs.push({
                  message: o.message,
                  annotations: o.fiber.getRef(References.CurrentLogAnnotations),
                });
              }),
            ])))),
        );

        // The metric alone (asserted above) would still pass if a mutant
        // deleted the `Effect.logWarning` call in AuditDecisionSinkLive.ts —
        // this pins the log itself, the 0.4.0 fix ticket #47 names. Exactly
        // one warning: the 6th record, dropped while the breaker is Open
        // and no staging port is wired.
        assert.strictEqual(logs.length, 1);
        const [entry] = logs;
        assert.isDefined(entry);
        if (entry === undefined) return;
        assert.include(String(entry.message), "circuit breaker open and no staging port wired");
        assert.strictEqual(entry.annotations["evaluationId"], "e-5");
      }),
  );

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
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging)))),
      );

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const failed = rows.find((r) => r.attributes?.outcome === "failed");
      assert.isDefined(failed);
      assert.strictEqual(failed?.state.count, 1);
      // The write itself still went through — staging is best-effort.
      assert.strictEqual(written().length, 1);
    }));

  it.effect(
    "a stage() defect — not just a typed AuditStagingError — is tagged 'failed', and never blocks " +
      "the write (ticket #47)",
    () =>
      Effect.gen(function* () {
        const { layer: trail, written } = AuditTrailPortTest();
        // A caller's own bug, not this package's error type — before ticket
        // #47, `record()` ran `stagingPort.stage` under `Effect.result`,
        // which only catches the typed `E` channel, so this used to unwind
        // straight past both branches below (`stagingFailed` and
        // `stagingFailedOpen`) rather than landing in either.
        const brokenStaging = Layer.succeed(AuditStagingPort, {
          stage: () => Effect.die(new Error("caller's staging store bug")),
          commit: () => Effect.void,
        });

        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const sink = yield* DecisionSink;
            yield* sink.record(decisionRecord());
            return yield* Metric.snapshot;
          }).pipe(
            Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, brokenStaging))),
          ),
        );

        const rows = counters(snapshots, "qadi_audit_staging_total");
        const failed = rows.find((r) => r.attributes?.outcome === "failed");
        assert.isDefined(failed);
        assert.strictEqual(failed?.state.count, 1);
        // The write itself still went through — staging is best-effort.
        assert.strictEqual(written().length, 1);
      }),
  );

  it.effect("wired and stage() succeeds is tagged 'staged'", () =>
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
        }).pipe(
          Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, brokenStaging))),
        ),
      );

      // The write itself still succeeded — a caller's commit bug must not
      // make record() itself fail or lose the row.
      assert.strictEqual(written().length, 1);

      const rows = counters(snapshots, "qadi_audit_staging_total");
      const commitFailed = rows.find((r) => r.attributes?.outcome === "commit_failed");
      assert.isDefined(commitFailed);
      assert.strictEqual(commitFailed?.state.count, 1);
    }));

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
