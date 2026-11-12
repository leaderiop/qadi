/**
 * What only React can get wrong about a session's scope: who builds it, who
 * closes it, and when it first exists.
 *
 * The rules a session keeps are proved without a DOM in
 * `test/model/SimulationSession.test.ts`; `Simulator.test.tsx` renders a session
 * its own test built. With `Simulator` a view of its session, these are the only
 * tests of the scope's owners (ARCH-73, ADR-QD-137). The dock's simulation session
 * lives in `useDockModel`'s scope (ARCH-74, D-13), so the two cases that need a
 * session's owner drive that hook.
 */
import { assert, describe, it, vi } from "@effect/vitest";
import { act, renderHook, render, waitFor } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Activity, StrictMode, useState } from "react";
import { useDockModel } from "../../src/react/useDockModel.ts";
import { useScoped } from "../../src/react/useScoped.ts";
import { AttributeResolver, gte, hasAttribute, portsLayer } from "@qadi/core";
import { policyLabel } from "../../src/model/Catalogue.ts";
import type { PolicySighting } from "../../src/model/Catalogue.ts";
import type { DockModel } from "../../src/model/DockModel.ts";
import { sourceFromRecords } from "../../src/model/Source.ts";
import { emptyTimeline, ingestAll } from "../../src/model/Timeline.ts";
import { useSimulationSession } from "../../src/react/useSimulationSession.ts";
import type { UseSimulationSessionInput } from "../../src/react/useSimulationSession.ts";
import { decisionRecord } from "../helpers.ts";

const clearance = hasAttribute("clearance", gte(5));

const sighting: PolicySighting = {
  policy: clearance,
  label: policyLabel(clearance),
  count: 1,
  allows: 1,
  denies: 0,
  errors: 0,
  lastAt: 100,
};
const sightings = [sighting];

/** One empty source, so `configure` sees one identity per field however often a case renders. */
const source = sourceFromRecords([]);

/** A resolver that takes a second, and counts how it ended. */
const slow = () => {
  const tally = { started: 0, finished: 0, interrupted: 0 };
  const ports = portsLayer({
    AttributeResolver: Layer.succeed(AttributeResolver, {
      name: "slow",
      resolve: () =>
        Effect.sync(() => {
          tally.started += 1;
        }).pipe(
          Effect.andThen(Effect.sleep("1 second")),
          Effect.onInterrupt(() =>
            Effect.sync(() => {
              tally.interrupted += 1;
            }),
          ),
          Effect.andThen(
            Effect.sync(() => {
              tally.finished += 1;
              return 9;
            }),
          ),
        ),
    }),
  });
  return { tally, ports };
};

describe("the component that owns a session's scope", () => {
  it("keeps a run alive through StrictMode's double mount, and stops it on unmount", async () => {
    const { tally, ports } = slow();
    const catalogue = { policies: { clearance } };
    let owned: DockModel | undefined;
    const Probe = () => {
      owned = useDockModel({ source, catalogue, ports });
      return null;
    };

    const view = render(
      <StrictMode>
        <Probe />
      </StrictMode>,
    );
    const model = owned;
    assert.isDefined(model);
    if (model === undefined) return;

    act(() => {
      model.simulation.chooseSource("Live");
      model.simulation.run("Run");
    });
    await waitFor(() => assert.strictEqual(tally.started, 1));

    // The first mount's scope was closed by StrictMode before this one was built,
    // so nothing of it can reach this run.
    assert.strictEqual(model.simulation.getSnapshot().run._tag, "Running");
    assert.strictEqual(tally.interrupted, 0);

    view.unmount();
    await waitFor(() => assert.strictEqual(tally.interrupted, 1));
    assert.strictEqual(tally.finished, 0);
  });
});

describe("the scope a build that threw had already filled", () => {
  it("is closed, not left open behind the error", () => {
    const released = { count: 0 };
    const Probe = () => {
      useScoped(() =>
        Effect.gen(function* () {
          yield* Effect.addFinalizer(() =>
            Effect.sync(() => {
              released.count += 1;
            }),
          );
          return yield* Effect.die("the build threw");
        }),
      );
      return null;
    };

    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      assert.throws(() => render(<Probe />));
    } finally {
      quiet.mockRestore();
    }

    assert.strictEqual(released.count, 1);
  });
});

describe("a hidden-then-shown tree (React's Activity)", () => {
  it("never leaves a child holding the closed session its owner replaced", () => {
    let owned: DockModel | undefined;
    let held: DockModel | undefined;
    // Reads the model once, as `DockFrame`'s readers do.
    const Child = ({ model }: { readonly model: DockModel }) => {
      const [once] = useState(() => model);
      held = once;
      return null;
    };
    const Owner = () => {
      owned = useDockModel({ source });
      return owned === undefined ? null : <Child model={owned} />;
    };
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Owner />
      </Activity>
    );

    const view = render(<App mode="visible" />);
    const first = owned;
    assert.isDefined(first);
    assert.strictEqual(held, first);

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);

    assert.isDefined(owned);
    assert.notStrictEqual(owned, first);
    assert.strictEqual(held, owned);
  });
});

describe("useSimulationSession", () => {
  it("is nothing before its session exists, then a view of it", () => {
    const seen: Array<ReturnType<typeof useSimulationSession>> = [];
    const { result } = renderHook(() => {
      const view = useSimulationSession({ sightings });
      seen.push(view);
      return view;
    });

    assert.isUndefined(seen[0]);
    assert.isDefined(result.current);
    assert.deepStrictEqual(result.current?.snapshot.sightings, sightings);
  });

  it("seeds the session when its seed prop arrives, and not before", () => {
    const [entry] = ingestAll(emptyTimeline(), [
      decisionRecord({ evaluationId: "ev-91", policy: clearance, action: "read" }),
    ]).entries;
    assert.isDefined(entry);
    const first: UseSimulationSessionInput = { sightings };
    const { result, rerender } = renderHook(
      (props: UseSimulationSessionInput) => useSimulationSession(props),
      { initialProps: first },
    );
    assert.strictEqual(result.current?.snapshot.policy._tag, "Listed");

    rerender({ sightings, seed: entry });

    assert.strictEqual(result.current?.snapshot.policy._tag, "Seeded");
    assert.strictEqual(result.current?.snapshot.draft.action, "read");
  });
});
