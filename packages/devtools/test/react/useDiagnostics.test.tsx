/**
 * The three things only React can get wrong: starting on mount, stopping on
 * unmount, and not restarting when a re-render changed nothing.
 *
 * What is sampled, how often, and what keeps its identity are the model's, and
 * are proved under `TestClock` in `test/model/DiagnosticsStore.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import { vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { useState } from "react";
import { useDiagnostics, type DiagnosticsDockOptions } from "../../src/react/useDiagnostics.ts";

const counted = () => {
  const counts = { builds: 0, releases: 0 };
  const layer = Layer.effectDiscard(
    Effect.acquireRelease(
      Effect.sync(() => {
        counts.builds += 1;
      }),
      () =>
        Effect.sync(() => {
          counts.releases += 1;
        }),
    ),
  );
  return { counts, layer };
};

const Probe = ({ options }: { readonly options: DiagnosticsDockOptions | undefined }) => {
  const diagnostics = useDiagnostics(options);
  return (
    <div>
      <span data-testid="hydration">{diagnostics.hydration === undefined ? "none" : "read"}</span>
      <span data-testid="wiring">{diagnostics.wiring._tag}</span>
    </div>
  );
};

describe("useDiagnostics", () => {
  it("fills the snapshot after mount", async () => {
    render(<Probe options={{}} />);
    await vi.waitFor(() => {
      assert.strictEqual(screen.getByTestId("hydration").textContent, "read");
    });
    assert.strictEqual(screen.getByTestId("wiring").textContent, "NotHanded");
  });

  it("starts nothing when no options were handed over", async () => {
    const { counts, layer } = counted();
    render(<Probe options={undefined} />);
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    assert.strictEqual(screen.getByTestId("hydration").textContent, "none");
    assert.strictEqual(counts.builds, 0);
    void layer;
  });

  it("runs the layer's finalizer when it unmounts", async () => {
    const { counts, layer } = counted();
    const options: DiagnosticsDockOptions = { layer };
    const view = render(<Probe options={options} />);
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

  it("does not restart on a re-render with a fresh but equal options literal", async () => {
    const { counts, layer } = counted();
    const Host = () => {
      const [n, setN] = useState(0);
      return (
        <div>
          <button type="button" onClick={() => setN(n + 1)}>
            again
          </button>
          <Probe options={{ layer, intervalMillis: 10_000 }} />
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
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
    });
    assert.strictEqual(counts.builds, 1);
    assert.strictEqual(counts.releases, 0);
  });

  it("restarts when the layer itself is replaced", async () => {
    const first = counted();
    const second = counted();
    const view = render(<Probe options={{ layer: first.layer }} />);
    await vi.waitFor(() => {
      assert.strictEqual(first.counts.builds, 1);
    });
    view.rerender(<Probe options={{ layer: second.layer }} />);
    await vi.waitFor(() => {
      assert.strictEqual(second.counts.builds, 1);
      assert.strictEqual(first.counts.releases, 1);
    });
  });
});
