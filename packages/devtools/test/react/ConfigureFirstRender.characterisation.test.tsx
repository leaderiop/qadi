/**
 * Pins what a reader sees on the first render of a dock model and of the feed hooks, and after a reveal.
 *
 * It was written before the hooks stopped building their value bare and configuring it
 * in the build, so a reader that sees an unconfigured model fails here: a commit that
 * says "No live guards were handed to the dock" about a dock that was handed some. It is
 * held byte-identical to its first commit, and reads the model's stores rather than the
 * panels, because the panels' props change elsewhere and these pins must not move with them.
 *
 * The harness is the file's own: a registry that counts its subscribe calls and live
 * listeners, a reader that logs one line per commit, and a boundary that logs what it caught.
 */
import { assert, describe, it } from "@effect/vitest";
import { act, render } from "@testing-library/react";
import { vi } from "vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { Activity, Component, StrictMode, useLayoutEffect, type ReactNode } from "react";
import {
  Allow,
  Decided,
  DecisionRecord,
  hasPermission,
  makeSubjectId,
  permission,
  StoredRecord,
} from "@qadi/core";
import { isUnsampled } from "../../src/model/DiagnosticsFeed.ts";
import type { DockModel } from "../../src/model/DockModel.ts";
import type { GateInstanceLike, GateRegistryLike } from "../../src/model/Gates.ts";
import { sourceFromRecords } from "../../src/index.ts";
import { useDiagnostics, useTimeline } from "../../src/react/index.ts";
import { useDockModel } from "../../src/react/useDockModel.ts";
import { useScoped } from "../../src/react/useScoped.ts";
import { useStoreSnapshot } from "../../src/react/useStoreSnapshot.ts";

const canRead = hasPermission(permission("doc", "read"));

const guard = (id: string): GateInstanceLike => ({ id, kind: "Can", policy: canRead, state: "Allowed" });

/** A diagnostics layer that never finishes building, so the poll stays `Starting`. */
const neverBuilt = () => ({ layer: Layer.effectDiscard(Effect.never) });

const asked = () => [{ policy: canRead }];

/** A gate registry holding the given guards, counting `subscribe` calls and live listeners. */
const makeRegistry = (ids: ReadonlyArray<string>) => {
  const instances = ids.map(guard);
  const live = new Set<() => void>();
  const counts = { subscribes: 0, failing: false };
  const registry: GateRegistryLike = {
    instances: () => instances,
    subscribe: (listener) => {
      counts.subscribes += 1;
      if (counts.failing) throw new Error("subscribe refused");
      live.add(listener);
      return () => {
        live.delete(listener);
      };
    },
  };
  return {
    registry,
    subscribes: () => counts.subscribes,
    listeners: () => live.size,
    failSubscribe: () => {
      counts.failing = true;
    },
  };
};

/** One decision record, built here so the file imports no shared test helper. */
const oneRecord = () =>
  new StoredRecord({
    environment: "Server",
    record: new DecisionRecord({
      evaluationId: "ev-1",
      at: 1_000,
      subjectId: makeSubjectId("alice"),
      policy: canRead,
      outcome: new Decided({
        decision: new Allow({
          evaluationId: "ev-1",
          subjectId: makeSubjectId("alice"),
          durationMillis: 1,
          trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
        }),
      }),
    }),
  });

type DockInputs = Parameters<typeof useDockModel>[0];

/** What a reader of the dock model's stores sees on one commit. */
const Reader = ({ model, lines }: { readonly model: DockModel; readonly lines: Array<string> }) => {
  const { status } = useStoreSnapshot(model.diagnostics);
  const q = useStoreSnapshot(model.questions);
  const ids = q.instances.map((instance) => instance.id).join(",");
  const line = `diag=${status._tag} unsampled=${isUnsampled(status)} gates=${q.gates._tag}[${ids}] questions=${q.questions._tag}`;
  useLayoutEffect(() => {
    lines.push(line);
  });
  return null;
};

/** The dock's shape: the real hook, and readers mounted only once a model exists. */
const Dock = ({ inputs, lines }: { readonly inputs: DockInputs; readonly lines: Array<string> }) => {
  const model = useDockModel(inputs);
  return model === undefined ? null : <Reader model={model} lines={lines} />;
};

/** The same lines with a repeat of the line before it dropped: StrictMode runs a layout effect twice. */
const distinct = <A,>(lines: ReadonlyArray<A>): ReadonlyArray<A> =>
  lines.filter((line, index) => index === 0 || lines[index - 1] !== line);

const settle = () =>
  act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 20));
  });

const mountDock = async (inputs: DockInputs, strict: boolean) => {
  const lines: Array<string> = [];
  const dock = <Dock inputs={inputs} lines={lines} />;
  const view = render(strict ? <StrictMode>{dock}</StrictMode> : dock);
  await settle();
  return { lines, view };
};

