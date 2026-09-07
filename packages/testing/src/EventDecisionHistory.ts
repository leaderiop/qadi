/**
 * A history port over a static event list, recording its queries.
 *
 * The closed-world matching rule lives in `@qadi/core`'s
 * `decisionHistoryFromEvents` — this only adds call recording on top, the same
 * relationship `recordingSignatureHistory` and `edgeRelationshipResolver` have
 * with their own core-level plain builders. `DecisionHistoryUnknown` is the
 * layer that says *nobody can say*, and it denies both polarities.
 */
import { DecisionHistory, decisionHistoryFromEvents } from "@qadi/core";
import type { ActedEventInput } from "@qadi/core";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export const eventDecisionHistory = (
  events: ReadonlyArray<ActedEventInput>,
): {
  readonly layer: Layer.Layer<DecisionHistory>;
  readonly calls: ReadonlyArray<string>;
} => {
  const recorder = makeCallRecorder();
  const layer = Layer.effect(
    DecisionHistory,
    Effect.gen(function* () {
      const context = yield* Layer.build(decisionHistoryFromEvents(events));
      const inner = Context.get(context, DecisionHistory);
      return {
        name: "eventDecisionHistory",
        hasActed: (query) => {
          recorder.record(
            query.resourceId === undefined
              ? `${query.subjectId} ${query.event}`
              : `${query.subjectId} ${query.event} ${query.resourceId}`,
          );
          return inner.hasActed(query);
        },
      };
    }),
  );

  return {
    get calls() {
      return recorder.calls;
    },
    layer,
  };
};
