/**
 * Pins gate registration as a provider-rendered tree sees it.
 *
 * Every row mounts guards (`Can`, `useCan`, `usePolicies`, `useQuestions`) under the real
 * `QadiProvider` with `instrument` on, steps the tree by rendering, re-rendering and
 * unmounting it, and compares the whole `instances()` projection and the exact number of
 * registry notifications at each step: what registers, under which id, in which state,
 * with which resource, whether it has an element, and how many times the registry told
 * its subscribers. A row reads a count as the difference between two settled readings,
 * and names an id only through a value captured at an earlier step, because `useId`
 * counts across a file.
 *
 * The rules these rows rest on are stated without rendering in
 * `GateWriter.reconcile.test.ts`.
 */
import {
  AttributeResolver,
  EvaluationIdLive,
  eq,
  hasAttribute,
  hasPermission,
  literal,
  permission,
  portsLayer,
} from "@qadi/core";
import { render, waitFor } from "@testing-library/react";
import * as Deferred from "effect/Deferred";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { describe, expect, it } from "vitest";
import { Can } from "../src/components.tsx";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import type { GateInstance, GateRegistry } from "../src/GateRegistry.ts";
import { useCan, useQuestions } from "../src/hooks.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { notificationsOf } from "./support/gates.ts";
import {
  atoms,
  canRead,
  canWrite,
  docA,
  docB,
  Group,
  isAdmin,
  providerTree,
} from "./support/trees.tsx";

/** Waits until no guard is still `Pending`, so a count is read between settled points. */
const settled = (registry: GateRegistry) =>
  waitFor(() =>
    expect(registry.instances().some((one) => one.state === "Pending")).toBe(false),
  );

/** What each instance is, in registry order, and whether it has an element. */
const snapshotOf = (instances: ReadonlyArray<GateInstance>) =>
  instances.map((one) => ({
    id: one.id,
    kind: one.kind,
    state: one.state,
    resource: one.resource,
    element: one.element !== undefined,
  }));

/** The id of the first guard the registry lists. */
const firstId = (registry: GateRegistry) => registry.instances()[0]?.id;

/** What a grouped hook's ids share: everything before the `/` and the entry name. */
const hookId = (registry: GateRegistry) => {
  const id = firstId(registry) ?? "";
  return id.slice(0, id.indexOf("/"));
};

