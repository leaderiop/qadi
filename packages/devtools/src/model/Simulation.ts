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
 * both are shadowed here in every source mode.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as TestClock from "effect/testing/TestClock";
import {
  currentSubjectLayer,
  Decided,
  decisionCacheLayer,
  DecisionSink,
  evaluate,
  evaluationIdSequential,
  Failed,
} from "@qadi/core";
import type { DecisionOutcome, Policy } from "@qadi/core";
import { evaluationOptionsOf, subjectOf, type SimulationInput } from "./SimulationInput.ts";
import { portsOf, type SimulationSource } from "./Sources.ts";

/**
 * Which clock a simulated evaluation runs under.
 *
 * `live` measures the browser and the screen says so; `deterministic` makes
 * `durationMillis` reproducibly zero, which is worth having when two runs are
 * being compared field by field.
 *
 * Neither changes the **trace**: a `Trace` carries no time at all, which is why
 * `diffTraces` is already deterministic under either — and why the gap
 * `02-screens.md` recorded here ("a simulator must wire `TestClock` itself")
 * turned out to be about display rather than about correctness.
 */
export type SimulationClock = "live" | "deterministic";

export interface SimulationOptions {
  readonly source?: SimulationSource;
  readonly clock?: SimulationClock;
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
 */
export const simulationLayer = (input: SimulationInput, options?: SimulationOptions) =>
  Layer.mergeAll(
    // Always the panel's subject, never a live one — the subject is the thing
    // being simulated, so taking it from anywhere else would defeat the screen.
    currentSubjectLayer(subjectOf(input.subject)),
    portsOf(options?.source, input),
    evaluationIdSequential("sim"),
    clockLayer(options?.clock ?? "live"),

    // ── shadowed on purpose, in every source mode ──
    //
    // A no-op sink rather than no sink: there is no way to *remove* a service
    // from a context, so the only way to guarantee a simulation writes nothing
    // is to put a sink here that discards. Without it, a sweep run anywhere a
    // real sink is in scope fabricates audit rows.
    Layer.succeed(DecisionSink, { record: () => Effect.void }),
    // A private cache rather than none, for the same reason: this shadows the
    // application's, so a simulation neither reads a real entry nor inserts a
    // fabricated one that a real request would later hit.
    decisionCacheLayer(),
  );

/**
 * `Layer.empty` under a live clock: the runtime's own `Clock` is already
 * correct, and providing a second one would only be a way to get it wrong.
 */
const clockLayer = (clock: SimulationClock) =>
  clock === "live" ? Layer.empty : TestClock.layer();
