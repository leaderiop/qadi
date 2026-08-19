/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `attributeResolverRetrying`'s own depth — the one export here with no
 * shipped resolver that would otherwise exercise it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import { AttributeResolveError } from "../src/Errors.ts";
import { AttributeResolver, attributeResolverRetrying } from "../src/AttributeResolver.ts";

/** A resolver that fails `failures` times, then succeeds, counting attempts via `attempts`. */
const flakyLayer = (failures: number, attempts: Ref.Ref<number>): Layer.Layer<AttributeResolver> =>
  Layer.succeed(AttributeResolver, {
    resolve: (_subjectId, attribute) =>
      Ref.updateAndGet(attempts, (n) => n + 1).pipe(
        Effect.flatMap((n) =>
          n <= failures
            ? Effect.fail(new AttributeResolveError({ attribute, cause: "flaky" }))
            : Effect.succeed("resolved"),
        ),
      ),
  });

describe("attributeResolverRetrying", () => {
  it.effect("eventually succeeds once the schedule outlasts the failures", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      const retrying = attributeResolverRetrying(Schedule.recurs(5))(flakyLayer(2, attempts));

      const result = yield* AttributeResolver.resolve("u1", "dept").pipe(Effect.provide(retrying));

      assert.strictEqual(result, "resolved");
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));

  it.effect("surfaces the original error once the schedule is exhausted", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      // Always fails — `failures` set higher than the schedule's budget.
      const retrying = attributeResolverRetrying(Schedule.recurs(2))(flakyLayer(999, attempts));

      const result = yield* Effect.result(
        AttributeResolver.resolve("u1", "dept").pipe(Effect.provide(retrying)),
      );

      assert.strictEqual(result._tag, "Failure");
      // 1 initial call + 2 retries = 3 attempts.
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));
});
