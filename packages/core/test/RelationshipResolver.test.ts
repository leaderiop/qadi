/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `RelationshipResolver`'s own depth, matching `DecisionCache.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import * as Layer from "effect/Layer";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import { RelationshipResolveError } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverBounded,
  relationshipResolverFromEdges,
  relationshipResolverRetrying,
} from "../src/RelationshipResolver.ts";

/**
 * `depth` defaults to `undefined` — the field is required, its value optional.
 *
 * Takes plain strings, not `RelationshipCheck` directly: `subjectId`/`resourceId`
 * are branded on the real service boundary, but every test in this file only
 * cares about the plain identifiers, so this is the one place that converts —
 * matching the "plain input, branded internal shape" split `AuthSubject.makeSubject`
 * already uses.
 */
const check = (
  layer: Layer.Layer<RelationshipResolver>,
  request: {
    readonly subjectId: string;
    readonly relation: string;
    readonly resourceId: string;
    readonly depth?: number;
  },
) =>
  RelationshipResolver.check({
    subjectId: makeSubjectId(request.subjectId),
    relation: request.relation,
    resourceId: makeResourceId(request.resourceId),
    depth: request.depth,
  }).pipe(Effect.provide(layer));

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
      { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
      { subjectId: "alice", relation: "owner", resourceId: "doc-2" },
      { subjectId: "bob", relation: "editor", resourceId: "doc-1" },
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
          { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
          { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
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
          const spaceCollidable = relationshipResolverFromEdges([
            { subjectId: "a b", relation: "owner", resourceId: "c" },
          ]);
          assert.isFalse(
            yield* check(spaceCollidable, {
              subjectId: "a",
              relation: "b owner",
              resourceId: "c",
            }),
          );

          const nulCollidable = relationshipResolverFromEdges([
            { subjectId: "a\0b", relation: "owner", resourceId: "c" },
          ]);
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

  describe("relationshipResolverBounded", () => {
    it.effect("never runs more than `permits` calls at once", () =>
      Effect.gen(function* () {
        const inFlight = yield* Ref.make(0);
        const peak = yield* Ref.make(0);
        const gate = yield* Deferred.make<void>();

        const blocking: Layer.Layer<RelationshipResolver> = Layer.succeed(RelationshipResolver, {
          check: () =>
            Effect.gen(function* () {
              const current = yield* Ref.updateAndGet(inFlight, (n) => n + 1);
              yield* Ref.update(peak, (max) => Math.max(max, current));
              yield* Deferred.await(gate);
              yield* Ref.update(inFlight, (n) => n - 1);
              return true;
            }),
        });

        const bounded = relationshipResolverBounded(2)(blocking);

        // Provided once around the whole batch — see the equivalent comment
        // in AttributeResolver.test.ts for why per-asker `Effect.provide`
        // would give each its own independent semaphore.
        const results = yield* Effect.gen(function* () {
          const fibers = yield* Effect.forEach(Array.from({ length: 5 }, (_, i) => i), (i) =>
            Effect.forkChild(
              RelationshipResolver.check({
                subjectId: makeSubjectId(`u${i}`),
                relation: "owner",
                resourceId: makeResourceId("d"),
                depth: undefined,
              }),
            ),
          );
          for (let i = 0; i < 20; i++) yield* Effect.yieldNow;
          assert.strictEqual(yield* Ref.get(inFlight), 2);
          assert.strictEqual(yield* Ref.get(peak), 2);
          yield* Deferred.succeed(gate, undefined);
          return yield* Effect.forEach(fibers, (f) => Effect.result(Fiber.join(f)));
        }).pipe(Effect.provide(bounded));

        for (const result of results) assert.strictEqual(result._tag, "Success");
        assert.strictEqual(yield* Ref.get(inFlight), 0);
      }));

    it.effect("forwards the checked value transparently", () =>
      Effect.gen(function* () {
        const bounded = relationshipResolverBounded(1)(relationshipResolverFromEdges([
          { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
        ]));
        assert.isTrue(
          yield* check(bounded, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
        assert.isFalse(
          yield* check(bounded, { subjectId: "bob", relation: "owner", resourceId: "doc-1" }),
        );
      }));
  });
});
