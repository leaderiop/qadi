/**
 * `settled` in isolation, exercised through a registry directly.
 *
 * The bug this pins (G-01-1, COMPAT-01) is a hang, not a wrong answer, so
 * every test that could hang races the promise under test against a timer and
 * asserts on which sentinel comes back — a suite timeout would report as an
 * unrelated failure and hide the real one.
 */
import {
  AttributeResolver,
  AttributeResolverNone,
  CustomPredicateNone,
  SignatureHistoryNone,
  DecisionHistoryUnknown,
  EvaluationIdLive,
  RelationshipResolverNever,
  gte,
  hasAttribute,
  hasPermission,
  makeSubject,
  permission,
} from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import { afterEach, describe, expect, it, vi } from "vitest";
import { makeQadiAtoms } from "../src/QadiAtoms.ts";
import { isPending, settled } from "../src/settled.ts";

const canRead = hasPermission(permission("doc", "read"));
const needsClearance = hasAttribute("clearance", gte(1));
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

/** A resolver that answers on a later tick, so a decision is genuinely async. */
const slowLayer = Layer.mergeAll(
  Layer.succeed(AttributeResolver, {
    resolve: () => Effect.delay(Effect.succeed(0), "1 millis"),
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

  it("suspends while genuinely pending, then resolves", async () => {
    const atoms = makeQadiAtoms(slowLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    const atom = atoms.decision(needsClearance);
    expect(AsyncResult.isInitial(registry.get(atom))).toBe(true);

    const promise = settled(registry, atom);

    // The fast path must not swallow a genuinely pending decision: racing
    // against an already-resolved microtask promise proves this did not
    // resolve synchronously, which the 1ms real-clock resolver could not do
    // even if the fast path were mistakenly taken.
    const raced = await Promise.race([
      promise.then((): "settled" => "settled"),
      Promise.resolve().then((): "microtask" => "microtask"),
    ]);
    expect(raced).toBe("microtask");

    await promise;
    expect(isPending(registry.get(atom))).toBe(false);
  });

  it("memoises the promise while the decision is pending", () => {
    const atoms = makeQadiAtoms(slowLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    const atom = atoms.decision(needsClearance);

    // React re-renders on every throw; a fresh promise per throw would
    // suspend forever, so this identity is load-bearing rather than an
    // optimisation.
    expect(settled(registry, atom)).toBe(settled(registry, atom));
  });

  it("does not memoise a fast-path resolve", async () => {
    const atoms = makeQadiAtoms(slowLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    const atom = atoms.decision(needsClearance);

    const pendingPromise = settled(registry, atom);
    await pendingPromise;
    expect(isPending(registry.get(atom))).toBe(false);

    // A resolved promise cached forever would be handed straight back to a
    // boundary that has genuinely gone pending again — `useInvalidate` relies
    // on that not happening.
    const afterSettleFirst = settled(registry, atom);
    const afterSettleSecond = settled(registry, atom);
    expect(afterSettleFirst).not.toBe(pendingPromise);
    expect(afterSettleSecond).not.toBe(pendingPromise);
    await expect(afterSettleFirst).resolves.toBeUndefined();
    await expect(afterSettleSecond).resolves.toBeUndefined();
  });

  it("treats a re-checking decision as unsettled", async () => {
    // ADR-QD-017: a decision being re-checked is not a decision. If the fast
    // path resolved on `waiting`, a Suspense boundary would clear while still
    // holding the *previous* verdict — a stale allow reaching the screen.
    const atoms = makeQadiAtoms(slowLayer);
    const registry = makeRegistry();
    registry.set(atoms.subject, reader);
    registry.mount(atoms.invalidate);
    const atom = atoms.decision(needsClearance);

    await settled(registry, atom);
    expect(isPending(registry.get(atom))).toBe(false);

    registry.set(atoms.invalidate, undefined);

    const recheckPromise = settled(registry, atom);
    const raced = await Promise.race([
      recheckPromise.then((): "settled" => "settled"),
      Promise.resolve().then((): "microtask" => "microtask"),
    ]);
    expect(raced).toBe("microtask");

    await recheckPromise;
    expect(isPending(registry.get(atom))).toBe(false);
  });
});
