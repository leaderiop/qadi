/**
 * Everything between a server's decision and the moment this client supersedes it.
 *
 * That is the seed atom a server-rendered decision is written to, the rule that
 * the client's own answer wins ([INV-QD-028](../../../spec/invariants.md)), the
 * once-per-registry announcement of a disagreement, and the re-check count. It
 * used to sit inside `QadiAtoms.ts`'s `seededDecision`, tangled with the
 * liveness bookkeeping the eviction sweep needs, which is not hydration at all.
 *
 * Private, and out of the barrel on purpose (AGENTS.md §9,
 * [ADR-QD-039](../../../spec/decisions/039-a-seed-is-not-an-authority.md)): a
 * consumer that could reach a seed atom could write an authorization decision
 * straight into the registry, bypassing the subject check and the evaluator.
 * `Hydration.ts` is the public interface over this module and re-exports by name
 * only what a consumer may hold. This file imports nothing from `Hydration.ts`,
 * `QadiAtoms.ts` or `QadiProvider.tsx`, so no cycle (counting `import type`
 * edges, ADR-QD-037) can form through it.
 *
 * No `"use client"`: this must also run under a server render.
 */
import type { Decision, Policy, Resource } from "@qadi/core";
import { isAllowed } from "@qadi/core";
import * as AsyncResult from "effect/reactivity/AsyncResult";
import * as Atom from "effect/reactivity/Atom";
import type * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { countRecheck } from "./HydrationCounts.ts";
import type { HydrationMismatchReporter } from "./HydrationWarning.ts";
import { hydrationMismatchReporter } from "./HydrationWarning.ts";

// Named here rather than reached through the barrel: `HydrationWarning.ts` stays
// out of it (AGENTS.md §9), and `.d.ts` emission has to be able to name them.
export type { HydrationMismatch, HydrationMismatchReporter } from "./HydrationWarning.ts";

/** Seed values applied when the provider creates its registry. */
export type InitialValues = Iterable<readonly [Atom.Atom<unknown>, unknown]>;

/**
 * Whether the two answers disagree.
 *
 * The **verdict** only. Two allows differing in `visibleFields` or obligations
 * are not a mismatch: what a developer sees, and what this exists to explain,
 * is a control appearing and then disappearing. Field-set differences would
 * report every projection difference as a wiring problem.
 */
export const isMismatch = (seeded: Decision, decided: Decision): boolean =>
  isAllowed(seeded) !== isAllowed(decided);

/** Finds the seed atom standing behind one decision. */
export type HydrationSeedLookup = (
  policy: Policy,
  resource: Resource | undefined,
) => Atom.Writable<Decision | undefined>;

const seeds = new WeakMap<object, HydrationSeedLookup>();

