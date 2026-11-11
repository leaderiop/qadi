/**
 * The gate reconcile rules, with no React and no DOM rendering (ARCH-76).
 *
 * `reconcile(writer, live, wanted, current) → next live map`, where
 * `live: ReadonlyMap<string, Registered>`, `wanted: ReadonlyArray<GateIdentity>` and
 * `current` is index-aligned with `wanted`. The writer is a fake that records every
 * call, so each rule is read off the log: what changed or left unregisters, what is
 * new registers, and what is unchanged is left alone. The render-level behaviour is
 * in `GateWriter.test.tsx`.
 */
import { hasPermission, permission } from "@qadi/core";
import { describe, expect, it } from "vitest";
import { reconcile } from "../src/GateWriter.ts";
import type { GateIdentity, GateWriter, Registered } from "../src/GateWriter.ts";
import type { GateRenderState } from "../src/GateRegistry.ts";

type Call =
  | readonly ["register", string, GateRenderState, Element | undefined]
  | readonly ["unregister", string]
  | readonly ["update", string, GateRenderState];

const fakeWriter = () => {
  const log: Array<Call> = [];
  const writer: GateWriter = {
    register: (instance) => {
      log.push(["register", instance.id, instance.state, instance.element]);
      return {
        update: (state) => log.push(["update", instance.id, state]),
        unregister: () => log.push(["unregister", instance.id]),
      };
    },
  };
  return { writer, log };
};

const canRead = () => hasPermission(permission("doc", "read"));
const canWrite = () => hasPermission(permission("doc", "write"));

const markerOf = (element: HTMLSpanElement | null = null) => ({ current: element });

const identity = (id: string, overrides?: Partial<GateIdentity>): GateIdentity => ({
  id,
  kind: "useCan",
  atom: {},
  wraps: false,
  policy: canRead(),
  resource: undefined,
  marker: markerOf(),
  ...overrides,
});

const nothing: ReadonlyMap<string, Registered> = new Map();

describe("reconcile: registering", () => {
  it("registers every wanted identity, in order, with the current policy, resource and state", () => {
    const { writer, log } = fakeWriter();
    const a = identity("a");
    const b = identity("b");
    const policyNow = canWrite();
    const next = reconcile(writer, nothing, [a, b], [
      { policy: policyNow, resource: { type: "doc", id: "1" }, state: "Allowed" },
      { policy: canRead(), resource: undefined, state: "Denied" },
    ]);
    expect(log).toEqual([
      ["register", "a", "Allowed", undefined],
      ["register", "b", "Denied", undefined],
    ]);
    expect([...next.keys()]).toEqual(["a", "b"]);
    expect(next.get("a")?.identity).toBe(a);
  });

  it("registers a new id and calls nothing else", () => {
    const { writer, log } = fakeWriter();
    const a = identity("a");
    const first = reconcile(writer, nothing, [a], [{ policy: a.policy, resource: undefined, state: "Pending" }]);
    log.length = 0;
    const b = identity("b");
    const next = reconcile(writer, first, [a, b], [
      { policy: a.policy, resource: undefined, state: "Pending" },
      { policy: b.policy, resource: undefined, state: "Allowed" },
    ]);
    expect(log).toEqual([["register", "b", "Allowed", undefined]]);
    expect([...next.keys()]).toEqual(["a", "b"]);
  });

  it("falls back to the identity's own policy and resource, and to Pending, when current is absent", () => {
    const registered: Array<{ policy: unknown; resource: unknown; state: unknown }> = [];
    const writer: GateWriter = {
      register: (instance) => {
        registered.push({
          policy: instance.policy,
          resource: instance.resource,
          state: instance.state,
        });
        return { update: () => undefined, unregister: () => undefined };
      },
    };
    const resource = { type: "doc", id: "7" };
    const a = identity("a", { resource });
    reconcile(writer, nothing, [a], [undefined]);
    reconcile(writer, nothing, [a], []);
    expect(registered).toEqual([
      { policy: a.policy, resource, state: "Pending" },
      { policy: a.policy, resource, state: "Pending" },
    ]);
  });

  it("registers the policy and resource current gives, not the identity's", () => {
    const registered: Array<{ policy: unknown; resource: unknown }> = [];
    const writer: GateWriter = {
      register: (instance) => {
        registered.push({ policy: instance.policy, resource: instance.resource });
        return { update: () => undefined, unregister: () => undefined };
      },
    };
    const a = identity("a", { resource: { type: "doc", id: "old" } });
    const newPolicy = canWrite();
    const newResource = { type: "doc", id: "new" };
    reconcile(writer, nothing, [a], [{ policy: newPolicy, resource: newResource, state: "Pending" }]);
    expect(registered).toEqual([{ policy: newPolicy, resource: newResource }]);
  });
});

