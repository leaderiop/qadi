import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Latch from "effect/Latch";
import * as Layer from "effect/Layer";
import * as Logger from "effect/Logger";
import * as References from "effect/References";
import * as TestClock from "effect/testing/TestClock";
import { DecisionSink } from "@qadi/core";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditEntryNotEncodable } from "../src/AuditEntry.ts";
import { AuditTrailPort, AuditWriteError } from "../src/AuditTrailPort.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { AuditStagingError, AuditStagingPort } from "../src/AuditStagingPort.ts";
import { AuditStagingPortTest } from "../src/AuditStagingPortTest.ts";
import { decisionRecord, failedWithCause, httpClientError, obligationRecord } from "./helpers.ts";

describe("AuditDecisionSinkLive — the assembled pipeline", () => {
  it.effect("a DecisionRecord writes through to the trail port", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "e1" }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

      assert.strictEqual(written().length, 1);
      assert.strictEqual(written()[0]?.record.evaluationId, "e1");
    }));

  it.effect("rows are written as wire version 2", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "e1" }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));
      const record = written()[0]?.record;
      assert.strictEqual(record !== undefined && "version" in record ? record.version : undefined, 2);
    }));

  it.effect("an ObligationRecord writes through too", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(obligationRecord({ evaluationId: "e2" }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

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
        }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail))),
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
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

      assert.strictEqual(written().length, 0);
    }));

  it.effect("with staging wired, a successful write commits the staged entry", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const { layer: staging, staged, committed } = AuditStagingPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(
        Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
      );

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
      }).pipe(
        Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
      );

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
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

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
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

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
      }).pipe(
        Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
      );

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
      }).pipe(
        Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
      );

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
        Effect.provide(Layer.provideMerge(AuditDecisionSinkLive({ failureThreshold: 2 }), trail)),
      );
    }));

  it.effect("a record whose resource cannot be encoded is dropped before ever reaching the port", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ resource: { handler: () => "nope" } }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

      assert.strictEqual(written().length, 0);
    }));

  it.effect(
    "five poisoned Failed records do not trip the breaker for a JSON-text store; the next Decided record is written",
    () =>
      Effect.gen(function* () {
        // ARCH-09 C5: the store BEH-QD-250's prose describes — it persists
        // `JSON.stringify(entry)`, mapping a throw to `AuditWriteError`. A
        // cyclic resolver cause used to reach it, throw, and count as a store
        // failure; five of them opened the breaker and the healthy record
        // after them was dropped.
        const rows: Array<string> = [];
        const trail = Layer.succeed(AuditTrailPort, {
          write: (entry) =>
            Effect.try({
              try: () => {
                rows.push(JSON.stringify(entry));
              },
              catch: (cause) => new AuditWriteError({ entry, cause }),
            }),
        });

        yield* Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) {
            yield* sink.record(failedWithCause(httpClientError(), `poisoned-${i}`));
          }
          yield* sink.record(decisionRecord({ evaluationId: "healthy" }));
        }).pipe(
          Effect.provide(Layer.provideMerge(AuditDecisionSinkLive({ failureThreshold: 5 }), trail)),
        );

        assert.isTrue(rows.some((row) => row.includes('"evaluationId":"healthy"')));
        // Since the codec owns the encode, the poisoned records are not refused
        // either: each is written with its cause normalised, and the store's
        // JSON.stringify never throws, so the breaker never sees a failure.
        assert.strictEqual(rows.length, 6);
        assert.include(rows[0] ?? "", '"cause":{"name":"Error","message":"Request failed with status code 503"}');
      }),
  );

  it.effect("AuditTrailPort is a real Layer requirement, not optional like staging", () =>
    Effect.gen(function* () {
      // Type-level: AuditDecisionSinkLive's own signature requires AuditTrailPort
      // in R — this test documents the runtime symmetry with staging by
      // showing recording succeeds once it's actually provided.
      const { layer: trail, written } = AuditTrailPortTest();
      const program = Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord());
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));

      yield* program;
      assert.strictEqual(written().length, 1);
    }));

  it.effect(
    "an interrupted half-open probe releases its claim — H4 (ticket #38): a later probe " +
      "attempt is still possible, and the breaker doesn't wedge Open forever",
    () =>
      Effect.gen(function* () {
        let writeAttempts = 0;
        const probeStarted = yield* Latch.make();
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
              return probeStarted.open.pipe(Effect.flatMap(() => Effect.never));
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
          yield* probeStarted.await;
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
        }).pipe(
          Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
        );

        // The recovered write actually committed its staged entry — full
        // round-trip recovery, not just an unstuck status read. Staging
        // itself stays bounded: it only ever grew by the calls this test
        // made (interrupted probe + one open-window entry + the recovered
        // one), never by an ever-growing backlog with no path to durability.
        assert.strictEqual(committed().length, 1, "the recovered probe's entry committed");
        assert.isBelow(staged().length, 10, "staging did not grow unbounded while the breaker recovered");
      }),
  );

  it.effect(
    "a probe interrupted while staging releases its claim at once — the next probe comes " +
      "resetTimeoutMs later, not twice that",
    () =>
      Effect.gen(function* () {
        let writeAttempts = 0;
        const stageStarted = yield* Latch.make();
        const trail = Layer.succeed(AuditTrailPort, {
          write: (entry) => {
            writeAttempts++;
            return writeAttempts <= 5
              ? Effect.fail(new AuditWriteError({ entry, cause: "offline" }))
              : Effect.void;
          },
        });
        const staging = Layer.succeed(AuditStagingPort, {
          stage: (entry) =>
            entry.record.evaluationId === "probe"
              ? stageStarted.open.pipe(Effect.andThen(Effect.never))
              : Effect.succeed(0),
          commit: () => Effect.void,
        });
        yield* Effect.gen(function* () {
          const sink = yield* DecisionSink;
          for (let i = 0; i < 5; i++) {
            yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
          }
          yield* TestClock.adjust("30 seconds");
          const probe = yield* Effect.forkChild(
            sink.record(decisionRecord({ evaluationId: "probe" })),
          );
          yield* stageStarted.await; // the claim is held; staging is in flight
          yield* Fiber.interrupt(probe);
          yield* TestClock.adjust("30 seconds");
          yield* sink.record(decisionRecord({ evaluationId: "recovered" }));
          assert.strictEqual(
            writeAttempts,
            6,
            "a fresh probe is admitted one resetTimeoutMs after the interrupt",
          );
        }).pipe(
          Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, staging))),
        );
      }),
  );

  // The review of ARCH-07 suspected a failed probe write could leave the half-open claim
  // held forever. It cannot: `Effect.exit` folds the failure into `recordFailure`, whose
  // `HalfOpen` branch reopens the breaker and clears `probeClaimed` itself. These two
  // tests pin that, for a typed failure and for a defect.
  for (const [label, failProbe] of [
    ["a typed AuditWriteError", (entry: Parameters<AuditTrailPort["Service"]["write"]>[0]) =>
      Effect.fail(new AuditWriteError({ entry, cause: "offline" }))],
    ["a defect", () => Effect.die(new Error("caller's trail store bug"))],
  ] as const) {
    it.effect(
      `a half-open probe whose write fails with ${label} reopens the breaker and a fresh probe ` +
        "follows one resetTimeoutMs later — no wedge",
      () =>
        Effect.gen(function* () {
          let writeAttempts = 0;
          const trail = Layer.succeed(AuditTrailPort, {
            write: (entry) => {
              writeAttempts++;
              if (writeAttempts <= 5) {
                return Effect.fail(new AuditWriteError({ entry, cause: "offline" }));
              }
              return writeAttempts === 6 ? failProbe(entry) : Effect.void;
            },
          });
          yield* Effect.gen(function* () {
            const sink = yield* DecisionSink;
            for (let i = 0; i < 5; i++) {
              yield* sink.record(decisionRecord({ evaluationId: `fail-${i}` }));
            }
            yield* TestClock.adjust("30 seconds");
            yield* sink.record(decisionRecord({ evaluationId: "probe-fails" }));
            assert.strictEqual(writeAttempts, 6);
            yield* sink.record(decisionRecord({ evaluationId: "still-open" }));
            assert.strictEqual(writeAttempts, 6, "reopened: no write is attempted");
            yield* TestClock.adjust("30 seconds");
            yield* sink.record(decisionRecord({ evaluationId: "probe-2" }));
            assert.strictEqual(writeAttempts, 7, "a fresh probe is admitted");
            yield* sink.record(decisionRecord({ evaluationId: "closed" }));
            assert.strictEqual(writeAttempts, 8, "the probe succeeded, so the breaker closed");
          }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), trail)));
        }),
    );
  }

  it.effect("an adapter that interrupts itself is a write failure and trips the breaker", () =>
    Effect.gen(function* () {
      let writeAttempts = 0;
      const trail = Layer.succeed(AuditTrailPort, {
        write: () => {
          writeAttempts++;
          return Effect.interrupt;
        },
      });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        for (let i = 0; i < 3; i++) yield* sink.record(decisionRecord({ evaluationId: `i-${i}` }));
        assert.strictEqual(writeAttempts, 2, "the third record is skipped: the breaker is open");
      }).pipe(
        Effect.provide(
          Layer.provideMerge(AuditDecisionSinkLive({ failureThreshold: 2 }), trail),
        ),
      );
    }));

  it.effect("a caller's interruption of a Closed-state write is not a store failure", () =>
    Effect.gen(function* () {
      let writeAttempts = 0;
      const started = [yield* Latch.make(), yield* Latch.make()];
      const trail = Layer.succeed(AuditTrailPort, {
        write: () => {
          writeAttempts++;
          const latch = started[writeAttempts - 1];
          return latch === undefined ? Effect.void : latch.open.pipe(Effect.andThen(Effect.never));
        },
      });
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        for (const [i, latch] of started.entries()) {
          const fiber = yield* Effect.forkChild(
            sink.record(decisionRecord({ evaluationId: `c-${i}` })),
          );
          yield* latch.await;
          yield* Fiber.interrupt(fiber);
        }
        yield* sink.record(decisionRecord({ evaluationId: "third" }));
        assert.strictEqual(writeAttempts, 3, "two caller interruptions did not trip the breaker");
      }).pipe(
        Effect.provide(
          Layer.provideMerge(AuditDecisionSinkLive({ failureThreshold: 2 }), trail),
        ),
      );
    }));
});

