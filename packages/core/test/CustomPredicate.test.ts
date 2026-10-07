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
import { hasCustom } from "../src/Policy.ts";
import { enforceProjected, enforceProjectedLoaded } from "../src/Qadi.ts";
import { subjectWith, testLayer } from "./helpers.ts";

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



describe("BEH-32's worked example", () => {
  const draft = { id: "draft-1", authorId: "u1" };
  const registry = customPredicateFromRecord({
    isAuthor: (subject, resource) => Effect.succeed(resource?.["authorId"] === subject.id),
  });
  const policy = hasCustom("isAuthor");

  it.effect(
    "as published, the example denies even the author: enforceProjected decides before the draft is loaded",
    () =>
      Effect.gen(function* () {
        const r = yield* Effect.result(Effect.succeed(draft).pipe(enforceProjected(policy)));
        assert.isTrue(r._tag === "Failure" && r.failure._tag === "AccessDenied");
      }).pipe(Effect.provide(testLayer(subjectWith({ id: "u1" }), { CustomPredicate: registry }))),
  );

  it.effect("decided against the loaded draft, the author reads it and another subject is denied", () =>
    Effect.gen(function* () {
      const program = Effect.succeed(draft).pipe(enforceProjectedLoaded(policy));
      const asAuthor = yield* program.pipe(
        Effect.provide(testLayer(subjectWith({ id: "u1" }), { CustomPredicate: registry })),
      );
      assert.deepStrictEqual(asAuthor, draft);
      const asOther = yield* Effect.result(
        program.pipe(
          Effect.provide(testLayer(subjectWith({ id: "u2" }), { CustomPredicate: registry })),
        ),
      );
      assert.isTrue(asOther._tag === "Failure" && asOther.failure._tag === "AccessDenied");
    }));
});
