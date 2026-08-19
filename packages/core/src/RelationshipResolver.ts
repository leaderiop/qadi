/**
 * Answers relationship questions for ReBAC policies: "is this subject the owner
 * of that document?"
 *
 * `check` returns an `Effect`, so a resolver backed by a graph database or a
 * remote service is a first-class implementation. The predecessor declared a
 * synchronous `check` plus an async `checkAsync` that nothing ever called —
 * the async path was unreachable because evaluation was synchronous.
 */
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import type { RelationshipResolveError } from "./Errors.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";
import { wrapService } from "./RetryingLayer.ts";

export interface RelationshipCheck {
  readonly subjectId: SubjectId;
  readonly relation: string;
  readonly resourceId: ResourceId;
  /** Maximum traversal depth. Undefined means the resolver decides. */
  readonly depth: number | undefined;
}

export interface RelationshipResolverShape {
  readonly check: (
    request: RelationshipCheck,
  ) => Effect.Effect<boolean, RelationshipResolveError>;
}

export class RelationshipResolver extends Context.Service<
  RelationshipResolver,
  RelationshipResolverShape
>()("qadi/RelationshipResolver") {
  static readonly check = (request: RelationshipCheck) =>
    RelationshipResolver.use((r) => r.check(request));
}

/**
 * Denies every relationship.
 *
 * The default, and deliberately fail-closed: an unwired resolver must not grant
 * access. A `HasRelationship` policy under this layer always denies.
 */
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  { check: () => Effect.succeed(false) },
);

/**
 * One edge to seed {@link relationshipResolverFromEdges} with.
 *
 * A named struct, not a `readonly [string, string, string]` positional
 * tuple: a tuple's field order is convention only, so
 * `edges.map(([a, b, c]) => ...)` called with the fields transposed — a
 * subject id where a relation belongs, say — type-checks cleanly and
 * silently grants or denies against the wrong identity. A struct makes that
 * a compile error instead.
 */
export interface RelationshipEdgeInput {
  readonly subjectId: string;
  readonly relation: string;
  readonly resourceId: string;
}

/**
 * One edge, compared structurally rather than by a joined string key —
 * `subjectId`/`relation`/`resourceId` collide onto the same key under naive
 * string-joining whenever a segment itself contains the delimiter. `Data.Class`
 * gives per-field `Equal`/`Hash`, so `HashSet` membership compares each field
 * independently and the collision is unrepresentable, not just harder to hit.
 *
 * Exported so `@qadi/testing`'s `edgeRelationshipResolver` can reuse this
 * exact class instead of pasting an identical one: a value class with no
 * behavior beyond structural equality has nothing sensitive to leak by being
 * public, and a future change to its equality semantics now has one
 * definition to reach, not two that could silently drift apart in the exact
 * area (key-collision avoidance) a real bug once lived.
 */
export class RelationshipEdge extends Data.Class<RelationshipEdgeInput> {}

/**
 * Resolves against a static edge list.
 *
 * Direct edges only — `depth` is ignored, since a flat list has no graph to
 * traverse. Suitable for tests and small fixed policies.
 */
export const relationshipResolverFromEdges = (
  edges: ReadonlyArray<RelationshipEdgeInput>,
): Layer.Layer<RelationshipResolver> => {
  const index = HashSet.fromIterable(edges.map((edge) => new RelationshipEdge(edge)));
  return Layer.succeed(RelationshipResolver, {
    check: (request) =>
      Effect.succeed(
        HashSet.has(
          index,
          new RelationshipEdge({
            subjectId: request.subjectId,
            relation: request.relation,
            resourceId: request.resourceId,
          }),
        ),
      ),
  });
};

/**
 * Wraps a resolver layer so every `check` call retries on
 * `RelationshipResolveError` under the given schedule before surfacing it.
 *
 * Additive, not a change to {@link RelationshipResolverShape} — see
 * `attributeResolverRetrying` in `AttributeResolver.ts`, the same combinator
 * for the sibling service.
 */
export const relationshipResolverRetrying =
  (schedule: Schedule.Schedule<unknown, RelationshipResolveError>) =>
  (layer: Layer.Layer<RelationshipResolver>): Layer.Layer<RelationshipResolver> =>
    wrapService(RelationshipResolver, layer, (inner) => ({
      check: (request) => inner.check(request).pipe(Effect.retry(schedule)),
    }));
