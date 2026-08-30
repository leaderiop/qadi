/**
 * `settled` in isolation, exercised through a registry directly.
 *
 * The bug this pins (G-01-1, COMPAT-01) is a hang, not a wrong answer, so
 * every test that could hang races the promise under test against a timer and
 * asserts on which sentinel comes back — a suite timeout would report as an
 * unrelated failure and hide the real one.
 */
import {
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  hasPermission,
  makeSubject,
  permission,
} from "@qadi/core";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { settled } from "../src/settled.ts";

const canRead = hasPermission(permission("doc", "read"));
const reader = makeSubject({ id: "u1", permissions: ["doc:read"] });

/** A resolver that answers synchronously, exactly as `QadiAtoms.test.ts` does. */
const baseLayer = Layer.mergeAll(
  AttributeResolverNone,
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

/** Races a promise against a timer, reporting which sentinel returned first. */
const raceTimeout = (promise: Promise<void>, ms: number): Promise<"resolved" | "timed-out"> =>
  Promise.race([
    promise.then((): "resolved" => "resolved"),
    new Promise<"timed-out">((resolve) => setTimeout(() => resolve("timed-out"), ms)),
  ]);

describe("settled", () => {
  it("resolves promptly for a decision that has already settled", async () => {
    const atoms = makeQadiAtoms(baseLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    const atom = atoms.decision(canRead);
    const unmount = registry.mount(atom);

    await vi.waitFor(() => {
      expect(AsyncResult.isInitial(registry.get(atom))).toBe(false);
    });

    // Against the current implementation this times out: `settled` subscribes
    // without ever reading the atom's current value, and `AtomRegistry.subscribe`
    // notifies on transitions only — an atom with no transition left to make
    // never calls the callback, and the promise hangs forever.
    await expect(raceTimeout(settled(registry, atom), 250)).resolves.toBe("resolved");

    unmount();
  });
});
