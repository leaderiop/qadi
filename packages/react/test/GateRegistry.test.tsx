/**
 * Guards recording that they exist — the thing BEH-QD-217 said could not.
 *
 * Two properties carry this file. **Off means absent**: an uninstrumented tree
 * registers nothing and renders no wrapper, so upgrading this package cannot
 * change a consumer's DOM. And **one instance registers once**: the surfaces
 * nest, so the easy mistake is a `<Can>` appearing twice, once mislabelled as
 * the hook it happens to be built on.
 */
import {
  AttributeResolver,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  EvaluationServicesNone,
  eq,
  hasAttribute,
  hasPermission,
  hasRole,
  literal,
  makeSubject,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";
import { act, render, screen, waitFor } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { StrictMode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { Can, Cannot } from "../src/components.tsx";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import {
  useCan,
  useDecision,
  useGateInstances,
  useInvalidate,
  useProjected,
} from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import type { QadiAtoms } from "../src/QadiAtoms.ts";
import { MissingQadiProviderError } from "../src/QadiProvider.tsx";
import { QadiProvider } from "../src/QadiProvider.tsx";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });

const atoms = () => makeQadiAtoms(EvaluationServicesNone);

// Each mount builds its own atom set, so its registry is its own: no test reads
// another's guards, and nothing needs resetting between them (ADR-QD-080).
let current: QadiAtoms = atoms();

const mount = (children: ReactNode, instrument: boolean) => {
  const set = atoms();
  current = set;
  return render(
    <QadiProvider atoms={set} subject={alice} instrument={instrument}>
      {children}
    </QadiProvider>,
  );
};

/** The guards listed by the most recent `mount`'s atom set. */
const gateInstances = () => current.gates.instances();

afterEach(() => {
  document.body.innerHTML = "";
});

