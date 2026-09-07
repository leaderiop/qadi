import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditStagingError } from "../src/AuditStagingPort.ts";
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

  it.effect("while open, a staging failure is a genuine, unrecoverable loss too", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest({
        failWith: (entry) => new AuditWriteError({ entry, cause: "offline" }),
      });
      const { layer: staging, staged, committed } = AuditStagingPortTest({
        failStageWith: (entry) =>
          entry.record.evaluationId === "lost"
            ? new AuditStagingError({ entry, cause: "staging offline" })
            : undefined,
      });

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        for (let i = 0; i < 5; i++) {
          yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
        }
        // Open now; stage() also fails, so this entry has nowhere to land.
        yield* sink.record(decisionRecord({ evaluationId: "lost" }));
      }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging));

      // The 5 failed-write entries staged normally; "lost" never made it.
      assert.strictEqual(staged().length, 5);
      assert.strictEqual(committed().length, 0);
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

  it.effect(
    "an interrupted half-open probe releases its claim — H4 (ticket #38): a later probe " +
      "attempt is still possible, and the breaker doesn't wedge Open forever",
    () =>
      Effect.gen(function* () {
        let writeAttempts = 0;
        const probeStarted = yield* Deferred.make<void>();
        // Only write attempt 6 — the half-open probe, once the breaker has
        // tripped on the default failureThreshold of 5 — hangs, standing in
        // for a client disconnect / `Effect.timeout` cutting the write off
        // mid-flight. `probeStarted` lets the test wait until the probe
        // genuinely holds the claim, not merely forked.
        const trail = Layer.succeed(AuditTrailPort, {
          write: (entry) => {
            writeAttempts++;
            if (writeAttempts <= 5) {
              return Effect.fail(new AuditWriteError({ entry, cause: "offline" }));
            }
            if (writeAttempts === 6) {
              return Deferred.succeed(probeStarted, undefined).pipe(
                Effect.flatMap(() => Effect.never),
              );
            }
            return Effect.void;
          },
        });
        const { layer: staging, staged, committed } = AuditStagingPortTest();

        yield* Effect.gen(function* () {
          const sink = yield* DecisionSink;

          // Trip the breaker: failureThreshold (default 5) consecutive
          // failures.
          for (let i = 0; i < 5; i++) {
            yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
          }
          // Past resetTimeoutMs (default 30 000ms): the next status read
          // moves Open -> HalfOpen.
          yield* TestClock.adjust("30 seconds");

          // The probe write, forked so the test can interrupt it mid-flight
          // — exactly the shape a client disconnect or `Effect.timeout`
          // wrapping `sink.record` produces in production.
          const probeFiber = yield* Effect.forkChild(
            sink.record(decisionRecord({ evaluationId: "probe" })),
          );
          yield* Deferred.await(probeStarted);
          yield* Fiber.interrupt(probeFiber);

          // Under the bug, `claimProbe` is never released: `status` stays
          // wedged at `"HalfOpen"` forever, so every later call loses
          // `claimProbe`, re-reads `status` as still `"HalfOpen"` (not
          // `"Closed"`), and treats itself as `Open` — no write is ever
          // attempted again, no matter how long the backend has recovered.
          yield* sink.record(decisionRecord({ evaluationId: "still-recovering" }));
          assert.strictEqual(
            writeAttempts,
            6,
            "immediately after the interrupted probe, the reopened breaker still honors resetTimeoutMs",
          );

          // Once resetTimeoutMs elapses again, a fresh half-open window — and
          // a fresh probe — must be reachable. Under the bug this call would
          // never attempt write() at all, and writeAttempts would stay at 6.
          yield* TestClock.adjust("30 seconds");
          yield* sink.record(decisionRecord({ evaluationId: "recovered" }));
          assert.strictEqual(writeAttempts, 7, "a later probe attempt is still possible");
        }).pipe(Effect.provide(AuditDecisionSinkLive()), Effect.provide(trail), Effect.provide(staging));

        // The recovered write actually committed its staged entry — full
        // round-trip recovery, not just an unstuck status read. Staging
        // itself stays bounded: it only ever grew by the calls this test
        // made (interrupted probe + one open-window entry + the recovered
        // one), never by an ever-growing backlog with no path to durability.
        assert.strictEqual(committed().length, 1, "the recovered probe's entry committed");
        assert.isBelow(staged().length, 10, "staging did not grow unbounded while the breaker recovered");
      }),
  );
});
