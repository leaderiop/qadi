/**
 * `useGateRegistrations` driven directly, with no provider and no `<Can>`.
 *
 * The lifecycle wiring `useGate` delegates to, tested against a bare registry:
 * the narrower surface the old module-scope design could not offer.
 */
import { hasPermission, permission } from "@qadi/core";
import { renderHook } from "@testing-library/react";
import { createRef, StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import type { GateRenderState } from "../src/GateRegistry.ts";
import { gateWriterFor } from "../src/GateWriter.ts";
import { useGateRegistrations } from "../src/useGate.ts";
import type { GateIdentity, GateWanted, GateWriter } from "../src/GateWriter.ts";
import { notificationsOf } from "./support/gates.ts";
import { Boundary } from "./support/trees.tsx";

const canRead = () => hasPermission(permission("doc", "read"));

// One marker ref per hook instance, as `useGate` has: a fresh ref per render
// would be a changed identity.
const marker = createRef<HTMLSpanElement>();

const identityFor = (atom: object, overrides?: Partial<GateIdentity>): GateIdentity => ({
  kind: "useCan",
  atom,
  wraps: false,
  policy: canRead(),
  resource: undefined,
  marker,
  ...overrides,
});

const setup = () => {
  const registry = makeGateRegistry();
  const writer = gateWriterFor(registry);
  if (writer === undefined) throw new Error("registry has no writer");
  return { registry, writer, notifications: notificationsOf(registry) };
};

interface Props {
  readonly writer: GateWriter | undefined;
  readonly identity: GateIdentity;
  readonly state: GateRenderState;
}

const wantedOf = (p: Props): ReadonlyMap<string, GateWanted> =>
  new Map([["g1", { identity: p.identity, state: p.state }]]);

const run = (props: Props, wrapper?: typeof StrictMode) =>
  renderHook((p: Props) => useGateRegistrations(p.writer, wantedOf(p)), {
    initialProps: props,
    wrapper,
  });

describe("useGateRegistrations (one identity)", () => {
  it("registers on mount", () => {
    const { registry, writer } = setup();
    run({ writer, identity: identityFor({}), state: "Pending" });
    expect(registry.instances().map((one) => [one.id, one.kind, one.state])).toEqual([
      ["g1", "useCan", "Pending"],
    ]);
  });

  it("a state change updates in place: one notification, the same id", () => {
    const { registry, writer, notifications } = setup();
    const identity = identityFor({});
    const view = run({ writer, identity, state: "Pending" });
    const afterMount = notifications();

    view.rerender({ writer, identity, state: "Allowed" });

    expect(notifications()).toBe(afterMount + 1);
    expect(registry.instances().map((one) => [one.id, one.state])).toEqual([
      ["g1", "Allowed"],
    ]);
  });

  it("an unchanged state makes no notification and keeps the id", () => {
    const { registry, writer, notifications } = setup();
    const identity = identityFor({});
    const view = run({ writer, identity, state: "Pending" });
    const afterMount = notifications();
    const [mounted] = registry.instances();

    view.rerender({ writer, identity, state: "Pending" });

    expect(notifications()).toBe(afterMount);
    expect(registry.instances().map((one) => [one.id, one.state])).toEqual([
      ["g1", "Pending"],
    ]);
    expect(registry.instances()[0]).toBe(mounted);
  });

  it("an equal-but-fresh policy with the same atom does not re-register", () => {
    // Ticket 141's property, provable here without rendering a `<Can>`.
    const { writer, notifications } = setup();
    const atom = {};
    const view = run({ writer, identity: identityFor(atom), state: "Allowed" });
    const afterMount = notifications();

    view.rerender({
      writer,
      identity: identityFor(atom, { policy: canRead(), resource: { id: "doc-1" } }),
      state: "Allowed",
    });

    expect(notifications()).toBe(afterMount);
  });

  it("a different atom re-registers", () => {
    const { registry, writer, notifications } = setup();
    const view = run({ writer, identity: identityFor({}), state: "Allowed" });
    const afterMount = notifications();

    view.rerender({ writer, identity: identityFor({}), state: "Allowed" });

    // Unregister, then register: two notifications, one live entry.
    expect(notifications()).toBe(afterMount + 2);
    expect(registry.instances()).toHaveLength(1);
  });

  it("GW-S1 under StrictMode a different atom re-registers with the non-strict notification count", () => {
    const { registry, writer, notifications } = setup();
    const view = run({ writer, identity: identityFor({}), state: "Allowed" }, StrictMode);
    const afterMount = notifications();

    view.rerender({ writer, identity: identityFor({}), state: "Allowed" });

    // The same unregister then register as without StrictMode: two notifications.
    expect(notifications()).toBe(afterMount + 2);
    expect(registry.instances()).toHaveLength(1);
  });

  it("the writer going undefined unregisters", () => {
    const { registry, writer } = setup();
    const identity = identityFor({});
    const view = run({ writer, identity, state: "Allowed" });
    expect(registry.instances()).toHaveLength(1);

    view.rerender({ writer: undefined, identity, state: "Allowed" });

    expect(registry.instances()).toEqual([]);
  });

  it("unmount unregisters", () => {
    const { registry, writer } = setup();
    const view = run({ writer, identity: identityFor({}), state: "Allowed" });
    view.unmount();
    expect(registry.instances()).toEqual([]);
  });

  it("an undefined writer registers nothing", () => {
    const { registry } = setup();
    run({ writer: undefined, identity: identityFor({}), state: "Allowed" });
    expect(registry.instances()).toEqual([]);
  });
});

describe("useGateRegistrations (several identities)", () => {
  it("a reconcile that throws leaves nothing registered once the hook unmounts", () => {
    const { registry, writer, notifications } = setup();
    const failure = new Error("register c is refused");
    const throwing: GateWriter = {
      register: (instance) => {
        if (instance.id === "c") throw failure;
        return writer.register(instance);
      },
    };
    const a = identityFor({});
    const wantedA: ReadonlyMap<string, GateWanted> = new Map([
      ["a", { identity: a, state: "Allowed" }],
    ]);
    const wantedAll: ReadonlyMap<string, GateWanted> = new Map([
      ["a", { identity: a, state: "Allowed" }],
      ["b", { identity: identityFor({}), state: "Allowed" }],
      ["c", { identity: identityFor({}), state: "Allowed" }],
    ]);
    const caught: Array<unknown> = [];
    const report = vi.spyOn(console, "error").mockImplementation(() => undefined);
    try {
      const view = renderHook(
        (p: { readonly wanted: ReadonlyMap<string, GateWanted> }) =>
          useGateRegistrations(throwing, p.wanted),
        {
          initialProps: { wanted: wantedA },
          wrapper: ({ children }) => (
            <Boundary onCaught={(error) => caught.push(error)}>{children}</Boundary>
          ),
        },
      );
      expect(registry.instances().map((one) => one.id)).toEqual(["a"]);

      view.rerender({ wanted: wantedAll });

      expect(caught).toHaveLength(1);
      expect(caught[0]).toBe(failure);
      expect(registry.instances()).toEqual([]);
      // Register a, register b, the rollback of b, then the teardown of a.
      expect(notifications()).toBe(4);
    } finally {
      report.mockRestore();
    }
  });
});
