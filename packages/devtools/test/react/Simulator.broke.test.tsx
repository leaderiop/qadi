/**
 * How the simulator shows a broken run, and the stopped box reason it shares its look with.
 *
 * A broken run is a defect the panel must show, and the message is a stack trace the reader
 * has to be able to scroll and focus, so it sits in the same labelled, focusable block the
 * stopped box gives a feed's reason. The first row pins that block as the stopped box draws
 * it, so the other three can say the simulator draws the same one.
 *
 * These rows were written before the simulator took that block, and the file is held byte
 * for byte from the commit that adds it.
 */
import { afterEach, assert, describe, it } from "@effect/vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Scope from "effect/Scope";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import { makeSimulationSession } from "../../src/model/SimulationSession.ts";
import type { SimulationSessionInit } from "../../src/model/SimulationSession.ts";
import { Simulator } from "../../src/react/Simulator.tsx";
import { noStops } from "../../src/model/StopLedger.ts";
import { StoppedBox } from "../../src/react/StoppedBox.tsx";
import { sighting } from "../simulationFixtures.ts";

/**
 * The `style` attribute of the stopped box's reason block, measured before the style moved
 * to the shared theme.
 */
const REASON_STYLE =
  "margin: 8px 0px 0px; padding: 8px; background: #14161a; border: 1px solid #2a2f39; border-radius: 4px; font-family: inherit; font-size: 11px; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 96px; overflow: auto;";

const dying = portsLayer({
  AttributeResolver: Layer.effect(AttributeResolver, Effect.die(new Error("the layer exploded"))),
});

const scopes: Array<Scope.Closeable> = [];

afterEach(() => {
  for (const scope of scopes.splice(0)) Effect.runSync(Scope.close(scope, Exit.void));
});

const mount = (init: SimulationSessionInit) => {
  const scope = Effect.runSync(Scope.make());
  scopes.push(scope);
  const session = Effect.runSync(Scope.provide(makeSimulationSession(init), scope));
  return { session, view: render(<Simulator session={session} />) };
};

/** Clicks the run button and lets real ticks pass, so a run on a detached fiber settles. */
const run = async () => {
  await act(async () => {
    fireEvent.click(screen.getByTestId("qadi-simulator-run"));
    for (let i = 0; i < 5; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
  });
};

/** A simulator over a layer that dies, on its Live source, after one run. */
const broken = async () => {
  const mounted = mount({ sightings: [sighting(hasAttribute("clearance", gte(5)))], ports: dying });
  act(() => {
    fireEvent.click(screen.getByTestId("qadi-source-Live"));
  });
  await run();
  return mounted;
};

/** The reason block of the broken-run box, found by its role and label. */
const whyBroke = () =>
  within(screen.getByTestId("qadi-simulator-broke")).getByRole("group", { name: "Why the simulation failed" });

describe("the stopped box reason", () => {
  it("SB1 the stopped box shows its reason in a labelled focusable pre whose style is the reason style", () => {
    const reason = "first line of the reason\nsecond line of the reason";
    render(
      <StoppedBox
        notice={{ status: "stopped", onRestart: () => undefined, announced: { ledger: noStops, record: () => undefined } }}
        reason={reason}
        lead="Timeline stopped."
        body="It stopped."
        reasonLabel="Why the timeline stopped"
        restartLabel="Restart timeline"
        feed="timeline"
      />,
    );

    const block = screen.getByRole("group", { name: "Why the timeline stopped" });
    assert.strictEqual(block.tagName, "PRE");
    assert.strictEqual(block.tabIndex, 0);
    assert.strictEqual(block.textContent, reason);
    assert.strictEqual(block.getAttribute("style"), REASON_STYLE);
  });
});

describe("a broken simulation", () => {
  it("SB2 a broken simulation shows its message in a labelled focusable pre", async () => {
    await broken();

    const block = whyBroke();
    assert.strictEqual(block.tagName, "PRE");
    assert.strictEqual(block.tabIndex, 0);
    assert.include(screen.getByTestId("qadi-simulator-broke").textContent ?? "", "the simulation itself failed");
  });

  it("SB3 the broken simulation pre holds the message exactly, its first line the error", async () => {
    const { session } = await broken();

    const state = session.getSnapshot().run;
    assert.strictEqual(state._tag, "Broke");
    const message = state._tag === "Broke" ? state.message : "";
    const block = whyBroke();
    assert.strictEqual(block.textContent, message);
    assert.strictEqual((block.textContent ?? "").split("\n")[0], "Error: the layer exploded");
  });

  it("SB4 the broken simulation pre has the stopped box reason style", async () => {
    await broken();

    assert.strictEqual(whyBroke().getAttribute("style"), REASON_STYLE);
  });
});
