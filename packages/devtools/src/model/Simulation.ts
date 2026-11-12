/**
 * Screen 5's engine: run a policy against a subject that does not exist, and
 * answer for what *would* happen.
 *
 * Every other screen reads records. This one **evaluates**, which is a
 * different risk class and the reason the whole module is shaped around one
 * property: a simulation reaches no port it was not given, and records nothing
 * ([INV-QD-042](../../../../spec/invariants.md)).
 *
 * **The seal is shadowing, not omission, and that distinction is the bug I
 * nearly shipped.** `Effect.provide` *adds* to a context; it cannot remove from
 * one. So providing the five required services does not stop `evaluate` finding
 * an *optional* service that is already in scope — and `evaluate` reads two
 * optionally. Left unshadowed, a what-if sweep of eight edits writes eight
 * fabricated decisions into the real log and eight entries into the real cache,
 * indistinguishable on screen from decisions someone actually asked for.
 * Fabricating audit rows from a debug panel is a defect, not a trade-off, so
 * both are shadowed in every source mode, by the one choice `simulationLayer`
 * states to core's evaluation environment.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as TestClock from "effect/testing/TestClock";
import { currentSubjectLayer, Decided, evaluate, evaluationEnvironment, Failed } from "@qadi/core";
import type { DecisionOutcome, EvaluationClock, EvaluationServices, Policy } from "@qadi/core";
import { evaluationOptionsOf, subjectOf, type SimulationInput } from "./SimulationInput.ts";
import { portsOf, type SimulationSource } from "./SimulationSource.ts";

export interface SimulationOptions {
  readonly source?: SimulationSource;
  readonly clock?: EvaluationClock;
}

/**
 * Runs one policy against one imagined subject.
 *
 * `R` is `never` — every service is provided here — and the error channel is
 * `never` too: a broken resolver is a `Failed` **outcome**, the same value the
 * timeline carries, rather than a simulation that throws. A panel that could
 * crash on a fixture typo is a panel nobody trusts.
 */
export const simulate = (
  policy: Policy,
  input: SimulationInput,
  options?: SimulationOptions,
): Effect.Effect<DecisionOutcome> =>
  evaluate(policy, evaluationOptionsOf(input)).pipe(
    Effect.provide(simulationLayer(input, options)),
    Effect.result,
    Effect.map((outcome) =>
      Result.isSuccess(outcome)
        ? new Decided({ decision: outcome.success })
        : new Failed({ error: outcome.failure }),
    ),
  );

/**
 * The sealed environment, built fresh for every run.
 *
 * Exported so a test can prove the seal rather than trust it, and so a caller
 * running several simulations under one scope can see exactly what they get.
 * It asks core's environment for `shadow: "sinkAndCache"`, because a simulated
 * decision must never reach a real sink or cache (INV-QD-042, ADR-QD-146).
 */
export const simulationLayer = (
  input: SimulationInput,
  options?: SimulationOptions,
): Layer.Layer<EvaluationServices> =>
  Layer.merge(
    // Always the panel's subject, never a live one — the subject is the thing
    // being simulated, so taking it from anywhere else would defeat the screen.
    currentSubjectLayer(subjectOf(input.subject)),
    evaluationEnvironment({
      ports: portsOf(options?.source, input),
      idPrefix: "sim",
      clock: clockLayer(options?.clock ?? "live"),
      shadow: "sinkAndCache",
    }),
  );

/**
 * The one place this package turns the shared clock word into a layer.
 *
 * `Layer.empty` under `live`: the runtime's own `Clock` is already correct, and
 * providing a second one would only be a way to get it wrong. Annotated with what
 * the evaluation environment asks of a clock, which provides nothing the
 * evaluation requires by type.
 */
const clockLayer = (clock: EvaluationClock): Layer.Layer<never> =>
  clock === "deterministic" ? TestClock.layer() : Layer.empty;
