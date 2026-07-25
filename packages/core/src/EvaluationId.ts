/**
 * Generates the identifier that correlates a decision with its logs and spans.
 *
 * A service rather than a direct `crypto.randomUUID()` call so that tests can
 * make identifiers deterministic. This is the sanctioned boundary for that
 * call; `scripts/check-house-style.mjs` allows it here and nowhere else.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export interface EvaluationIdShape {
  readonly next: Effect.Effect<string>;
}

export class EvaluationId extends Context.Service<EvaluationId, EvaluationIdShape>()(
  "guard/EvaluationId",
) {
  static readonly next = EvaluationId.use((s) => s.next);
}

/** Random identifiers. The production default. */
export const EvaluationIdLive: Layer.Layer<EvaluationId> = Layer.succeed(EvaluationId, {
  next: Effect.sync(() => crypto.randomUUID()),
});

/** Monotonic identifiers `eval-1`, `eval-2`, … for reproducible tests. */
export const evaluationIdSequential = (prefix = "eval"): Layer.Layer<EvaluationId> =>
  Layer.sync(EvaluationId, () => {
    let counter = 0;
    return {
      next: Effect.sync(() => {
        counter += 1;
        return `${prefix}-${counter}`;
      }),
    };
  });
