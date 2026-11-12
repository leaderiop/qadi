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

const reactTab = () => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "React" }));
  });
};

/** A question source that throws on its first call and answers nothing after. */
const throwsFirst = () => {
  const state = { calls: 0 };
  const questions = (): ReadonlyArray<never> => {
    state.calls += 1;
    if (state.calls === 1) throw new Error("questions blew up");
    return [];
  };
  return { state, questions };
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

  it("D4 a stopped poll is stated on Services with its reason, and a restart brings the screen back", async () => {
    const { questions } = throwsFirst();
    const held: DiagnosticsDockOptions = { questions };
    render(<DevtoolsDock diagnostics={held} />);
    services();

    await vi.waitFor(() => {
      assert.strictEqual(
        screen.getByTestId("qadi-services").getAttribute("data-diagnostics-status"),
        "Stopped",
      );
    });
    const notice = screen.getByTestId("qadi-diagnostics-stopped");
    assert.strictEqual(notice.getAttribute("data-sampled"), "false");
    assert.strictEqual(notice.getAttribute("data-announce"), "alert");
    assert.strictEqual(notice.getAttribute("role"), "alert");
    assert.include(screen.getByTestId("qadi-diagnostics-reason").textContent ?? "", "questions blew up");
    assert.isNull(screen.queryByTestId("qadi-wiring-absent"));

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: "Restart diagnostics" }));
    });
    assert.isNull(screen.queryByTestId("qadi-diagnostics-restart"));
    await vi.waitFor(() => {
      assert.strictEqual(
        screen.getByTestId("qadi-services").getAttribute("data-diagnostics-status"),
        "Live",
      );
    });
    assert.isNull(screen.queryByTestId("qadi-diagnostics-stopped"));
    assert.isNull(screen.queryByTestId("qadi-diagnostics-starting"));
    assert.isNotNull(screen.getByTestId("qadi-wiring-absent"));
    assert.strictEqual(document.activeElement, screen.getByTestId("qadi-services"));
  });

  it("D5 on the React tab a poll stopped before any sample states the stop and withholds the not-handed copy", async () => {
    const { questions } = throwsFirst();
    const held: DiagnosticsDockOptions = { questions };
    render(<DevtoolsDock diagnostics={held} />);
    reactTab();

    await vi.waitFor(() => {
      assert.strictEqual(
        screen.getByTestId("qadi-questions").getAttribute("data-diagnostics-status"),
        "Stopped",
      );
    });
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-sampled"), "false");
    assert.isNull(screen.queryByTestId("qadi-questions-absent"));
    assert.isNull(screen.queryByTestId("qadi-hydration-unwired"));
    assert.strictEqual(screen.getByTestId("qadi-hydration-pending").textContent, "no counts read yet.");
  });

  it("D6 a poll stopped after a sample restores the messages the sample makes true", async () => {
    let calls = 0;
    const questions = (): ReadonlyArray<never> => {
      calls += 1;
      if (calls > 1) throw new Error("questions blew up later");
      return [];
    };
    const held: DiagnosticsDockOptions = { questions, intervalMillis: 10 };
    render(<DevtoolsDock diagnostics={held} />);
    services();

    await vi.waitFor(() => {
      assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-sampled"), "true");
    });
    assert.isNotNull(screen.getByTestId("qadi-wiring-absent"));

    reactTab();
    assert.isNotNull(screen.getByTestId("qadi-questions-empty"));
    assert.isNull(screen.queryByTestId("qadi-hydration-pending"));
  });

  it("D7 a stop is alerted on the first screen that shows it and silent on every revisit", async () => {
    const { questions } = throwsFirst();
    const held: DiagnosticsDockOptions = { questions };
    render(<DevtoolsDock diagnostics={held} />);
    services();
    await vi.waitFor(() => {
      assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");
    });
    const reason = screen.getByTestId("qadi-diagnostics-reason").textContent;

    reactTab();
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "none");
    assert.isNull(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("role"));
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-reason").textContent, reason);

    services();
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "none");
  });

  it("D8 a stop that happened on a screen with no notice alerts on the first visit to one", async () => {
    const { state, questions } = throwsFirst();
    const held: DiagnosticsDockOptions = { questions };
    render(<DevtoolsDock diagnostics={held} />);
    await vi.waitFor(() => {
      assert.strictEqual(state.calls, 1);
    });
    await act(async () => {});

    reactTab();
    assert.strictEqual(screen.getByTestId("qadi-diagnostics-stopped").getAttribute("data-announce"), "alert");
  });
});
