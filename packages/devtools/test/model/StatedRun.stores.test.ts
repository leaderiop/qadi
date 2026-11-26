/**
 * The rows that pin each store's own use of the stated run.
 *
 * `StatedRun.test.ts` pins the module through a plan of its own. A store hands the module a
 * stop and an engine, and a few of the store's own lines are reached only through that handoff:
 * what the session shows when its run dies where its own exit read cannot see it, and what a
 * closed session still publishes. Each row is stated against `makeSimulationSession` and nothing else.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import * as Tracer from "effect/Tracer";
import { gte, hasAttribute } from "@qadi/core";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import { settleTurns } from "../helpers.ts";
import { counted, sighting, slow } from "../simulationFixtures.ts";

const clearance = hasAttribute("clearance", gte(5));

/** What a fixture answers: enough that `clearance` allows, so a run that lands would show. */
const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};

/** The name the session gives the span of every run it lands. */
const RUN_SPAN = "qadi.devtools.simulationSession.run";

/** A tracer whose run span cannot be opened, so the run dies before it reads its own exit. */
const refusingRunSpan = Layer.succeed(
  Tracer.Tracer,
  Tracer.make({
    span: (options) => {
      if (options.name === RUN_SPAN) throw new Error("the run span was refused");
      return new Tracer.NativeSpan(options);
    },
  }),
);

describe("the simulation session's own use of the stated run", () => {
  it.effect("SS1 a run that dies before it reads its own exit reads Broke with the first line of the error, published once", () =>
    Effect.gen(function* () {
      const session = yield* makeSimulationSession({ sightings: [sighting(clearance)], ports: slow().ports }).pipe(
        Effect.provide(refusingRunSpan),
      );
      session.chooseSource("Live");
      session.edit(withClearance);
      const seen = counted(session);

      session.run("Run");
      yield* settleTurns;
      const run = session.getSnapshot().run;

      assert.strictEqual(run._tag, "Broke");
      assert.strictEqual(run._tag === "Broke" ? run.message.split("\n")[0] : "", "Error: the run span was refused");
      assert.deepStrictEqual(run._tag === "Broke" ? run.question.input : undefined, withClearance);
      // The `Running` the run publishes as it starts, then the one `Broke`.
      assert.strictEqual(seen.notified, 2);
    }));

  it.effect("SS2 a run asked of a closed session publishes nothing, even a refusal", () =>
    Effect.gen(function* () {
      const scope = Scope.makeUnsafe();
      // No ports, so a Live run is refused rather than started.
      const session = yield* Scope.provide(makeSimulationSession({ sightings: [sighting(clearance)] }), scope);
      session.chooseSource("Live");
      session.edit(withClearance);
      yield* Scope.close(scope, Exit.void);
      const seen = counted(session);

      session.run("Run");
      yield* settleTurns;

      assert.strictEqual(seen.notified, 0);
      assert.strictEqual(session.getSnapshot().run._tag, "Idle");
    }));
});
