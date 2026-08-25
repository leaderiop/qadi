import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import { makeCircuitBreaker } from "../src/CircuitBreaker.ts";

/** Isolates one test's counts from the process-wide registry every other test shares. */
const isolatedMetrics = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(
    Effect.provideService(Metric.MetricRegistry, new Map()),
    Effect.provideService(Metric.CurrentMetricAttributes, { test: "isolated" }),
  );

type CounterSnapshot = Extract<Metric.Metric.Snapshot, { type: "Counter" }>;

const OPTIONS = { failureThreshold: 3, resetTimeoutMs: 10_000 };

describe("CircuitBreaker — threshold boundary, scripted rather than generated", () => {
  it.effect("stays closed at failureThreshold - 1 consecutive failures", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("trips open on exactly the failureThreshold-th consecutive failure", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("a success resets the consecutive-failure count", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordSuccess;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      // Two more failures after the reset — still short of three in a row.
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("stays open before resetTimeoutMs elapses", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("9999 millis");
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("transitions to half-open once resetTimeoutMs elapses, on the next status read", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
    }));

  it.effect("a success while half-open closes the breaker", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* breaker.recordSuccess;
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("a failure while half-open reopens the breaker", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* breaker.recordFailure;
      assert.strictEqual(yield* breaker.status, "Open");
    }));

  it.effect("reopening from half-open restarts the resetTimeoutMs window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      yield* breaker.recordFailure;
      yield* TestClock.adjust("9999 millis");
      assert.strictEqual(yield* breaker.status, "Open");
      yield* TestClock.adjust("1 milli");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
    }));

  it.effect("starts closed", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      assert.strictEqual(yield* breaker.status, "Closed");
    }));

  it.effect("a lone success on an already-closed breaker is a no-op", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordSuccess;
      assert.strictEqual(yield* breaker.status, "Closed");
    }));
});

describe("CircuitBreaker — concurrent record() calls (Qadi.ts's filter/filterStream fan-out)", () =>
  it.effect(
    "exactly failureThreshold consecutive failures trips it, even run concurrently — no lost update, no double-count",
    () =>
      Effect.gen(function* () {
        const snapshots = yield* isolatedMetrics(
          Effect.gen(function* () {
            const breaker = yield* makeCircuitBreaker({ failureThreshold: 25, resetTimeoutMs: 10_000 });

            yield* Effect.all(
              Array.from({ length: 25 }, () => breaker.recordFailure),
              { concurrency: "unbounded" },
            );

            // A lost update (two fibers reading the same stale count) would
            // leave this still Closed.
            assert.strictEqual(yield* breaker.status, "Open");
            return yield* Metric.snapshot;
          }),
        );

        // A double-counted transition — the other failure mode a non-atomic
        // read-compute-write allows — would inflate this past exactly one.
        const toOpen = snapshots.find(
          (s): s is CounterSnapshot =>
            s.type === "Counter" &&
            s.id === "qadi_audit_circuit_breaker_transitions_total" &&
            s.attributes?.to === "Open",
        );
        assert.strictEqual(toOpen?.state.count, 1);
      }),
  ));