describe("one guard", () => {
  it("a Can registers once on mount, with an element", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    render(providerTree(set, <Can policy={canRead}>allowed</Can>, { instrument: true }));
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      {
        id: firstId(set.gates),
        kind: "Can",
        state: "Allowed",
        resource: undefined,
        element: true,
      },
    ]);
    expect(told()).toBe(1);
  });

  it("a hook registers once on mount, with no element", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);
    const Probe = () => <span>{String(useCan(canRead))}</span>;

    render(providerTree(set, <Probe />, { instrument: true }));
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      {
        id: firstId(set.gates),
        kind: "useCan",
        state: "Allowed",
        resource: undefined,
        element: false,
      },
    ]);
    expect(told()).toBe(1);
  });

  it(
    "a held decision settling updates the entry in place: one notification, same id",
    async () => {
      const held = Deferred.makeUnsafe<unknown>();
      const resolver = Layer.succeed(AttributeResolver, {
        resolve: () => Deferred.await(held),
      });
      const set = makeQadiAtoms(
        Layer.mergeAll(portsLayer({ AttributeResolver: resolver }), EvaluationIdLive),
      );
      const told = notificationsOf(set.gates);
      const legal = hasAttribute("dept", eq(literal("legal")));

      render(providerTree(set, <Can policy={legal}>allowed</Can>, { instrument: true }));
      const id = firstId(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([
        { id, kind: "Can", state: "Pending", resource: undefined, element: true },
      ]);
      expect(told()).toBe(1);

      Deferred.doneUnsafe(held, Effect.succeed("legal"));
      await settled(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([
        { id, kind: "Can", state: "Allowed", resource: undefined, element: true },
      ]);
      expect(told()).toBe(2);
    },
  );

  it("a re-render with a fresh equal policy and resource notifies nothing", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);
    const Wrapper = ({ tick }: { readonly tick: number }) => (
      <Can policy={hasPermission(permission("doc", "read"))} resource={{ id: "doc-1" }}>
        {`allowed-${tick}`}
      </Can>
    );

    const view = render(providerTree(set, <Wrapper tick={0} />, { instrument: true }));
    await settled(set.gates);
    const id = firstId(set.gates);
    const before = told();

    view.rerender(providerTree(set, <Wrapper tick={1} />, { instrument: true }));
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      { id, kind: "Can", state: "Allowed", resource: { id: "doc-1" }, element: true },
    ]);
    expect(told() - before).toBe(0);
  });

  it("a changed policy re-registers once and keeps the id", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(set, <Can policy={canRead}>x</Can>, { instrument: true }),
    );
    await settled(set.gates);
    const id = firstId(set.gates);
    const before = told();

    view.rerender(
      providerTree(set, <Can policy={canWrite}>x</Can>, { instrument: true }),
    );
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      { id, kind: "Can", state: "Denied", resource: undefined, element: true },
    ]);
    expect(told() - before).toBe(2);
  });

  it("a changed resource re-registers once and keeps the id", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(
        set,
        <Can policy={canRead} resource={docA}>
          x
        </Can>,
        { instrument: true },
      ),
    );
    await settled(set.gates);
    const id = firstId(set.gates);
    const before = told();

    view.rerender(
      providerTree(
        set,
        <Can policy={canRead} resource={docB}>
          x
        </Can>,
        { instrument: true },
      ),
    );
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      { id, kind: "Can", state: "Allowed", resource: docB, element: true },
    ]);
    expect(told() - before).toBe(2);
  });

  it("unmounting unregisters with one notification and leaves nothing", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(set, <Can policy={canRead}>x</Can>, { instrument: true }),
    );
    await settled(set.gates);
    const before = told();

    view.unmount();

    expect(snapshotOf(set.gates.instances())).toEqual([]);
    expect(told() - before).toBe(1);
  });

  it("a remount registers again under a new id", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(
        set,
        <Can key="1" policy={canRead}>
          x
        </Can>,
        { instrument: true },
      ),
    );
    await settled(set.gates);
    const id = firstId(set.gates);
    const before = told();

    view.rerender(
      providerTree(
        set,
        <Can key="2" policy={canRead}>
          x
        </Can>,
        { instrument: true },
      ),
    );
    await settled(set.gates);

    const after = snapshotOf(set.gates.instances());
    expect(after).toHaveLength(1);
    expect(after[0]?.id).not.toBe(id);
    expect(after).toEqual([
      {
        id: firstId(set.gates),
        kind: "Can",
        state: "Allowed",
        resource: undefined,
        element: true,
      },
    ]);
    expect(told() - before).toBe(2);
  });

  it(
    "under StrictMode a guard registers once and a changed policy re-registers once",
    async () => {
      const set = atoms();
      const told = notificationsOf(set.gates);
      const options = { instrument: true, strict: true };

      const view = render(providerTree(set, <Can policy={canRead}>x</Can>, options));
      await settled(set.gates);
      const id = firstId(set.gates);
      expect(snapshotOf(set.gates.instances())).toEqual([
        { id, kind: "Can", state: "Allowed", resource: undefined, element: true },
      ]);
      const before = told();

      view.rerender(providerTree(set, <Can policy={canWrite}>x</Can>, options));
      await settled(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([
        { id, kind: "Can", state: "Denied", resource: undefined, element: true },
      ]);
      expect(told() - before).toBe(2);

      view.unmount();

      expect(snapshotOf(set.gates.instances())).toEqual([]);
    },
  );
});

