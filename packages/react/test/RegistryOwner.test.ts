/**
 * The owner of a provider's registry, driven headless: no React, a real `AtomRegistry`, the
 * real lease and a defer the test fires by hand.
 *
 * Every transition is followed by a further operation, so a mutated state is observed by
 * what the owner does next and not only by what it did. A row that pins that nothing was
 * recycled sits beside one that pins a recycle, so a recycle that never happens cannot
 * satisfy both. The rows are lettered `RO`.
 */
import { EvaluationServicesNone, makeSubject } from "@qadi/core";
import type { AuthSubject } from "@qadi/core";
import * as Atom from "effect/reactivity/Atom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/index.ts";
import type { InitialValues } from "../src/HydrationEngine.ts";
import type { LeaseDefer } from "../src/RegistryLease.ts";
import { makeRegistryOwner } from "../src/RegistryOwner.ts";
import { makeRecordingDefer } from "./support/recordingDefer.ts";

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const otherReader: AuthSubject = makeSubject({ id: "u2", permissions: ["doc:read"] });
const seededSubject: AuthSubject = makeSubject({ id: "seeded", permissions: [] });

/** A host atom a recycle returns to its default, and the entry that seeds it. */
const host = Atom.make("default").pipe(Atom.keepAlive);
const seededHost: InitialValues = [[host, "seeded"]];

const unreported = (): void => undefined;

