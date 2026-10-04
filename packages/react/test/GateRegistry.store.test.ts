/**
 * The gate registry's store contract, with no React and no DOM.
 *
 * Every test builds its own registry, so nothing resets process state: that is
 * the point of ADR-QD-080. The render-level behaviour is in `GateRegistry.test.tsx`
 * and `GateWriter.test.tsx`.
 */
import { hasPermission, permission } from "@qadi/core";
import * as FastCheck from "fast-check";
import { describe, expect, it } from "vitest";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import type { GateInstance, GateRenderState } from "../src/GateRegistry.ts";
import { gateWriterFor } from "../src/GateWriter.ts";

const canRead = hasPermission(permission("doc", "read"));

const instance = (id: string, state: GateRenderState): GateInstance => ({
  id,
  kind: "Can",
  policy: canRead,
  resource: undefined,
  state,
  element: undefined,
});

const writerOf = (registry: object) => {
  const writer = gateWriterFor(registry);
  if (writer === undefined) throw new Error("registry has no writer");
  return writer;
};

describe("the snapshot", () => {
  it("is the same reference until something changes", () => {
    // `useSyncExternalStore` compares by reference. A fresh array per call
    // re-renders forever.
    const registry = makeGateRegistry();
    writerOf(registry).register(instance("a", "Pending"));
    expect(registry.instances()).toBe(registry.instances());
  });

  it("is a new reference after a change", () => {
    const registry = makeGateRegistry();
    const handle = writerOf(registry).register(instance("a", "Pending"));
    const before = registry.instances();
    handle.update("Allowed");
    expect(registry.instances()).not.toBe(before);
  });

  it("starts empty", () => {
    expect(makeGateRegistry().instances()).toEqual([]);
  });
});

describe("subscribing", () => {
  it("tells a subscriber on register, update and unregister", () => {
    const registry = makeGateRegistry();
    let notified = 0;
    registry.subscribe(() => {
      notified += 1;
    });
    const handle = writerOf(registry).register(instance("a", "Pending"));
    expect(notified).toBe(1);
    handle.update("Allowed");
    expect(notified).toBe(2);
    handle.unregister();
    expect(notified).toBe(3);
  });

  it("does not notify for an unchanged state", () => {
    const registry = makeGateRegistry();
    let notified = 0;
    const handle = writerOf(registry).register(instance("a", "Pending"));
    registry.subscribe(() => {
      notified += 1;
    });
    handle.update("Pending");
    expect(notified).toBe(0);
  });

  it("stops telling a subscriber that unsubscribed", () => {
    const registry = makeGateRegistry();
    let notified = 0;
    const unsubscribe = registry.subscribe(() => {
      notified += 1;
    });
    unsubscribe();
    writerOf(registry).register(instance("a", "Pending"));
    expect(notified).toBe(0);
  });

  it("a listener that throws does not stop the fan-out", () => {
    const registry = makeGateRegistry();
    let reached = false;
    registry.subscribe(() => {
      throw new Error("subscriber bug");
    });
    registry.subscribe(() => {
      reached = true;
    });
    expect(() => writerOf(registry).register(instance("a", "Pending"))).not.toThrow();
    expect(reached).toBe(true);
  });
});

describe("interleaving: applied in firing order, eventually consistent", () => {
  it("an update firing after the matching unregister stays a no-op", () => {
    const registry = makeGateRegistry();
    const handle = writerOf(registry).register(instance("a", "Pending"));
    handle.unregister();
    handle.update("Allowed");
    expect(registry.instances()).toEqual([]);
  });

  it("unregister still evicts after an update replaced the stored object (regression)", () => {
    // `update` stores a brand-new object, not a mutation of the registered one.
    // A cleanup that compared the stored object by reference would never evict.
    const registry = makeGateRegistry();
    const handle = writerOf(registry).register(instance("a", "Pending"));
    handle.update("Allowed");
    expect(registry.instances()).toEqual([instance("a", "Allowed")]);
    handle.unregister();
    expect(registry.instances()).toEqual([]);
  });

  it("unregister is idempotent", () => {
    const registry = makeGateRegistry();
    const first = writerOf(registry).register(instance("a", "Pending"));
    first.unregister();
    const second = writerOf(registry).register(instance("a", "Allowed"));
    first.unregister();
    expect(registry.instances()).toEqual([instance("a", "Allowed")]);
    second.unregister();
  });

  it("re-registering an id after an unregister resurrects it cleanly", () => {
    const registry = makeGateRegistry();
    writerOf(registry).register(instance("a", "Pending")).unregister();
    writerOf(registry).register(instance("a", "Allowed"));
    expect(registry.instances()).toEqual([instance("a", "Allowed")]);
  });

  it("of two updates, the last wins", () => {
    const registry = makeGateRegistry();
    const handle = writerOf(registry).register(instance("a", "Pending"));
    handle.update("Allowed");
    handle.update("Denied");
    expect(registry.instances()).toHaveLength(1);
    expect(registry.instances()[0]?.state).toBe("Denied");
  });

  it("a stale handle's unregister after a newer same-id registration does not evict it", () => {
    // Under handles that race is a collision: both are listed, the newer under
    // a disambiguated id, and ending the older leaves only the newer.
    const registry = makeGateRegistry();
    const older = writerOf(registry).register(instance("a", "Pending"));
    writerOf(registry).register(instance("a", "Allowed"));
    expect(registry.instances().map((one) => one.id)).toEqual(["a", "a~1"]);

    older.unregister();

    expect(registry.instances()).toEqual([{ ...instance("a", "Allowed"), id: "a~1" }]);
  });
});

