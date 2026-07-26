/**
 * The atoms, exercised through a registry directly.
 *
 * Nothing here renders. Caching, sharing and invalidation are properties of the
 * atom graph, not of React, and proving them without a DOM is what keeps the
 * React binding thin enough to be obviously correct.
 */
import {
  AttributeResolver,
  AttributeResolverNone,
  EvaluationIdLive,
  RelationshipResolverNever,
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
import { afterEach, describe, expect, it } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";

const canRead = hasPermission(permission("doc", "read"));
const isAdmin = hasRole("admin");
/** Answerable only by asking the resolver, so resolver calls are countable. */
const needsLookup = hasAttribute("clearance", gte(1));

const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

const baseLayer = Layer.mergeAll(
  AttributeResolverNone,
  RelationshipResolverNever,
  EvaluationIdLive,
);

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
