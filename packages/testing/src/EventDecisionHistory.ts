/**
 * A history port over a static event list, recording its queries.
 *
 * A closed world: anything not listed is `"NotActed"`. `DecisionHistoryUnknown`
 * is the layer that says *nobody can say*, and it denies both polarities.
 */
import { DecisionHistory } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const eventDecisionHistory = (
  events: ReadonlyArray<readonly [string, string, string]>,
): {
  readonly layer: Layer.Layer<DecisionHistory>;
  readonly calls: ReadonlyArray<string>;
} => {
  const keyed = new Set(events.map(([s, e, r]) => `${s} ${e} ${r}`));
  const anywhere = new Set(events.map(([s, e]) => `${s} ${e}`));
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(DecisionHistory, {
      hasActed: (query) =>
        Effect.sync(() => {
          const key =
            query.resourceId === undefined
              ? `${query.subjectId} ${query.event}`
              : `${query.subjectId} ${query.event} ${query.resourceId}`;
          calls.push(key);
          const found =
            query.resourceId === undefined ? anywhere.has(key) : keyed.has(key);
          return found ? "Acted" : "NotActed";
        }),
    }),
  };
};
