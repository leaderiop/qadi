/**
 * The gate reconcile rules, with no React and no DOM rendering (ARCH-76).
 *
 * `reconcile(writer, live, wanted) → next live map`, where
 * `live: ReadonlyMap<string, Registered>` and `wanted: ReadonlyMap<string, GateWanted>`
 * is keyed by gate id. The writer is a fake that records every call, so each rule is
 * read off the log: what is kept is told its state, what changed or left unregisters,
 * and what is new registers. The render-level behaviour is in `GateWriter.test.tsx`
 * and `GateRegistration.characterisation.test.tsx`.
 */
import { describe, expect, it } from "vitest";
import { gateWriterFor, reconcile } from "../src/GateWriter.ts";
import type {
  GateIdentity,
  GateWanted,
  GateWriter,
  Registered,
} from "../src/GateWriter.ts";
import { makeGateRegistry } from "../src/GateRegistry.ts";
import type { GateRenderState } from "../src/GateRegistry.ts";
import { newCanRead, newCanWrite } from "./support/gates.ts";

type Call =
  | readonly ["register", string, GateRenderState, Element | undefined]
  | readonly ["unregister", string]
  | readonly ["update", string, GateRenderState];

/** A writer that logs every call it is made, and never throws. */
const fakeWriter = () => {
  const log: Array<Call> = [];
  const writer: GateWriter = {
    register: (instance) => {
      log.push(["register", instance.id, instance.state, instance.element]);
      return {
        update: (state) => {
          log.push(["update", instance.id, state]);
        },
        unregister: () => {
          log.push(["unregister", instance.id]);
        },
      };
    },
  };
  return { writer, log };
};

const markerOf = (element: HTMLSpanElement | null = null) => ({ current: element });

const identity = (overrides?: Partial<GateIdentity>): GateIdentity => ({
  kind: "useCan",
  atom: {},
  wraps: false,
  policy: newCanRead(),
  resource: undefined,
  marker: markerOf(),
  ...overrides,
});

const want = (one: GateIdentity, state: GateRenderState = "Pending"): GateWanted => ({
  identity: one,
  state,
});

const nothing: ReadonlyMap<string, Registered> = new Map();

describe("reconcile: registering", () => {
  it("registers every wanted entry in map order, with its identity and its state", () => {
    const { writer, log } = fakeWriter();
    const a = identity({ policy: newCanWrite(), resource: { type: "doc", id: "1" } });
    const b = identity();
    const next = reconcile(
      writer,
      nothing,
      new Map([
        ["a", want(a, "Allowed")],
        ["b", want(b, "Denied")],
      ]),
    );
    expect(log).toEqual([
      ["register", "a", "Allowed", undefined],
      ["register", "b", "Denied", undefined],
    ]);
    expect([...next.keys()]).toEqual(["a", "b"]);
    expect(next.get("a")?.identity).toBe(a);
  });

  it("keeps a live entry, updates it, and registers an id that was not live", () => {
    const { writer, log } = fakeWriter();
    const a = identity();
    const first = reconcile(writer, nothing, new Map([["a", want(a)]]));
    log.length = 0;
    const next = reconcile(
      writer,
      first,
      new Map([
        ["a", want(a)],
        ["b", want(identity(), "Allowed")],
      ]),
    );
    expect(log).toEqual([
      ["update", "a", "Pending"],
      ["register", "b", "Allowed", undefined],
    ]);
    expect([...next.keys()]).toEqual(["a", "b"]);
  });

  it("registers a new id with the wanted state, not Pending", () => {
    const { writer, log } = fakeWriter();
    reconcile(writer, nothing, new Map([["a", want(identity(), "Denied")]]));
    expect(log).toEqual([["register", "a", "Denied", undefined]]);
  });

  it("registers the policy and resource its identity carries", () => {
    const registered: Array<{ policy: unknown; resource: unknown }> = [];
    const writer: GateWriter = {
      register: (instance) => {
        registered.push({ policy: instance.policy, resource: instance.resource });
        return { update: () => undefined, unregister: () => undefined };
      },
    };
    const policy = newCanWrite();
    const resource = { type: "doc", id: "new" };
    reconcile(writer, nothing, new Map([["a", want(identity({ policy, resource }))]]));
    expect(registered).toEqual([{ policy, resource }]);
  });
});

