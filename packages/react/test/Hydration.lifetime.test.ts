/**
 * How long a hydrated seed lasts in a registry, and which registries can read it.
 *
 * The cases that fail on a registry that removes an idle node are the loss being
 * fixed: a read after a macrotask, and an hour of fake time. The green ones are the
 * traps of the designs that were rejected: a seed shared across registries, a spent
 * seed returning, a node pinned for every question asked, and a seed outliving
 * eviction. Every case reads through a bare `AtomRegistry`, with no provider and no
 * component, and the registry's removal is a real macrotask, so each wait is a real
 * turn rather than a test clock.
 */
import { Allow, Deny, EvaluationServicesNone, hasRole, makeSubject, makeSubjectId } from "@qadi/core";
import type { AuthSubject, Policy } from "@qadi/core";
import * as Atom from "effect/reactivity/Atom";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { currentDecision } from "../src/DecisionOutcome.ts";
import { dehydrateDecisions, hydrateDecisions } from "../src/Hydration.ts";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { settle } from "./support/settle.ts";

const isAdmin = hasRole("admin");
const isEditor = hasRole("editor");
const reader: AuthSubject = makeSubject({ id: "u1" });

const denyOf = (role: string): Deny =>
  new Deny({
    evaluationId: `deny-${role}`,
    subjectId: makeSubjectId("u1"),
    durationMillis: 1,
    trace: {
      policyTag: "HasRole",
      allowed: false,
      reason: `subject lacks role '${role}'`,
      children: [],
      obligations: [],
    },
  });

const allowOf = (role: string): Allow =>
  new Allow({
    evaluationId: `allow-${role}`,
    subjectId: makeSubjectId("u1"),
    durationMillis: 1,
    trace: { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
  });

type Pair = readonly [Atom.Atom<unknown>, unknown];

const registries: Array<AtomRegistry.AtomRegistry> = [];
const registryOf = (initialValues: ReadonlyArray<Pair>) => {
  const registry = AtomRegistry.make({ initialValues });
  registries.push(registry);
  return registry;
};

afterEach(() => {
  vi.useRealTimers();
  for (const registry of registries.splice(0)) registry.dispose();
});

const turn = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

const seedsFor = (
  atoms: ReturnType<typeof makeQadiAtoms>,
  entries: ReadonlyArray<readonly [Policy, Deny | Allow]>,
) =>
  [
    ...hydrateDecisions(
      atoms,
      dehydrateDecisions(entries.map(([policy, decision]) => ({ policy, decision }))),
      reader,
    ),
  ];

describe("a seed's lifetime in a registry", () => {
  it("HL1 a bare registry read after a macrotask still has the seed", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const registry = registryOf(seedsFor(atoms, [[isAdmin, denyOf("admin")]]));

    await turn(0);

    expect(currentDecision(registry.get(atoms.decision(isAdmin)))?._tag).toBe("SeededDeny");
  });

  it("HL2 the seed lasts an hour of fake time: no timer ends it", () => {
    vi.useFakeTimers();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const registry = registryOf(seedsFor(atoms, [[isAdmin, denyOf("admin")]]));

    vi.advanceTimersByTime(3_600_000);

    expect(currentDecision(registry.get(atoms.decision(isAdmin)))?._tag).toBe("SeededDeny");
  });

  it("HL3 a registry never given a seed reads none", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const seeded = registryOf(seedsFor(atoms, [[isAdmin, denyOf("admin")]]));
    const unseeded = registryOf([]);

    expect(currentDecision(seeded.get(atoms.decision(isAdmin)))?._tag).toBe("SeededDeny");
    await turn(0);

    expect(currentDecision(unseeded.get(atoms.decision(isAdmin)))).toBeUndefined();
  });

  it("HL4 a spent seed is not read again after the client answered", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const registry = registryOf([[atoms.subject, reader], ...seedsFor(atoms, [[isAdmin, denyOf("admin")]])]);

    const release = registry.mount(atoms.decision(isAdmin));
    expect(currentDecision(registry.get(atoms.decision(isAdmin)))?._tag).toBe("Deny");
    release();
    await turn(0);
    registry.set(atoms.subject, undefined);

    expect(currentDecision(registry.get(atoms.decision(isAdmin)))).toBeUndefined();
  });

  it("HL5 a question that was never hydrated leaves no node behind", async () => {
    const nodesLeftBy = async (questions: number) => {
      const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 5 });
      const registry = registryOf([[atoms.subject, reader]]);
      for (let i = 0; i < questions; i++) registry.mount(atoms.decision(hasRole(`role-${i}`)))();
      await turn(20);
      await settle();
      return { nodes: registry.getNodes().size, asked: atoms.asked().length };
    };

    const one = await nodesLeftBy(1);
    const many = await nodesLeftBy(50);

    expect(many.nodes).toBe(one.nodes);
    expect(many.asked).toBe(5);
  });

  it("HL6 eviction forgets a cold hydrated question's seed", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 });
    const seeds = seedsFor(atoms, [
      [isAdmin, denyOf("admin")],
      [isEditor, denyOf("editor")],
    ]);

    await settle();
    const registry = registryOf(seeds);

    expect(currentDecision(registry.get(atoms.decision(isAdmin)))).toBeUndefined();
    expect(currentDecision(registry.get(atoms.decision(isEditor)))?._tag).toBe("SeededDeny");
  });

  it("HL7 two registries over one atom set each read their own seed", () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const first = registryOf(seedsFor(atoms, [[isAdmin, denyOf("admin")]]));
    const second = registryOf(seedsFor(atoms, [[isAdmin, allowOf("admin")]]));

    expect(currentDecision(first.get(atoms.decision(isAdmin)))?._tag).toBe("SeededDeny");
    expect(currentDecision(second.get(atoms.decision(isAdmin)))?._tag).toBe("SeededAllow");
  });
});
