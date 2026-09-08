import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as TestClock from "effect/testing/TestClock";
import { makeCircuitBreaker } from "../src/CircuitBreaker.ts";
import { isolatedMetrics } from "./helpers.ts";

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

  it.effect(
    "a claimed probe that never releases (crash, or a caller that forgot) still ages out of half-open",
    () =>
      Effect.gen(function* () {
        // Defense-in-depth path (H4, ticket #38): if `releaseProbe`'s
        // `Effect.onExit` somehow never runs — the caller's process crashed
        // between claiming and running, say — the claim would otherwise wedge
        // `HalfOpen` forever. `status` itself ages a stale claim out once
        // `resetTimeoutMs` has elapsed since `halfOpenAt`, independent of
        // `releaseProbe` ever being called.
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* breaker.recordFailure;
        yield* breaker.recordFailure;
        yield* breaker.recordFailure;
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.isTrue(yield* breaker.claimProbe, "claim the one probe, then never release it");

        // Still within the window: the claim stands, nothing ages out yet.
        yield* TestClock.adjust("9999 millis");
        assert.strictEqual(yield* breaker.status, "HalfOpen");

        // Past resetTimeoutMs since halfOpenAt, with the claim never released:
        // the fallback in `status` reopens it rather than leaving it wedged.
        yield* TestClock.adjust("1 milli");
        assert.strictEqual(yield* breaker.status, "Open");

        // And the reopened window behaves like an ordinary Open→HalfOpen
        // transition — a fresh claim is available once it elapses again.
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");
        assert.isTrue(yield* breaker.claimProbe, "the aged-out window issues a fresh claim");
      }),
  );

  it.effect("claimProbe admits exactly one caller per half-open window, not the whole fan-out", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");

      // Ten concurrent callers, the Qadi.ts filter/filterStream fan-out
      // shape — without claimProbe every one of them would attempt a write
      // the instant the breaker reads HalfOpen.
      const claims = yield* Effect.all(
        Array.from({ length: 10 }, () => breaker.claimProbe),
        { concurrency: "unbounded" },
      );
      assert.strictEqual(claims.filter((c) => c).length, 1, "exactly one caller claims the probe");
    }));

  it.effect(
    "a lost claim's re-read can show Closed, not just HalfOpen or Open — ticket #46's disambiguation",
    () =>
      Effect.gen(function* () {
        const breaker = yield* makeCircuitBreaker(OPTIONS);
        yield* breaker.recordFailure;
        yield* breaker.recordFailure;
        yield* breaker.recordFailure;
        yield* TestClock.adjust("10 seconds");
        assert.strictEqual(yield* breaker.status, "HalfOpen");

        // Two concurrent record() calls would both have read "HalfOpen"
        // here; only one of them goes on to claim the probe.
        assert.isTrue(yield* breaker.claimProbe, "the prober claims the slot");
        assert.isFalse(yield* breaker.claimProbe, "a second caller's claim is refused");

        // The prober's write then succeeds, closing the breaker. A caller
        // who lost the claim and assumed "still HalfOpen, so behave as
        // Open" would be wrong the instant it re-reads status: it is
        // Closed, not HalfOpen or Open — the exact ambiguity
        // AuditDecisionSinkLive.ts's record() re-reads status to resolve.
        yield* breaker.recordSuccess;
        assert.strictEqual(yield* breaker.status, "Closed");
      }),
  );

  it.effect("claimProbe resets on the next half-open window, whichever direction closed the last one", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen"); // the read that performs the transition
      assert.isTrue(yield* breaker.claimProbe);
      assert.isFalse(yield* breaker.claimProbe, "already claimed for this window");

      // Reopen, then reach half-open again — a fresh window, a fresh probe.
      yield* breaker.recordFailure;
      yield* TestClock.adjust("10 seconds");
      assert.strictEqual(yield* breaker.status, "HalfOpen");
      assert.isTrue(yield* breaker.claimProbe, "a new half-open window admits a new probe");
    }));

  it.effect("claimProbe is false outside a half-open window", () =>
    Effect.gen(function* () {
      const breaker = yield* makeCircuitBreaker(OPTIONS);
      assert.isFalse(yield* breaker.claimProbe, "closed — nothing to claim");
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      yield* breaker.recordFailure;
      assert.isFalse(yield* breaker.claimProbe, "open, before resetTimeoutMs — nothing to claim yet");
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
