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
import {
  Allow,
  AttributeResolver,
  EvaluationIdLive,
  EvaluationServicesNone,
  eq,
  hasAttribute,
  hasPermission,
  literal,
  makeSubject,
  makeSubjectId,
  permission,
} from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import { RegistryContext } from "@effect/atom-react/RegistryContext";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { Activity, Component, StrictMode, useContext, useState, type ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  Can,
  QadiProvider,
  dehydrateDecisions,
  hydrateDecisions,
  makeQadiAtoms,
  useCan,
  useDevtoolsFeed,
  useInvalidate,
  useSubject,
} from "../src/index.ts";
import type { DevtoolsFeed, ProviderSignal, QadiAtoms } from "../src/index.ts";
import { withSweepFork } from "../src/SweepScheduler.ts";
import { settle } from "./support/settle.ts";
import { makeSweepCounter } from "./support/sweepCounter.ts";

const canRead = hasPermission(permission("doc", "read"));
const standing = hasAttribute("standing", eq(literal("good")));
const extra = hasPermission(permission("doc", "extra"));
const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const otherReader: AuthSubject = makeSubject({ id: "u2", permissions: ["doc:read"] });

/** What a server decided for `standing`, before this client answered. */
const serverAllow = new Allow({
  evaluationId: "eval-allow",
  subjectId: makeSubjectId("u1"),
  durationMillis: 2,
  trace: { policyTag: "HasAttribute", allowed: true, children: [], obligations: [] },
});

/** An atom set whose attribute resolver answers by `resolve`, reporting each hydration mismatch. */
const atomsResolvingBy = (
  resolve: () => Effect.Effect<unknown>,
  mismatches: Array<unknown> = [],
): QadiAtoms =>
  makeQadiAtoms(
    Layer.merge(
      Layer.merge(EvaluationServicesNone, Layer.succeed(AttributeResolver, { resolve })),
      EvaluationIdLive,
    ),
    { onHydrationMismatch: (mismatch) => mismatches.push(mismatch) },
  );

/** The seed a server page embeds for `standing`, as the provider's `initialValues`. */
const seededAllow = (atoms: QadiAtoms) =>
  hydrateDecisions(atoms, dehydrateDecisions([{ policy: standing, decision: serverAllow }]), reader);

/** Held at module scope: the feed keys its memo on the identity of the host's own fields. */
const EMPTY_EXTRA = {};

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

/** Pushes what `standing` reads in every render, so a single superseded frame is seen. */
const FrameLog = ({ frames }: { readonly frames: Array<boolean> }) => {
  frames.push(useCan(standing));
  return null;
};

/** Pushes the subject id each render reads, `none` while the subject is unset. */
const IdLog = ({ ids }: { readonly ids: Array<string> }) => {
  ids.push(useSubject()?.id ?? "none");
  return null;
};

/** A bounded atom set whose forks and sweeps are counted through the real sweep. */
const countedAtoms = (maxTrackedQuestions: number) => {
  const counter = makeSweepCounter();
  const atoms = makeQadiAtoms(
    EvaluationServicesNone,
    withSweepFork({ maxTrackedQuestions }, counter.fork),
  );
  return { atoms, counter };
};

const SubjectProbe = () => {
  const subject = useSubject();
  return <span>{`subject:${subject?.id ?? "none"}`}</span>;
};

/** A real macrotask past the release: the wait the provider's own deferral is measured against. */
const pastTheRelease = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 50));

