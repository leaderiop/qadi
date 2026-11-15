/**
 * Pins that a breaker or audit sink option that cannot work is refused when it is built.
 *
 * On the phase base `failureThreshold: NaN` built a breaker that never opened
 * (`consecutiveFailures >= NaN` is false), and a zero, negative or non-finite
 * duration was accepted or died with a defect. Each bad value is one row, so a
 * value the checks miss is a named failure rather than a gap in a loop.
 *
 * The rows were written before the error class existed, so their RED was the
 * behaviour's, not the compiler's; the assertions now name `InvalidAuditSinkOption`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Option from "effect/Option";
import { DecisionSink } from "@qadi/core";
import { makeCircuitBreaker } from "../src/CircuitBreaker.ts";
import type { CircuitBreakerOptions } from "../src/CircuitBreaker.ts";
import { AuditDecisionSinkLive } from "../src/AuditDecisionSinkLive.ts";
import type { AuditDecisionSinkOptions } from "../src/AuditDecisionSinkLive.ts";
import { AuditTrailPortTest } from "../src/AuditTrailPortTest.ts";
import { InvalidAuditSinkOption } from "../src/InvalidAuditSinkOption.ts";
import type { AuditWriteOutcome } from "../src/AuditWriteOutcome.ts";
import { decisionRecord } from "./helpers.ts";

const OPTIONS = { failureThreshold: 3, resetTimeoutMs: 10_000 };

/** The refusal's shape: the typed failure is an `InvalidAuditSinkOption` naming the option and the raw value received. */
const assertRefusal = (cause: Cause.Cause<unknown>, option: string, received: unknown, message?: string) => {
  const found = Cause.findErrorOption(cause);
  assert.isTrue(Option.isSome(found), "the cause holds a typed failure");
  if (Option.isSome(found)) {
    assert.instanceOf(found.value, InvalidAuditSinkOption);
    if (found.value instanceof InvalidAuditSinkOption) {
      assert.strictEqual(found.value.option, option);
      assert.isTrue(Object.is(found.value.received, received), `received is ${String(received)}`);
      if (message !== undefined) assert.strictEqual(found.value.message, message);
    }
  }
};

/**
 * Passes only when construction fails with the refusal. A breaker that builds is
 * driven through ten admitted failures, so the message says what it would have done.
 */
const refusedByBreaker = (options: CircuitBreakerOptions, option: string, received: unknown, message?: string) =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(makeCircuitBreaker(options));
    if (Exit.isFailure(exit)) return assertRefusal(exit.cause, option, received, message);
    const breaker = exit.value;
    for (let n = 0; n < 10; n++) {
      yield* breaker.withPermit((permit) =>
        permit._tag === "Admitted" ? permit.attempt(Effect.fail("offline")).pipe(Effect.asVoid) : Effect.void,
      );
    }
    const first = yield* breaker.status;
    const second = yield* breaker.status;
    return assert.fail(`built a breaker that reads ${first} then ${second} after 10 consecutive failures`);
  });

const acceptedByBreaker = (options: CircuitBreakerOptions) =>
  Effect.gen(function* () {
    const exit = yield* Effect.exit(makeCircuitBreaker(options));
    assert.isTrue(Exit.isSuccess(exit), "the breaker is built");
    if (Exit.isSuccess(exit)) assert.strictEqual(yield* exit.value.status, "Closed");
  });

/** A sink over a healthy trail, with every outcome collected in order. */
const sinkOver = (options: AuditDecisionSinkOptions) => {
  const outcomes: Array<AuditWriteOutcome> = [];
  const layer = Layer.provide(
    AuditDecisionSinkLive({ ...options, onOutcome: (outcome) => outcomes.push(outcome) }),
    AuditTrailPortTest().layer,
  );
  return { layer, outcomes };
};

const recordOnce = DecisionSink.use((sink) => sink.record(decisionRecord()));

const refusedBySink = (options: AuditDecisionSinkOptions, option: string, received: unknown, message?: string) =>
  Effect.gen(function* () {
    const sink = sinkOver(options);
    const exit = yield* Effect.exit(recordOnce.pipe(Effect.provide(sink.layer)));
    if (Exit.isFailure(exit)) return assertRefusal(exit.cause, option, received, message);
    return assert.fail(`built a sink whose first record ended ${sink.outcomes.map((o) => o._tag).join(", ")}`);
  });

const acceptedBySink = (options: AuditDecisionSinkOptions) =>
  Effect.gen(function* () {
    const sink = sinkOver(options);
    const exit = yield* Effect.exit(recordOnce.pipe(Effect.provide(sink.layer)));
    assert.isTrue(Exit.isSuccess(exit), "the sink is built and records");
    assert.deepStrictEqual(
      sink.outcomes.map((o) => o._tag),
      ["Written"],
    );
  });

