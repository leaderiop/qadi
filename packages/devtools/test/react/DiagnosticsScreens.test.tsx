/**
 * What the dock's screens show of its diagnostics store, rendered.
 *
 * The store is the dock model's, so its behaviour is pinned headlessly in
 * `DockModel.test.ts` and `DiagnosticsFeed.test.ts`. These cases prove the dock hands
 * its inputs over at build and on change, and renders what the store holds.
 */
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Activity, useState } from "react";
import { WiringRead, type DiagnosticsReading } from "../../src/model/DiagnosticsStore.ts";
import type { DiagnosticsDockOptions } from "../../src/model/DiagnosticsFeed.ts";
import type { PortActivity, WiringReport } from "../../src/model/Wiring.ts";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";

const counting = (build: Effect.Effect<void>) => {
  const counts = { builds: 0, releases: 0 };
  const layer = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.andThen(
        build,
        Effect.sync(() => {
          counts.builds += 1;
        }),
      ),
      () =>
        Effect.sync(() => {
          counts.releases += 1;
        }),
    ),
  );
  return { counts, layer };
};

/** A layer whose build is synchronous, counted on acquire and release. */
const counted = () => counting(Effect.void);

/** The same, but its build takes 30 ms, so "before it has rebuilt" is a window a test can stand in. */
const slowCounted = () => counting(Effect.sleep("30 millis"));

const services = () => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
  });
};

const activityOf = (calls: number): ReadonlyArray<PortActivity> => [
  { port: "AttributeResolver", calls, retries: 0, timeouts: 0, translationCalls: 0 },
];

const portActivityText = () =>
  screen
    .getAllByTestId("qadi-port")
    .filter((node) => node.getAttribute("data-port") === "AttributeResolver")
    .map((node) => node.querySelector("[data-testid='qadi-port-activity']")?.textContent ?? "")
    .join("|");

const suppliedWiring: WiringReport = {
  ports: [
    {
      port: "AttributeResolver",
      name: "record",
      required: true,
      present: true,
      defaulted: undefined,
      consequence: "an unanswered attribute denies",
    },
  ],
  cache: { present: true, size: 9 },
};

describe("the dock's diagnostics screens", () => {
  it("D1 a synchronous layer is built once and its report is on screen in the render that mounts the dock", () => {
    const { counts, layer } = counted();
    const held: DiagnosticsDockOptions = { layer };
    render(<DevtoolsDock diagnostics={held} />);
    assert.strictEqual(counts.builds, 1);

    services();
    assert.isNotNull(screen.getByTestId("qadi-cache-card"));
  });

  it("D2 changing only reading updates the screen and builds the layer once, with no release", async () => {
    const { counts, layer } = counted();
    const held: DiagnosticsDockOptions = { layer };
    const one: DiagnosticsReading = { activity: activityOf(1) };
    const three: DiagnosticsReading = { activity: activityOf(3) };
    const Host = () => {
      const [reading, setReading] = useState(one);
      return (
        <div>
          <button type="button" onClick={() => setReading(three)}>
            more calls
          </button>
          <DevtoolsDock diagnostics={held} reading={reading} />
        </div>
      );
    };
    render(<Host />);
    services();
    await vi.waitFor(() => {
      assert.include(portActivityText(), "1 call");
    });
    assert.notInclude(portActivityText(), "3 calls");

    await act(async () => {
      screen.getByText("more calls").click();
    });
    await vi.waitFor(() => {
      assert.include(portActivityText(), "3 calls");
    });
    assert.strictEqual(counts.builds, 1);
    assert.strictEqual(counts.releases, 0);
  });

  it("D3 a hidden-then-shown dock shows the supplied reading in its first frame, while its own sample is pending", async () => {
    const { counts, layer } = slowCounted();
    const held: DiagnosticsDockOptions = { layer };
    const supplied: DiagnosticsReading = {
      wiring: WiringRead.Read({ report: suppliedWiring }),
      activity: activityOf(7),
    };
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <DevtoolsDock diagnostics={held} reading={supplied} />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    services();
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 1);
    });

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);
    services();

    // The rebuilt model has taken nothing yet, so what is on screen is the supplied reading.
    assert.strictEqual(counts.builds, 1);
    assert.include(portActivityText(), "7 calls");
    assert.include(screen.getByTestId("qadi-cache-size").textContent ?? "", "9 completed entries");

    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 2);
    });
    assert.include(portActivityText(), "7 calls");
  });
});