describe("uninstrumented, nothing changes", () => {
  it("registers no instance", () => {
    mount(<Can policy={canRead}>allowed</Can>, false);
    expect(gateInstances()).toEqual([]);
  });

  it("renders no wrapper element", () => {
    // Not "a wrapper with display:contents" — no wrapper. A consumer's DOM
    // snapshots must not change the day they upgrade this package.
    const { container } = mount(<Can policy={canRead}>allowed</Can>, false);
    expect(container.querySelector("[data-qadi-gate]")).toBeNull();
    expect(container.querySelector("span")).toBeNull();
  });

  it("is the default", () => {
    current = atoms();
    render(
      <QadiProvider atoms={current} subject={alice}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(gateInstances()).toEqual([]);
  });
});

describe("instrumented, a guard says it exists", () => {
  it("records a Can with its policy and what it rendered", () => {
    mount(<Can policy={canRead}>allowed</Can>, true);

    const instances = gateInstances();
    expect(instances).toHaveLength(1);
    expect(instances[0]?.kind).toBe("Can");
    expect(instances[0]?.policy).toBe(canRead);
    expect(instances[0]?.state).toBe("Allowed");
  });

  it("records a denial as denied, not as pending", () => {
    // The state a reader comes to this panel about.
    mount(<Can policy={isAdmin}>hidden</Can>, true);
    expect(gateInstances()[0]?.state).toBe("Denied");
  });

  it("records a Cannot as its own kind", () => {
    mount(<Cannot policy={isAdmin}>refused</Cannot>, true);
    expect(gateInstances()[0]?.kind).toBe("Cannot");
    // `Cannot` renders when the policy denies, so a denial is what it shows —
    // the state is the *decision*, not whether the component rendered anything.
    expect(gateInstances()[0]?.state).toBe("Denied");
  });

  it("reports 'Rechecking' during a re-check, not a stale Allowed/Denied (ticket 145)", async () => {
    // `outcomeOf`'s waiting -> `Rechecking` read is the instrumented panel's
    // half of ADR-QD-017 — the registry records `outcome._tag`, the same
    // outcome `<Can>` renders from, so the "a decision being re-checked is not
    // yet an answer" rule reaches both through one read. Every other test in
    // this file only ever observes a settled Allowed or Denied.
    //
    // The resolver is held open by hand, not timed: `waitFor`'s real-time
    // polling could otherwise step over a re-check settling in under a
    // millisecond and only ever observe the before and after.
    let release: ((value: string) => void) | undefined;
    const controlled = Layer.mergeAll(
      Layer.succeed(AttributeResolver, {
        resolve: (_id: unknown, attribute: string) =>
          attribute === "standing"
            ? Effect.promise(
                () => new Promise<string | undefined>((resolve) => (release = resolve)),
              )
            : Effect.succeed(undefined),
      }),
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    );
    const set = makeQadiAtoms(controlled);
    current = set;
    const standing = hasAttribute("standing", eq(literal("good")));

    const Invalidate = () => {
      const invalidate = useInvalidate();
      return <button type="button" data-testid="invalidate" onClick={invalidate} />;
    };

    render(
      <QadiProvider atoms={set} subject={alice} instrument>
        <Can policy={standing}>allowed</Can>
        <Invalidate />
      </QadiProvider>,
    );

    await waitFor(() => expect(release).toBeDefined());
    act(() => release?.("good"));
    await waitFor(() => expect(gateInstances()[0]?.state).toBe("Allowed"));

    // Reset the capture so the assertions below observe the RE-CHECK's own
    // resolver, not the spent one from the initial decision.
    release = undefined;
    act(() => {
      screen.getByTestId("invalidate").click();
    });

    // The re-check is genuinely in flight — the resolver has not been
    // released yet — and this is exactly the moment the panel must say
    // "Rechecking", not the stale "Allowed" it showed a moment ago.
    await waitFor(() => expect(gateInstances()[0]?.state).toBe("Rechecking"));

    act(() => release?.("suspended"));
    await waitFor(() => expect(gateInstances()[0]?.state).toBe("Denied"));
  });

  it("REGISTERS ONE INSTANCE PER GUARD, not one per nested hook", () => {
    // `Can` is built on the same read `useDecision` performs. Registering in
    // both would report this single component as two instances, the inner one
    // labelled with a hook the author never called.
    mount(<Can policy={canRead}>allowed</Can>, true);
    expect(gateInstances()).toHaveLength(1);
  });

  it("registers a hook under its own name", () => {
    const Probe = () => <span>{String(useCan(canRead))}</span>;
    mount(<Probe />, true);

    expect(gateInstances()).toHaveLength(1);
    expect(gateInstances()[0]?.kind).toBe("useCan");
  });

  it("registers useDecision under its own name", () => {
    const Probe = () => {
      useDecision(canRead);
      return null;
    };
    mount(<Probe />, true);
    expect(gateInstances()[0]?.kind).toBe("useDecision");
  });

  it("registers useProjected under its own name, not as useDecision (DA-08)", () => {
    // `useProjected` used to read through `useDecision`, so its instance
    // registered — and was labelled in the devtools panel — as "useDecision",
    // a silent aliasing nothing declared.
    const Probe = () => {
      useProjected(canRead, { title: "Q3" });
      return null;
    };
    mount(<Probe />, true);
    expect(gateInstances()).toHaveLength(1);
    expect(gateInstances()[0]?.kind).toBe("useProjected");
  });

  it("distinguishes two guards on the same policy", () => {
    // The distinction the atom layer cannot make, and the whole point: these
    // two share one atom and are two components.
    mount(
      <>
        <Can policy={canRead}>one</Can>
        <Can policy={canRead}>two</Can>
      </>,
      true,
    );

    const instances = gateInstances();
    expect(instances).toHaveLength(2);
    expect(new Set(instances.map((one) => one.id)).size).toBe(2);
  });

  it("carries the resource a question was asked about", () => {
    const resource = { id: "invoice-42" };
    mount(
      <Can policy={canRead} resource={resource}>
        allowed
      </Can>,
      true,
    );
    expect(gateInstances()[0]?.resource).toBe(resource);
  });

  it("does NOT re-register on a render with a fresh, structurally equal policy and resource (ticket 141)", () => {
    // AGENTS.md §13 blesses passing an inline policy/resource literal — a fresh
    // object every render — and relies on `Atom.family`'s structural keying to
    // share the underlying atom anyway. Before the fix, the registration
    // effect's dependency array compared `policy`/`resource` by reference, so
    // this exact pattern unregistered and re-registered the instance (two
    // `changed()` notifications) on every single render, even though nothing
    // about the question or its answer changed.
    const shared = atoms();
    let notified = 0;
    const unsubscribe = shared.gates.subscribe(() => {
      notified += 1;
    });

    const Wrapper = ({ tick }: { tick: number }) => (
      <Can policy={hasPermission(permission("doc", "read"))} resource={{ id: "doc-1" }}>
        {`allowed-${tick}`}
      </Can>
    );

    const view = render(
      <QadiProvider atoms={shared} subject={alice} instrument>
        <Wrapper tick={0} />
      </QadiProvider>,
    );

    const idBefore = shared.gates.instances()[0]?.id;
    const notifiedAfterMount = notified;

    view.rerender(
      <QadiProvider atoms={shared} subject={alice} instrument>
        <Wrapper tick={1} />
      </QadiProvider>,
    );

    expect(shared.gates.instances()).toHaveLength(1);
    // The SAME instance, not one torn down and rebuilt.
    expect(shared.gates.instances()[0]?.id).toBe(idBefore);
    // No unregister/re-register churn from the re-render.
    expect(notified).toBe(notifiedAfterMount);

    unsubscribe();
    view.unmount();
  });

  it("drops an instance when it unmounts", () => {
    const view = mount(<Can policy={canRead}>allowed</Can>, true);
    expect(gateInstances()).toHaveLength(1);

    view.unmount();
    // An entry holds a DOM element, so a leaked one keeps a detached subtree
    // alive. This is the assertion that says it does not.
    expect(gateInstances()).toEqual([]);
  });
});

describe("locating a guard", () => {
  it("carries the marker element for a Can", () => {
    mount(<Can policy={canRead}>allowed</Can>, true);
    const element = gateInstances()[0]?.element;

    expect(element).toBeDefined();
    expect(element?.getAttribute("data-qadi-gate")).toBe(gateInstances()[0]?.id);
    expect(element?.textContent).toBe("allowed");
  });

  it("marks a guard that rendered NOTHING, which is the case the lens is for", () => {
    // "Why is this button missing" is answered by pointing at where it is not.
    // A guard rendering `null` still has a marker sitting at that position.
    mount(<Can policy={isAdmin}>hidden</Can>, true);
    const element = gateInstances()[0]?.element;

    expect(element).toBeDefined();
    expect(element?.textContent).toBe("");
  });

  it("gives a hook no element, because it has no node of its own", () => {
    const Probe = () => <span>{String(useCan(canRead))}</span>;
    mount(<Probe />, true);

    // Enumerable and not locatable. A panel offering to highlight this would be
    // offering a button that silently does nothing.
    expect(gateInstances()[0]?.element).toBeUndefined();
  });

  it("does not change layout: the marker generates no box", () => {
    mount(<Can policy={canRead}>allowed</Can>, true);
    const element = gateInstances()[0];

    // The property the whole design rests on. Asserted on the style rather than
    // on a measured rect, because happy-dom performs no layout — a rect
    // assertion here would pass for a `display: block` wrapper too.
    const marker = element?.element;
    expect(marker instanceof HTMLElement && marker.style.display).toBe("contents");
  });
});


describe("what the page still renders", () => {
  it("renders children through the marker", () => {
    mount(<Can policy={canRead}>allowed</Can>, true);
    expect(screen.getByText("allowed")).toBeDefined();
  });

  it("still renders a fallback through the marker", () => {
    mount(
      <Can policy={isAdmin} fallback={<em>denied</em>}>
        allowed
      </Can>,
      true,
    );
    expect(screen.getByText("denied")).toBeDefined();
  });
});


describe("the registry, read from a host", () => {
  it("tells a subscribed host on mount, and not after it unsubscribed", () => {
    const set = atoms();
    let notified = 0;
    const unsubscribe = set.gates.subscribe(() => {
      notified += 1;
    });
    const view = render(
      <QadiProvider atoms={set} subject={alice} instrument>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(notified).toBeGreaterThan(0);

    unsubscribe();
    const settled = notified;
    view.unmount();
    expect(notified).toBe(settled);
  });
});

describe("scoped to its atom set", () => {
  it("two atom sets do not share guards", () => {
    const tenantA = atoms();
    const tenantB = atoms();
    render(
      <>
        <QadiProvider atoms={tenantA} subject={alice} instrument>
          <Can policy={canRead}>a</Can>
        </QadiProvider>
        <QadiProvider atoms={tenantB} subject={alice} instrument>
          <Can policy={isAdmin}>b</Can>
        </QadiProvider>
      </>,
    );
    expect(tenantA.gates.instances().map((one) => one.policy)).toEqual([canRead]);
    expect(tenantB.gates.instances().map((one) => one.policy)).toEqual([isAdmin]);
  });

  it("two hydrated roots sharing one atom set both stay listed", () => {
    const collisions: Array<string> = [];
    const shared = makeQadiAtoms(EvaluationServicesNone, {
      onGateIdCollision: (id) => collisions.push(id),
    });
    const tree = (policy: typeof canRead) => (
      <QadiProvider atoms={shared} subject={alice} instrument>
        <Can policy={policy}>guarded</Can>
      </QadiProvider>
    );
    const a = document.createElement("div");
    const b = document.createElement("div");
    document.body.append(a, b);
    a.innerHTML = renderToString(tree(canRead));
    b.innerHTML = renderToString(tree(isAdmin));

    const roots: Array<ReturnType<typeof hydrateRoot>> = [];
    act(() => {
      roots.push(hydrateRoot(a, tree(canRead), { onRecoverableError: () => {} }));
    });
    act(() => {
      roots.push(hydrateRoot(b, tree(isAdmin), { onRecoverableError: () => {} }));
    });
    try {
      const listed = shared.gates.instances();
      expect(listed).toHaveLength(2);
      expect(new Set(listed.map((one) => one.id)).size).toBe(2);
      expect(listed.map((one) => one.state).sort()).toEqual(["Allowed", "Denied"]);
      expect(collisions).toEqual(["_R_0_"]);

      act(() => roots[0]?.unmount());
      expect(shared.gates.instances()).toHaveLength(1);
    } finally {
      act(() => roots.forEach((root) => root.unmount()));
    }
  });

  it("the `gates` prop routes registration to the registry it names", () => {
    const set = atoms();
    const own = makeGateRegistry();
    render(
      <QadiProvider atoms={set} subject={alice} instrument gates={own}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(own.instances()).toHaveLength(1);
    expect(set.gates.instances()).toEqual([]);
  });

  it("a hand-built `gates` registers nothing and renders no marker", () => {
    // Off means absent extends to a registry this package cannot write to.
    const foreign = { instances: () => [], subscribe: () => () => {} };
    const { container } = render(
      <QadiProvider atoms={atoms()} subject={alice} instrument gates={foreign}>
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(container.querySelector("[data-qadi-gate]")).toBeNull();
    expect(foreign.instances()).toEqual([]);
  });

  it("StrictMode registers once", () => {
    const set = atoms();
    const view = render(
      <StrictMode>
        <QadiProvider atoms={set} subject={alice} instrument>
          <Can policy={canRead}>allowed</Can>
        </QadiProvider>
      </StrictMode>,
    );
    expect(set.gates.instances()).toHaveLength(1);
    view.unmount();
    expect(set.gates.instances()).toHaveLength(0);
  });
});

describe("useGateInstances", () => {
  const Count = () => <output data-testid="count">{useGateInstances().length}</output>;

  it("re-renders its caller as guards mount and unmount", () => {
    const set = atoms();
    const tree = (guarded: boolean) => (
      <QadiProvider atoms={set} subject={alice} instrument>
        <Count />
        {guarded ? <Can policy={canRead}>allowed</Can> : null}
      </QadiProvider>
    );
    const view = render(tree(true));
    expect(screen.getByTestId("count").textContent).toBe("1");
    view.rerender(tree(false));
    expect(screen.getByTestId("count").textContent).toBe("0");
  });

  it("returns the same array reference across a rerender with no change", () => {
    const seen: Array<ReadonlyArray<unknown>> = [];
    const Probe = ({ tick }: { tick: number }) => {
      seen.push(useGateInstances());
      return <span>{tick}</span>;
    };
    const set = atoms();
    const tree = (tick: number) => (
      <QadiProvider atoms={set} subject={alice} instrument>
        <Can policy={canRead}>allowed</Can>
        <Probe tick={tick} />
      </QadiProvider>
    );
    const view = render(tree(0));
    view.rerender(tree(1));
    expect(seen.length).toBeGreaterThan(1);
    expect(seen[seen.length - 1]).toBe(seen[seen.length - 2]);
  });

  it("throws MissingQadiProviderError outside a provider", () => {
    const quiet = console.error;
    console.error = () => {};
    try {
      expect(() => render(<Count />)).toThrow(MissingQadiProviderError);
    } finally {
      console.error = quiet;
    }
  });

  it("lists the `gates` override's guards", () => {
    const own = makeGateRegistry();
    render(
      <QadiProvider atoms={atoms()} subject={alice} instrument gates={own}>
        <Count />
        <Can policy={canRead}>allowed</Can>
      </QadiProvider>,
    );
    expect(screen.getByTestId("count").textContent).toBe("1");
  });
});
