/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `attributeResolverRetrying`'s own depth — the one export here with no
 * shipped resolver that would otherwise exercise it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import { AttributeResolveError } from "../src/Errors.ts";
import {
  AttributeResolver,
  attributeResolverBounded,
  attributeResolverRetrying,
} from "../src/AttributeResolver.ts";
import { makeSubjectId } from "../src/Identity.ts";

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

      const result = yield* AttributeResolver.resolve(makeSubjectId("u1"), "dept").pipe(
        Effect.provide(retrying),
      );

      assert.strictEqual(result, "resolved");
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));

  it.effect("surfaces the original error once the schedule is exhausted", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      // Always fails — `failures` set higher than the schedule's budget.
      const retrying = attributeResolverRetrying(Schedule.recurs(2))(flakyLayer(999, attempts));

      const result = yield* Effect.result(
        AttributeResolver.resolve(makeSubjectId("u1"), "dept").pipe(Effect.provide(retrying)),
      );

      assert.strictEqual(result._tag, "Failure");
      // 1 initial call + 2 retries = 3 attempts.
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));
});

describe("attributeResolverBounded", () => {
  it.effect("never runs more than `permits` calls at once", () =>
    Effect.gen(function* () {
      const inFlight = yield* Ref.make(0);
      const peak = yield* Ref.make(0);
      const total = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      const blocking: Layer.Layer<AttributeResolver> = Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.gen(function* () {
            yield* Ref.update(total, (n) => n + 1);
            const current = yield* Ref.updateAndGet(inFlight, (n) => n + 1);
            yield* Ref.update(peak, (max) => Math.max(max, current));
            yield* Deferred.await(gate);
            yield* Ref.update(inFlight, (n) => n - 1);
            return "resolved";
          }),
      });

      const bounded = attributeResolverBounded(2)(blocking);

      // The layer is provided once, around the whole batch — not per asker.
      // `Effect.provide` builds a layer fresh per execution it wraps, so
      // providing it separately to each asker would give each its own
      // independent semaphore, sharing nothing (the same trap
      // `DecisionCache.test.ts` documents for a per-evaluation cache).
      const results = yield* Effect.gen(function* () {
        const fibers = yield* Effect.forEach(Array.from({ length: 5 }, (_, i) => i), (i) =>
          Effect.forkChild(AttributeResolver.resolve(makeSubjectId(`u${i}`), "dept")),
        );
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
        // 5 askers, 2 permits: exactly 2 should have made it through to the
        // resolver, the other 3 still queued on the semaphore.
        assert.strictEqual(yield* Ref.get(inFlight), 2);
        assert.strictEqual(yield* Ref.get(peak), 2);
        yield* Deferred.succeed(gate, undefined);
        return yield* Effect.forEach(fibers, (f) => Effect.result(Fiber.join(f)));
      }).pipe(Effect.provide(bounded));

      for (const result of results) assert.strictEqual(result._tag, "Success");
      assert.strictEqual(yield* Ref.get(total), 5, "every asker was eventually served");
      assert.strictEqual(yield* Ref.get(inFlight), 0);
    }));

  it.effect("forwards the resolved value and errors transparently", () =>
    Effect.gen(function* () {
      const ok = attributeResolverBounded(1)(
        Layer.succeed(AttributeResolver, { resolve: () => Effect.succeed(42) }),
      );
      assert.strictEqual(
        yield* AttributeResolver.resolve(makeSubjectId("u1"), "dept").pipe(Effect.provide(ok)),
        42,
      );

      const failing = attributeResolverBounded(1)(
        Layer.succeed(AttributeResolver, {
          resolve: (_id, attribute) =>
            Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
        }),
      );
      const result = yield* Effect.result(
        AttributeResolver.resolve(makeSubjectId("u1"), "dept").pipe(Effect.provide(failing)),
      );
      assert.strictEqual(result._tag, "Failure");
    }));
});
