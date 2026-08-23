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
import * as Semaphore from "effect/Semaphore";
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

/**
 * What the port can say about a relationship.
 *
 * Three values, mirroring `ActedResult` in `DecisionHistory.ts`.
 * [ADR-QD-020](../../../spec/decisions/020-decision-history-port.md) named
 * `RelationshipResolverNever` answering `false` "the exact counterpart" of
 * `"Unknown"` and left this port boolean, because `hasRelationship` is a
 * positive test and `false` already fails closed. That is still true — the
 * third value buys nothing here for *safety*.
 *
 * It buys the denial's sentence. A boolean cannot tell the evaluator which of
 * two answers it is holding, so an unwired port denied with
 * `subject 'u1' has no 'owner' relation to 'doc-1'` — a claim about the
 * contents of a store nobody had wired
 * ([INV-QD-029](../../../spec/invariants.md#inv-qd-029-a-denial-names-only-what-was-consulted)).
 *
 * `"Unknown"` means *nobody can say* — no resolver is wired. A resolver that is
 * wired and unreachable is a `RelationshipResolveError`, which is an error, not
 * an answer.
 */
export type RelatedResult = "Related" | "Unrelated" | "Unknown";

export interface RelationshipResolverShape {
  readonly check: (
    request: RelationshipCheck,
  ) => Effect.Effect<RelatedResult, RelationshipResolveError>;
}

export class RelationshipResolver extends Context.Service<
  RelationshipResolver,
  RelationshipResolverShape
>()("qadi/RelationshipResolver") {
  static readonly check = (request: RelationshipCheck) =>
    RelationshipResolver.use((r) => r.check(request));
}

/**
 * Knows nothing, so every relationship policy denies.
 *
 * The default, and deliberately fail-closed: an unwired resolver must not grant
 * access. A `HasRelationship` policy under this layer always denies — the name
 * is still accurate in outcome, which is why it kept it.
 *
 * It answers `"Unknown"` rather than `"Unrelated"`, and the difference is only
 * ever visible in the denial's reason. `"Unrelated"` is what a wired store says
 * when it looked and found no edge; this layer never looked, and a denial that
 * claimed otherwise sent developers to audit a graph they had not connected.
 */
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver> = Layer.succeed(
  RelationshipResolver,
  { check: () => Effect.succeed("Unknown") },
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
 *
 * A closed world: an edge not listed is `"Unrelated"` rather than `"Unknown"`,
 * because this layer *is* the store and it does know — the same distinction
 * `decisionHistoryFromEvents` draws.
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
        )
          ? "Related"
          : "Unrelated",
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

/**
 * Wraps a resolver layer so no more than `permits` calls to `check` run at
 * once, queuing the rest.
 *
 * The sibling of `attributeResolverBounded` in `AttributeResolver.ts` — see
 * that doc comment for why this exists and why `effect/Semaphore` rather than
 * a rate limiter. `Qadi.filter`'s `concurrency` bounds fan-out across policy
 * evaluations, not calls into this specific resolver, so a `HasRelationship`-
 * heavy policy evaluated over a large collection under `concurrency:
 * "unbounded"` has nothing else standing between it and this resolver's
 * backing store.
 */
export const relationshipResolverBounded =
  (permits: number) =>
  (layer: Layer.Layer<RelationshipResolver>): Layer.Layer<RelationshipResolver> =>
    Layer.effect(
      RelationshipResolver,
      Effect.gen(function* () {
        const semaphore = yield* Semaphore.make(permits);
        const inner = yield* Layer.build(layer).pipe(
          Effect.map((context) => Context.get(context, RelationshipResolver)),
        );
        return {
          check: (request) => Semaphore.withPermit(semaphore)(inner.check(request)),
        };
      }),
    );
