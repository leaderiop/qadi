/**
 * A history port over a static event list, recording its queries.
 *
 * A closed world: anything not listed is `"NotActed"`. `DecisionHistoryUnknown`
 * is the layer that says *nobody can say*, and it denies both polarities.
 */
import { ActedAnywhere, ActedEvent, DecisionHistory } from "@qadi/core";
import type { ActedEventInput } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export const eventDecisionHistory = (
  events: ReadonlyArray<ActedEventInput>,
): {
  readonly layer: Layer.Layer<DecisionHistory>;
  readonly calls: ReadonlyArray<string>;
} => {
  const keyed = HashSet.fromIterable(events.map((event) => new ActedEvent(event)));
  const anywhere = HashSet.fromIterable(
    events.map(({ subjectId, event }) => new ActedAnywhere({ subjectId, event })),
  );
  const recorder = makeCallRecorder();
  return {
    get calls() {
      return recorder.calls;
    },
    layer: Layer.succeed(DecisionHistory, {
      hasActed: (query) =>
        Effect.sync(() => {
          recorder.record(
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
