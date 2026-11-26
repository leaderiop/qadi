/**
 * The text a broken simulation run reports, pinned through the session's interface.
 *
 * The session reports a broken run in the text the timeline and diagnostics feeds use for
 * their stop, so the three read alike: the first line of a defect is the error itself, a
 * value that cannot be described reads as one placeholder, and an interruption names its
 * cause. `String` of a cause never throws, so this is uniformity between the three readers
 * and not a defect fix.
 *
 * These rows were written before the session took that text from the shared reader, and the
 * file is held byte for byte from the commit that adds it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import type { SimulationInput } from "../../src/model/SimulationInput.ts";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { RunState } from "../../src/model/SimulationSession.ts";
import { hostile } from "../helpers.ts";
import { ran, sighting } from "../simulationFixtures.ts";

const clearance = hasAttribute("clearance", gte(5));

/** What a fixture answers: enough that `clearance` allows, so a run that lands would show. */
const withClearance: SimulationInput = {
  subject: { id: "alice" },
  attributes: { clearance: 9 },
};

/** One Live run over `ports`, settled, and the run state the session ends on. */
const liveRunOver = (ports: ReturnType<typeof portsLayer>) =>
  Effect.gen(function* () {
    const session = yield* makeSimulationSession({ sightings: [sighting(clearance)], ports });
    session.chooseSource("Live");
    session.edit(withClearance);
    yield* ran(session);
    return session.getSnapshot().run;
  });

/** The message of a broken run, or a text naming the state a run that did not break ended on. */
const messageOf = (run: RunState): string => (run._tag === "Broke" ? run.message : `not Broke: ${run._tag}`);

describe("the text a broken simulation run reports", () => {
  it.effect("SX1 a run whose ports layer dies reports its cause in the text the feeds use: first line the error, never a Cause wrapper", () =>
    Effect.gen(function* () {
      const run = yield* liveRunOver(
        portsLayer({ AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))) }),
      );
      const message = messageOf(run);

      assert.strictEqual(run._tag, "Broke");
      assert.isFalse(message.startsWith("Cause("), message);
      assert.strictEqual(message.split("\n")[0], "Error: the layer exploded");
    }));

  it.effect("SX2 a run whose ports layer dies with a value that cannot be described reports the one placeholder, as the feeds do", () =>
    Effect.gen(function* () {
      const run = yield* liveRunOver(
        portsLayer({ AttributeResolver: Layer.effect(AttributeResolver, Effect.die(hostile)) }),
      );

      assert.strictEqual(run._tag, "Broke");
      assert.strictEqual(messageOf(run), "a value that could not be described");
    }));

  it.effect("SX3 a run whose resolver interrupts itself reports the interruption in the text the feeds use", () =>
    Effect.gen(function* () {
      const run = yield* liveRunOver(
        portsLayer({
          AttributeResolver: Layer.succeed(AttributeResolver, {
            name: "self-interrupt",
            resolve: () => Effect.interrupt,
          }),
        }),
      );
      const message = messageOf(run);

      assert.strictEqual(run._tag, "Broke");
      assert.isFalse(message.startsWith("Cause("), message);
      assert.include(message, "InterruptError");
    }));
});
