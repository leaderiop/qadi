/**
 * `customPredicateRetrying`/`customPredicateBounded` mirror
 * `attributeResolverRetrying`/`attributeResolverBounded` exactly, so these
 * cases mirror `AttributeResolver.test.ts`'s. `CustomPredicateNone` and
 * `customPredicateFromRecord`'s two answers — a registered name and an
 * unregistered one — are exercised directly here, at this module's own
 * boundary, rather than only through `evaluateNode`'s `HasCustom` case.
 *
 * `Evaluate.test.ts` covers `HasCustom` directly too now — deny-no-registry,
 * registry-allow, registry-deny, and the unregistered-name failure — closing
 * a gap that had actually been open here: this comment previously claimed
 * that coverage already existed, but only `@qadi/testing`'s
 * `TestLayers.test.ts` had it, which core's own `stryker` run cannot see.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Result from "effect/Result";
import * as Schedule from "effect/Schedule";
import { makeSubject } from "../src/AuthSubject.ts";
import {
  CustomPredicate,
  CustomPredicateNone,
  customPredicateBounded,
  customPredicateFromRecord,
  customPredicateRetrying,
} from "../src/CustomPredicate.ts";
import { CustomPredicateError } from "../src/Errors.ts";

const alice = makeSubject({ id: "alice", roles: [], permissions: [], attributes: {} });

describe("CustomPredicateNone", () => {
  it.effect("denies every name, without failing", () =>
    Effect.gen(function* () {
      const allowed = yield* CustomPredicate.evaluate("anything", alice, undefined, undefined).pipe(
        Effect.provide(CustomPredicateNone),
      );
      assert.isFalse(allowed);
    }));
});

describe("customPredicateFromRecord", () => {
  it.effect("resolves a registered name against the subject and params it was given", () =>
    Effect.gen(function* () {
      const layer = customPredicateFromRecord({
        isOwner: (subject, _resource, params) =>
          Effect.succeed(subject.id === "alice" && params === "doc-1"),
      });

      const allowed = yield* CustomPredicate.evaluate("isOwner", alice, undefined, "doc-1").pipe(
        Effect.provide(layer),
      );
      assert.isTrue(allowed);
    }));

  it.effect("forwards a real resource to the registered function unchanged", () =>
    Effect.gen(function* () {
      // Every other case in this suite passes `undefined` for `resource`
      // (issue #67), which would not catch a bug that drops, swaps, or
      // mis-forwards the argument in `customPredicateFromRecord`.
      const resource = { id: "doc-1", owner: "alice" };
      const layer = customPredicateFromRecord({
        isOwner: (_subject, seenResource, _params) => Effect.succeed(seenResource === resource),
      });

      const allowed = yield* CustomPredicate.evaluate(
        "isOwner",
        alice,
        resource,
        undefined,
      ).pipe(Effect.provide(layer));
      assert.isTrue(allowed);
    }));

  it.effect("fails, rather than denies, on a name the table does not recognize", () =>
    Effect.gen(function* () {
      const layer = customPredicateFromRecord({});

      const error = yield* Effect.flip(
        CustomPredicate.evaluate("noSuchPredicate", alice, undefined, undefined).pipe(
          Effect.provide(layer),
        ),
      );

      assert.strictEqual(error._tag, "CustomPredicateError");
      assert.strictEqual(error.name, "noSuchPredicate");
    }));

  it.effect("forwards the registered predicate's own failure unchanged", () =>
    Effect.gen(function* () {
      const layer = customPredicateFromRecord({
        broken: () => Effect.fail(new CustomPredicateError({ name: "broken", reason: "down" })),
      });

      const error = yield* Effect.flip(
        CustomPredicate.evaluate("broken", alice, undefined, undefined).pipe(Effect.provide(layer)),
      );
      assert.strictEqual(error.reason, "down");
    }));
});

/** A registry that fails `failures` times, then succeeds, counting attempts via `attempts`. */
const flakyLayer = (
  failures: number,
  attempts: Ref.Ref<number>,
): Layer.Layer<CustomPredicate> =>
  Layer.succeed(CustomPredicate, {
    evaluate: (name) =>
      Ref.updateAndGet(attempts, (n) => n + 1).pipe(
        Effect.flatMap((n) =>
          n <= failures
            ? Effect.fail(new CustomPredicateError({ name, reason: "flaky" }))
            : Effect.succeed(true),
        ),
      ),
  });

describe("customPredicateRetrying", () => {
  it.effect("eventually succeeds once the schedule outlasts the failures", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      const retrying = customPredicateRetrying(Schedule.recurs(5))(flakyLayer(2, attempts));

      const result = yield* CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(
        Effect.provide(retrying),
      );

      assert.isTrue(result);
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));

  it.effect("surfaces the original error once the schedule is exhausted", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      const retrying = customPredicateRetrying(Schedule.recurs(2))(flakyLayer(999, attempts));

      const result = yield* Effect.result(
        CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(Effect.provide(retrying)),
      );

      assert.strictEqual(result._tag, "Failure");
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));
});

