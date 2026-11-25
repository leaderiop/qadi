/**
 * Pins the hook that builds a value in a scope and configures it with the latest inputs.
 *
 * The value is a small double built here: a store whose `configure` records the label it
 * was handed and whose release sets a flag. Each cell reads what a child sees on its
 * first commit, what the boundary caught, or what the latest build was configured with,
 * so the nearest wrong fold (configuring only in the change effect, swallowing a throw,
 * following the value alone, or reading the first render's inputs) fails a cell.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import * as Effect from "effect/Effect";
import { Activity, Component, StrictMode, useLayoutEffect, type ReactNode } from "react";
import { useConfigured } from "../../src/react/useConfigured.ts";

interface Inputs {
  readonly label: string;
  readonly fail?: boolean;
}

interface Double {
  readonly configured: Array<string>;
  readonly configure: (inputs: Inputs) => void;
  released: boolean;
}

/** A harness whose builds, configure calls and commits are logged. */
const makeHarness = () => {
  const built: Array<Double> = [];
  const commits: Array<ReadonlyArray<string>> = [];
  const caught: Array<unknown> = [];
  const make = () =>
    Effect.acquireRelease(
      Effect.sync(() => {
        const configured: Array<string> = [];
        const double: Double = {
          configured,
          configure: (inputs) => {
            if (inputs.fail === true) throw new Error(`refused ${inputs.label}`);
            configured.push(inputs.label);
          },
          released: false,
        };
        built.push(double);
        return double;
      }),
      (double) =>
        Effect.sync(() => {
          double.released = true;
        }),
    );
  const Reader = ({ double }: { readonly double: Double }) => {
    useLayoutEffect(() => {
      commits.push([...double.configured]);
    }, [double]);
    return <span>read</span>;
  };
  const Owner = ({ inputs }: { readonly inputs: Inputs }) => {
    const double = useConfigured(make, (double, inputs) => double.configure(inputs), inputs);
    return double === undefined ? null : <Reader double={double} />;
  };
  class Boundary extends Component<{ readonly children: ReactNode }, { readonly failed: boolean }> {
    override state = { failed: false };
    static getDerivedStateFromError(): { readonly failed: boolean } {
      return { failed: true };
    }
    override componentDidCatch(error: unknown): void {
      caught.push(error);
    }
    override render(): ReactNode {
      return this.state.failed ? null : this.props.children;
    }
  }
  return { built, commits, caught, Owner, Boundary };
};

describe("useConfigured", () => {
  it("U1 the first commit a child makes reads the value already configured with the first inputs", () => {
    const { commits, Owner } = makeHarness();
    render(<Owner inputs={{ label: "first" }} />);
    assert.deepStrictEqual(commits[0], ["first"]);
  });

  it("U2 a configure that throws on the first build closes the scope and reaches the boundary as itself", () => {
    const { built, commits, caught, Owner, Boundary } = makeHarness();
    const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      render(
        <Boundary>
          <Owner inputs={{ label: "bad", fail: true }} />
        </Boundary>,
      );
    } finally {
      quiet.mockRestore();
    }
    assert.strictEqual(built.length, 1);
    assert.isTrue(built[0]?.released);
    assert.deepStrictEqual(commits, []);
    assert.strictEqual(caught.length, 1);
    assert.instanceOf(caught[0], Error);
    assert.strictEqual(caught[0] instanceof Error ? caught[0].message : "", "refused bad");
  });

  it("U3 a new inputs record configures once more and the same record configures nothing more", () => {
    const { built, Owner } = makeHarness();
    const first: Inputs = { label: "first" };
    const view = render(<Owner inputs={first} />);
    const double = built[0];
    assert.isDefined(double);
    const mounted = double?.configured.length ?? 0;

    view.rerender(<Owner inputs={first} />);
    assert.strictEqual(double?.configured.length, mounted);

    view.rerender(<Owner inputs={{ label: "second" }} />);
    assert.strictEqual(double?.configured.length, mounted + 1);
    assert.strictEqual(double?.configured.at(-1), "second");
  });

  it("U4 a value hidden, handed new inputs and shown again is rebuilt configured with them, also under StrictMode", async () => {
    const hidden = makeHarness();
    const view = render(
      <Activity mode="visible">
        <hidden.Owner inputs={{ label: "first" }} />
      </Activity>,
    );
    await act(async () => {
      view.rerender(
        <Activity mode="hidden">
          <hidden.Owner inputs={{ label: "second" }} />
        </Activity>,
      );
    });
    await act(async () => {
      view.rerender(
        <Activity mode="visible">
          <hidden.Owner inputs={{ label: "second" }} />
        </Activity>,
      );
    });
    assert.strictEqual(hidden.built.at(-1)?.configured[0], "second");
    assert.isTrue(hidden.built[0]?.released);
    view.unmount();

    const strict = makeHarness();
    render(
      <StrictMode>
        <strict.Owner inputs={{ label: "current" }} />
      </StrictMode>,
    );
    assert.strictEqual(strict.built.length, 2);
    assert.strictEqual(strict.built.at(-1)?.configured[0], "current");
    assert.deepStrictEqual(strict.commits.at(-1), ["current", "current"]);
  });
});