describe("reconcile: the element", () => {
  it("registers the marker's element for a wrapping identity that has one", () => {
    const { writer, log } = fakeWriter();
    const element = document.createElement("span");
    const wrapping = identity({ wraps: true, marker: markerOf(element) });
    reconcile(writer, nothing, new Map([["a", want(wrapping)]]));
    expect(log).toEqual([["register", "a", "Pending", element]]);
  });

  it("registers undefined for a wrapping identity whose marker is empty", () => {
    const { writer, log } = fakeWriter();
    const wrapping = identity({ wraps: true, marker: markerOf(null) });
    reconcile(writer, nothing, new Map([["a", want(wrapping)]]));
    expect(log).toEqual([["register", "a", "Pending", undefined]]);
  });

  it("registers undefined for a non-wrapping identity even when its marker holds an element", () => {
    const { writer, log } = fakeWriter();
    const element = document.createElement("span");
    const plain = identity({ wraps: false, marker: markerOf(element) });
    reconcile(writer, nothing, new Map([["a", want(plain)]]));
    expect(log).toEqual([["register", "a", "Pending", undefined]]);
  });
});

describe("reconcile: keeping and updating", () => {
  it("tells the handle of a kept entry the wanted state", () => {
    const { writer, log } = fakeWriter();
    const a = identity();
    const first = reconcile(writer, nothing, new Map([["a", want(a, "Pending")]]));
    log.length = 0;
    const next = reconcile(writer, first, new Map([["a", want(a, "Allowed")]]));
    expect(log).toEqual([["update", "a", "Allowed"]]);
    expect(next.get("a")).toBe(first.get("a"));
  });

  it("tells a kept handle its state even when unchanged, leaving equality to it", () => {
    const { writer, log } = fakeWriter();
    const a = identity();
    const first = reconcile(writer, nothing, new Map([["a", want(a, "Pending")]]));
    log.length = 0;
    reconcile(writer, first, new Map([["a", want(a, "Pending")]]));
    expect(log).toEqual([["update", "a", "Pending"]]);
  });

  it("keeps the entry when only the policy or the resource changed", () => {
    const moved: ReadonlyArray<readonly [string, Partial<GateIdentity>]> = [
      ["policy", { policy: newCanWrite() }],
      ["resource", { resource: { type: "doc", id: "r2" } }],
    ];
    for (const [what, change] of moved) {
      const { writer, log } = fakeWriter();
      const atom = {};
      const marker = markerOf();
      const first = reconcile(
        writer,
        nothing,
        new Map([["a", want(identity({ atom, marker }))]]),
      );
      log.length = 0;
      const next = reconcile(
        writer,
        first,
        new Map([["a", want(identity({ atom, marker, ...change }))]]),
      );
      expect(log, what).toEqual([["update", "a", "Pending"]]);
      expect(next.get("a"), what).toBe(first.get("a"));
    }
  });

  it("reconciling the same input twice keeps every entry and calls only update", () => {
    const { writer, log } = fakeWriter();
    const input = new Map([
      ["a", want(identity(), "Allowed")],
      ["b", want(identity(), "Denied")],
    ]);
    const first = reconcile(writer, nothing, input);
    log.length = 0;
    const second = reconcile(writer, first, input);
    expect(log).toEqual([
      ["update", "a", "Allowed"],
      ["update", "b", "Denied"],
    ]);
    expect(second.get("a")).toBe(first.get("a"));
    expect(second.get("b")).toBe(first.get("b"));
  });

  it("keeps unchanged identities with fresh policy objects, calling only update", () => {
    const { writer, log } = fakeWriter();
    const atom = {};
    const marker = markerOf();
    const first = reconcile(
      writer,
      nothing,
      new Map([
        ["a", want(identity({ atom, marker }))],
        ["b", want(identity({ atom, marker }))],
      ]),
    );
    log.length = 0;
    const next = reconcile(
      writer,
      first,
      new Map([
        ["a", want(identity({ atom, marker, policy: newCanWrite() }))],
        ["b", want(identity({ atom, marker, resource: { type: "doc", id: "2" } }))],
      ]),
    );
    expect(log).toEqual([
      ["update", "a", "Pending"],
      ["update", "b", "Pending"],
    ]);
    expect(next.get("a")).toBe(first.get("a"));
    expect(next.get("b")).toBe(first.get("b"));
  });

  it("returns a fresh map and does not mutate the live map it is given", () => {
    const { writer } = fakeWriter();
    const first = reconcile(writer, nothing, new Map([["a", want(identity())]]));
    const snapshot = [...first];
    const next = reconcile(writer, first, new Map([["b", want(identity())]]));
    expect(next).not.toBe(first);
    expect([...first]).toEqual(snapshot);
    expect(nothing.size).toBe(0);
  });
});