describe("customPredicateBounded", () => {
  it.effect("never runs more than `permits` calls at once", () =>
    Effect.gen(function* () {
      const inFlight = yield* Ref.make(0);
      const peak = yield* Ref.make(0);
      const total = yield* Ref.make(0);
      const gate = yield* Deferred.make<void>();

      const blocking: Layer.Layer<CustomPredicate> = Layer.succeed(CustomPredicate, {
        evaluate: () =>
          Effect.gen(function* () {
            yield* Ref.update(total, (n) => n + 1);
            const current = yield* Ref.updateAndGet(inFlight, (n) => n + 1);
            yield* Ref.update(peak, (max) => Math.max(max, current));
            yield* Deferred.await(gate);
            yield* Ref.update(inFlight, (n) => n - 1);
            return true;
          }),
      });

      const bounded = customPredicateBounded(2)(blocking);

      const results = yield* Effect.gen(function* () {
        const fibers = yield* Effect.forEach(Array.from({ length: 5 }, (_, i) => i), () =>
          Effect.forkChild(CustomPredicate.evaluate("x", alice, undefined, undefined)),
        );
        for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
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
      const ok = customPredicateBounded(1)(
        Layer.succeed(CustomPredicate, { evaluate: () => Effect.succeed(true) }),
      );
      assert.isTrue(
        yield* CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(Effect.provide(ok)),
      );

      const failing = customPredicateBounded(1)(
        Layer.succeed(CustomPredicate, {
          evaluate: (name) => Effect.fail(new CustomPredicateError({ name, reason: "down" })),
        }),
      );
      const result = yield* Effect.result(
        CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(Effect.provide(failing)),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect(
    "fails fast with InvalidBoundedPermits instead of deadlocking every call, for permits <= 0",
    () =>
      Effect.gen(function* () {
        // `Semaphore.make` performs no validation of its own: with a
        // non-positive, `NaN` or infinite permit count, `free` never reaches
        // `1`, so every `withPermit` call would enqueue forever with nothing
        // able to wake it. This asserts the fast, typed failure this defect
        // was fixed to produce instead — proven fast by `it.effect` itself:
        // an Effect that actually deadlocked here would hang the test rather
        // than let it complete.
        for (const permits of [0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
          const bounded = customPredicateBounded(permits)(
            Layer.succeed(CustomPredicate, { evaluate: () => Effect.succeed(true) }),
          );
          const result = yield* Effect.result(
            CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(
              Effect.provide(bounded),
            ),
          );

          assert.isTrue(Result.isFailure(result), `permits ${permits} should fail fast`);
          if (!Result.isFailure(result)) continue;
          assert.strictEqual(result.failure._tag, "InvalidBoundedPermits");
          if (result.failure._tag !== "InvalidBoundedPermits") continue;
          // `assert.strictEqual` uses `===`, under which `NaN !== NaN` — the
          // one case in this table needing its own comparison.
          if (Number.isNaN(permits)) assert.isNaN(result.failure.permits);
          else assert.strictEqual(result.failure.permits, permits);
        }
      }),
  );

  it.effect("accepts exactly one permit — the smallest valid bound", () =>
    Effect.gen(function* () {
      const bounded = customPredicateBounded(1)(
        Layer.succeed(CustomPredicate, { evaluate: () => Effect.succeed(true) }),
      );
      assert.isTrue(
        yield* CustomPredicate.evaluate("x", alice, undefined, undefined).pipe(
          Effect.provide(bounded),
        ),
      );
    }));
});

describe("naming", () => {
  it.effect("a wrapper composes its name onto the one it wraps", () =>
    Effect.gen(function* () {
      const named = customPredicateRetrying(Schedule.recurs(0))(
        Layer.succeed(CustomPredicate, { name: "fromRecord", evaluate: () => Effect.succeed(true) }),
      );
      const allowed = yield* CustomPredicate.use((r) => Effect.succeed(r.name)).pipe(
        Effect.provide(named),
      );
      assert.strictEqual(allowed, "fromRecord (retrying)");
    }));

  it.effect("an unnamed wrapped implementation says so rather than dropping the stack", () =>
    Effect.gen(function* () {
      const named = customPredicateBounded(1)(
        Layer.succeed(CustomPredicate, { evaluate: () => Effect.succeed(true) }),
      );
      const name = yield* CustomPredicate.use((r) => Effect.succeed(r.name)).pipe(
        Effect.provide(named),
      );
      assert.strictEqual(name, "? (bounded 1)");
    }));
});
