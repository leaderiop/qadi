import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import { AttributeResolveError } from "../src/Errors.ts";
import { catchPortDefect } from "../src/PortAccess.ts";

/**
 * `catchPortDefect`'s whole contract is a cause matrix: which shapes of cause it
 * rewrites and which it leaves alone. Fail+Die and Die+Interrupt are awkward to
 * produce through a real port, so they are driven here directly (BEH-QD-261).
 */
describe("catchPortDefect", () => {
  const convert = catchPortDefect(
    (cause: Cause.Cause<AttributeResolveError>) =>
      new AttributeResolveError({ attribute: "x", cause: Cause.squash(cause) }),
  );
  const original = new AttributeResolveError({ attribute: "x", cause: "down" });
  const defect = new Error("boom");

  it.effect("a typed failure passes through as the same instance", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(convert(Effect.fail(original)));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure, original);
    }));

  it.effect("a defect becomes the typed error carrying it", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(convert(Effect.die(defect)));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      assert.strictEqual(r.failure.cause, defect);
    }));

  it.effect("a synchronous throw becomes the typed error", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(
        convert(
          Effect.sync(() => {
            throw defect;
          }),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      assert.strictEqual(r.failure.cause, defect);
    }));

  it.effect("an interruption is never converted", () =>
    Effect.gen(function* () {
      const exit = yield* Effect.exit(convert(Effect.interrupt));
      assert.isTrue(Exit.isFailure(exit));
      if (!Exit.isFailure(exit)) return;
      assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
    }));

  it.effect("a cause with both a Fail and a Die passes through unchanged", () =>
    Effect.gen(function* () {
      const mixed = Effect.failCause(Cause.combine(Cause.fail(original), Cause.die(defect)));
      const exit = yield* Effect.exit(convert(mixed));
      assert.isTrue(Exit.isFailure(exit));
      if (!Exit.isFailure(exit)) return;
      // Not rewritten: the original Fail is still there, and so is the Die.
      assert.isTrue(Cause.hasFails(exit.cause));
      assert.isTrue(Cause.hasDies(exit.cause));
    }));

  it.effect("a cause with a Die and an Interrupt is converted", () =>
    Effect.gen(function* () {
      const mixed = Effect.failCause(Cause.combine(Cause.die(defect), Cause.interrupt()));
      const r = yield* Effect.result(convert(mixed));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
    }));

  it.effect("a success is untouched", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* convert(Effect.succeed(1)), 1);
    }));
});
