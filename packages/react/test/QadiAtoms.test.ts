/**
 * The atoms, exercised through a registry directly.
 *
 * Nothing here renders. Caching, sharing and invalidation are properties of the
 * atom graph, not of React, and proving them without a DOM is what keeps the
 * React binding thin enough to be obviously correct.
 */
import {
  AttributeResolver,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  EvaluationServicesNone,
  RelationshipResolverNever,
  decisionSinkRing,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  isAllowed,
  makeSubject,
  permission,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");
/** Answerable only by asking the resolver, so resolver calls are countable. */
const needsLookup = hasAttribute("clearance", gte(1));

const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

const baseLayer = EvaluationServicesNone;

/** Counts how many times an attribute lookup actually happens. */
const countingLayer = (counter: { count: number }) =>
  Layer.mergeAll(
    Layer.succeed(AttributeResolver, {
      resolve: () =>
        Effect.sync(() => {
          counter.count += 1;
          return undefined;
        }),
    }),
    RelationshipResolverNever,
    DecisionHistoryUnknown,
    EvaluationIdLive,
    CustomPredicateNone,
    SignatureHistoryNone,
  );

const registries: Array<AtomRegistry.AtomRegistry> = [];
const makeRegistry = () => {
  const registry = AtomRegistry.make();
  registries.push(registry);
  return registry;
};

afterEach(() => {
  for (const registry of registries.splice(0)) registry.dispose();
});

/** Resolves once the decision leaves `Initial`. */
const settle = (
  registry: AtomRegistry.AtomRegistry,
  atoms: ReturnType<typeof makeQadiAtoms>,
  policy: Parameters<ReturnType<typeof makeQadiAtoms>["decision"]>[0],
) =>
  Effect.runPromise(
    AtomRegistry.getResult(registry, atoms.decision(policy), { suspendOnWaiting: true }),
  );

describe("makeQadiAtoms", () => {
  it("stays Initial until a subject is known", () => {
    const atoms = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    const unmount = registry.mount(atoms.decision(canRead));

    // Not a denial. A pending decision and a refused one are different answers,
    // and rendering the second while waiting for the first is a lie.
    expect(AsyncResult.isInitial(registry.get(atoms.decision(canRead)))).toBe(true);
    unmount();
  });

  it("decides once the subject arrives", async () => {
    const atoms = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);

    const decision = await settle(registry, atoms, canRead);
    expect(isAllowed(decision)).toBe(true);
  });

  it("re-decides when the subject changes", async () => {
    const atoms = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    expect(isAllowed(await settle(registry, atoms, isAdmin))).toBe(false);

    registry.set(atoms.subject, makeSubject({ id: "u2", roles: ["admin"] }));
    expect(isAllowed(await settle(registry, atoms, isAdmin))).toBe(true);
  });

  it("returns the same atom for the same policy", () => {
    const atoms = makeQadiAtoms(baseLayer);
    expect(atoms.decision(canRead)).toBe(atoms.decision(canRead));
    expect(atoms.decision(canRead)).not.toBe(atoms.decision(isAdmin));
  });

  it("shares one atom between two equal policies built independently", () => {
    // BEH-QD-071. `Atom.family` keys structurally, so sharing does not depend on
    // the caller holding one reference — a policy built inline in render still
    // shares with an equal one built anywhere else.
    //
    // This document and this package both claimed the opposite until the
    // reactivity canary disproved it. The practical advice (hoist to module
    // scope) was unaffected, which is why the wrong reason went unchallenged.
    const atoms = makeQadiAtoms(baseLayer);

    expect(atoms.decision(hasRole("admin"))).toBe(atoms.decision(hasRole("admin")));
    expect(atoms.decision(hasRole("admin"))).not.toBe(atoms.decision(hasRole("editor")));

    // Nested structure, not just a flat leaf: the comparison has to walk in.
    const a = hasPermission(permission("doc", "read"));
    const b = hasPermission(permission("doc", "read"));
    const c = hasPermission(permission("doc", "write"));
    expect(atoms.decision(a)).toBe(atoms.decision(b));
    expect(atoms.decision(a)).not.toBe(atoms.decision(c));

    // And for the resource key, which is keyed the same way.
    expect(atoms.decisionFor(a, { id: "d1" })).toBe(atoms.decisionFor(b, { id: "d1" }));
    expect(atoms.decisionFor(a, { id: "d1" })).not.toBe(atoms.decisionFor(a, { id: "d2" }));
  });

  it("keys resource-scoped decisions by policy and resource together", () => {
    const atoms = makeQadiAtoms(baseLayer);
    const doc = { id: "d1" };
    const other = { id: "d2" };
    expect(atoms.decisionFor(canRead, doc)).toBe(atoms.decisionFor(canRead, doc));
    expect(atoms.decisionFor(canRead, doc)).not.toBe(atoms.decisionFor(canRead, other));
    expect(atoms.decisionFor(canRead, doc)).not.toBe(atoms.decision(canRead));
  });

  it("evaluates a shared policy once, not once per subscriber", async () => {
    // The predecessor re-ran the whole evaluation in every component that asked
    // the same question. Ten rows meant ten evaluations of one identical rule.
    // `needsLookup` is attribute-backed on purpose: a policy answerable from the
    // subject alone would never call the resolver, and the count would prove
    // nothing.
    const counter = { count: 0 };
    const atoms = makeQadiAtoms(countingLayer(counter));
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);

    const unmounts = Array.from({ length: 5 }, () =>
      registry.mount(atoms.decision(needsLookup)),
    );
    await settle(registry, atoms, needsLookup);

    expect(counter.count).toBe(1);
    for (const unmount of unmounts) unmount();
  });

  it("re-evaluates when invalidated", async () => {
    const counter = { count: 0 };
    const atoms = makeQadiAtoms(countingLayer(counter));
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    registry.mount(atoms.invalidate);

    const unmount = registry.mount(atoms.decision(needsLookup));
    await settle(registry, atoms, needsLookup);
    expect(counter.count).toBe(1);

    registry.set(atoms.invalidate, undefined);
    await settle(registry, atoms, needsLookup);

    // Authority can change without the subject object changing: a role granted
    // server-side leaves the same subject id holding different powers, and
    // nothing in the atom graph would notice on its own.
    expect(counter.count).toBe(2);
    expect(AsyncResult.isSuccess(registry.get(atoms.decision(needsLookup)))).toBe(true);
    unmount();
  });

  it("keeps two contexts from seeing each other's decisions", async () => {
    const tenantA = makeQadiAtoms(baseLayer);
    const tenantB = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();

    registry.set(tenantA.subject, reader);
    registry.set(tenantB.subject, makeSubject({ id: "other" }));

    expect(isAllowed(await settle(registry, tenantA, canRead))).toBe(true);
    expect(isAllowed(await settle(registry, tenantB, canRead))).toBe(false);
  });
});

