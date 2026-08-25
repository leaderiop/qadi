import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
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

  it.effect("a defect from a resolver is not swallowed into 'unhealthy' — it still propagates", () => {
    // Pins the doc comment's central claim: only a *typed* EvaluationError
    // becomes `healthy: false`. A resolver that dies outright (a real bug, not
    // a reported failure) must still surface as a defect, or the probe would
    // report a broken port as merely "unhealthy" — indistinguishable from a
    // clean typed failure.
    const dying: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
      resolve: () => Effect.die(new Error("resolver exploded")),
    });
    const policy = P.hasAttribute("plan", M.eq(M.literal("pro")));

    return Effect.gen(function* () {
      const exit = yield* Effect.exit(createGuardHealthCheck(policy));

      assert.strictEqual(exit._tag, "Failure");
      if (exit._tag !== "Failure") return;
      const defect = Cause.squash(exit.cause);
      assert.instanceOf(defect, Error);
      if (!(defect instanceof Error)) return;
      assert.match(defect.message, /resolver exploded/);
    }).pipe(Effect.provide(testLayer(subjectWith({}), { attributes: dying })));
  });
});
