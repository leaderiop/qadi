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
import * as Context from "effect/Context";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import type { DecisionHistoryUnavailable } from "./Errors.ts";
import type { ResourceId, SubjectId } from "./Identity.ts";

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
 * Knows nothing, so every history policy denies.
 *
 * The default. Unlike `RelationshipResolverNever` this needs no polarity
 * argument: `"Unknown"` is not "did not act", so `hasNotActed` denies under it
 * just as `hasActed` does. That is why the port is three-valued
 * ([INV-QD-007](../../../spec/invariants.md#inv-qd-007-defaults-fail-closed)).
 */
export const DecisionHistoryUnknown: Layer.Layer<DecisionHistory> = Layer.succeed(
  DecisionHistory,
  { hasActed: () => Effect.succeed("Unknown") },
);

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
 * Exported so `@qadi/testing`'s `eventDecisionHistory` can reuse these exact
 * classes instead of pasting identical ones — see `RelationshipEdge` in
 * `RelationshipResolver.ts` for the same reasoning.
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
