/**
 * The private channel between the atom set and hydration.
 *
 * A server-rendered decision is written to a **seed atom** that sits beside the
 * decision atom rather than into the decision atom itself, and this module is
 * how `hydrateDecisions` finds it. Which atom a seed lands in is an
 * implementation detail of the two modules either side, so it is deliberately
 * out of the barrel (AGENTS.md §9) — a consumer that could reach a seed atom
 * could write an authorization decision straight into the registry, bypassing
 * both the subject check and the evaluator.
 *
 * Keyed on `object` rather than on `QadiAtoms` so this module imports nothing
 * from either side and no cycle exists to break.
 */
import type { Decision, Policy, Resource } from "@qadi/core";
import type * as Atom from "effect/unstable/reactivity/Atom";

/** Finds the seed atom standing behind one decision. */
export type HydrationSeedLookup = (
  policy: Policy,
  resource: Resource | undefined,
) => Atom.Writable<Decision | undefined>;

const seeds = new WeakMap<object, HydrationSeedLookup>();

/** Called once per atom set, by `makeQadiAtoms`. */
export const registerHydrationSeeds = (
  atoms: object,
  lookup: HydrationSeedLookup,
): void => {
  seeds.set(atoms, lookup);
};

/**
 * The lookup for an atom set, or `undefined` for one this package did not build.
 *
 * A wrapper, a proxy or a test double is not registered, and hydration treats
 * that the way it treats every other unverifiable input: it seeds nothing.
 */
export const hydrationSeedFor = (atoms: object): HydrationSeedLookup | undefined =>
  seeds.get(atoms);
