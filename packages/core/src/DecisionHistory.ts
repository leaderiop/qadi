/**
 * Answers questions about what a subject has already done: "has this approver
 * already raised this invoice?"
 *
 * A **port**, not a store. The history lives in the caller's system, behind this
 * interface, exactly as relationships do. Qadi holding accesses itself would
 * make it a system of record, which the URS forbids
 * ([ADR-QD-016](../../../spec/decisions/016-gxp-out-of-scope.md)).
 *
 * Read-only, and deliberately so. Recording that an approval happened is the
 * caller's write: an evaluator that writes is no longer reproducible, and Qadi
 * is called speculatively all the time — `filter` evaluates one policy across a
 * list, and React's `Can` re-evaluates on render, so a component mounting would
 * record accesses that never happened.
 */
import * as Cause from "effect/Cause";
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import type * as Duration from "effect/Duration";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import * as Schema from "effect/Schema";
import { DecisionHistoryUnavailable } from "./Errors.ts";
import type { InvalidBoundedPermits } from "./Errors.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";
import { boundedPort, nonePort, retryingPort, timingOutPort } from "./PortDerivation.ts";
import type { PortDescription } from "./PortDescription.ts";
import { sharedQuestionFields, sharedQuestionKeys, spanStruct } from "./PortSpanEncode.ts";

/**
 * What the port can say about a past event.
 *
 * Three values rather than two, and that is the whole of
 * [ADR-QD-020](../../../spec/decisions/020-decision-history-port.md). A boolean
 * has a polarity: whichever way an unwired default answers, it grants under one
 * of `hasActed`/`hasNotActed`. `"Unknown"` denies under both.
 *
 * `"Unknown"` means *nobody can say* — no store is wired. A store that is wired
 * and unreachable is a `DecisionHistoryUnavailable`, which is an error, not an
 * answer.
 */
export type ActedResult = "Acted" | "NotActed" | "Unknown";

export interface ActedQuery {
  readonly subjectId: SubjectId;
  /**
   * What was done before — `"raised"`, `"approved"`.
   *
   * An `event`, not an `action` and not a `relation`. The action is what the
   * caller is doing *now* (`hasAction`); a relation is an edge in the caller's
   * graph (`hasRelationship`); an event is what this subject did *before*.
   */
  readonly event: string;
  /** The resource it was done to. Absent when the question is "ever, at all". */
  readonly resourceId: ResourceId | undefined;
}

export interface DecisionHistoryShape {
  /** Which implementation this is. A label only — see `AttributeResolverShape`. */
  readonly name?: string | undefined;
  /**
   * Answers `hasActed`/`hasNotActed`.
   *
   * An implementation is not required to fail cleanly. `PortAccess.ts`'s
   * `askActedAny`/`askActedForResource` catch a defect from this call and
   * convert it into this same `DecisionHistoryUnavailable`, matching `AttributeResolverShape.resolve`'s
   * own contract — see its doc comment for why (issue #100).
   */
  readonly hasActed: (
    query: ActedQuery,
  ) => Effect.Effect<ActedResult, DecisionHistoryUnavailable>;
}

export class DecisionHistory extends Context.Service<
  DecisionHistory,
  DecisionHistoryShape
>()("qadi/DecisionHistory") {
  static readonly hasActed = (query: ActedQuery) =>
    DecisionHistory.use((h) => h.hasActed(query));
}

/**
 * What the history span says (BEH-QD-227). The answer is a closed three-valued
 * enum, so it discloses nothing a policy tag does not.
 */
const actedSpan = {
  question: spanStruct(
    {
      event: Schema.optionalKey(Schema.String),
      scope: Schema.optionalKey(Schema.Literals(["Any", "Resource"])),
      resourceId: Schema.optionalKey(Schema.String),
      ...sharedQuestionFields,
    },
    {
      event: "qadi.event",
      scope: "qadi.scope",
      resourceId: "qadi.resource_id",
      ...sharedQuestionKeys,
    },
  ),
  answer: spanStruct(
    { answer: Schema.optionalKey(Schema.Literals(["Acted", "NotActed", "Unknown"])) },
    { answer: "qadi.answer" },
  ),
  disclose: (answer: ActedResult) => ({ answer }),
};

/**
 * The decision-history port, described once (`PortDescription.ts`).
 *
 * A request is keyed by `(subjectId, event, resourceId)`, with an absent
 * resource as `null`, so an "ever, at all" question stays distinct from any
 * resource-scoped one.
 */
export const decisionHistoryPort: PortDescription<
  "DecisionHistory",
  DecisionHistory,
  DecisionHistoryShape,
  [query: ActedQuery],
  ActedResult,
  DecisionHistoryUnavailable,
  typeof actedSpan
> = {
  port: "DecisionHistory",
  method: "hasActed",
  span: "qadi.acted",
  attributes: actedSpan,
  service: DecisionHistory,
  invoke: (shape) => (query) => shape.hasActed(query),
  make: (name, call) => ({ name, hasActed: call }),
  failure: ([query], cause) => new DecisionHistoryUnavailable({ event: query.event, cause }),
  defect: ([query], cause) =>
    new DecisionHistoryUnavailable({ event: query.event, cause: Cause.squash(cause) }),
  key: ([query]) => JSON.stringify([query.subjectId, query.event, query.resourceId ?? null]),
  none: { name: "DecisionHistoryUnknown", answer: "Unknown" },
};

