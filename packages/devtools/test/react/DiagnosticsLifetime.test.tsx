/**
 * How the diagnostics poll lives across React's lifecycle, for the public hook
 * and for the dock.
 *
 * StrictMode's simulated remount, a hidden `Activity` and `diagnostics` going
 * `undefined` and back are where a poll forked from a component can leak a layer
 * or show a stale reading, and no other test renders them. The cases are written
 * against the shipped behaviour first, so a later change to any of them is a
 * visible, deliberate edit rather than a silent drift.
 */
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Activity, StrictMode, useState } from "react";
import { DevtoolsDock } from "../../src/react/DevtoolsDock.tsx";
import { useDiagnostics, type DiagnosticsDockOptions } from "../../src/react/useDiagnostics.ts";

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

const Probe = ({ options }: { readonly options: DiagnosticsDockOptions | undefined }) => {
  const diagnostics = useDiagnostics(options);
  return (
    <>
      <span data-testid="wiring">{diagnostics.reading.wiring._tag}</span>
      <span data-testid="status">{diagnostics.status._tag}</span>
    </>
  );
};

const wiring = () => screen.getByTestId("wiring").textContent;

const status = () => screen.getByTestId("status").textContent;

const services = () => {
  act(() => {
    fireEvent.click(screen.getByRole("button", { name: "Services" }));
  });
};

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

describe("useDiagnostics across React's lifecycle", () => {
  it("H1 under StrictMode builds the layer twice and releases the first, and both on unmount", async () => {
    const { counts, layer } = counted();
    const options: DiagnosticsDockOptions = { layer };
    const view = render(
      <StrictMode>
        <Probe options={options} />
      </StrictMode>,
    );
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 2);
      assert.strictEqual(counts.releases, 1);
    });

    await act(async () => {
      view.unmount();
    });
    await vi.waitFor(() => {
      assert.strictEqual(counts.releases, 2);
    });
  });

  it("H2 a hidden-then-shown hook samples afresh: Starting and no reading until the first sample", async () => {
    const { counts, layer } = slowCounted();
    const options: DiagnosticsDockOptions = { layer };
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <Probe options={options} />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    await vi.waitFor(() => {
      assert.strictEqual(wiring(), "Read");
    });
    assert.strictEqual(counts.builds, 1);

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);

    // The feed was rebuilt with the show: nothing is held over until its first sample.
    assert.strictEqual(wiring(), "NotHanded");
    assert.strictEqual(status(), "Starting");
    await vi.waitFor(() => {
      assert.strictEqual(wiring(), "Read");
    });
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 2);
    });
  });

  it("H3 options going undefined return noDiagnostics and release the layer; defined again start a fresh run", async () => {
    const { counts, layer } = counted();
    const options: DiagnosticsDockOptions = { layer };
    const view = render(<Probe options={options} />);
    await vi.waitFor(() => {
      assert.strictEqual(wiring(), "Read");
    });
    assert.strictEqual(counts.builds, 1);

    view.rerender(<Probe options={undefined} />);
    assert.strictEqual(wiring(), "NotHanded");
    await vi.waitFor(() => {
      assert.strictEqual(counts.releases, 1);
    });

    view.rerender(<Probe options={options} />);
    await vi.waitFor(() => {
      assert.strictEqual(wiring(), "Read");
      assert.strictEqual(counts.builds, 2);
    });
  });
});

describe("the dock's diagnostics across React's lifecycle", () => {
  it("K1 an equal inline diagnostics literal on a re-render builds the layer once", async () => {
    const { counts, layer } = counted();
    const Host = () => {
      const [n, setN] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setN(n + 1)}>
            again
          </button>
          <DevtoolsDock diagnostics={{ layer }} />
        </div>
      );
    };
    render(<Host />);
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 1);
    });
    await act(async () => {
      screen.getByText("again").click();
    });
    await act(async () => {
      screen.getByText("again").click();
    });
    await settle();
    assert.strictEqual(counts.builds, 1);
    assert.strictEqual(counts.releases, 0);
  });

  it("K2 unmounting the dock releases the layer", async () => {
    const { counts, layer } = counted();
    const diagnostics: DiagnosticsDockOptions = { layer };
    const view = render(<DevtoolsDock diagnostics={diagnostics} />);
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 1);
    });
    assert.strictEqual(counts.releases, 0);

    await act(async () => {
      view.unmount();
    });
    await vi.waitFor(() => {
      assert.strictEqual(counts.releases, 1);
    });
  });

  it("K3 the Services screen states no layer, then the report, then no layer as diagnostics goes undefined, defined, undefined", async () => {
    const { counts, layer } = counted();
    const diagnostics: DiagnosticsDockOptions = { layer };
    const view = render(<DevtoolsDock />);
    services();
    assert.isNotNull(screen.getByTestId("qadi-wiring-absent"));

    view.rerender(<DevtoolsDock diagnostics={diagnostics} />);
    await screen.findByTestId("qadi-cache-card");
    assert.strictEqual(counts.builds, 1);
    assert.isEmpty(screen.queryAllByTestId("qadi-wiring-absent"));

    view.rerender(<DevtoolsDock />);
    await screen.findByTestId("qadi-wiring-absent");
    await vi.waitFor(() => {
      assert.strictEqual(counts.releases, 1);
    });
  });

  it("K4 under StrictMode the dock builds the layer twice and releases the first", async () => {
    const { counts, layer } = counted();
    const diagnostics: DiagnosticsDockOptions = { layer };
    const view = render(
      <StrictMode>
        <DevtoolsDock diagnostics={diagnostics} />
      </StrictMode>,
    );
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 2);
      assert.strictEqual(counts.releases, 1);
    });

    await act(async () => {
      view.unmount();
    });
    await vi.waitFor(() => {
      assert.strictEqual(counts.releases, 2);
    });
  });

  it("K5 a hidden-then-shown dock samples afresh: no report until the first sample after the show", async () => {
    const { counts, layer } = slowCounted();
    const diagnostics: DiagnosticsDockOptions = { layer };
    const App = ({ mode }: { readonly mode: "visible" | "hidden" }) => (
      <Activity mode={mode}>
        <DevtoolsDock diagnostics={diagnostics} />
      </Activity>
    );
    const view = render(<App mode="visible" />);
    services();
    await screen.findByTestId("qadi-cache-card");
    assert.strictEqual(counts.builds, 1);

    view.rerender(<App mode="hidden" />);
    view.rerender(<App mode="visible" />);
    services();

    // The model was rebuilt with the show: nothing is held over, so there is no report yet.
    assert.isNull(screen.queryByTestId("qadi-cache-card"));
    await vi.waitFor(() => screen.getByTestId("qadi-cache-card"));
    await vi.waitFor(() => {
      assert.strictEqual(counts.builds, 2);
    });
  });
});