describe("a grouped hook", () => {
  it(
    "usePolicies registers one entry per name, in key order, under the id of the hook",
    async () => {
      const set = atoms();
      const told = notificationsOf(set.gates);

      render(providerTree(set, <Group />, { instrument: true }));
      await settled(set.gates);
      const base = hookId(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([
        {
          id: `${base}/read`,
          kind: "usePolicies",
          state: "Allowed",
          resource: undefined,
          element: false,
        },
        {
          id: `${base}/admin`,
          kind: "usePolicies",
          state: "Denied",
          resource: undefined,
          element: false,
        },
      ]);
      expect(told()).toBe(2);
    },
  );

  it("adding a key registers that entry alone", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(set, <Group names={["read"]} />, { instrument: true }),
    );
    await settled(set.gates);
    const base = hookId(set.gates);
    const before = told();

    view.rerender(
      providerTree(set, <Group names={["read", "admin"]} />, { instrument: true }),
    );
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      {
        id: `${base}/read`,
        kind: "usePolicies",
        state: "Allowed",
        resource: undefined,
        element: false,
      },
      {
        id: `${base}/admin`,
        kind: "usePolicies",
        state: "Denied",
        resource: undefined,
        element: false,
      },
    ]);
    expect(told() - before).toBe(1);
  });

  it("removing a key unregisters that entry alone and keeps its sibling", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(
      providerTree(set, <Group names={["read", "admin"]} />, { instrument: true }),
    );
    await settled(set.gates);
    const base = hookId(set.gates);
    const before = told();

    view.rerender(providerTree(set, <Group names={["read"]} />, { instrument: true }));
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      {
        id: `${base}/read`,
        kind: "usePolicies",
        state: "Allowed",
        resource: undefined,
        element: false,
      },
    ]);
    expect(told() - before).toBe(1);
  });

  it(
    "reordering the keys notifies nothing and keeps the registration order",
    async () => {
      const set = atoms();
      const told = notificationsOf(set.gates);

      const view = render(
        providerTree(set, <Group names={["read", "admin"]} />, { instrument: true }),
      );
      await settled(set.gates);
      const base = hookId(set.gates);
      const before = told();

      view.rerender(
        providerTree(set, <Group names={["admin", "read"]} />, { instrument: true }),
      );
      await settled(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([
        {
          id: `${base}/read`,
          kind: "usePolicies",
          state: "Allowed",
          resource: undefined,
          element: false,
        },
        {
          id: `${base}/admin`,
          kind: "usePolicies",
          state: "Denied",
          resource: undefined,
          element: false,
        },
      ]);
      expect(told() - before).toBe(0);
    },
  );

  it("an equal record rebuilt each render notifies nothing", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);
    const tree = (tick: number) =>
      providerTree(
        set,
        <>
          <span data-tick={tick} />
          <Group />
        </>,
        { instrument: true },
      );

    const view = render(tree(0));
    await settled(set.gates);
    const base = hookId(set.gates);
    const before = told();

    view.rerender(tree(1));
    view.rerender(tree(2));
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([
      {
        id: `${base}/read`,
        kind: "usePolicies",
        state: "Allowed",
        resource: undefined,
        element: false,
      },
      {
        id: `${base}/admin`,
        kind: "usePolicies",
        state: "Denied",
        resource: undefined,
        element: false,
      },
    ]);
    expect(told() - before).toBe(0);
  });

  it("a changed resource in useQuestions re-registers that entry alone", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);
    const Ask = ({ doc }: { readonly doc: string }) => {
      useQuestions({
        doc: { policy: canRead, resource: { id: doc } },
        admin: { policy: isAdmin },
      });
      return null;
    };

    const view = render(providerTree(set, <Ask doc="d1" />, { instrument: true }));
    await settled(set.gates);
    const base = hookId(set.gates);
    const adminBefore = set.gates.instances().find((one) => one.id.endsWith("/admin"));
    const before = told();

    view.rerender(providerTree(set, <Ask doc="d2" />, { instrument: true }));
    await settled(set.gates);

    const after = set.gates.instances();
    expect(after.find((one) => one.id.endsWith("/admin"))).toBe(adminBefore);
    expect(snapshotOf(after)).toEqual([
      {
        id: `${base}/admin`,
        kind: "useQuestions",
        state: "Denied",
        resource: undefined,
        element: false,
      },
      {
        id: `${base}/doc`,
        kind: "useQuestions",
        state: "Allowed",
        resource: { id: "d2" },
        element: false,
      },
    ]);
    expect(told() - before).toBe(2);
  });

  it("unmounting a grouped hook unregisters every entry", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    const view = render(providerTree(set, <Group />, { instrument: true }));
    await settled(set.gates);
    const before = told();

    view.unmount();

    expect(snapshotOf(set.gates.instances())).toEqual([]);
    expect(told() - before).toBe(2);
  });
});

describe("off means absent", () => {
  it("an uninstrumented provider registers nothing and notifies nothing", async () => {
    const set = atoms();
    const told = notificationsOf(set.gates);

    render(
      providerTree(
        set,
        <>
          <Can policy={canRead}>x</Can>
          <Group />
        </>,
        { instrument: false },
      ),
    );
    await settled(set.gates);

    expect(snapshotOf(set.gates.instances())).toEqual([]);
    expect(told()).toBe(0);
  });

  it(
    "a changed gates prop moves every entry to the new registry, keeping its id",
    async () => {
      const set = atoms();
      const first = makeGateRegistry();
      const second = makeGateRegistry();
      const toldFirst = notificationsOf(first);
      const toldSecond = notificationsOf(second);
      const tree = (gates: GateRegistry) =>
        providerTree(set, <Can policy={canRead}>x</Can>, { instrument: true, gates });

      const view = render(tree(first));
      await settled(first);
      const id = firstId(first);
      expect(snapshotOf(first.instances())).toEqual([
        { id, kind: "Can", state: "Allowed", resource: undefined, element: true },
      ]);
      expect(toldFirst()).toBe(1);
      expect(toldSecond()).toBe(0);

      view.rerender(tree(second));
      await settled(second);

      expect(snapshotOf(first.instances())).toEqual([]);
      expect(snapshotOf(second.instances())).toEqual([
        { id, kind: "Can", state: "Allowed", resource: undefined, element: true },
      ]);
      expect(toldFirst()).toBe(2);
      expect(toldSecond()).toBe(1);
    },
  );

  it(
    "turning instrumentation off unregisters every entry and registers nothing",
    async () => {
      const set = atoms();
      const told = notificationsOf(set.gates);

      const view = render(
        providerTree(set, <Can policy={canRead}>x</Can>, { instrument: true }),
      );
      await settled(set.gates);
      const before = told();

      view.rerender(
        providerTree(set, <Can policy={canRead}>x</Can>, { instrument: false }),
      );
      await settled(set.gates);

      expect(snapshotOf(set.gates.instances())).toEqual([]);
      expect(told() - before).toBe(1);

      view.rerender(
        providerTree(set, <Can policy={canRead}>y</Can>, { instrument: false }),
      );
      await settled(set.gates);

      expect(told() - before).toBe(1);
    },
  );
});