/**
 * Knows nothing, so every history policy denies.
 *
 * The default. Unlike `RelationshipResolverNever` this needs no polarity
 * argument: `"Unknown"` is not "did not act", so `hasNotActed` denies under it
 * just as `hasActed` does. That is why the port is three-valued
 * ([INV-QD-007](../../../spec/invariants.md#inv-qd-007-defaults-fail-closed)).
 * Derived from {@link decisionHistoryPort}'s `none` (ADR-QD-040).
 */
export const DecisionHistoryUnknown: Layer.Layer<DecisionHistory> = nonePort(decisionHistoryPort);

/**
 * One event to seed {@link decisionHistoryFromEvents} with.
 *
 * A named struct, not a `readonly [string, string, string]` positional
 * tuple — see {@link RelationshipEdgeInput} in `RelationshipResolver.ts` for
 * why: a tuple's field order is convention only, and a transposed call
 * type-checks cleanly while silently answering about the wrong subject or
 * event.
 */
export interface ActedEventInput {
  readonly subjectId: string;
  readonly event: string;
  readonly resourceId: string;
}

/** `(subjectId, event)` only — no resource, for an "ever, at all" question. */
export interface ActedAnywhereInput {
  readonly subjectId: string;
  readonly event: string;
}

/**
 * One `(subjectId, event, resourceId)` triple and one `(subjectId, event)`
 * pair, compared structurally rather than by a joined string key — a naive
 * `${a} ${b} ${c}` join collides whenever a segment itself contains the
 * delimiter. `Data.Class` gives per-field `Equal`/`Hash`, so `HashSet`
 * membership compares each field independently and the collision is
 * unrepresentable, not just harder to hit.
 *
 * Exported, as `RelationshipEdge` in `RelationshipResolver.ts` is: a value
 * class with no behaviour beyond structural equality has nothing to leak, and
 * a consumer building its own history fixture reuses these exact classes
 * rather than pasting identical ones.
 */
export class ActedEvent extends Data.Class<ActedEventInput> {}

export class ActedAnywhere extends Data.Class<ActedAnywhereInput> {}

/**
 * Resolves against a static event list.
 *
 * A closed world: anything not listed is `"NotActed"` rather than `"Unknown"`,
 * because this layer *is* the store and it does know. Suitable for tests and
 * small fixed policies.
 */
export const decisionHistoryFromEvents = (
  events: ReadonlyArray<ActedEventInput>,
): Layer.Layer<DecisionHistory> => {
  const keyed = HashSet.fromIterable(events.map((event) => new ActedEvent(event)));
  const anywhere = HashSet.fromIterable(
    events.map(({ subjectId, event }) => new ActedAnywhere({ subjectId, event })),
  );

  return Layer.succeed(DecisionHistory, {
    name: "decisionHistoryFromEvents",
    hasActed: (query) =>
      Effect.succeed(
        (
          query.resourceId === undefined
            ? HashSet.has(
                anywhere,
                new ActedAnywhere({ subjectId: query.subjectId, event: query.event }),
              )
            : HashSet.has(
                keyed,
                new ActedEvent({
                  subjectId: query.subjectId,
                  event: query.event,
                  resourceId: query.resourceId,
                }),
              )
        )
          ? "Acted"
          : "NotActed",
      ),
  });
};

/**
 * Wraps a history layer so every `hasActed` call retries on
 * `DecisionHistoryUnavailable` under the given schedule before surfacing it —
 * `attributeResolverRetrying` for this port: it annotates `qadi.attempts` on
 * the caller's span and counts failed attempts in `portRetriesTotal`. Derived
 * from {@link decisionHistoryPort} by `PortDerivation.ts`'s `retryingPort`.
 */
export const decisionHistoryRetrying: (
  schedule: Schedule.Schedule<unknown, DecisionHistoryUnavailable>,
) => (layer: Layer.Layer<DecisionHistory>) => Layer.Layer<DecisionHistory> =
  retryingPort(decisionHistoryPort);

/**
 * Wraps a history layer so no more than `permits` calls to `hasActed` run at
 * once, queuing the rest — `attributeResolverBounded` for this port. A history
 * policy evaluated over a large collection under `concurrency: "unbounded"`
 * otherwise reaches the audit store once per item, all at once. `permits` that
 * is not a positive integer fails construction with `InvalidBoundedPermits`.
 */
export const decisionHistoryBounded: (
  permits: number,
) => (
  layer: Layer.Layer<DecisionHistory>,
) => Layer.Layer<DecisionHistory, InvalidBoundedPermits> = boundedPort(decisionHistoryPort);

/**
 * Wraps a history layer so a `hasActed` call that does not settle within
 * `duration` fails with a typed `DecisionHistoryUnavailable` instead of
 * holding its caller open — `attributeResolverTimingOut` for this port (see
 * its doc comment for the composition order), and counts in
 * `portTimeoutsTotal`. A hung audit store held an evaluation open with no
 * library-provided deadline until every port had this wrapper (ARCH-10 E1).
 */
export const decisionHistoryTimingOut: (
  duration: Duration.Input,
) => (layer: Layer.Layer<DecisionHistory>) => Layer.Layer<DecisionHistory> =
  timingOutPort(decisionHistoryPort);