const STARTING = "diag=Starting unsampled=true gates=Listed[a] questions=Unsampled";
const STARTING_B = "diag=Starting unsampled=true gates=Listed[b] questions=Unsampled";
const OFF = "diag=Off unsampled=false gates=Listed[a] questions=Absent";
const REFUSED = "emptyTimeline: capacity must be a non-negative integer, got -1";

class Boundary extends Component<
  { readonly children: ReactNode; readonly onCaught: (error: unknown) => void },
  { readonly failed: boolean }
> {
  override state = { failed: false };

  static getDerivedStateFromError(): { readonly failed: boolean } {
    return { failed: true };
  }

  override componentDidCatch(error: unknown): void {
    this.props.onCaught(error);
  }

  override render(): ReactNode {
    return this.state.failed ? null : this.props.children;
  }
}

/** Runs `body` with React's report of a caught error silenced. */
const quietly = async (body: () => Promise<void>) => {
  const quiet = vi.spyOn(console, "error").mockImplementation(() => undefined);
  try {
    await body();
  } finally {
    quiet.mockRestore();
  }
};

describe("the first render of the dock model and the feed hooks", () => {
  it("C1 a dock handed diagnostics and gates commits only its configured state", async () => {
    const a = makeRegistry(["a"]);
    const { lines } = await mountDock({ diagnostics: neverBuilt(), gates: a.registry, questions: asked }, false);

    assert.deepStrictEqual(distinct(lines), [STARTING]);
    assert.isTrue(lines.every((line) => line === STARTING));
    assert.strictEqual(a.subscribes(), 1);
    assert.strictEqual(a.listeners(), 1);
  });

  it("C2 the same dock under StrictMode commits no unconfigured state and subscribes twice", async () => {
    const a = makeRegistry(["a"]);
    const { lines } = await mountDock({ diagnostics: neverBuilt(), gates: a.registry, questions: asked }, true);

    assert.deepStrictEqual(distinct(lines), [STARTING]);
    assert.isTrue(lines.every((line) => line === STARTING));
    assert.strictEqual(a.subscribes(), 2);
    assert.strictEqual(a.listeners(), 1);
  });

  it("C3 a dock handed gates and no diagnostics commits Off with the gates listed", async () => {
    for (const strict of [false, true]) {
      const a = makeRegistry(["a"]);
      const { lines, view } = await mountDock({ gates: a.registry }, strict);

      assert.deepStrictEqual(distinct(lines), [OFF]);
      assert.isTrue(lines.every((line) => line === OFF));
      view.unmount();
    }
  });

  it("C4 a registry whose subscribe throws is read as failed in every commit and retried once", async () => {
    for (const { strict, calls } of [
      { strict: false, calls: 2 },
      { strict: true, calls: 3 },
    ]) {
      const a = makeRegistry(["a"]);
      a.failSubscribe();
      const { lines, view } = await mountDock({ gates: a.registry }, strict);

      assert.isAbove(lines.length, 0);
      assert.isTrue(lines.every((line) => line.includes("gates=Failed[]")));
      assert.strictEqual(a.subscribes(), calls);
      assert.strictEqual(a.listeners(), 0);
      view.unmount();
    }
  });

  it("C5 useDiagnostics reads its options on every render, never Off between two Starting", async () => {
    const renders = (options: ReturnType<typeof neverBuilt> | undefined, strict: boolean) => {
      const tags: Array<string> = [];
      const Probe = () => {
        tags.push(useDiagnostics(options).status._tag);
        return null;
      };
      render(strict ? <StrictMode><Probe /></StrictMode> : <Probe />);
      return tags;
    };

    const handed = neverBuilt();
    assert.deepStrictEqual(renders(handed, false), ["Starting", "Starting"]);
    assert.deepStrictEqual(renders(undefined, false), ["Off", "Off"]);
    await settle();

    const strictHanded = renders(handed, true);
    assert.deepStrictEqual(distinct(strictHanded), ["Starting"]);
    assert.isFalse(strictHanded.includes("Off"));
    assert.deepStrictEqual(distinct(renders(undefined, true)), ["Off"]);
    await settle();
  });

  it("C6 useTimeline reads a capacity of 50 as 0 entries at 500 then 1 at 50", async () => {
    const source = sourceFromRecords([oneRecord()]);
    const renders = (capacity: number | undefined) => {
      const seen: Array<string> = [];
      const Probe = () => {
        const { timeline } = useTimeline(source, capacity === undefined ? {} : { capacity });
        seen.push(`${timeline.entries.length}@${timeline.capacity}`);
        return null;
      };
      render(<Probe />);
      return seen;
    };

    const bounded = renders(50);
    await settle();
    assert.deepStrictEqual(bounded, ["0@500", "1@50"]);

    const omitted = renders(undefined);
    await settle();
    assert.deepStrictEqual(omitted, ["0@500", "1@500"]);
  });
});

