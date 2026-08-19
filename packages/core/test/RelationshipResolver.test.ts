/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `RelationshipResolver`'s own depth, matching `DecisionCache.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import { RelationshipResolveError } from "../src/Errors.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
  relationshipResolverRetrying,
} from "../src/RelationshipResolver.ts";
import type { RelationshipCheck } from "../src/RelationshipResolver.ts";

/** `depth` defaults to `undefined` — the field is required, its value optional. */
const check = (
  layer: Layer.Layer<RelationshipResolver>,
  request: Omit<RelationshipCheck, "depth"> & { readonly depth?: number },
) =>
  RelationshipResolver.check({ depth: undefined, ...request }).pipe(Effect.provide(layer));

describe("RelationshipResolver", () => {
  describe("RelationshipResolverNever", () => {
    it.effect("denies every relationship, at any depth", () =>
      Effect.gen(function* () {
        const request = { subjectId: "u", relation: "owner", resourceId: "d" };
        assert.isFalse(yield* check(RelationshipResolverNever, request));
        assert.isFalse(yield* check(RelationshipResolverNever, { ...request, depth: 50 }));
      }));
  });

  describe("relationshipResolverFromEdges", () => {
    const owns = relationshipResolverFromEdges([
      ["alice", "owner", "doc-1"],
      ["alice", "owner", "doc-2"],
      ["bob", "editor", "doc-1"],
    ]);

    it.effect("matches an exact edge", () =>
      Effect.gen(function* () {
        assert.isTrue(
          yield* check(owns, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the subject differs", () =>
      Effect.gen(function* () {
        assert.isFalse(
          yield* check(owns, { subjectId: "mallory", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the relation differs, even for the same subject and resource", () =>
      Effect.gen(function* () {
        assert.isFalse(
          yield* check(owns, { subjectId: "alice", relation: "editor", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the resource differs", () =>
      Effect.gen(function* () {
        assert.isFalse(
          yield* check(owns, { subjectId: "alice", relation: "owner", resourceId: "doc-3" }),
        );
      }));

    it.effect("an empty edge list denies everything", () =>
      Effect.gen(function* () {
        const empty = relationshipResolverFromEdges([]);
        assert.isFalse(
          yield* check(empty, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect(
      "DEPTH IS IGNORED — a direct edge matches identically at every depth, since a flat list has no graph to traverse",
      () =>
        Effect.gen(function* () {
          const request = { subjectId: "alice", relation: "owner", resourceId: "doc-1" };
          assert.isTrue(yield* check(owns, { ...request, depth: 0 }));
          assert.isTrue(yield* check(owns, { ...request, depth: 50 }));
          assert.isTrue(yield* check(owns, request));
        }),
    );

    it.effect("a duplicated edge collapses without changing the result", () =>
      Effect.gen(function* () {
        const duped = relationshipResolverFromEdges([
          ["alice", "owner", "doc-1"],
          ["alice", "owner", "doc-1"],
        ]);
        assert.isTrue(
          yield* check(duped, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect(
      "collision-immune regardless of what a segment contains, not just what the old key delimiter was",
      () =>
        Effect.gen(function* () {
          // `relationshipResolverFromEdges` used to join `${subjectId} ${relation}
          // ${resourceId}` into an index key — literally with a NUL byte, not a
          // space, specifically because a real id is far more likely to contain a
          // space than a NUL byte (CCR-QD-034; see scripts/check-api-surface.mjs's
          // `exportsOf` and packages/core/bench/Evaluate.bench.ts, both of which
          // call the NUL bytes out explicitly). That was a real, deliberate, tested
          // mitigation for the common case — but a segment containing an actual NUL
          // byte could still collide under it.
          //
          // The current implementation has no key to collide on at all: HashSet
          // membership over a Data.Class compares subjectId/relation/resourceId as
          // independent structural fields, so neither character — nor any other —
          // is special. Both cases below are covered: the one the old mitigation
          // already handled, and the one it didn't.
          const spaceCollidable = relationshipResolverFromEdges([["a b", "owner", "c"]]);
          assert.isFalse(
            yield* check(spaceCollidable, {
              subjectId: "a",
              relation: "b owner",
              resourceId: "c",
            }),
          );

          const nulCollidable = relationshipResolverFromEdges([["a\0b", "owner", "c"]]);
          assert.isFalse(
            yield* check(nulCollidable, {
              subjectId: "a",
              relation: "b\0owner",
              resourceId: "c",
            }),
          );
        }),
    );
  });

  describe("relationshipResolverRetrying", () => {
    /** A resolver that fails `failures` times, then succeeds, counting attempts via `attempts`. */
    const flakyLayer = (
      failures: number,
      attempts: Ref.Ref<number>,
    ): Layer.Layer<RelationshipResolver> =>
      Layer.succeed(RelationshipResolver, {
        check: (request) =>
          Ref.updateAndGet(attempts, (n) => n + 1).pipe(
            Effect.flatMap((n) =>
              n <= failures
                ? Effect.fail(
                    new RelationshipResolveError({
                      relation: request.relation,
                      resourceId: request.resourceId,
                      cause: "flaky",
                    }),
                  )
                : Effect.succeed(true),
            ),
          ),
      });

    it.effect("eventually succeeds once the schedule outlasts the failures", () =>
      Effect.gen(function* () {
        const attempts = yield* Ref.make(0);
        const retrying = relationshipResolverRetrying(Schedule.recurs(5))(flakyLayer(2, attempts));

        const result = yield* check(retrying, {
          subjectId: "alice",
          relation: "owner",
          resourceId: "doc-1",
        });

        assert.isTrue(result);
        assert.strictEqual(yield* Ref.get(attempts), 3);
      }));

    it.effect("surfaces the original error once the schedule is exhausted", () =>
      Effect.gen(function* () {
        const attempts = yield* Ref.make(0);
        const retrying = relationshipResolverRetrying(Schedule.recurs(2))(
          flakyLayer(999, attempts),
        );

        const result = yield* Effect.result(
          check(retrying, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );

        assert.strictEqual(result._tag, "Failure");
        assert.strictEqual(yield* Ref.get(attempts), 3);
      }));
  });
});