describe("asked()", () => {
  it("records each distinct question once, in the order first asked", () => {
    // The honest basis for a devtools panel. `Atom.family` keys structurally, so
    // several `<Can>` on one policy are ONE atom — a panel keyed by component
    // instance would be inventing a distinction the architecture does not have.
    const set = makeQadiAtoms(baseLayer);

    set.decision(canRead);
    set.decision(canRead);
    set.decision(isAdmin);
    set.decisionFor(canRead, { id: "doc-1" });

    const asked = set.asked();
    expect(asked.length).toBe(3);
    expect(asked[0]).toEqual({ policy: canRead });
    expect(asked[1]).toEqual({ policy: isAdmin });
    expect(asked[2]).toEqual({ policy: canRead, resource: { id: "doc-1" } });
  });

  it("counts a structurally equal policy as the same question", () => {
    const set = makeQadiAtoms(baseLayer);

    set.decision(hasRole("admin"));
    set.decision(hasRole("admin"));

    // Structural keying is the property `v4-reactivity-smoke.test.ts` pins; this
    // asserts the panel agrees with it rather than double-counting.
    expect(set.asked().length).toBe(1);
  });

  it("hands back a copy", () => {
    const set = makeQadiAtoms(baseLayer);
    set.decision(canRead);

    const first = set.asked();
    set.decision(isAdmin);

    expect(first.length).toBe(1);
    expect(set.asked().length).toBe(2);
  });
});

