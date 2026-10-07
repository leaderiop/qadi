/**
 * The atoms, exercised through a registry directly.
 *
 * Nothing here renders. Caching, sharing and invalidation are properties of the
 * atom graph, not of React, and proving them without a DOM is what keeps the
 * React binding thin enough to be obviously correct.
 */
import {
  AttributeResolver,
  EvaluationIdLive,
  EvaluationServicesNone,
  makeDecisionLog,
  gte,
  hasAttribute,
  hasPermission,
  hasRole,
  makeSubject,
  permission,
  portsLayer,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { permits } from "../src/SeededDecision.ts";
import { collect } from "./support/collect.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");
/** Answerable only by asking the resolver, so resolver calls are countable. */
const needsLookup = hasAttribute("clearance", gte(1));

const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

const baseLayer = EvaluationServicesNone;

/** Counts how many times an attribute lookup actually happens. */
const countingLayer = (counter: { count: number }) =>
  Layer.mergeAll(
    portsLayer({
      AttributeResolver: Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.sync(() => {
            counter.count += 1;
            return undefined;
          }),
      }),
    }),
    EvaluationIdLive,
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
    expect(permits(decision)).toBe(true);
  });

  it("re-decides when the subject changes", async () => {
    const atoms = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    expect(permits(await settle(registry, atoms, isAdmin))).toBe(false);

    registry.set(atoms.subject, makeSubject({ id: "u2", roles: ["admin"] }));
    expect(permits(await settle(registry, atoms, isAdmin))).toBe(true);
  });

  it("does not re-decide when a fresh but structurally equal subject replaces the current one (RC-01)", async () => {
    // `makeSubject`/`fromRoles` return a fresh object every call — the shape an
    // inline `<QadiProvider subject={makeSubject(...)} />` produces on every
    // render. `subjectsEqual` (`QadiAtoms.ts`) gives the `subject` atom
    // structural equality specifically so a write like this one no-ops before
    // `AtomRegistry`'s `invalidateChildren`, instead of re-running every
    // mounted decision on every render of a component that never changed who
    // is asking.
    const counter = { count: 0 };
    const atoms = makeQadiAtoms(countingLayer(counter));
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    await settle(registry, atoms, needsLookup);
    const decisionBefore = registry.get(atoms.decision(needsLookup));
    const countAfterFirst = counter.count;

    registry.set(atoms.subject, makeSubject({ id: "u1", permissions: ["doc:read"] }));
    await Promise.resolve();

    expect(counter.count).toBe(countAfterFirst);
    expect(registry.get(atoms.decision(needsLookup))).toBe(decisionBefore);
  });

  it("does not re-decide when the replacement subject's nested attributes are equal by structure", async () => {
    // The shallow comparison this atom used to make (`Object.is` per attribute
    // key) called two subjects whose `org` is an equal-but-distinct object
    // different, and re-ran every mounted decision for it. `subjectEquivalence`
    // is the deep rule `DecisionCache`'s key already uses.
    const counter = { count: 0 };
    const atoms = makeQadiAtoms(countingLayer(counter));
    const registry = makeRegistry();
    registry.set(
      atoms.subject,
      makeSubject({ id: "u1", permissions: ["doc:read"], attributes: { org: { id: 1 } } }),
    );
    await settle(registry, atoms, needsLookup);
    const decisionBefore = registry.get(atoms.decision(needsLookup));
    const countAfterFirst = counter.count;

    registry.set(
      atoms.subject,
      makeSubject({ id: "u1", permissions: ["doc:read"], attributes: { org: { id: 1 } } }),
    );
    await Promise.resolve();

    expect(counter.count).toBe(countAfterFirst);
    expect(registry.get(atoms.decision(needsLookup))).toBe(decisionBefore);
  });

  it("still re-decides when a nested attribute really changed", async () => {
    const counter = { count: 0 };
    const atoms = makeQadiAtoms(countingLayer(counter));
    const registry = makeRegistry();
    registry.set(
      atoms.subject,
      makeSubject({ id: "u1", permissions: ["doc:read"], attributes: { org: { id: 1 } } }),
    );
    await settle(registry, atoms, needsLookup);
    const countAfterFirst = counter.count;

    registry.set(
      atoms.subject,
      makeSubject({ id: "u1", permissions: ["doc:read"], attributes: { org: { id: 2 } } }),
    );
    await settle(registry, atoms, needsLookup);

    expect(counter.count).toBeGreaterThan(countAfterFirst);
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
    expect(atoms.decision(a, { id: "d1" })).toBe(atoms.decision(b, { id: "d1" }));
    expect(atoms.decision(a, { id: "d1" })).not.toBe(atoms.decision(a, { id: "d2" }));
  });

  it("keys resource-scoped decisions by policy and resource together", () => {
    const atoms = makeQadiAtoms(baseLayer);
    const doc = { id: "d1" };
    const other = { id: "d2" };
    expect(atoms.decision(canRead, doc)).toBe(atoms.decision(canRead, doc));
    expect(atoms.decision(canRead, doc)).not.toBe(atoms.decision(canRead, other));
    expect(atoms.decision(canRead, doc)).not.toBe(atoms.decision(canRead));
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

    expect(permits(await settle(registry, tenantA, canRead))).toBe(true);
    expect(permits(await settle(registry, tenantB, canRead))).toBe(false);
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
    set.decision(canRead, { id: "doc-1" });

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

describe("a question's identity survives a collection", () => {
  // `Atom.family` holds its values weakly, and nothing else held a question's
  // atom, so after a collection the same question got a NEW atom: evaluated
  // twice, listed twice in `asked()`, and its hydrated seed lost (BEH-QD-065).
  it("returns the same atom and one row for a bare question", async () => {
    const set = makeQadiAtoms(baseLayer);
    const held = set.decision(canRead);

    await collect();

    expect(set.decision(canRead)).toBe(held);
    expect(set.asked().length).toBe(1);
  });

  it("returns the same atom and one row for a resource-scoped question", async () => {
    const set = makeQadiAtoms(baseLayer);
    const held = set.decision(canRead, { id: "d1" });

    await collect();

    expect(set.decision(canRead, { id: "d1" })).toBe(held);
    expect(set.asked().length).toBe(1);
  });

  it("returns the same atom while a registry has it mounted", async () => {
    const set = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    const held = set.decision(canRead);
    const unmount = registry.mount(held);

    await collect();

    expect(set.decision(canRead)).toBe(held);
    expect(set.asked().length).toBe(1);
    unmount();
  });
});

describe("decisions", () => {
  it("returns the same atom for a structurally equal record", () => {
    const set = makeQadiAtoms(baseLayer);

    expect(set.decisions({ a: { policy: canRead }, b: { policy: isAdmin } })).toBe(
      set.decisions({ a: { policy: hasPermission(permission("doc", "read")) }, b: { policy: isAdmin } }),
    );
    expect(set.decisions({ a: { policy: canRead } })).not.toBe(
      set.decisions({ a: { policy: isAdmin } }),
    );
  });

  it("reads each entry through the shared decision atom, resource included", async () => {
    const set = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(set.subject, reader);
    const group = set.decisions({ bare: { policy: canRead }, scoped: { policy: canRead, resource: { id: "d1" } } });
    const unmount = registry.mount(group);

    await vi.waitFor(() => {
      const value = registry.get(group);
      expect(value["bare"]).toBe(registry.get(set.decision(canRead)));
      expect(value["scoped"]).toBe(registry.get(set.decision(canRead, { id: "d1" })));
      expect(value["scoped"]?._tag).toBe("Success");
    });
    unmount();
  });
});

describe("sweepEvictions", () => {
  // Distinct, structurally-unequal policies — `Atom.family` keys structurally
  // (BEH-QD-071), so these need to differ in more than object identity to
  // count as distinct tracked questions.
  const permissionPolicy = (name: string) => hasPermission(permission("doc", name));

  it("never evicts a mounted question across an invalidation", async () => {
    // AGENTS.md §13's reason eviction is safe: a recompute disposes the reader's
    // lifetime and re-reads in one synchronous step, so the count is never zero
    // where a sweep can see it. `v4-reactivity-smoke.test.ts` pins the mechanism;
    // this pins the consequence.
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();
    registry.set(set.subject, reader);
    registry.mount(set.invalidate);
    const unmount = registry.mount(set.decision(canRead));
    set.decision(permissionPolicy("filler"));

    registry.set(set.invalidate, undefined);
    Effect.runSync(set.sweepEvictions);

    expect(set.asked().map((q) => q.policy)).toEqual([canRead]);
    await vi.waitFor(() => {
      expect(registry.get(set.decision(canRead))._tag).not.toBe("Initial");
    });
    Effect.runSync(set.sweepEvictions);
    expect(set.asked().map((q) => q.policy)).toEqual([canRead]);
    unmount();
  });

  it("never evicts a mounted question while its recompute is in flight", async () => {
    const parked: { release: ((value: number) => void) | undefined } = { release: undefined };
    const parkedLayer = Layer.mergeAll(
      portsLayer({
        AttributeResolver: Layer.succeed(AttributeResolver, {
          resolve: () =>
            Effect.promise(() => new Promise<number>((resolve) => (parked.release = resolve))),
        }),
      }),
      EvaluationIdLive,
    );
    const pending = () => parked.release;
    const set = makeQadiAtoms(parkedLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();
    registry.set(set.subject, reader);
    registry.mount(set.invalidate);
    const unmount = registry.mount(set.decision(needsLookup));
    set.decision(permissionPolicy("filler"));
    await vi.waitFor(() => expect(pending()).toBeDefined());
    pending()?.(2);
    await vi.waitFor(() => {
      expect(registry.get(set.decision(needsLookup))._tag).toBe("Success");
    });

    // Park the recompute: the resolver is asked again and not answered.
    parked.release = undefined;
    registry.set(set.invalidate, undefined);
    await vi.waitFor(() => expect(pending()).toBeDefined());
    Effect.runSync(set.sweepEvictions);

    expect(set.asked().map((q) => q.policy)).toEqual([needsLookup]);
    pending()?.(2);
    unmount();
  });

  it("never evicts a question a mounted gate still has open", () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();

    // Mounting runs the question's reader, which is what marks it live — merely
    // calling `decision()` never does.
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

  it("reappears in asked() if its gate remounts before Atom.family's cache forgets it", async () => {
    const set = makeQadiAtoms(baseLayer, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();

    const decision = set.decision(canRead);
    const unmount = registry.mount(decision);
    unmount();
    await vi.waitFor(() => {
      expect(registry.getNodes().has(decision)).toBe(false);
    });

    // A second, unrelated question pushes the book over the bound of 1, so
    // the now-cold `canRead` entry — the oldest — is the one evicted.
    set.decision(permissionPolicy("filler"));
    Effect.runSync(set.sweepEvictions);
    expect(set.asked().map((q) => q.policy)).not.toContainEqual(canRead);

    // Re-mounting the identical policy: the swept question's old atom may still
    // be reachable, and the book re-admits it when its reader runs again.
    const remount = registry.mount(set.decision(canRead));
    expect(set.asked().map((q) => q.policy)).toContainEqual(canRead);

    remount();
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
    const log = Effect.runSync(makeDecisionLog({ environment: "Client" }));

    const set = makeQadiAtoms(Layer.merge(baseLayer, log.layer));
    const registry = makeRegistry();
    registry.set(set.subject, reader);
    registry.get(set.decision(canRead));

    await vi.waitFor(async () => {
      const stored = await Effect.runPromise(log.snapshot);
      expect(stored.length).toBe(1);
    });

    const stored = await Effect.runPromise(log.snapshot);
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
