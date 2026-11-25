/**
 * How a provider builds and seeds its registry, writes the subject, recycles and
 * reports a replaced atom set, for the cases the lifetime suite does not pin.
 *
 * Every cell goes through the public `QadiProvider` and reads the registry through the
 * context and the hooks, so each holds wherever the registry's lifetime is kept. They
 * were written before that lifetime moved out of the component. `QadiProvider.tsx` sits
 * outside every mutation config, so a change of order there is caught only by rendered
 * tests like these. The cell that counts timers around a render React discards compares
 * with the same tree whose provider is replaced by a fragment, because React schedules
 * timers of its own while it recovers from the error.
 *
 * This file is held byte for byte from the commit that adds it: a later cell goes in
 * another file.
 */
import { EvaluationServicesNone, makeSubject } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { Activity, Component, Fragment, StrictMode, useContext, useState } from "react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { QadiProvider, makeQadiAtoms, useSubject } from "../src/index.ts";
import type { ProviderSignal, QadiAtoms } from "../src/index.ts";
import { settle } from "./support/settle.ts";

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const sameReader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const otherReader: AuthSubject = makeSubject({ id: "u2", permissions: ["doc:read"] });
const seededReader: AuthSubject = makeSubject({ id: "seeded", permissions: [] });

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
 * a parent that stays mounted.
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

/** Pushes the subject id each render reads, `none` while the subject is unset. */
const IdLog = ({ ids }: { readonly ids: Array<string> }) => {
  ids.push(useSubject()?.id ?? "none");
  return null;
};

/** A child that fails in render, so React discards the render of everything above it. */
const Failing = (): ReactNode => {
  throw new Error("a child failed in render");
};

/** A real macrotask past the release: the wait the provider's own deferral is measured against. */
const pastTheRelease = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

