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
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { DecisionHistoryUnavailable } from "./Errors.ts";

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
  readonly subjectId: string;
  /**
   * What was done before — `"raised"`, `"approved"`.
   *
   * An `event`, not an `action` and not a `relation`. The action is what the
   * caller is doing *now* (`hasAction`); a relation is an edge in the caller's
   * graph (`hasRelationship`); an event is what this subject did *before*.
   */
  readonly event: string;
  /** The resource it was done to. Absent when the question is "ever, at all". */
  readonly resourceId: string | undefined;
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
 * Resolves against a static event list of `[subjectId, event, resourceId]`.
 *
 * A closed world: anything not listed is `"NotActed"` rather than `"Unknown"`,
 * because this layer *is* the store and it does know. Suitable for tests and
 * small fixed policies.
 */
export const decisionHistoryFromEvents = (
  events: ReadonlyArray<readonly [string, string, string]>,
): Layer.Layer<DecisionHistory> => {
  const keyed = new Set(events.map(([s, e, r]) => `${s} ${e} ${r}`));
  const anywhere = new Set(events.map(([s, e]) => `${s} ${e}`));

  return Layer.succeed(DecisionHistory, {
    hasActed: (query) =>
      Effect.succeed(
        (
          query.resourceId === undefined
            ? anywhere.has(`${query.subjectId} ${query.event}`)
            : keyed.has(`${query.subjectId} ${query.event} ${query.resourceId}`)
        )
          ? "Acted"
          : "NotActed",
      ),
  });
};
