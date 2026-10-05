/**
 * `CustomPredicateNone` and `customPredicateFromRecord`'s two answers — a
 * registered name and an unregistered one — exercised directly here, at this
 * module's own boundary, rather than only through `evaluateNode`'s `HasCustom`
 * case. The wrappers (`…Retrying`, `…Bounded`, `…TimingOut`) are pinned for
 * every port at once by `PortConformance.test.ts`.
 *
 * `Evaluate.test.ts` covers `HasCustom` directly too now — deny-no-registry,
 * registry-allow, registry-deny, and the unregistered-name failure — closing
 * a gap that had actually been open here: this comment previously claimed
 * that coverage already existed, but only `@qadi/testing`'s
 * `TestLayers.test.ts` had it, which core's own `stryker` run cannot see.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { makeSubject } from "../src/AuthSubject.ts";
import {
  CustomPredicate,
  CustomPredicateNone,
  customPredicateFromRecord,
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