describe("sweepEvictions", () => {
  // Distinct, structurally-unequal policies — `Atom.family` keys structurally
  // (BEH-QD-071), so these need to differ in more than object identity to
  // count as distinct tracked questions.
  const permissionPolicy = (name: string) => hasPermission(permission("doc", name));

  it("rejects a non-positive maxTrackedQuestions at construction", () => {
    // Mirrors `decisionCacheLayer`'s own capacity validation (`DecisionCache.ts`)
    // and for the same two reasons: unsatisfiable eviction loop on a negative
    // bound, silently-unbounded on NaN.
    expect(() => makeQadiAtoms(baseLayer, { maxTrackedQuestions: 0 })).toThrow(
      /maxTrackedQuestions/,
    );
    expect(() => makeQadiAtoms(baseLayer, { maxTrackedQuestions: -1 })).toThrow(
      /maxTrackedQuestions/,
    );
    expect(() => makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1.5 })).toThrow(
      /maxTrackedQuestions/,
    );
  });

  it("evicts the oldest unmounted questions once the bound is exceeded", () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 2 });

    // None of these are ever mounted to a registry, so every one has
    // `liveCount === 0` and is eligible for eviction.
    set.decision(permissionPolicy("a"));
    set.decision(permissionPolicy("b"));
    set.decision(permissionPolicy("c"));
    expect(set.asked().length).toBe(3);

    Effect.runSync(set.sweepEvictions);

    // Oldest-first (FIFO among non-live entries, matching DecisionCache.ts's
    // own bounded eviction order): "a" is dropped, "b" and "c" survive.
    const remaining = set.asked();
    expect(remaining.length).toBe(2);
    expect(remaining.map((q) => q.policy)).toEqual([
      permissionPolicy("b"),
      permissionPolicy("c"),
    ]);
  });

  it("never evicts a question a mounted gate still has open", () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();

    // Mounting reads through `combined`, which is what actually increments
    // `liveCount` — merely calling `decision()` (as the eviction test above
    // does) never does.
    const unmount = registry.mount(set.decision(canRead));
    set.decision(permissionPolicy("b"));
    set.decision(permissionPolicy("c"));
    expect(set.asked().length).toBe(3);

    Effect.runSync(set.sweepEvictions);

    // Both unmounted entries are eligible and evicted first, reaching the
    // bound of 1 — but the survivor is the mounted one, never dropped even
    // though it was tracked before either of the other two.
    const remaining = set.asked();
    expect(remaining.length).toBe(1);
    expect(remaining[0]?.policy).toBe(canRead);

    unmount();
  });

  it("becomes eligible again once its gate unmounts", async () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();

    const decision = set.decision(canRead);
    const unmount = registry.mount(decision);
    set.decision(permissionPolicy("b"));
    Effect.runSync(set.sweepEvictions);
    expect(set.asked().length).toBe(1);
    expect(set.asked()[0]?.policy).toBe(canRead);

    // `unmount()` only *schedules* the node's removal — `AtomRegistry`
    // dispatches it through its own async scheduler (`Scheduler.ts`'s
    // `MixedSchedulerDispatcher`, a real macrotask), not synchronously — so
    // `liveCount` does not drop to zero the instant this call returns.
    // `canRead`'s finalizer only runs once that scheduled removal actually
    // fires; waiting on the registry's own node map (rather than retrying the
    // sweep, which would race a fresh cold entry into being evicted first and
    // permanently satisfy the bound without `canRead` ever having to give up
    // its slot) is what makes this assertion about `canRead` specifically.
    unmount();
    await vi.waitFor(() => {
      expect(registry.getNodes().has(decision)).toBe(false);
    });

    set.decision(permissionPolicy("d"));
    Effect.runSync(set.sweepEvictions);

    // `canRead` was the oldest tracked entry and is now cold, so it — not the
    // newly-added "d" — is the one the FIFO-among-cold sweep drops.
    const remaining = set.asked();
    expect(remaining.length).toBe(1);
    expect(remaining[0]?.policy).not.toBe(canRead);
  });

  it("stops shrinking once every remaining entry is live, rather than evicting one", () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();

    const unmountA = registry.mount(set.decision(canRead));
    const unmountB = registry.mount(set.decision(isAdmin));

    Effect.runSync(set.sweepEvictions);

    // Both are live; the bound of 1 cannot be honored without dropping one in
    // use, so neither is dropped.
    expect(set.asked().length).toBe(2);

    unmountA();
    unmountB();
  });
});

describe("a DecisionSink wired into the runtime layer", () => {
  it("records the decisions this client makes", async () => {
    // The client half of the merged timeline. `DecisionSink` is optional, so it
    // is absent from `QadiRuntimeServices` and nothing in the types says a layer
    // may carry one — this asserts that providing it anyway reaches
    // `Effect.serviceOption` inside the atom runtime, which is what makes
    // "one UI, two streams" true on the browser side rather than merely
    // plausible.
    const ring = decisionSinkRing({ environment: "Client" });

    const set = makeQadiAtoms(Layer.merge(baseLayer, ring.layer));
    const registry = makeRegistry();
    registry.set(set.subject, reader);
    registry.get(set.decision(canRead));

    await vi.waitFor(async () => {
      const stored = await Effect.runPromise(ring.snapshot);
      expect(stored.length).toBe(1);
    });

    const stored = await Effect.runPromise(ring.snapshot);
    // Stamped by the sink, not by core — which cannot know it is in a browser.
    expect(stored[0]?.environment).toBe("Client");
    expect(stored[0]?._tag).toBe("Decision");
  });

  it("an atom set with no sink is unaffected", async () => {
    // The optionality that makes the above safe to offer: absent, nothing
    // changes and nothing is recorded anywhere.
    const set = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(set.subject, reader);

    await vi.waitFor(() => {
      const result = registry.get(set.decision(canRead));
      expect(AsyncResult.isSuccess(result) && !result.waiting).toBe(true);
    });
  });
});