/** Called once per atom set, by `makeQadiAtoms`. */
export const registerHydrationSeeds = (atoms: object, lookup: HydrationSeedLookup): void => {
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

/**
 * The reporter an atom set will use for mismatches, or `undefined` for none.
 *
 * `QadiAtoms.ts` resolves this once per atom set and hands the result to each
 * question, so the development-mode default is decided at construction.
 */
export const resolveMismatchReporter = (
  supplied: HydrationMismatchReporter | undefined,
): HydrationMismatchReporter | undefined => hydrationMismatchReporter(supplied);

/**
 * Announcement state for one question, kept **per registry**.
 *
 * Two providers over the same atom set — two tabs, or a server render followed
 * by the client's own registry — each get their own first answer, and each must
 * report its own first disagreement. A single closure flag shared across every
 * registry that ever reads this atom would let only the first registry's first
 * answer ever be announced or counted; every other registry's genuinely-first
 * re-check would silently join the "already announced" branch of a flag it never
 * flipped. Held in a `WeakMap<AtomRegistry, …>` rather than a bare closure
 * variable, scoped to one question because nothing outside it needs the map.
 */
interface AnnounceState {
  /**
   * Announced once per question **per registry**, the first time that
   * registry's client answers it for itself — absorbing StrictMode's double
   * render, which a value comparison would report twice.
   */
  announced: boolean;
  /**
   * The seed, as this registry first saw it.
   *
   * Kept because `get.once(seed)` can read `undefined` for a seed that was
   * definitely there: a registry may drop the value of an atom nothing mounted,
   * and the seed atom is only ever a *dependency* of the question's atom. Under
   * `registry.mount` it survives and the disagreement is reported; under a
   * `QadiProvider`, which subscribes rather than mounts, it does not and the
   * report would be silently skipped. Remembering the first non-absent reading
   * makes the announcement depend only on what was seeded and what this client
   * then decided, not on registry lifetime.
   *
   * Written in the branch that already reads the seed reactively, so it costs
   * nothing and adds no dependency of its own.
   */
  observedSeed: Decision | undefined;
}

/** A question's seed atom, and the atom a consumer reads the decision through. */
export interface SeededQuestion<E> {
  /** Where `hydrate` writes a server decision. Never reachable from outside. */
  readonly seed: Atom.Writable<Decision | undefined>;
  /** The decision atom: the client's answer, or the seed until it has one. */
  readonly read: Atom.Atom<AsyncResult.AsyncResult<Decision, E>>;
}

/**
 * Builds one question's seed atom and the atom that reads through it.
 *
 * A decision and the seed that covers its first frames are **separate atoms**,
 * and that separation is the whole of INV-QD-028. A seed written directly into
 * the decision atom is *preserved over the value that atom computes*:
 * `AtomRegistry` sets `preserveInitialValueOnBuild` for a seeded node and, when
 * the build finishes with the node still awaiting a value, keeps the seed and
 * throws the computed value away. An effect that settles asynchronously escapes
 * that, because it publishes through `setSelf` on a later turn — but one that
 * settles **synchronously** returns its value straight out of the read, and the
 * seed wins permanently. Every policy that needs no resolver settles
 * synchronously, so that was the common case, and it left a subject holding a
 * server-issued allow they no longer qualified for. Keeping the two apart makes
 * the precedence explicit and one-directional instead of a consequence of when
 * an effect happens to settle.
 *
 * Exactly one `Atom.readable` per question, as before: adding an atom would
 * change notification and batching, and with it the render sequences
 * `QadiProvider.test.tsx` pins.
 */
export const makeSeededQuestion = <E,>(input: {
  readonly policy: Policy;
  readonly resource: Resource | undefined;
  /** Builds the computing atom; handed the seed so it can `get.once` the server's evaluation id. */
  readonly computedFor: (
    seed: Atom.Writable<Decision | undefined>,
  ) => Atom.Atom<AsyncResult.AsyncResult<Decision, E>>;
  readonly report: HydrationMismatchReporter | undefined;
  /**
   * `QadiAtoms`' liveness bookkeeping for the eviction sweep. Runs FIRST inside
   * the reader, before any `get`, exactly where it ran when it was inline.
   */
  readonly track: (get: Atom.AtomContext) => void;
}): SeededQuestion<E> => {
  const { policy, resource, report } = input;
  // Declared before `computed`, which reads it with `get.once` to carry the
  // server's evaluation id into the re-check.
  const seed = Atom.make<Decision | undefined>(undefined);
  const computed = input.computedFor(seed);

  const announceState = new WeakMap<AtomRegistry.AtomRegistry, AnnounceState>();
  const announceStateFor = (registry: AtomRegistry.AtomRegistry): AnnounceState => {
    const existing = announceState.get(registry);
    if (existing !== undefined) return existing;
    const created: AnnounceState = { announced: false, observedSeed: undefined };
    announceState.set(registry, created);
    return created;
  };

  const read = Atom.readable((get): AsyncResult.AsyncResult<Decision, E> => {
    input.track(get);

    const state = announceStateFor(get.registry);
    const result = get(computed);
    // `Initial` is the only state in which this client has never answered for
    // itself. The moment it has — allow, deny or failure — that answer is
    // authoritative and the seed is spent. That includes while a *later*
    // re-check is in flight: a re-checking result already carries its own
    // previous decision, and falling back to the seed there would resurrect
    // something older still.
    if (!AsyncResult.isInitial(result)) {
      if (!state.announced) {
        state.announced = true;
        // `get.once`, not `get`. This block previously ran only when a
        // reporter was wired, and was guarded that way so an atom set without
        // one "reads exactly the atoms it read before — no reporter, no added
        // dependency, no change". Counting must happen whether or not a
        // reporter is wired, so the guard could not stay; `get.once` keeps the
        // promise it was protecting, because it registers no dependency. It is
        // also the honest read here: the seed is already spent in this branch,
        // so re-running on a later seed change could not change the answer.
        // `?? state.observedSeed`: the registry's copy is authoritative when it
        // has one, and the first reading stands in when it has dropped it.
        const seeded = get.once(seed) ?? state.observedSeed;
        if (seeded !== undefined) {
          // A failure is not a disagreement. The client could not answer, so
          // there is nothing for the server's answer to disagree with, and
          // reporting one would be INV-QD-006 in reverse. It is still a
          // re-check: the question was seeded and has now been asked again.
          const mismatched = AsyncResult.isSuccess(result) && isMismatch(seeded, result.value);
          countRecheck(mismatched);
          if (mismatched && report !== undefined && AsyncResult.isSuccess(result)) {
            report({ policy, resource, seeded, decided: result.value });
          }
        }
      }
      return result;
    }
    const seeded = get(seed);
    if (seeded !== undefined) state.observedSeed = seeded;
    return seeded === undefined ? result : AsyncResult.success(seeded);
  });

  return { seed, read };
};
