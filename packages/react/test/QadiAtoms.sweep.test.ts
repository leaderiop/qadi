/**
 * How an atom set's bound behaves with no provider.
 *
 * The bound is enforced by whatever sweeps the question book. A bare registry (a
 * test, a non-React host) has no provider, and today a provider is the only thing
 * that sweeps, so released readers leave the book over its bound. This case states
 * that shipped behaviour so the change that moves enforcement into the atom set
 * flips it visibly.
 */
import { EvaluationServicesNone, hasPermission, permission } from "@qadi/core";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";

const registries: Array<AtomRegistry.AtomRegistry> = [];
const makeRegistry = () => {
  const registry = AtomRegistry.make();
  registries.push(registry);
  return registry;
};

afterEach(() => {
  for (const registry of registries.splice(0)) registry.dispose();
});

const question = (name: string) => hasPermission(permission("doc", name));

describe("the bound without a provider", () => {
  it("S1 with no provider nothing sweeps: released readers leave the book over the bound", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
    const registry = makeRegistry();
    const policies = ["q1", "q2", "q3", "q4", "q5"].map(question);
    const questions = policies.map((policy) => atoms.decision(policy));

    const unmounts = questions.map((atom) => registry.mount(atom));
    expect(atoms.asked().length).toBe(5);

    for (const unmount of unmounts) unmount();
    await vi.waitFor(() => {
      for (const atom of questions) expect(registry.getNodes().has(atom)).toBe(false);
    });
    await new Promise((resolve) => setTimeout(resolve, 50));

    expect(atoms.asked().length).toBe(5);
    expect(atoms.asked().map((q) => q.policy)).toEqual(policies);
  });
});
