/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `RelationshipResolver`'s own depth, matching `DecisionCache.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
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
      "THE INDEX SEPARATOR IS A NUL BYTE, NOT A SPACE — an id containing a space does not collide across a triple",
      () =>
        Effect.gen(function* () {
          // Worth an assertion rather than a doc comment, matching the trap tests in
          // DecisionCache.test.ts — and a genuine trap here for a reader, not the
          // resolver: `relationshipResolverFromEdges`'s composite key reads as
          // `${s} ${rel} ${r}` in every editor and in this file, but the actual
          // separator between the interpolated values is `\0`, not a literal space
          // (scripts/check-api-surface.mjs's `exportsOf` and
          // packages/core/bench/Evaluate.bench.ts both call this out explicitly,
          // which is how it was confirmed deliberate here rather than "fixed" back
          // to a real space — a real space is exactly the character most likely to
          // appear in an app-controlled id, which is what makes NUL the safer
          // choice of the two). This test is the property that choice buys: a
          // subject/relation split that *would* collide under a space-joined key
          // does not collide under this one.
          const collidable = relationshipResolverFromEdges([["a b", "owner", "c"]]);
          const wouldCollideOnSpace = yield* check(collidable, {
            subjectId: "a",
            relation: "b owner",
            resourceId: "c",
          });
          assert.isFalse(wouldCollideOnSpace);
        }),
    );
  });
});