describe("makeCircuitBreaker refuses an option that cannot work (BRKR-03)", () => {
  it.effect("failureThreshold NaN is refused when built", () =>
    refusedByBreaker(
      { ...OPTIONS, failureThreshold: Number.NaN },
      "failureThreshold",
      Number.NaN,
      "failureThreshold must be a positive whole number; received NaN",
    ));
  it.effect("failureThreshold Infinity is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, failureThreshold: Infinity }, "failureThreshold", Infinity));
  it.effect("failureThreshold -Infinity is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, failureThreshold: -Infinity }, "failureThreshold", -Infinity));
  it.effect("failureThreshold 0 is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, failureThreshold: 0 }, "failureThreshold", 0));
  it.effect("failureThreshold -1 is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, failureThreshold: -1 }, "failureThreshold", -1));
  it.effect("failureThreshold 2.5 is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, failureThreshold: 2.5 }, "failureThreshold", 2.5));
  it.effect("failureThreshold 1 is accepted", () => acceptedByBreaker({ ...OPTIONS, failureThreshold: 1 }));
  it.effect("resetTimeoutMs NaN is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: Number.NaN }, "resetTimeoutMs", Number.NaN));
  it.effect("resetTimeoutMs Infinity is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: Infinity }, "resetTimeoutMs", Infinity));
  it.effect("resetTimeoutMs -Infinity is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: -Infinity }, "resetTimeoutMs", -Infinity));
  it.effect("resetTimeoutMs 0 is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: 0 }, "resetTimeoutMs", 0));
  it.effect("resetTimeoutMs -1 is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: -1 }, "resetTimeoutMs", -1));
  it.effect("resetTimeoutMs 1.5 is refused when built", () =>
    refusedByBreaker(
      { ...OPTIONS, resetTimeoutMs: 1.5 },
      "resetTimeoutMs",
      1.5,
      "resetTimeoutMs must be a finite, positive, whole number of milliseconds; received 1.5",
    ));
  it.effect("resetTimeoutMs 1n (one nanosecond) is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: 1n }, "resetTimeoutMs", 1n));
  it.effect("resetTimeoutMs '1e3 seconds' is refused when built", () =>
    refusedByBreaker({ ...OPTIONS, resetTimeoutMs: "1e3 seconds" }, "resetTimeoutMs", "1e3 seconds"));
  it.effect("resetTimeoutMs 1 is accepted", () => acceptedByBreaker({ ...OPTIONS, resetTimeoutMs: 1 }));
  it.effect("resetTimeoutMs 2_000_000n (two milliseconds) is accepted", () =>
    acceptedByBreaker({ ...OPTIONS, resetTimeoutMs: 2_000_000n }));
});

describe("AuditDecisionSinkLive refuses an option that cannot work (BRKR-03)", () => {
  it.effect("failureThreshold NaN is refused when the layer is built", () =>
    refusedBySink({ failureThreshold: Number.NaN }, "failureThreshold", Number.NaN));
  it.effect("resetTimeoutMs NaN is refused when the layer is built", () =>
    refusedBySink({ resetTimeoutMs: Number.NaN }, "resetTimeoutMs", Number.NaN));
  it.effect("storeCallTimeout NaN is refused when the layer is built", () =>
    refusedBySink({ storeCallTimeout: Number.NaN }, "storeCallTimeout", Number.NaN));
  it.effect("storeCallTimeout -Infinity is refused when the layer is built", () =>
    refusedBySink({ storeCallTimeout: -Infinity }, "storeCallTimeout", -Infinity));
  it.effect("storeCallTimeout 0 is refused when the layer is built", () =>
    refusedBySink(
      { storeCallTimeout: 0 },
      "storeCallTimeout",
      0,
      "storeCallTimeout must be a positive duration, or Duration.infinity for no deadline; received 0",
    ));
  it.effect("storeCallTimeout -1 is refused when the layer is built", () =>
    refusedBySink({ storeCallTimeout: -1 }, "storeCallTimeout", -1));
  it.effect("storeCallTimeout '1e3 seconds' is refused when the layer is built", () =>
    refusedBySink({ storeCallTimeout: "1e3 seconds" }, "storeCallTimeout", "1e3 seconds"));
  it.effect("storeCallTimeout 1 is accepted", () => acceptedBySink({ storeCallTimeout: 1 }));
  it.effect("storeCallTimeout Duration.infinity is accepted (no deadline)", () =>
    acceptedBySink({ storeCallTimeout: Duration.infinity }));
});
