/**
 * What assistive technology is told when a simulation breaks.
 *
 * A broken run appears in the panel without any action on the reader's part beyond pressing
 * Run, so the heading of its box is an alert, as the stopped box's lead is: a reader who
 * cannot see the box appear is told that the run failed, and the block below it carries why.
 */
import { afterEach, assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import { Simulator } from "../../src/react/Simulator.tsx";
import { sighting } from "../simulationFixtures.ts";

const dying = portsLayer({
  AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
});

const scopes: Array<Scope.Closeable> = [];

afterEach(() => {
  for (const scope of scopes.splice(0)) Effect.runSync(Scope.close(scope, Exit.void));
});

describe("the broken-run box announcement", () => {
  it("SA1 a broken simulation's heading is the one alert in its box, and the reason block is not", async () => {
    const scope = Effect.runSync(Scope.make());
    scopes.push(scope);
    const session = Effect.runSync(
      Scope.provide(makeSimulationSession({ sightings: [sighting(hasAttribute("clearance", gte(5)))], ports: dying }), scope),
    );
    render(<Simulator session={session} />);
    act(() => {
      fireEvent.click(screen.getByTestId("qadi-source-Live"));
    });
    await act(async () => {
      fireEvent.click(screen.getByTestId("qadi-simulator-run"));
      for (let i = 0; i < 5; i++) await new Promise((resolve) => setTimeout(resolve, 0));
    });

    const box = screen.getByTestId("qadi-simulator-broke");
    const alerts = within(box).getAllByRole("alert");
    assert.strictEqual(alerts.length, 1);
    assert.strictEqual(alerts[0]?.textContent, "the simulation itself failed");
    assert.isFalse(alerts[0]?.contains(within(box).getByRole("group", { name: "Why the simulation failed" })) ?? true);
  });
});