describe("reconcile: unregistering", () => {
  it(
    "on a real registry a changed identity keeps its id and reports no collision",
    () => {
      const reported: Array<string> = [];
      const registry = makeGateRegistry({ onIdCollision: (id) => reported.push(id) });
      const writer = gateWriterFor(registry);
      if (writer === undefined) throw new Error("registry has no writer");
      const first = reconcile(writer, nothing, new Map([["a", want(identity())]]));
      const atom = {};
      const next = reconcile(
        writer,
        first,
        new Map([["a", want(identity({ atom }), "Allowed")]]),
      );
      expect(registry.instances().map((one) => [one.id, one.state])).toEqual([
        ["a", "Allowed"],
      ]);
      expect(next.get("a")?.identity.atom).toBe(atom);
      expect(reported).toEqual([]);
    },
  );

  it("calls each live update or unregister in order, then each registration", () => {
    const { writer, log } = fakeWriter();
    const atom = {};
    const marker = markerOf();
    const first = reconcile(
      writer,
      nothing,
      new Map([
        ["a", want(identity({ atom, marker }))],
        ["b", want(identity({ atom, marker }))],
        ["c", want(identity({ atom, marker }))],
      ]),
    );
    log.length = 0;
    reconcile(
      writer,
      first,
      new Map([
        ["d", want(identity({ atom, marker }))],
        ["a", want(identity({ atom, marker }))],
        ["c", want(identity({ atom: {}, marker }))],
      ]),
    );
    expect(log).toEqual([
      ["update", "a", "Pending"],
      ["unregister", "b"],
      ["unregister", "c"],
      ["register", "d", "Pending", undefined],
      ["register", "c", "Pending", undefined],
    ]);
  });

  it("unregisters a dropped id and registers nothing", () => {
    const { writer, log } = fakeWriter();
    const a = identity();
    const first = reconcile(
      writer,
      nothing,
      new Map([
        ["a", want(a)],
        ["b", want(identity())],
      ]),
    );
    log.length = 0;
    const next = reconcile(writer, first, new Map([["a", want(a)]]));
    expect(log).toEqual([
      ["update", "a", "Pending"],
      ["unregister", "b"],
    ]);
    expect([...next.keys()]).toEqual(["a"]);
    expect(next.get("a")).toBe(first.get("a"));
  });

  it("unregisters everything for an empty wanted map", () => {
    const { writer, log } = fakeWriter();
    const first = reconcile(
      writer,
      nothing,
      new Map([
        ["a", want(identity())],
        ["b", want(identity())],
      ]),
    );
    log.length = 0;
    const next = reconcile(writer, first, new Map());
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
  it(
    "re-registers when only atom, kind, wraps or marker changed, updating its sibling",
    () => {
      for (const [what, change] of changes) {
        const { writer, log } = fakeWriter();
        const atom = {};
        const marker = markerOf();
        const b = identity({ atom, marker });
        const first = reconcile(
          writer,
          nothing,
          new Map([
            ["a", want(identity({ atom, marker }))],
            ["b", want(b)],
          ]),
        );
        log.length = 0;
        const changed = identity({ atom, marker, ...change });
        const next = reconcile(
          writer,
          first,
          new Map([
            ["a", want(changed)],
            ["b", want(b)],
          ]),
        );
        expect(log, what).toEqual([
          ["unregister", "a"],
          ["update", "b", "Pending"],
          ["register", "a", "Pending", undefined],
        ]);
        expect(next.get("a")?.identity, what).toBe(changed);
        expect(next.get("b"), what).toBe(first.get("b"));
      }
    },
  );
});
