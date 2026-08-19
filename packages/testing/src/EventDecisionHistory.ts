/**
 * A history port over a static event list, recording its queries.
 *
 * A closed world: anything not listed is `"NotActed"`. `DecisionHistoryUnknown`
 * is the layer that says *nobody can say*, and it denies both polarities.
 */
import { DecisionHistory } from "@qadi/core";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";

/**
 * Compared structurally, not by a joined string key — see the identical
 * classes in `@qadi/core`'s `DecisionHistory.ts` for why.
 */
class ActedEvent extends Data.Class<{
  readonly subjectId: string;
  readonly event: string;
  readonly resourceId: string;
}> {}

class ActedAnywhere extends Data.Class<{
  readonly subjectId: string;
  readonly event: string;
}> {}

export const eventDecisionHistory = (
  events: ReadonlyArray<readonly [string, string, string]>,
): {
  readonly layer: Layer.Layer<DecisionHistory>;
  readonly calls: ReadonlyArray<string>;
} => {
  const keyed = HashSet.fromIterable(
    events.map(([subjectId, event, resourceId]) =>
      new ActedEvent({ subjectId, event, resourceId })),
  );
  const anywhere = HashSet.fromIterable(
    events.map(([subjectId, event]) => new ActedAnywhere({ subjectId, event })),
  );
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(DecisionHistory, {
      hasActed: (query) =>
        Effect.sync(() => {
          calls.push(
            query.resourceId === undefined
              ? `${query.subjectId} ${query.event}`
              : `${query.subjectId} ${query.event} ${query.resourceId}`,
          );
          const found =
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
                );
          return found ? "Acted" : "NotActed";
        }),
    }),
  };
};
