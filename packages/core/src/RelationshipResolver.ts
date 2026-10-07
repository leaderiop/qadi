/**
 * Answers relationship questions for ReBAC policies: "is this subject the owner
 * of that document?"
 *
 * `check` returns an `Effect`, so a resolver backed by a graph database or a
 * remote service is a first-class implementation. The predecessor declared a
 * synchronous `check` plus an async `checkAsync` that nothing ever called —
 * the async path was unreachable because evaluation was synchronous.
 */
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import { RelationshipResolveError } from "./Errors.ts";
import type { InvalidBoundedPermits } from "./Errors.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";
import { boundedPort, nonePort, retryingPort, timingOutPort } from "./PortDerivation.ts";
import type { PortDescription } from "./PortDescription.ts";

export interface RelationshipCheck {
  readonly subjectId: SubjectId;
  readonly relation: string;
  readonly resourceId: ResourceId;
  /**
   * Maximum traversal depth. Undefined means the resolver decides.
   *
   * `Evaluate.ts` clamps `HasRelationship.depth` to `[0, 64]` before ever
   * constructing this request — every untrusted numeric that reaches this
   * boundary is bounded on the evaluator's side. That clamp is fuel handed to
   * whichever resolver is wired; it only bounds a traversal if the resolver
   * actually spends it (RP-02). **An implementation that traverses a graph
   * rather than checking a single edge MUST treat a defined `depth` as a
   * maximum hop budget and MUST detect cycles (a visited-node set, or
   * equivalent) rather than assume the underlying store is acyclic** — a
   * relationship graph loaded from a real store (a Zanzibar-style "manager
   * of"/"member of" hierarchy, say) has no acyclicity guarantee this library
   * can make on a caller's behalf, and an unbounded traversal over cyclic
   * data hangs the same way an unbounded remote call does. `undefined` is the
   * common case (the field is optional) and hands the resolver an explicitly
   * unbounded mandate — that is a real grant, not an oversight, and an
   * implementation accepting it must still terminate on its own. Every
   * resolver shipped with this library today (`relationshipResolverFromEdges`,
   * which `@qadi/testing`'s `relationships` option also builds) checks direct
   * edges only and ignores `depth` entirely, so it is not a tested reference for the
   * traversal case this obligation describes; a resolver that does traverse
   * has no conformance test to check itself against yet.
   */
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
 * `"Unknown"` means *nobody can say*. `RelationshipResolverNever` — the unwired
 * default — is the common source, but not the only one: a wired resolver may
 * answer it too, for a relation it has genuinely no answer for (a graph store
 * with no namespace for this relation, say). The port cannot tell the two
 * apart, which is why `evaluateHasRelationship` (`Walk.ts`, over
 * `PortAccess.ts`'s `askRelationship`) does not name wiring as the cause in the denial it produces (BEH-QD-045) — doing so would
 * assert a fact about a store INV-QD-029 forbids asserting without having
 * consulted it. A resolver that is wired and unreachable is a
 * `RelationshipResolveError`, which is an error, not an answer.
 */
export type RelatedResult = "Related" | "Unrelated" | "Unknown";

export interface RelationshipResolverShape {
  /** Which implementation this is. A label only — see `AttributeResolverShape`. */
  readonly name?: string | undefined;
  /**
   * Answers a relationship question.
   *
   * An implementation is not required to fail cleanly. `PortAccess.ts`'s
   * `askRelationship` catches a defect from this call and converts it
   * into this same `RelationshipResolveError`, matching
   * `AttributeResolverShape.resolve`'s own contract — see its doc comment for
   * why (issue #100).
   *
   * `request.subjectId` carries the same width `AttributeResolverShape.resolve`'s
   * `subjectId` does, for the same reason (JF-03): `Evaluate.ts`'s only call
   * site always asks about the subject being evaluated, but the field is not
   * narrowed to that in the type, because `@qadi/devtools`'s capture/sweep
   * tooling checks relationships for subjects outside the evaluation it is
   * instrumenting. An implementation must authorize an arbitrary subject id
   * safely, not assume it is always the one currently being evaluated.
   */
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
 * The relationship port, described once (`PortDescription.ts`).
 *
 * A request is keyed by `(subjectId, relation, resourceId)` — never by the
 * relation alone, and not by `depth`, which is traversal fuel rather than part
 * of the question.
 */
export const relationshipResolverPort: PortDescription<
  "RelationshipResolver",
  RelationshipResolver,
  RelationshipResolverShape,
  [request: RelationshipCheck],
  RelatedResult,
  RelationshipResolveError
> = {
  port: "RelationshipResolver",
  method: "check",
  span: "qadi.hasRelationship",
  service: RelationshipResolver,
  invoke: (shape) => (request) => shape.check(request),
  make: (name, call) => ({ name, check: call }),
  failure: ([request], cause) =>
    new RelationshipResolveError({
      relation: request.relation,
      resourceId: request.resourceId,
      cause,
    }),
  defect: ([request], cause) =>
    new RelationshipResolveError({
      relation: request.relation,
      resourceId: request.resourceId,
      cause: Cause.squash(cause),
    }),
  key: ([request]) => JSON.stringify([request.subjectId, request.relation, request.resourceId]),
  none: { name: "RelationshipResolverNever", answer: "Unknown" },
};

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
 * Derived from {@link relationshipResolverPort}'s `none` (ADR-QD-040).
 */
export const RelationshipResolverNever: Layer.Layer<RelationshipResolver> =
  nonePort(relationshipResolverPort);

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
 * Exported so a consumer building its own edge fixture can reuse this exact
 * class instead of pasting an identical one (as `@qadi/testing` once had to):
 * a value class with no
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
    name: "relationshipResolverFromEdges",
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
 * Additive, not a change to {@link RelationshipResolverShape} — the same
 * wrapper `attributeResolverRetrying` is for the sibling service, derived from
 * {@link relationshipResolverPort} by `PortDerivation.ts`'s `retryingPort`:
 * it annotates `qadi.attempts` on the caller's span and counts failed
 * attempts in `portRetriesTotal`.
 */
export const relationshipResolverRetrying: (
  schedule: Schedule.Schedule<unknown, RelationshipResolveError>,
) => (layer: Layer.Layer<RelationshipResolver>) => Layer.Layer<RelationshipResolver> =
  retryingPort(relationshipResolverPort);

/**
 * Wraps a resolver layer so no more than `permits` calls to `check` run at
 * once, queuing the rest.
 *
 * `Qadi.filter`'s `concurrency` bounds fan-out across policy evaluations, not
 * calls into this specific resolver, so a `HasRelationship`-heavy policy
 * evaluated over a large collection under `concurrency: "unbounded"` has
 * nothing else standing between it and this resolver's backing store.
 * `permits` that is not a positive integer fails construction with
 * `InvalidBoundedPermits`. Derived by `PortDerivation.ts`'s `boundedPort`.
 */
export const relationshipResolverBounded: (
  permits: number,
) => (
  layer: Layer.Layer<RelationshipResolver>,
) => Layer.Layer<RelationshipResolver, InvalidBoundedPermits> =
  boundedPort(relationshipResolverPort);

/**
 * Wraps a resolver layer so a `check` call that does not settle within
 * `duration` fails with a typed `RelationshipResolveError` instead of holding
 * its caller open indefinitely — the sibling of `attributeResolverTimingOut`
 * (JM-01/WV-01/SP-01); see that doc comment for why this is needed alongside,
 * not instead of, `*Retrying`/`*Bounded`, and for the composition order.
 * Derived by `PortDerivation.ts`'s `timingOutPort`.
 */
export const relationshipResolverTimingOut: (
  duration: Duration.Input,
) => (layer: Layer.Layer<RelationshipResolver>) => Layer.Layer<RelationshipResolver> =
  timingOutPort(relationshipResolverPort);
