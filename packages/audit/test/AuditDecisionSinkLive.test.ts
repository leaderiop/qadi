import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { decisionRecord, obligationRecord } from "./helpers.ts";

describe("AuditDecisionSinkLive — the assembled pipeline", () => {
  it.effect("a DecisionRecord writes through to the trail port", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "e1" }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written().length, 1);
      assert.strictEqual(written()[0]?.record.evaluationId, "e1");
    }));

  it.effect("an ObligationRecord writes through too", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(obligationRecord({ evaluationId: "e2" }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written()[0]?.record._tag, "Obligations");
    }));

  it.effect("DecisionSink.record never fails, even when the trail port write fails", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      const result = yield* Effect.result(
        Effect.gen(function* () {
          const sink = yield* DecisionSink;
          yield* sink.record(decisionRecord());
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail)),
      );

      assert.strictEqual(result._tag, "Success");
    }));

  it.effect("without staging wired, a write failure simply isn't recorded, and nothing throws", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written().length, 0);
    }));

  it.effect("with staging wired, a successful write commits the staged entry", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const { layer: staging, staged, committed } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging));

      assert.strictEqual(staged().length, 0);
      assert.strictEqual(committed().length, 1);
    }));

  it.effect("with staging wired, a write failure leaves the staged entry un-discarded", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });
      const { layer: staging, staged, committed } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging));

      assert.strictEqual(staged().length, 1);
      assert.strictEqual(committed().length, 0);
    }));

  it.effect("once the breaker trips, write() is never attempted again until reset", () =>
    Effect.gen(function* () {
      let writeAttempts = 0;
      const { layer: trail, written } = AuditTrailPortTest({
        failWith: (entry) => {
          writeAttempts++;
          return new AuditWriteError({ entry, cause: "offline" });
        },
      });

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        // failureThreshold defaults to 5.
        for (let i = 0; i < 5; i++) {
          yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
        }
        assert.strictEqual(writeAttempts, 5);

        // The breaker is now open — further records must not attempt write().
        yield* sink.record(decisionRecord({ evaluationId: "skipped-1" }));
        yield* sink.record(decisionRecord({ evaluationId: "skipped-2" }));
        assert.strictEqual(writeAttempts, 5);
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written().length, 0);
    }));

  it.effect("while open, an unwired deployment genuinely loses the entry", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        for (let i = 0; i < 5; i++) {
          yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
        }
        // Open now; this one is dropped, not staged (nothing to stage into).
        yield* sink.record(decisionRecord({ evaluationId: "lost" }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written().length, 0);
    }));

  it.effect("while open, a staged deployment keeps the entry recoverable", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });
      const { layer: staging, staged } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        for (let i = 0; i < 5; i++) {
          yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
        }
        // Open now; write() is skipped but stage() still runs.
        yield* sink.record(decisionRecord({ evaluationId: "recoverable" }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging));

      // 5 failed-write stages (left un-discarded) + 1 open-skip stage.
      assert.strictEqual(staged().length, 6);
    }));

  it.effect("a custom failureThreshold is honored", () =>
    Effect.gen(function* () {
      let writeAttempts = 0;
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => {
          writeAttempts++;
          return new AuditWriteError({ entry, cause: "offline" });
        },
      });

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "a" }));
        yield* sink.record(decisionRecord({ evaluationId: "b" }));
        // Breaker should now be open with failureThreshold: 2.
        yield* sink.record(decisionRecord({ evaluationId: "c" }));
        assert.strictEqual(writeAttempts, 2);
      }).pipe(
        Effect.provide(AuditDecisionSinkLive({ failureThreshold: 2 })),
        Effect.provide(trail),
      );
    }));

  it.effect("a record whose resource cannot be encoded is dropped before ever reaching the port", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ resource: { handler: () => "nope" } }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      assert.strictEqual(written().length, 0);
    }));

  it.effect("AuditTrailPort is a real Layer requirement, not optional like staging", () =>
    Effect.gen(function* () {
      // Type-level: AuditDecisionSinkLive's own signature requires AuditTrailPort
      // in R — this test documents the runtime symmetry with staging by
      // showing recording succeeds once it's actually provided.
      const { layer: trail, written } = AuditTrailPortTest();
      const program = Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail));

      yield* program;
      assert.strictEqual(written().length, 1);
    }));
});