/** Everything one test needs, built per test so no state crosses tests. */
const rig = (atoms: QadiAtoms = makeQadiAtoms(EvaluationServicesNone)) => {
  const caught: Array<unknown> = [];
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
  const warnings = vi.spyOn(console, "warn").mockImplementation(() => {});
  const seen = new Set<AtomRegistry.AtomRegistry>();
  const latest: { registry: AtomRegistry.AtomRegistry | undefined } = { registry: undefined };
  const control: Control = { set: () => {} };
  const host = Atom.make("default").pipe(Atom.keepAlive);
  const initial: Scene = { mode: "visible", subject: reader, atoms, tick: 0 };

  const RegistryTap = () => {
    const registry = useContext(RegistryContext);
    seen.add(registry);
    latest.registry = registry;
    return null;
  };

  const mount = (view: (scene: Scene) => ReactNode, strict = false) => {
    const tree = (
      <Boundary sink={caught}>
        <Host initial={initial} control={control} view={view} />
      </Boundary>
    );
    return render(strict ? <StrictMode>{tree}</StrictMode> : tree);
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
  /** The registry the tap was last handed. */
  const registry = (): AtomRegistry.AtomRegistry => {
    const handed = latest.registry;
    if (handed === undefined) throw new Error("no registry was handed to the tap");
    return handed;
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
    warnings,
    RegistryTap,
    mount,
    hide,
    show,
    change,
    longHide,
    registry,
    expectNothingThrown,
  };
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("how a provider builds, seeds, writes, recycles and reports its registry", () => {
  it("C1 an initial value for the subject atom is read in the first render and the prop subject after the commit", async () => {
    const ids: Array<string> = [];
    const r = rig();
    r.mount(() => (
      <QadiProvider
        atoms={r.atoms}
        subject={reader}
        initialValues={[[r.atoms.subject, seededReader]]}
      >
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();

    r.expectNothingThrown();
    expect(ids[0]).toBe("seeded");
    expect(ids.at(-1)).toBe("u1");
    expect(r.registry().get(r.atoms.subject)).toBe(reader);
    expect(r.seen.size).toBe(1);
  });

  it("C2 a server render of a seeded provider schedules no timer and recycles nothing", async () => {
    const r = rig();
    const timers = vi.spyOn(globalThis, "setTimeout");
    renderToString(<Fragment />);
    const baseline = timers.mock.calls.length;
    timers.mockClear();
    renderToString(
      <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
        <r.RegistryTap />
      </QadiProvider>,
    );
    const used = timers.mock.calls.length;
    timers.mockRestore();

    expect(used).toBeLessThanOrEqual(baseline);
    await pastTheRelease();
    expect(r.registry().get(r.host)).toBe("seeded");
    expect(r.registry().get(r.atoms.subject)).toBe(reader);
  });

  it("C3 a render React discards schedules no timer beyond the same tree without the provider", async () => {
    const r = rig();
    const reported = vi.fn();
    vi.stubGlobal("reportError", reported);
    const timers = vi.spyOn(globalThis, "setTimeout");
    const without: Array<unknown> = [];
    const bare = render(
      <Boundary sink={without}>
        <Fragment>
          <Failing />
        </Fragment>
      </Boundary>,
    );
    const baseline = timers.mock.calls.length;
    bare.unmount();
    timers.mockClear();
    const withProvider = render(
      <Boundary sink={r.caught}>
        <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
          <Failing />
        </QadiProvider>
      </Boundary>,
    );
    const used = timers.mock.calls.length;
    timers.mockRestore();

    expect(without).toHaveLength(1);
    expect(r.caught).toHaveLength(1);
    expect(used).toBeLessThanOrEqual(baseline);
    withProvider.unmount();
    await pastTheRelease();
    expect(r.caught).toHaveLength(1);
  });

  it("C4 an atoms swap is reported before the subject of the new atom set is written", async () => {
    const second = makeQadiAtoms(EvaluationServicesNone);
    const r = rig();
    const reads: Array<AuthSubject | undefined> = [];
    r.mount((scene) => (
      <QadiProvider
        atoms={scene.atoms}
        subject={scene.subject}
        onDeveloperSignal={(signal) => {
          if (signal._tag === "AtomsReplaced") reads.push(r.registry().get(second.subject));
        }}
      >
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    expect(reads).toEqual([]);

    await r.change({ atoms: second });
    await settle();

    r.expectNothingThrown();
    expect(reads).toEqual([undefined]);
    expect(r.registry().get(second.subject)).toBe(reader);
    expect(r.seen.size).toBe(1);
  });

  it("C5 an equal subject notifies no subscriber of the subject atom and a new one notifies once", async () => {
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject}>
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    const heard = { count: 0 };
    r.registry().subscribe(r.atoms.subject, () => {
      heard.count += 1;
    });
    expect(r.registry().get(r.atoms.subject)).toBe(reader);

    await r.change({ subject: sameReader });
    await settle();
    expect(heard.count).toBe(0);
    expect(r.registry().get(r.atoms.subject)).toBe(reader);

    await r.change({ subject: otherReader });
    await settle();
    r.expectNothingThrown();
    expect(heard.count).toBe(1);
    expect(r.registry().get(r.atoms.subject)).toBe(otherReader);
  });

  it("C6 no atoms swap is reported for a StrictMode double effect or a plain reveal", async () => {
    const second = makeQadiAtoms(EvaluationServicesNone);
    const r = rig();
    const tags: Array<ProviderSignal["_tag"]> = [];
    r.mount(
      (scene) => (
        <QadiProvider
          atoms={scene.atoms}
          subject={scene.subject}
          onDeveloperSignal={(signal) => tags.push(signal._tag)}
        >
          <r.RegistryTap />
        </QadiProvider>
      ),
      true,
    );
    await settle();
    expect(tags).toEqual([]);

    await r.longHide();
    await r.show();
    await settle();
    r.expectNothingThrown();
    expect(tags).toEqual([]);

    await r.change({ atoms: second });
    await settle();
    expect(tags).toEqual(["AtomsReplaced"]);
    expect(r.seen.size).toBe(1);
  });

  it("C7 a subject and an atom set committed together are the ones a long hide writes back", async () => {
    const ids: Array<string> = [];
    const second = makeQadiAtoms(EvaluationServicesNone);
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject} onDeveloperSignal={() => undefined}>
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    await r.change({ atoms: second, subject: otherReader });
    await settle();
    expect(ids.at(-1)).toBe("u2");

    await r.longHide();
    ids.length = 0;
    await r.change({ mode: "visible", tick: 1 });
    await settle();

    r.expectNothingThrown();
    expect(ids).not.toContain("none");
    expect(ids).not.toContain("u1");
    expect(ids.at(-1)).toBe("u2");
    expect(r.registry().get(second.subject)).toBe(otherReader);
    expect(r.seen.size).toBe(1);
  });

  it("C8 a reporter that throws on an atoms swap still leaves the new subject written", async () => {
    const second = makeQadiAtoms(EvaluationServicesNone);
    const r = rig();
    r.mount((scene) => (
      <QadiProvider
        atoms={scene.atoms}
        subject={scene.subject}
        onDeveloperSignal={() => {
          throw new Error("the reporter failed");
        }}
      >
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    expect(r.warnings).not.toHaveBeenCalled();

    await r.change({ atoms: second });
    await settle();

    r.expectNothingThrown();
    expect(r.registry().get(second.subject)).toBe(reader);
    expect(r.warnings).toHaveBeenCalledTimes(1);
    expect(r.warnings.mock.calls[0]?.[0]).toContain("the reporter failed");
    expect(r.seen.size).toBe(1);
  });

  it("C9 the first commit writes the prop subject over a seeded one with no reader of it", async () => {
    const r = rig();
    r.mount(() => (
      <QadiProvider
        atoms={r.atoms}
        subject={reader}
        initialValues={[[r.atoms.subject, seededReader]]}
      >
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();

    r.expectNothingThrown();
    expect(r.registry().get(r.atoms.subject)).toBe(reader);
    await r.longHide();
    await r.show();
    await settle();
    expect(r.registry().get(r.atoms.subject)).toBe(reader);
    expect(r.seen.size).toBe(1);
  });
});
