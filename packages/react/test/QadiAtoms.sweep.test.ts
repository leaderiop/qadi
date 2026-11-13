/**
 * How an atom set's bound behaves with no provider.
 *
 * The atom set sweeps itself: the book signals when it goes over its bound and a
 * deferred sweep brings it back, so a bare registry (a test, a non-React host)
 * holds the bound without a provider. This case states that, and was the pin of
 * the opposite while a provider was the only thing that swept.
 */
import { EvaluationServicesNone, hasPermission, makeSubject, permission } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { withSweepFork } from "../src/SweepScheduler.ts";
import { makeSweepCounter } from "./support/sweepCounter.ts";
import { settle } from "./support/settle.ts";

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

describe("the atom set's own sweep", () => {
  const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });
  const canRead = question("read");
  const filler = question("filler");

  it("S2 four registries releasing in one turn bring the book back to the bound once", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
    const policies = Array.from({ length: 12 }, (_, i) => question(`q${i + 1}`));
    const unmounts = [0, 1, 2, 3].flatMap((r) => {
      const registry = makeRegistry();
      return policies.slice(r * 3, r * 3 + 3).map((policy) => registry.mount(atoms.decision(policy)));
    });
    await settle();
    expect(atoms.asked().length).toBe(12);

    for (const unmount of unmounts) unmount();
    expect(atoms.asked().length).toBe(12);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual(policies.slice(10));
  });

  it("S3 a signal raised inside the dispose-then-reread window sweeps only after it: the recomputed question is kept", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    registry.mount(atoms.invalidate);
    registry.mount(atoms.decision(canRead));
    await settle();

    atoms.decision(filler);
    registry.set(atoms.invalidate, undefined);
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead, filler]);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("S4 questions opened on the render path and never read are swept back to the bound after the call returns, never during it", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
    const policies = ["q1", "q2", "q3", "q4", "q5"].map(question);

    for (const policy of policies) atoms.decision(policy);
    expect(atoms.asked().length).toBe(5);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual(policies.slice(3));
  });

  it("S5 when every entry over the bound is live the sweep keeps them all; a release drops exactly the released one", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 2 });
    const registry = makeRegistry();
    const policies = ["q1", "q2", "q3", "q4"].map(question);
    const unmounts = policies.map((policy) => registry.mount(atoms.decision(policy)));

    await settle();
    expect(atoms.asked().length).toBe(4);

    unmounts[0]?.();
    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual(policies.slice(1));
  });

  it("S6 a swept entry is re-admitted once, at the end, when its own atom is read again", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();
    const atom = atoms.decision(canRead);
    registry.mount(atom)();
    await settle();

    atoms.decision(filler);
    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual([filler]);

    registry.mount(atom);
    expect(atoms.asked().map((q) => q.policy)).toEqual([filler, canRead]);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("S7 a render-phase read that commits late is evicted at the bound and re-admitted once by its commit", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 });
    const registry = makeRegistry();
    const atom = atoms.decision(canRead);
    registry.get(atom);
    atoms.decision(filler);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual([filler]);

    registry.mount(atom);
    expect(atoms.asked().filter((q) => q.policy === canRead).length).toBe(1);

    await settle();
    expect(atoms.asked().map((q) => q.policy)).toEqual([canRead]);
  });

  it("S8 a sweep pending when the registry is disposed runs harmlessly after it", async () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone, { maxTrackedQuestions: 1 });
    const registry = AtomRegistry.make();
    registry.mount(atoms.decision(canRead));
    atoms.decision(filler);

    registry.dispose();
    await settle();

    expect(atoms.asked().length).toBe(1);
  });

  it("S9 two registries over one atom set releasing in one turn fork one sweep, after the call returns", async () => {
    const askedAtFork: Array<number> = [];
    const counter = makeSweepCounter(() => {
      askedAtFork.push(atoms.asked().length);
    });
    const atoms = makeQadiAtoms(
      EvaluationServicesNone,
      withSweepFork({ maxTrackedQuestions: 2 }, counter.fork),
    );
    const policies = ["q1", "q2", "q3", "q4", "q5", "q6"].map(question);
    const first = makeRegistry();
    const second = makeRegistry();
    const unmounts = [
      ...policies.slice(0, 3).map((policy) => first.mount(atoms.decision(policy))),
      ...policies.slice(3).map((policy) => second.mount(atoms.decision(policy))),
    ];
    await settle();
    counter.reset();
    askedAtFork.length = 0;

    for (const unmount of unmounts) unmount();
    expect(counter.counts.forks).toBe(0);
    expect(counter.counts.sweeps).toBe(0);
    expect(atoms.asked().length).toBe(6);

    // One yield resumes between the removal's bucket and the episode's; pinned by
    // `v4-reactivity-smoke.test.ts`.
    await Effect.runPromise(Effect.yieldNow);
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(0);

    await settle();
    expect(counter.counts.forks).toBe(1);
    expect(counter.counts.sweeps).toBe(1);
    expect(counter.counts.sweepsAtFork).toEqual([0]);
    expect(askedAtFork).toEqual([6]);
    expect(atoms.asked().map((q) => q.policy)).toEqual(policies.slice(4));
  });
});
