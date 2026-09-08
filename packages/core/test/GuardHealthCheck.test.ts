import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as TestClock from "effect/testing/TestClock";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { createGuardHealthCheck } from "../src/GuardHealthCheck.ts";
import * as M from "../src/Matcher.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const canRead = P.hasPermission(permission("doc", "read"));

describe("createGuardHealthCheck", () => {
  it.effect("healthy when the canary policy evaluates cleanly, allow or deny alike", () =>
    Effect.gen(function* () {
      const result = yield* createGuardHealthCheck(canRead);
      assert.isTrue(result.healthy);
      assert.deepStrictEqual(result.errors, []);
      assert.isNumber(result.checkedAt);
      assert.isAtLeast(result.latencyMillis, 0);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("checkedAt is the simulated clock's time, not wall-clock time", () =>
    Effect.gen(function* () {
      // Mirrors DecisionSink.test.ts's "`at` is the clock's start time" test:
      // `checkedAt`'s doc comment says it comes from `Clock` specifically for
      // TestClock reproducibility, and `assert.isNumber` alone would pass
      // identically whether the field came from `Clock` or `Date.now()`.
      yield* TestClock.adjust("5 seconds");
      const result = yield* createGuardHealthCheck(canRead);
      assert.strictEqual(result.checkedAt, 5000);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("unhealthy when the probed evaluation fails with a typed EvaluationError", () =>
    Effect.gen(function* () {
      // A resource-scoped policy with no resource supplied fails with
      // MissingResource — a wiring problem, not a clean deny.
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const result = yield* createGuardHealthCheck(policy);
      assert.isFalse(result.healthy);
      assert.deepStrictEqual(result.errors, ["MissingResource"]);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("options.resource reaches the probed evaluation, same as a real call", () =>
    Effect.gen(function* () {
      const policy = P.hasResourceAttribute("state", M.eq(M.literal("open")));
      const result = yield* createGuardHealthCheck(policy, { resource: { state: "open" } });
      assert.isTrue(result.healthy);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect(
    "a resolver that dies outright is reported unhealthy, not left to crash the probe",
    () => {
      // Corrected alongside issue #100 (BEH-QD-261): this pinned the opposite
      // claim before — that a dying resolver was *not* caught here and
      // crashed the probe as a defect. `Evaluate.ts`'s five port calls now
      // convert a defect into that port's own typed `EvaluationError` before
      // it ever reaches this function, so a probe against a broken port now
      // reports `healthy: false` exactly as it does for a port that fails
      // cleanly — an operator polling this learns the resolver is broken
      // instead of the health check itself dying.
      const dying: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.die(new Error("resolver exploded")),
      });
      const policy = P.hasAttribute("plan", M.eq(M.literal("pro")));

      return Effect.gen(function* () {
        const result = yield* createGuardHealthCheck(policy);

        assert.isFalse(result.healthy);
        assert.deepStrictEqual(result.errors, ["AttributeResolveError"]);
      }).pipe(Effect.provide(testLayer(subjectWith({}), { attributes: dying })));
    },
  );
});
