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
import { makeRegistryOwner } from "../src/RegistryOwner.ts";
import { makeRecordingDefer } from "./support/recordingDefer.ts";

const reader: AuthSubject = makeSubject({ id: "u1", permissions: ["doc:read"] });
const otherReader: AuthSubject = makeSubject({ id: "u2", permissions: ["doc:read"] });

/** A host atom a recycle returns to its default, and the entry that seeds it. */
const host = Atom.make("default").pipe(Atom.keepAlive);
const seededHost: InitialValues = [[host, "seeded"]];

const unreported = (): void => undefined;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("makeRegistryOwner", () => {
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
});
