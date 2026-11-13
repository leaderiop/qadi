/**
 * One evaluation environment, built from its parts, that states whether it
 * shadows the decision sink and the decision cache.
 *
 * The review layer and a simulation are the same environment: a ports layer, a
 * sequential id layer and a clock. They used to assemble it twice, one sealing
 * and one not, with nothing saying the difference was chosen. `Effect.provide`
 * adds to a context and cannot remove from one, so the only seal is shadowing;
 * `shadow` has no default because a forgotten seal is the defect INV-QD-042
 * exists to prevent, and a default would make either choice silent
 * (ADR-QD-146, INV-QD-311, INV-QD-312).
 *
 * The clock arrives as a layer because `@qadi/core` imports nothing from
 * Effect's testing modules; each package maps {@link EvaluationClock} to a layer
 * in one place.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import { decisionCacheLayer } from "./DecisionCache.ts";
import { DecisionSink } from "./DecisionSink.ts";
import { evaluationIdSequential } from "./EvaluationId.ts";
import type { StandingEvaluationServices } from "./EvaluationServices.ts";
import type { PortServices } from "./Ports.ts";

/**
 * Whether an environment shadows the decision sink and the decision cache.
 *
 * `none` is for an environment whose decisions are real and must reach an outer
 * sink and cache, the review layer's. `sinkAndCache` is for one whose decisions
 * are imagined, the simulator's.
 */
export type EvaluationShadowing = "none" | "sinkAndCache";

/**
 * Which clock an evaluation runs under.
 *
 * `live` measures the runtime's own clock; `deterministic` makes
 * `durationMillis` reproducibly zero, which is worth having when two runs are
 * being compared field by field.
 *
 * Neither changes the **trace**: a `Trace` carries no time at all, which is why
 * `diffTraces` is already deterministic under either.
 */
export type EvaluationClock = "live" | "deterministic";

/** What {@link evaluationEnvironment} is built from. Every field is required. */
export interface EvaluationEnvironmentOptions {
  /** The five ports, already built, so no package's fixture vocabulary crosses into core. */
  readonly ports: Layer.Layer<PortServices>;
  /** The prefix of the sequential evaluation ids the environment mints. */
  readonly idPrefix: string;
  /**
   * `Layer.empty` for the runtime's own clock, or a test clock layer. `Clock` is
   * a default service, so neither leaves a requirement behind.
   */
  readonly clock: Layer.Layer<never>;
  /** Whether the environment shadows the decision sink and the decision cache. */
  readonly shadow: EvaluationShadowing;
}

/**
 * The layer each shadowing choice installs, built once per layer build and never
 * on the evaluation path.
 */
const shadowing = (shadow: EvaluationShadowing) =>
  Match.value(shadow).pipe(
    Match.when("none", () => Layer.empty),
    Match.when("sinkAndCache", () =>
      Layer.merge(
        // A discarding sink rather than none: a service cannot be removed from a
        // context, so the only way to guarantee a simulation writes nothing is to
        // put a sink here that discards. Without it, a sweep run anywhere a real
        // sink is in scope fabricates audit rows.
        Layer.succeed(DecisionSink, { record: () => Effect.void }),
        // A private cache rather than none, for the same reason: this shadows the
        // application's, so an imagined decision neither reads a real entry nor
        // inserts a fabricated one that a real request would later hit.
        decisionCacheLayer(),
      ),
    ),
    Match.exhaustive,
  );

/**
 * Builds the standing services of one evaluation environment: the ports, an
 * evaluation id layer, the clock, and whatever `shadow` installs.
 *
 * No current subject: a caller that evaluates for one merges `currentSubjectLayer`
 * itself, and a subject-set evaluation supplies its own per element.
 */
export const evaluationEnvironment = (
  options: EvaluationEnvironmentOptions,
): Layer.Layer<StandingEvaluationServices> =>
  Layer.mergeAll(
    options.ports,
    evaluationIdSequential(options.idPrefix),
    options.clock,
    shadowing(options.shadow),
  );