describe("AuditDecisionSinkLive — an encode refusal is observable", () => {
  const capture = () => {
    const logs: Array<{ message: unknown; annotations: Record<string, unknown> }> = [];
    const layer = Logger.layer([
      Logger.make((o) => {
        logs.push({ message: o.message, annotations: o.fiber.getRef(References.CurrentLogAnnotations) });
      }),
    ]);
    return { logs, layer };
  };

  it.effect("a refused record is logged with its refusal, path and evaluationId; no row is written", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      const { logs, layer: logger } = capture();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "poisoned", resource: { tags: new Set(["finance"]) } }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, logger))));

      assert.strictEqual(written().length, 0);
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "could not be encoded for the audit trail");
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "Opaque");
      assert.strictEqual(logs[0]?.annotations["qadi.path"], "resource.tags");
      assert.strictEqual(logs[0]?.annotations["evaluationId"], "poisoned");
    }));

  it.effect("onRefused receives the refusal once and replaces the warning", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      const { logs, layer: logger } = capture();
      const seen: Array<AuditEntryNotEncodable> = [];

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "poisoned", resource: { tags: new Set(["finance"]) } }));
      }).pipe(
        Effect.provide(
          Layer.provideMerge(AuditDecisionSinkLive({ onRefused: (r) => void seen.push(r) }), Layer.mergeAll(trail, logger)),
        ),
      );

      assert.strictEqual(written().length, 0);
      assert.strictEqual(logs.length, 0);
      assert.strictEqual(seen.length, 1);
      assert.strictEqual(seen[0]?.evaluationId, "poisoned");
      assert.strictEqual(seen[0]?.refusal._tag, "Opaque");
      assert.strictEqual(seen[0]?.reason, "resource.tags: a Set has no JSON form");
    }));

  it.effect("a throwing onRefused is logged, and the next healthy record is still written", () =>
    Effect.gen(function* () {
      const { layer: trail, written } = AuditTrailPortTest();
      const { logs, layer: logger } = capture();

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "poisoned", resource: { tags: new Set(["finance"]) } }));
        yield* sink.record(decisionRecord({ evaluationId: "healthy" }));
      }).pipe(
        Effect.provide(
          Layer.provideMerge(
            AuditDecisionSinkLive({
              onRefused: () => {
                throw new Error("hook bug");
              },
            }),
            Layer.mergeAll(trail, logger),
          ),
        ),
      );

      assert.deepStrictEqual(written().map((e) => e.record.evaluationId), ["healthy"]);
      assert.strictEqual(logs.length, 1);
      assert.include(String(logs[0]?.message), "hook threw");
      assert.strictEqual(logs[0]?.annotations["evaluationId"], "poisoned");
    }));

  it.effect("a refusal with no path (EncodeFailed) logs an empty path and never the getter's text", () =>
    Effect.gen(function* () {
      const { layer: trail } = AuditTrailPortTest();
      const { logs, layer: logger } = capture();
      const hostile = {
        get boom(): unknown {
          throw new Error("sentinel-getter-text");
        },
      };

      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(decisionRecord({ evaluationId: "hostile", resource: { nested: hostile } }));
      }).pipe(Effect.provide(Layer.provideMerge(AuditDecisionSinkLive(), Layer.mergeAll(trail, logger))));

      assert.strictEqual(logs.length, 1);
      assert.strictEqual(logs[0]?.annotations["qadi.refusal"], "EncodeFailed");
      assert.strictEqual(logs[0]?.annotations["qadi.path"], "");
      assert.notInclude(JSON.stringify([logs[0]?.message, logs[0]?.annotations]), "sentinel-getter-text");
    }));
});
