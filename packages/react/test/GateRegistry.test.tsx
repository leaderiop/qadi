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
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
  RelationshipResolverNever,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import type { ReactNode } from "react";
import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { Can, Cannot } from "../src/components.tsx";
import { clearGatesUnsafe, gateInstances, subscribeGates } from "../src/GateRegistry.ts";
import { useCan, useDecision } from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { QadiProvider } from "../src/QadiProvider.tsx";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");

const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });

const atoms = () =>
  makeQadiAtoms(
    Layer.mergeAll(
      AttributeResolverNone,
      RelationshipResolverNever,
      DecisionHistoryUnknown,
      EvaluationIdLive,
      CustomPredicateNone,
      SignatureHistoryNone,
    ),
  );

const mount = (children: ReactNode, instrument: boolean) =>
  render(
    <QadiProvider atoms={atoms()} subject={alice} instrument={instrument}>
      {children}
    </QadiProvider>,
  );

afterEach(() => {
  clearGatesUnsafe();
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
    render(
      <QadiProvider atoms={atoms()} subject={alice}>
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
    expect((element?.element as HTMLElement | undefined)?.style.display).toBe("contents");
  });
});

describe("the store contract", () => {
  it("returns the same snapshot reference until something changes", () => {
    // `useSyncExternalStore` compares by reference. A fresh array per call
    // re-renders forever.
    mount(<Can policy={canRead}>allowed</Can>, true);
    expect(gateInstances()).toBe(gateInstances());
  });

  it("returns a new reference after a change", () => {
    mount(<Can policy={canRead}>allowed</Can>, true);
    const before = gateInstances();

    act(() => {
      clearGatesUnsafe();
    });
    expect(gateInstances()).not.toBe(before);
  });

  it("tells a subscriber when a guard mounts", () => {
    let notified = 0;
    const unsubscribe = subscribeGates(() => {
      notified += 1;
    });

    mount(<Can policy={canRead}>allowed</Can>, true);
    expect(notified).toBeGreaterThan(0);
    unsubscribe();
  });

  it("stops telling a subscriber that unsubscribed", () => {
    let notified = 0;
    const unsubscribe = subscribeGates(() => {
      notified += 1;
    });
    unsubscribe();

    mount(<Can policy={canRead}>allowed</Can>, true);
    expect(notified).toBe(0);
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
