/**
 * A provider hidden by an `<Activity>` for longer than one macrotask and shown again
 * keeps one usable registry.
 *
 * The registry is the provider's own, built once and handed to every consumer below
 * it. React runs a hidden tree's effect cleanups and, on reveal, runs the setups again
 * without rendering a hoisted element a second time, so a registry released at the
 * hidden tree's cleanup and never rebuilt meets its own consumers' subscriptions on
 * reveal. Every wait here is a real macrotask, because the release is one and a
 * faked clock would hide the commit order the defect lives in. Each test states the
 * outcome a provider must give, never the failure of a provider that does not.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { Activity, Component, useContext, useState, type ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Can, QadiProvider, makeQadiAtoms, useSubject } from "../src/index.ts";
import type { QadiAtoms } from "../src/index.ts";
import { settle } from "./support/settle.ts";

const canRead = hasPermission(permission("doc", "read"));
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });

type Mode = "visible" | "hidden";

interface Scene {
  readonly mode: Mode;
  readonly subject: AuthSubject;
  readonly atoms: QadiAtoms;
  readonly tick: number;
}

interface Control {
  set: (patch: Partial<Scene>) => void;
}

/** Records what an error boundary caught, and renders a marker in place of its subtree. */
class Boundary extends Component<
  { readonly sink: Array<unknown>; readonly children: ReactNode },
  { readonly failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override componentDidCatch(error: unknown) {
    this.props.sink.push(error);
  }
  override render() {
    return this.state.failed ? <span>BOUNDARY</span> : this.props.children;
  }
}

/**
 * Holds the scene in state, above the hidden tree, so the tree below is hidden and shown by
 * a parent that stays mounted. A `view` that returns the same element each call is a
 * hoisted element: React does not render it again when only the mode changes.
 */
const Host = ({
  initial,
  control,
  view,
}: {
  readonly initial: Scene;
  readonly control: Control;
  readonly view: (scene: Scene) => ReactNode;
}) => {
  const [scene, setScene] = useState(initial);
  control.set = (patch) => setScene((previous) => ({ ...previous, ...patch }));
  return <Activity mode={scene.mode}>{view(scene)}</Activity>;
};

const SubjectProbe = () => {
  const subject = useSubject();
  return <span>{`subject:${subject?.id ?? "none"}`}</span>;
};

/** A real macrotask past the release: the wait the provider's own deferral is measured against. */
const pastTheRelease = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

/** Everything one test needs, built per test so no state crosses tests. */
const rig = () => {
  const caught: Array<unknown> = [];
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const seen = new Set<AtomRegistry.AtomRegistry>();
  const latest: { registry: AtomRegistry.AtomRegistry | undefined } = { registry: undefined };
  const control: Control = { set: () => {} };
  const host = Atom.make("default").pipe(Atom.keepAlive);
  const atoms = makeQadiAtoms(EvaluationServicesNone);
  const initial: Scene = { mode: "visible", subject: reader, atoms, tick: 0 };

  const RegistryTap = () => {
    const registry = useContext(RegistryContext);
    seen.add(registry);
    latest.registry = registry;
    return null;
  };

  /** The gate, the subject probe and the tap: what every provider below carries. */
  const body = (
    <>
      <Can policy={canRead} pending="pending" fallback="denied">
        allowed
      </Can>
      <SubjectProbe />
      <RegistryTap />
    </>
  );

  const mount = (view: (scene: Scene) => ReactNode) => {
    const tree = (
      <Boundary sink={caught}>
        <Host initial={initial} control={control} view={view} />
      </Boundary>
    );
    return render(tree);
  };

  const hide = () =>
    act(async () => {
      control.set({ mode: "hidden" });
    });
  const show = () =>
    act(async () => {
      control.set({ mode: "visible" });
    });
  const change = (patch: Partial<Scene>) =>
    act(async () => {
      control.set(patch);
    });
  /** Hidden, a real macrotask past the release, then the caller reveals. */
  const longHide = async () => {
    await hide();
    await pastTheRelease();
  };
  /** What the host atom reads in the registry the tap was handed. */
  const hostValue = (): string => {
    const registry = latest.registry;
    if (registry === undefined) throw new Error("no registry was handed to the tap");
    return registry.get(host);
  };
  const expectNothingThrown = () => {
    expect(caught).toEqual([]);
    expect(errors).not.toHaveBeenCalled();
  };

  return {
    caught,
    seen,
    host,
    atoms,
    body,
    mount,
    hide,
    show,
    change,
    longHide,
    hostValue,
    expectNothingThrown,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("a provider hidden past one macrotask and shown again", () => {
  it("LT1 a provider hidden past a macrotask and shown again throws nothing and renders the decision", async () => {
    const r = rig();
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader}>
        {r.body}
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();
    expect(screen.getByText("allowed")).toBeDefined();
    expect(screen.getByText("subject:u1")).toBeDefined();

    await r.longHide();
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(screen.getByText("allowed")).toBeDefined();
    expect(screen.getByText("subject:u1")).toBeDefined();
  });
});
