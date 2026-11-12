/**
 * How an atom set's bound behaves with no provider.
 *
 * The atom set sweeps itself: the book signals when it goes over its bound and a
 * deferred sweep brings it back, so a bare registry (a test, a non-React host)
 * holds the bound without a provider. This case states that, and was the pin of
 * the opposite while a provider was the only thing that swept.
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
  it("S1 holds the bound with no provider: released readers are swept back to it", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
    const registry = makeRegistry();
    const policies = ["q1", "q2", "q3", "q4", "q5"].map(question);
    const questions = policies.map((policy) => atoms.decision(policy));

    const unmounts = questions.map((atom) => registry.mount(atom));
    expect(atoms.asked().length).toBe(5);

    for (const unmount of unmounts) unmount();
    await vi.waitFor(() => expect(atoms.asked().length).toBe(2));

    expect(atoms.asked().map((q) => q.policy)).toEqual(policies.slice(3));
  });
});
