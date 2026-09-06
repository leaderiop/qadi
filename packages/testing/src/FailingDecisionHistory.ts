/**
 * A decision history port that always fails.
 *
 * For asserting that a broken history lookup surfaces as an error rather than
 * being silently reported as a denial — mirrors `failingAttributeResolver`.
 */
import { DecisionHistory, DecisionHistoryUnavailable } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const failingDecisionHistory = (
  cause: unknown = "test failure",
): Layer.Layer<DecisionHistory> =>
  Layer.succeed(DecisionHistory, {
    hasActed: (query) =>
      Effect.fail(new DecisionHistoryUnavailable({ event: query.event, cause })),
  });