describe("the first commit after a reveal", () => {
  /** A dock inside an `Activity` that starts visible on registry `a`; `b` is the registry it is later moved to. */
  const revealable = async () => {
    const a = makeRegistry(["a"]);
    const b = makeRegistry(["b"]);
    const lines: Array<string> = [];
    const diagnostics = neverBuilt();
    const App = ({ mode, gates }: { readonly mode: "visible" | "hidden"; readonly gates: GateRegistryLike }) => (
      <Activity mode={mode}>
        <Dock inputs={{ diagnostics, gates, questions: asked }} lines={lines} />
      </Activity>
    );
    const view = render(<App mode="visible" gates={a.registry} />);
    await settle();
    return { a, b, lines, view, App, shown: lines.length };
  };

  const holdsOnlyB = (
    run: Awaited<ReturnType<typeof revealable>>,
  ) => {
    const after = run.lines.slice(run.shown);
    assert.deepStrictEqual(distinct(after), [STARTING_B]);
    assert.isTrue(after.every((line) => line === STARTING_B));
    // The registry handed first gained no subscribe at the reveal, and the new one is subscribed once.
    assert.strictEqual(run.a.subscribes(), 1);
    assert.strictEqual(run.a.listeners(), 0);
    assert.strictEqual(run.b.subscribes(), 1);
    assert.strictEqual(run.b.listeners(), 1);
  };

  it("C7 inputs swapped while the dock is hidden are the ones its first commit after the reveal holds", async () => {
    const run = await revealable();
    run.view.rerender(<run.App mode="hidden" gates={run.b.registry} />);
    await settle();
    run.view.rerender(<run.App mode="visible" gates={run.b.registry} />);
    await settle();

    holdsOnlyB(run);
  });

  it("C8 hiding and showing in one rerender with new inputs holds the new inputs on the first commit", async () => {
    const run = await revealable();
    run.view.rerender(<run.App mode="hidden" gates={run.a.registry} />);
    await settle();
    await act(async () => {
      run.view.rerender(<run.App mode="visible" gates={run.b.registry} />);
    });
    await settle();

    holdsOnlyB(run);
  });

  it("C9 three unsettled changes while hidden leave the first commit after the reveal on the last inputs", async () => {
    const run = await revealable();
    await act(async () => {
      run.view.rerender(<run.App mode="hidden" gates={run.b.registry} />);
    });
    await act(async () => {
      run.view.rerender(<run.App mode="hidden" gates={run.a.registry} />);
    });
    await act(async () => {
      run.view.rerender(<run.App mode="visible" gates={run.b.registry} />);
    });
    await settle();

    holdsOnlyB(run);
  });
});

describe("a first configure that throws", () => {
  it("C10 a refused capacity commits no reader and reaches the boundary as the original error", async () => {
    await quietly(async () => {
      const a = makeRegistry(["a"]);
      const caught: Array<unknown> = [];
      const lines: Array<string> = [];
      const dock = render(
        <Boundary onCaught={(error) => caught.push(error)}>
          <Dock inputs={{ diagnostics: neverBuilt(), gates: a.registry, questions: asked, capacity: -1 }} lines={lines} />
        </Boundary>,
      );
      await settle();
      dock.unmount();

      assert.deepStrictEqual(lines, []);
      assert.strictEqual(caught.length, 1);
      const [error] = caught;
      assert.instanceOf(error, Error);
      assert.strictEqual(error instanceof Error ? error.message : undefined, REFUSED);

      const source = sourceFromRecords([oneRecord()]);
      const commits: Array<string> = [];
      const timelineCaught: Array<unknown> = [];
      const Probe = () => {
        const { timeline } = useTimeline(source, { capacity: -1 });
        useLayoutEffect(() => {
          commits.push(`${timeline.entries.length}@${timeline.capacity}`);
        });
        return null;
      };
      render(
        <Boundary onCaught={(thrown) => timelineCaught.push(thrown)}>
          <Probe />
        </Boundary>,
      );
      await settle();

      assert.deepStrictEqual(commits, []);
      assert.strictEqual(timelineCaught.length, 1);
      const [thrown] = timelineCaught;
      assert.instanceOf(thrown, Error);
      assert.strictEqual(thrown instanceof Error ? thrown.message : undefined, REFUSED);
    });
  });

  it("C11 a scoped build that throws closes its scope before the boundary receives the original error", async () => {
    await quietly(async () => {
      const events: Array<string> = [];
      const failure = new Error("the build threw");
      const Probe = () => {
        useScoped(() =>
          Effect.andThen(
            Effect.addFinalizer(() =>
              Effect.sync(() => {
                events.push("closed");
              }),
            ),
            Effect.sync((): number => {
              throw failure;
            }),
          ),
        );
        return null;
      };
      const caught: Array<unknown> = [];
      render(
        <Boundary
          onCaught={(error) => {
            events.push("received");
            caught.push(error);
          }}
        >
          <Probe />
        </Boundary>,
      );
      await settle();

      assert.deepStrictEqual(events, ["closed", "received"]);
      assert.deepStrictEqual(caught, [failure]);
    });
  });
});