/** Everything one test needs, built per test so no state crosses tests. */
const rig = (atoms: QadiAtoms = makeQadiAtoms(EvaluationServicesNone)) => {
  const caught: Array<unknown> = [];
  const errors = vi.spyOn(console, "error").mockImplementation(() => {});
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
  /** A hide and a show that each flush synchronously, so no macrotask can fall between them. */
  const flip = (mode: Mode) => {
    act(() => {
      control.set({ mode });
    });
  };
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
  /** What the host atom reads in the registry the tap was handed. */
  const hostValue = (): string => registry().get(host);
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
    RegistryTap,
    mount,
    hide,
    show,
    flip,
    change,
    longHide,
    registry,
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

  it("LT2 an invalidation after a long hide re-evaluates without throwing", async () => {
    const r = rig();
    const handle: { invalidate: (() => void) | undefined } = { invalidate: undefined };
    const Invalidator = () => {
      handle.invalidate = useInvalidate();
      return null;
    };
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader}>
        {r.body}
        <Invalidator />
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();

    await r.longHide();
    await r.show();
    await settle();
    r.expectNothingThrown();

    const { invalidate } = handle;
    if (invalidate === undefined) throw new Error("the invalidator never rendered");
    await act(async () => {
      invalidate();
    });
    await settle();

    r.expectNothingThrown();
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("LT3 a devtools feed consumer survives a long hide", async () => {
    const r = rig();
    const handle: { feed: DevtoolsFeed<typeof EMPTY_EXTRA> | undefined } = { feed: undefined };
    const FeedConsumer = () => {
      handle.feed = useDevtoolsFeed(EMPTY_EXTRA);
      return null;
    };
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader}>
        {r.body}
        <FeedConsumer />
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();

    await r.longHide();
    await r.show();
    await settle();
    r.expectNothingThrown();

    const { feed } = handle;
    if (feed === undefined) throw new Error("the feed consumer never rendered");
    await act(async () => {
      feed.onInvalidate();
    });
    await settle();

    r.expectNothingThrown();
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("LT4 under StrictMode the double effect recycles nothing and a long hide is survived", async () => {
    const r = rig();
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
        {r.body}
      </QadiProvider>
    );
    r.mount(() => element, true);
    await settle();
    await pastTheRelease();

    expect(r.hostValue()).toBe("seeded");
    expect(r.seen.size).toBe(1);

    await r.longHide();
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(r.seen.size).toBe(1);
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("LT5 a hide shorter than a macrotask recycles nothing", async () => {
    const r = rig();
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
        {r.body}
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();

    r.flip("hidden");
    r.flip("visible");
    await pastTheRelease();
    await settle();

    r.expectNothingThrown();
    expect(r.hostValue()).toBe("seeded");
    expect(r.seen.size).toBe(1);
    expect(screen.getByText("allowed")).toBeDefined();
  });

  // The tradeoff the provider's subject effect records: what a recycle writes back is the
  // subject of the last commit whose effects ran, and a hidden tree runs none, so the first
  // frame of a reveal reads the subject before the change and the provider's own effect then
  // writes the new one. Both frames are pinned so the one-frame cost is a recorded limit.
  it("LT6 a subject changed while hidden is read in the first frame of the reveal as the last committed one, then as the new one", async () => {
    const ids: Array<string> = [];
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject}>
        <IdLog ids={ids} />
        {r.body}
      </QadiProvider>
    ));
    await settle();
    expect(screen.getByText("subject:u1")).toBeDefined();

    await r.hide();
    await r.change({ subject: otherReader });
    await pastTheRelease();
    ids.length = 0;
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(r.seen.size).toBe(1);
    expect(ids).toEqual(["u1", "u2"]);
    expect(screen.getByText("subject:u2")).toBeDefined();
  });

  it("LT7 a re-render while hidden past the release keeps one registry", async () => {
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject}>
        {r.body}
      </QadiProvider>
    ));
    await settle();

    await r.longHide();
    await r.change({ tick: 1 });
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(r.seen.size).toBe(1);
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("LT8 an atoms swap while hidden keeps the registry and is reported once", async () => {
    const r = rig();
    const tags: Array<ProviderSignal["_tag"]> = [];
    const second = makeQadiAtoms(EvaluationServicesNone);
    r.mount((scene) => (
      <QadiProvider
        atoms={scene.atoms}
        subject={scene.subject}
        onDeveloperSignal={(signal) => tags.push(signal._tag)}
      >
        {r.body}
      </QadiProvider>
    ));
    await settle();
    expect(tags).toEqual([]);

    await r.longHide();
    await r.change({ atoms: second });
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(r.seen.size).toBe(1);
    expect(tags).toEqual(["AtomsReplaced"]);
    expect(screen.getByText("subject:u1")).toBeDefined();
  });

  it("LT9 a seeded allow the client never answers is not shown again after a long hide", async () => {
    const atoms = atomsResolvingBy(() => Effect.never);
    const r = rig(atoms);
    const frames: Array<boolean> = [];
    const element = (
      <QadiProvider atoms={atoms} subject={reader} initialValues={seededAllow(atoms)}>
        <Can policy={standing} pending="pending" fallback="denied">
          allowed
        </Can>
        <FrameLog frames={frames} />
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();
    expect(screen.getByText("allowed")).toBeDefined();

    frames.length = 0;
    await r.longHide();
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(frames).not.toContain(true);
    expect(screen.getByText("pending")).toBeDefined();
  });

  it("LT10 a seeded allow with no subject stays pending after a long hide", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const r = rig(atoms);
    const element = (
      <QadiProvider atoms={atoms} subject={undefined} initialValues={seededAllow(atoms)}>
        <Can policy={standing} pending="pending" fallback="denied">
          allowed
        </Can>
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();
    expect(screen.getByText("allowed")).toBeDefined();

    await r.longHide();
    await r.show();
    await settle();

    r.expectNothingThrown();
    expect(screen.getByText("pending")).toBeDefined();
  });

  it("LT11 a long hide with a re-render shows no superseded allow and reports one mismatch", async () => {
    const mismatches: Array<unknown> = [];
    const atoms = atomsResolvingBy(() => Effect.sleep("1 millis").pipe(Effect.as("bad")), mismatches);
    const r = rig(atoms);
    const frames: Array<boolean> = [];
    const initialValues = seededAllow(atoms);
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject} initialValues={initialValues}>
        <Can policy={standing} pending="pending" fallback="denied">
          allowed
        </Can>
        <FrameLog frames={frames} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await waitFor(() => expect(screen.getByText("denied")).toBeDefined());
    await settle();

    await r.longHide();
    await r.change({ tick: 1 });
    frames.length = 0;
    await r.show();
    await waitFor(() => expect(screen.getByText("denied")).toBeDefined());
    await settle();

    r.expectNothingThrown();
    expect(frames).not.toContain(true);
    expect(mismatches).toHaveLength(1);
  });

  // The rule, not a step count: each pressure episode is one fork and one sweep, so after a
  // settle the sweeps equal the forks and each fork saw exactly the sweeps before it. The
  // question the hidden tree asks is tracked past the bound while it is hidden, so an episode
  // begins across the hide; the gate's own question is kept through a second one that follows
  // the reveal.
  it("LT12 across a long hide each pressure episode is one fork and one sweep", async () => {
    const { atoms, counter } = countedAtoms(1);
    const r = rig(atoms);
    const element = (
      <QadiProvider atoms={atoms} subject={reader}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>
    );
    r.mount(() => element);
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    await settle();
    const { counts } = counter;
    expect(counts.forks).toBe(0);

    await r.hide();
    atoms.decision(extra);
    expect(counts.forks).toBe(1);
    await pastTheRelease();
    await settle();
    expect(counts.forks).toBe(1);
    expect(counts.sweeps).toBe(1);

    await r.show();
    await waitFor(() => expect(screen.getByText("allowed")).toBeDefined());
    await settle();

    r.expectNothingThrown();
    expect(counts.forks).toBeGreaterThan(0);
    expect(counts.sweeps).toBe(counts.forks);
    expect(counts.sweepsAtFork).toEqual(Array.from({ length: counts.forks }, (_, i) => i));
    expect(atoms.asked().filter((q) => q.policy === canRead)).toHaveLength(1);

    counter.reset();
    atoms.decision(extra);
    expect(counts.forks).toBe(1);
    expect(counts.sweeps).toBe(0);
    await settle();
    expect(counts.forks).toBe(1);
    expect(counts.sweeps).toBe(1);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("LT13 a reveal committed with a re-render reads the subject in its first frame", async () => {
    const ids: Array<string> = [];
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject}>
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    expect(ids.at(-1)).toBe("u1");

    await r.longHide();
    ids.length = 0;
    await r.change({ mode: "visible", tick: 1 });
    await settle();

    r.expectNothingThrown();
    expect(ids).not.toContain("none");
    expect(ids.at(-1)).toBe("u1");
    expect(r.seen.size).toBe(1);
  });

  it("LT14 a read straggling after an unmount throws nothing and leaves no node", async () => {
    const r = rig();
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
        {r.body}
      </QadiProvider>
    );
    const { unmount } = r.mount(() => element);
    await settle();
    const registry = r.registry();
    const decision = r.atoms.decision(canRead);
    expect(registry.get(r.host)).toBe("seeded");

    unmount();
    await pastTheRelease();

    expect(registry.get(r.host)).toBe("default");
    expect(() => registry.get(decision)).not.toThrow();
    await pastTheRelease();
    expect(registry.getNodes().has(decision)).toBe(false);
  });

  it("LT16 a subject committed while visible is the one a long hide's reveal reads in its first frame", async () => {
    const ids: Array<string> = [];
    const r = rig();
    r.mount((scene) => (
      <QadiProvider atoms={scene.atoms} subject={scene.subject}>
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    await r.change({ subject: otherReader });
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
    expect(r.seen.size).toBe(1);
  });

  it("LT17 an atom set committed while visible is the one a long hide's reveal reads its subject from", async () => {
    const ids: Array<string> = [];
    const second = makeQadiAtoms(EvaluationServicesNone);
    const r = rig();
    r.mount((scene) => (
      <QadiProvider
        atoms={scene.atoms}
        subject={scene.subject}
        onDeveloperSignal={() => undefined}
      >
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    await r.change({ atoms: second });
    await settle();
    expect(ids.at(-1)).toBe("u1");

    await r.longHide();
    ids.length = 0;
    await r.change({ mode: "visible", tick: 1 });
    await settle();

    r.expectNothingThrown();
    expect(ids).not.toContain("none");
    expect(ids.at(-1)).toBe("u1");
    expect(r.seen.size).toBe(1);
  });

  it("LT18 a recycle whose reset throws still writes the subject back before the reveal", async () => {
    const ids: Array<string> = [];
    const r = rig();
    r.mount(() => (
      <QadiProvider atoms={r.atoms} subject={reader}>
        <IdLog ids={ids} />
        <r.RegistryTap />
      </QadiProvider>
    ));
    await settle();
    const registry = r.registry();
    const reset = registry.reset.bind(registry);
    const thrown: Array<unknown> = [];
    vi.spyOn(registry, "reset").mockImplementation(() => {
      reset();
      throw new Error("a finalizer threw");
    });
    // A bare timer callback has no caller to catch what it throws. The lease resolves
    // `setTimeout` from the global when it defers, so wrapping it for this test hears the
    // error without touching the process's own handlers; afterEach restores the spy.
    const realSetTimeout = globalThis.setTimeout;
    vi.spyOn(globalThis, "setTimeout").mockImplementation((run, ms) =>
      realSetTimeout(() => {
        try {
          if (typeof run === "function") run();
        } catch (error) {
          thrown.push(error);
        }
      }, ms),
    );
    await r.longHide();
    expect(thrown).toHaveLength(1);
    expect(thrown[0]).toMatchObject({ message: "a finalizer threw" });
    ids.length = 0;
    await r.show();
    await settle();

    expect(ids).not.toContain("none");
    expect(ids.at(-1)).toBe("u1");
  });

  // A limit a host must know: a subscription it holds directly on the provider's registry
  // does not survive a recycle, while every hook of this package has already unsubscribed
  // by the time the recycle runs. A hide that ends before the recycle detaches nothing.
  it("LT15 a host subscription held across a long hide is detached by the recycle", async () => {
    const r = rig();
    const element = (
      <QadiProvider atoms={r.atoms} subject={reader} initialValues={[[r.host, "seeded"]]}>
        {r.body}
      </QadiProvider>
    );
    r.mount(() => element);
    await settle();
    const registry = r.registry();
    const heard = { count: 0 };
    registry.subscribe(r.host, () => {
      heard.count += 1;
    });

    registry.set(r.host, "before");
    expect(heard.count).toBe(1);

    r.flip("hidden");
    r.flip("visible");
    registry.set(r.host, "short");
    expect(heard.count).toBe(2);

    await r.longHide();
    registry.set(r.host, "after");
    expect(heard.count).toBe(2);

    await r.show();
    await settle();
    r.expectNothingThrown();
  });
});