/** A callback that counts how often it was called. */
const counting = () => {
  const calls = { count: 0 };
  return {
    calls,
    onAtomsReplaced: (): void => {
      calls.count += 1;
    },
  };
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("makeRegistryOwner", () => {
  it("RO1 a built owner defers nothing, and a commit and a hold defer nothing either", () => {
    const { counts, defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    expect(counts).toEqual({ defers: 0, cancels: 0 });
    fire();
    expect(owner.registry.get(host)).toBe("seeded");

    owner.commit(atoms, reader, unreported);
    owner.hold();
    expect(counts).toEqual({ defers: 0, cancels: 0 });
    fire();
    expect(owner.registry.get(host)).toBe("seeded");

    owner.release();
    expect(counts.defers).toBe(1);
  });

  it("RO2 a release recycles once when its deferred run fires", () => {
    const { defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    const reset = vi.spyOn(owner.registry, "reset");

    owner.commit(atoms, reader, unreported);
    owner.hold();
    expect(owner.registry.get(host)).toBe("seeded");

    owner.release();
    expect(reset).toHaveBeenCalledTimes(0);
    fire();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(owner.registry.get(host)).toBe("default");

    owner.registry.set(host, "written after");
    fire();
    expect(reset).toHaveBeenCalledTimes(1);
    expect(owner.registry.get(host)).toBe("written after");
  });

  it("RO3 commits and holds with no release leave the registry alone however often they run", () => {
    const { counts, defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const later = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);

    owner.hold();
    owner.commit(atoms, reader, unreported);
    owner.hold();
    owner.commit(later, otherReader, unreported);
    owner.hold();
    expect(counts).toEqual({ defers: 0, cancels: 0 });
    fire();
    expect(owner.registry.get(host)).toBe("seeded");
    expect(owner.registry.get(later.subject)).toBe(otherReader);

    owner.release();
    expect(counts).toEqual({ defers: 1, cancels: 0 });
  });

  it("RO4 a hold before the deferred run fires cancels the one recycle, and a later release defers again", () => {
    const { counts, defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    const reset = vi.spyOn(owner.registry, "reset");

    owner.hold();
    owner.release();
    owner.hold();
    expect(counts).toEqual({ defers: 1, cancels: 1 });
    fire();
    expect(reset).toHaveBeenCalledTimes(0);
    expect(owner.registry.get(host)).toBe("seeded");

    owner.release();
    expect(counts).toEqual({ defers: 2, cancels: 1 });
  });

  it("RO5 a long hide re-seeds from the latest commit before any read", () => {
    const { defer, fire } = makeRecordingDefer();
    const first = makeQadiAtoms(EvaluationServicesNone);
    const latest = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner(
      { atoms: first, subject: reader, initialValues: seededHost },
      defer,
    );

    owner.commit(first, reader, unreported);
    owner.commit(latest, otherReader, unreported);
    owner.hold();
    owner.release();
    fire();

    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(latest.subject)).toBe(otherReader);

    const fresh = makeRegistryOwner({ atoms: first, subject: reader, initialValues: undefined }, defer);
    fresh.hold();
    fresh.release();
    fire();
    expect(fresh.registry.get(first.subject)).toBe(reader);
  });

  it("RO6 a recycle whose reset throws still writes the latest subject back and the owner recycles again", () => {
    const { defer, fire } = makeRecordingDefer();
    const first = makeQadiAtoms(EvaluationServicesNone);
    const latest = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner(
      { atoms: first, subject: reader, initialValues: seededHost },
      defer,
    );
    const reset = owner.registry.reset.bind(owner.registry);
    vi.spyOn(owner.registry, "reset").mockImplementationOnce(() => {
      reset();
      throw new Error("a finalizer threw");
    });
    owner.commit(latest, otherReader, unreported);

    owner.hold();
    owner.release();
    expect(() => fire()).toThrow("a finalizer threw");
    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(latest.subject)).toBe(otherReader);

    owner.registry.set(host, "written after");
    owner.hold();
    owner.release();
    fire();
    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(latest.subject)).toBe(otherReader);
  });

  it("RO7 a recycle returns neither an initial value nor the seed, only the latest commit", () => {
    const { defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner(
      {
        atoms,
        subject: reader,
        initialValues: [
          [atoms.subject, seededSubject],
          [host, "seeded"],
        ],
      },
      defer,
    );
    expect(owner.registry.get(host)).toBe("seeded");

    owner.commit(atoms, otherReader, unreported);
    owner.hold();
    owner.release();
    fire();
    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(atoms.subject)).toBe(otherReader);

    owner.commit(atoms, reader, unreported);
    owner.release();
    owner.hold();
    owner.release();
    fire();
    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(atoms.subject)).toBe(reader);
  });

  it("RO8 an atom set that is not the last committed one is reported once however often it is committed", () => {
    const first = makeQadiAtoms(EvaluationServicesNone);
    const second = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms: first, subject: reader, initialValues: undefined });
    const { calls, onAtomsReplaced } = counting();

    owner.commit(first, reader, onAtomsReplaced);
    expect(calls.count).toBe(0);
    owner.commit(first, otherReader, onAtomsReplaced);
    expect(calls.count).toBe(0);

    owner.commit(second, reader, onAtomsReplaced);
    expect(calls.count).toBe(1);
    owner.commit(second, otherReader, onAtomsReplaced);
    expect(calls.count).toBe(1);

    owner.commit(first, reader, onAtomsReplaced);
    expect(calls.count).toBe(2);
    owner.commit(first, reader, onAtomsReplaced);
    expect(calls.count).toBe(2);
  });

  it("RO9 the callback runs before the subject is written and a callback that throws writes nothing", () => {
    const first = makeQadiAtoms(EvaluationServicesNone);
    const second = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms: first, subject: reader, initialValues: undefined });

    expect(() =>
      owner.commit(second, otherReader, () => {
        throw new Error("a reporter threw");
      }),
    ).toThrow("a reporter threw");
    expect(owner.registry.get(second.subject)).toBeUndefined();

    const seen: Array<unknown> = [];
    owner.commit(second, otherReader, () => {
      seen.push(owner.registry.get(second.subject));
    });
    expect(seen).toEqual([undefined]);
    expect(owner.registry.get(second.subject)).toBe(otherReader);

    const { calls, onAtomsReplaced } = counting();
    owner.commit(second, reader, onAtomsReplaced);
    expect(calls.count).toBe(0);
    expect(owner.registry.get(second.subject)).toBe(reader);
  });

  // Measured on effect 4.1.2: a listener that throws escapes `registry.set`, after the node
  // already holds the value. So the row makes the write throw and reads what a later recycle
  // writes: a commit that recorded the latest only after its write would leave the recycle
  // writing the commit before it.
  it("RO10 a commit whose write throws has already recorded the latest for a later recycle", () => {
    const { defer, fire } = makeRecordingDefer();
    const first = makeQadiAtoms(EvaluationServicesNone);
    const second = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms: first, subject: reader, initialValues: undefined }, defer);
    owner.hold();
    owner.registry.subscribe(second.subject, () => {
      throw new Error("a listener threw");
    });

    expect(() => owner.commit(second, otherReader, unreported)).toThrow("a listener threw");
    owner.release();
    fire();
    expect(owner.registry.get(second.subject)).toBe(otherReader);
    expect(owner.registry.get(first.subject)).toBeUndefined();

    owner.hold();
    owner.commit(first, reader, unreported);
    owner.release();
    fire();
    expect(owner.registry.get(first.subject)).toBe(reader);
  });

  it("RO11 the subject is seeded first so an initial value for it wins, and the node count is the entries and the subject", () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const seeded = makeRegistryOwner({
      atoms,
      subject: reader,
      initialValues: [
        [atoms.subject, seededSubject],
        [host, "seeded"],
      ],
    });
    expect(seeded.registry.get(atoms.subject)).toBe(seededSubject);
    expect(seeded.registry.get(host)).toBe("seeded");

    const bare = makeRegistryOwner({ atoms, subject: reader, initialValues: undefined });
    expect(bare.registry.getNodes().size).toBe(1);
    expect(bare.registry.get(atoms.subject)).toBe(reader);

    const second = Atom.make("default").pipe(Atom.keepAlive);
    const two = makeRegistryOwner({
      atoms,
      subject: reader,
      initialValues: [
        [host, "seeded"],
        [second, "also seeded"],
      ],
    });
    expect(two.registry.getNodes().size).toBe(3);
    expect(two.registry.get(atoms.subject)).toBe(reader);
    expect(two.registry.get(second)).toBe("also seeded");
  });

  it("RO12 a reset replaced on the registry after construction is the one a recycle calls", () => {
    const { defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    const replaced = vi.spyOn(owner.registry, "reset").mockImplementation(() => undefined);

    owner.hold();
    owner.release();
    fire();
    expect(replaced).toHaveBeenCalledTimes(1);
    expect(owner.registry.get(host)).toBe("seeded");

    owner.hold();
    owner.release();
    fire();
    expect(replaced).toHaveBeenCalledTimes(2);
  });

  it("RO13 a subscription a host holds on the registry stops hearing after a recycle", () => {
    const { defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    const heard: Array<string> = [];
    owner.registry.subscribe(host, (value) => {
      heard.push(value);
    });

    owner.registry.set(host, "before");
    expect(heard).toEqual(["before"]);

    owner.hold();
    owner.release();
    fire();
    owner.registry.set(host, "after");
    expect(heard).toEqual(["before"]);
    expect(owner.registry.get(host)).toBe("after");
  });

  it("RO14 one registry object is the one a commit, a hold, a release and a recycle all act on", () => {
    const { defer, fire } = makeRecordingDefer();
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, defer);
    const registry = owner.registry;

    owner.commit(atoms, otherReader, unreported);
    expect(owner.registry).toBe(registry);
    expect(registry.get(atoms.subject)).toBe(otherReader);

    owner.hold();
    owner.release();
    fire();
    expect(owner.registry).toBe(registry);
    expect(registry.get(host)).toBe("default");
    expect(registry.get(atoms.subject)).toBe(otherReader);

    owner.commit(atoms, reader, unreported);
    expect(registry.get(atoms.subject)).toBe(reader);
  });

  it("RO15 a defer that throws makes the release throw and leaves the owner usable and held", () => {
    const inner = makeRecordingDefer();
    let attempts = 0;
    const refusing: LeaseDefer = (run) => {
      attempts += 1;
      if (attempts === 1) throw new Error("defer refused");
      return inner.defer(run);
    };
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: seededHost }, refusing);

    owner.hold();
    expect(() => owner.release()).toThrow("defer refused");
    owner.commit(atoms, otherReader, unreported);
    expect(owner.registry.get(atoms.subject)).toBe(otherReader);

    owner.hold();
    expect(inner.counts).toEqual({ defers: 0, cancels: 0 });

    owner.release();
    expect(inner.counts.defers).toBe(1);
    inner.fire();
    expect(owner.registry.get(host)).toBe("default");
    expect(owner.registry.get(atoms.subject)).toBe(otherReader);
  });

  // A commit writes the subject without reading it first. A read built the node before the
  // write, which cleared the flag a seeded node nothing has read carries, so a host refresh
  // of the subject atom then reset it to its default; the write that does not read keeps it.
  it("RO16 a host refresh of the subject atom after the first commit keeps the current subject", () => {
    const atoms = makeQadiAtoms(EvaluationServicesNone);
    const owner = makeRegistryOwner({ atoms, subject: reader, initialValues: undefined });

    owner.commit(atoms, reader, unreported);
    owner.registry.refresh(atoms.subject);
    expect(owner.registry.get(atoms.subject)).toBe(reader);

    owner.commit(atoms, otherReader, unreported);
    expect(owner.registry.get(atoms.subject)).toBe(otherReader);
  });
});
