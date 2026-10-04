/**
 * `useGateRegistration` driven directly, with no provider and no `<Can>`.
 *
 * The lifecycle wiring `useGate` delegates to, tested against a bare registry:
 * the narrower surface the old module-scope design could not offer.
 */
import { hasPermission, permission } from "@qadi/core";
import { renderHook } from "@testing-library/react";
import { createRef } from "react";
import { describe, expect, it } from "vitest";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import type { GateRenderState } from "../src/GateRegistry.ts";
import { gateWriterFor, useGateRegistration } from "../src/GateWriter.ts";
import type { GateIdentity, GateWriter } from "../src/GateWriter.ts";

const canRead = () => hasPermission(permission("doc", "read"));

// One marker ref per hook instance, as `useGate` has: a fresh ref per render
// would be a changed identity.
const marker = createRef<HTMLSpanElement>();

const identityFor = (atom: object, overrides?: Partial<GateIdentity>): GateIdentity => ({
  id: "g1",
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
  let notified = 0;
  registry.subscribe(() => {
    notified += 1;
  });
  return { registry, writer, notifications: () => notified };
};

interface Props {
  readonly writer: GateWriter | undefined;
  readonly identity: GateIdentity;
  readonly state: GateRenderState;
}

const run = (props: Props) =>
  renderHook((p: Props) => useGateRegistration(p.writer, p.identity, p.state), {
    initialProps: props,
  });

describe("useGateRegistration", () => {
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
