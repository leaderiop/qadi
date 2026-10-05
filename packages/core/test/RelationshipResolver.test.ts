/**
 * `Layers.test.ts` covers each default layer's happy path in one line; this is
 * `RelationshipResolver`'s own depth, matching `DecisionCache.test.ts`. Its
 * wrappers (`…Retrying`, `…Bounded`, `…TimingOut`) are pinned for every port at
 * once by `PortConformance.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import type { RelatedResult } from "../src/RelationshipResolver.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
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
const check = <E>(
  layer: Layer.Layer<RelationshipResolver, E>,
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

/**
 * Typed assertions, replacing the `assert.isTrue`/`isFalse` pairs these call
 * sites used while `check` returned a boolean.
 *
 * Worth the three functions: `assert.isTrue` takes `unknown`, so when the port
 * became three-valued the compiler had nothing to say and every one of these
 * sites failed only at run time — and `isFalse` cannot tell `"Unrelated"` from
 * `"Unknown"`, which is the distinction the whole change exists to draw.
 */
const assertRelated = (result: RelatedResult): void =>
  assert.strictEqual(result, "Related");
const assertUnrelated = (result: RelatedResult): void =>
  assert.strictEqual(result, "Unrelated");
const assertUnknown = (result: RelatedResult): void =>
  assert.strictEqual(result, "Unknown");

describe("RelationshipResolver", () => {
  describe("RelationshipResolverNever", () => {
    it.effect("ANSWERS Unknown at any depth — it never looked", () =>
      Effect.gen(function* () {
        // Not "Unrelated". Both deny, so no verdict changes; what changes is
        // the denial's sentence, which used to describe a store this layer has
        // never had (INV-QD-029).
        const request = { subjectId: "u", relation: "owner", resourceId: "d" };
        assertUnknown(yield* check(RelationshipResolverNever, request));
        assertUnknown(yield* check(RelationshipResolverNever, { ...request, depth: 50 }));
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
        assertRelated(
          yield* check(owns, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the subject differs", () =>
      Effect.gen(function* () {
        assertUnrelated(
          yield* check(owns, { subjectId: "mallory", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the relation differs, even for the same subject and resource", () =>
      Effect.gen(function* () {
        assertUnrelated(
          yield* check(owns, { subjectId: "alice", relation: "editor", resourceId: "doc-1" }),
        );
      }));

    it.effect("denies when the resource differs", () =>
      Effect.gen(function* () {
        assertUnrelated(
          yield* check(owns, { subjectId: "alice", relation: "owner", resourceId: "doc-3" }),
        );
      }));

    it.effect("an empty edge list denies everything", () =>
      Effect.gen(function* () {
        const empty = relationshipResolverFromEdges([]);
        assertUnrelated(
          yield* check(empty, { subjectId: "alice", relation: "owner", resourceId: "doc-1" }),
        );
      }));

    it.effect(
      "DEPTH IS IGNORED — a direct edge matches identically at every depth, since a flat list has no graph to traverse",
      () =>
        Effect.gen(function* () {
          const request = { subjectId: "alice", relation: "owner", resourceId: "doc-1" };
          assertRelated(yield* check(owns, { ...request, depth: 0 }));
          assertRelated(yield* check(owns, { ...request, depth: 50 }));
          assertRelated(yield* check(owns, request));
        }),
    );

    it.effect("a duplicated edge collapses without changing the result", () =>
      Effect.gen(function* () {
        const duped = relationshipResolverFromEdges([
          { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
          { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
        ]);
        assertRelated(
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
          assertUnrelated(
            yield* check(spaceCollidable, {
              subjectId: "a",
              relation: "b owner",
              resourceId: "c",
            }),
          );

          const nulCollidable = relationshipResolverFromEdges([
            { subjectId: "a\0b", relation: "owner", resourceId: "c" },
          ]);
          assertUnrelated(
            yield* check(nulCollidable, {
              subjectId: "a",
              relation: "b\0owner",
              resourceId: "c",
            }),
          );
        }),
    );
  });
});