describe("reconcile: the element", () => {
  it("registers the marker's element for a wrapping identity that has one", () => {
    const { writer, log } = fakeWriter();
    const element = document.createElement("span");
    reconcile(writer, nothing, [identity("a", { wraps: true, marker: markerOf(element) })], [undefined]);
    expect(log).toEqual([["register", "a", "Pending", element]]);
  });

  it("registers undefined for a wrapping identity whose marker is empty", () => {
    const { writer, log } = fakeWriter();
    reconcile(writer, nothing, [identity("a", { wraps: true, marker: markerOf(null) })], [undefined]);
    expect(log).toEqual([["register", "a", "Pending", undefined]]);
  });

  it("registers undefined for a non-wrapping identity even when its marker holds an element", () => {
    const { writer, log } = fakeWriter();
    const element = document.createElement("span");
    reconcile(writer, nothing, [identity("a", { wraps: false, marker: markerOf(element) })], [undefined]);
    expect(log).toEqual([["register", "a", "Pending", undefined]]);
  });
});

describe("reconcile: leaving things alone", () => {
  it("makes no call, and keeps the same entries, for the same identities with fresh policy objects", () => {
    const { writer, log } = fakeWriter();
    const atom = {};
    const marker = markerOf();
    const a = identity("a", { atom, marker });
    const b = identity("b", { atom, marker });
    const first = reconcile(writer, nothing, [a, b], [undefined, undefined]);
    log.length = 0;
    const next = reconcile(
      writer,
      first,
      [
        identity("a", { atom, marker, policy: canWrite() }),
        identity("b", { atom, marker, resource: { type: "doc", id: "2" } }),
      ],
      [undefined, undefined],
    );
    expect(log).toEqual([]);
    expect(next.get("a")).toBe(first.get("a"));
    expect(next.get("b")).toBe(first.get("b"));
  });

  it("does not mutate the live map it is given", () => {
    const { writer } = fakeWriter();
    const a = identity("a");
    const first = reconcile(writer, nothing, [a], [undefined]);
    const snapshot = [...first];
    reconcile(writer, first, [identity("b")], [undefined]);
    expect([...first]).toEqual(snapshot);
    expect(nothing.size).toBe(0);
  });
});

describe("reconcile: unregistering", () => {
  it("unregisters a dropped id and registers nothing", () => {
    const { writer, log } = fakeWriter();
    const a = identity("a");
    const b = identity("b");
    const first = reconcile(writer, nothing, [a, b], [undefined, undefined]);
    log.length = 0;
    const next = reconcile(writer, first, [a], [undefined]);
    expect(log).toEqual([["unregister", "b"]]);
    expect([...next.keys()]).toEqual(["a"]);
  });

  it("unregisters everything for an empty wanted list", () => {
    const { writer, log } = fakeWriter();
    const first = reconcile(writer, nothing, [identity("a"), identity("b")], [undefined, undefined]);
    log.length = 0;
    const next = reconcile(writer, first, [], []);
    expect(log).toEqual([
      ["unregister", "a"],
      ["unregister", "b"],
    ]);
    expect(next.size).toBe(0);
  });

  const changes: ReadonlyArray<readonly [string, Partial<GateIdentity>]> = [
    ["atom", { atom: {} }],
    ["kind", { kind: "useDecision" }],
    ["wraps", { wraps: true }],
    ["marker", { marker: markerOf() }],
  ];

  // One test, not one per field: vitest folds identical errors into one block, and
  // the field name rides on each assertion's message instead.
  it("unregisters then registers when only one of atom, kind, wraps or marker changed, and leaves its sibling", () => {
    for (const [what, change] of changes) {
      const { writer, log } = fakeWriter();
      const atom = {};
      const marker = markerOf();
      const a = identity("a", { atom, marker });
      const b = identity("b", { atom, marker });
      const first = reconcile(writer, nothing, [a, b], [undefined, undefined]);
      log.length = 0;
      const changed = identity("a", { atom, marker, ...change });
      const next = reconcile(writer, first, [changed, b], [undefined, undefined]);
      expect(log, what).toEqual([
        ["unregister", "a"],
        ["register", "a", "Pending", undefined],
      ]);
      expect(next.get("a")?.identity, what).toBe(changed);
      expect(next.get("b"), what).toBe(first.get("b"));
    }
  });
});