describe("scope and collisions", () => {
  it("two registries are independent", () => {
    const one = makeGateRegistry();
    const other = makeGateRegistry();
    writerOf(one).register(instance("a", "Allowed"));
    expect(one.instances()).toHaveLength(1);
    expect(other.instances()).toEqual([]);
  });

  it("disambiguates a colliding id and reports it once per id", () => {
    const reported: Array<string> = [];
    const registry = makeGateRegistry({ onIdCollision: (id) => reported.push(id) });
    const writer = writerOf(registry);
    writer.register(instance("x", "Allowed"));
    writer.register(instance("x", "Denied"));
    writer.register(instance("x", "Pending"));

    const ids = registry.instances().map((one) => one.id);
    expect(ids).toEqual(["x", "x~1", "x~2"]);
    expect(reported).toEqual(["x"]);
  });

  it("a disambiguated entry updates and unregisters under its own handle", () => {
    const registry = makeGateRegistry();
    const writer = writerOf(registry);
    writer.register(instance("x", "Allowed"));
    const second = writer.register(instance("x", "Pending"));
    second.update("Denied");
    expect(registry.instances().map((one) => one.state)).toEqual(["Allowed", "Denied"]);
    second.unregister();
    expect(registry.instances().map((one) => one.id)).toEqual(["x"]);
  });

  it("a hand-built registry has no writer", () => {
    const foreign = { instances: () => [], subscribe: () => () => {} };
    expect(gateWriterFor(foreign)).toBeUndefined();
  });
});

type Operation =
  | { readonly kind: "register"; readonly id: string; readonly state: GateRenderState }
  | { readonly kind: "update"; readonly slot: number; readonly state: GateRenderState }
  | { readonly kind: "unregister"; readonly slot: number };

const states: ReadonlyArray<GateRenderState> = [
  "Pending",
  "Rechecking",
  "Allowed",
  "Denied",
  "Failed",
];
const stateArbitrary = FastCheck.constantFrom(...states);
const operationArbitrary: FastCheck.Arbitrary<Operation> = FastCheck.oneof(
  FastCheck.record({
    kind: FastCheck.constant("register" as const),
    id: FastCheck.constantFrom("a", "b", "c"),
    state: stateArbitrary,
  }),
  FastCheck.record({
    kind: FastCheck.constant("update" as const),
    slot: FastCheck.nat(3),
    state: stateArbitrary,
  }),
  FastCheck.record({
    kind: FastCheck.constant("unregister" as const),
    slot: FastCheck.nat(3),
  }),
);

describe("against a reference model", () => {
  it("instances() equals the model's live handles, and ids stay pairwise distinct", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.array(operationArbitrary, { maxLength: 40 }), (operations) => {
        const registry = makeGateRegistry();
        const writer = writerOf(registry);
        // Every handle ever made, and the model's ordered list of live ones.
        const handles: Array<{ readonly unregister: () => void; readonly update: (s: GateRenderState) => void }> = [];
        const live: Array<{ handle: number; baseId: string; state: GateRenderState }> = [];

        for (const operation of operations) {
          if (operation.kind === "register") {
            handles.push(writer.register(instance(operation.id, operation.state)));
            live.push({ handle: handles.length - 1, baseId: operation.id, state: operation.state });
          } else {
            const target = handles[operation.slot];
            if (target === undefined) continue;
            const entry = live.find((one) => one.handle === operation.slot);
            if (operation.kind === "update") {
              target.update(operation.state);
              if (entry !== undefined) entry.state = operation.state;
            } else {
              target.unregister();
              const at = live.findIndex((one) => one.handle === operation.slot);
              if (at >= 0) live.splice(at, 1);
            }
          }

          const snapshot = registry.instances();
          expect(snapshot.map((one) => [one.id.split("~")[0], one.state])).toEqual(
            live.map((one) => [one.baseId, one.state]),
          );
          expect(new Set(snapshot.map((one) => one.id)).size).toBe(snapshot.length);
        }
      }),
    );
  });
});
