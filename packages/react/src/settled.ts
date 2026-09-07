"use client";
/**
 * A promise that resolves when a decision leaves `Initial`.
 *
 * React's throw-to-suspend contract is defined in terms of a thrown promise,
 * not an Effect — this is the one framework boundary AGENTS.md §6's async ban
 * cannot reach through, hence this file's `no-raw-promise` exemption in
 * `check-house-style.mjs`. Out of the barrel (AGENTS.md §9), for the same
 * reason `useGate.ts` gives for itself: `settled` is scaffolding with a
 * maximally generic name and must not be leaked into `@qadi/react`'s flat
 * namespace.
 *
 * Two distinct defects live here, both found via the Node 20.19.0 floor leg
 * (COMPAT-01, gap G-01-1), and both are load-bearing for the shape below:
 *
 * 1. `AtomRegistry.subscribe` notifies on *transitions* only — verified
 *    against `effect@4.0.0-rc.110`'s `AtomRegistry.ts` source — so a
 *    subscription registered after the atom has already reached its terminal
 *    state receives nothing, and the promise it backs hangs forever. Closed by
 *    reading the atom's current value before subscribing, in the same
 *    synchronous step, so no window is left for the atom to settle in between.
 *
 * 2. A second, deeper race, found only by reproducing the CI failure directly
 *    under a real Node 20.17.0 binary rather than by re-deriving it from
 *    source: `RegistryImpl.subscribe`'s returned unsubscribe function checks
 *    `node.canBeRemoved` and, if the listener count has just dropped to zero,
 *    schedules the node for removal. A version of this module that resolves
 *    the promise and unsubscribes in the same callback creates exactly that
 *    zero-listener window — between the moment the underlying decision
 *    settles and the moment React's Suspense retry re-renders and
 *    `useAtomValue` commits its own, permanent subscription. On Node 20.x the
 *    node-removal task (scheduled on `effect`'s own dispatcher) can win that
 *    race against React's retry (scheduled on React's own Scheduler); when it
 *    does, the decision atom's node — and the `computed` atom it depends on —
 *    is torn down and rebuilt from scratch, re-running the entire evaluation
 *    and resetting the result to `Initial` a second time. The fix in step 1
 *    cannot see this: a fresh `registry.get(atom)` call at that point
 *    genuinely reads `Initial`, because the atom genuinely has been rebuilt,
 *    not merely because of a stale render. Confirmed by instrumenting both
 *    values at the point of the second `settled` call and observing them
 *    agree — the TOCTOU fix alone left `edges.test.tsx:154` failing 1/8 under
 *    a real Node 20.17.0 binary.
 *
 *    The fix is to never let the listener count reach zero for an atom this
 *    module has ever subscribed to: the subscription below is established at
 *    most once per atom and is never torn down. A resolved decision's node
 *    then stays exactly as alive as the `Atom.family` entry that produced it
 *    already is — family entries are never pruned (ADR-QD-071) — so this adds
 *    no meaningfully new retention, only removes the specific window in which
 *    the *node* could disappear out from under a Suspense boundary that is
 *    mid-retry. `resolvers` holds the one function that current call should
 *    invoke, so a later re-check (ADR-QD-017) is resolved by the same
 *    long-lived listener rather than by a second, competing one.
 *
 * 3. A third defect, found by reproducing a route change over a module-scope
 *    `makeQadiAtoms()` call — the documented usage, and exactly what fix 2's
 *    "family entries are never pruned" reasoning depends on: fix 2's three
 *    structures were keyed by *atom alone*, but every `QadiProvider` instance
 *    builds its own `AtomRegistry` over those same shared atom objects. The
 *    once-per-atom subscription in fix 2 therefore attaches to whichever
 *    registry first called {@link settled}, not to the registry the *current*
 *    caller passed in. When that first registry unmounts, its deferred
 *    `dispose()` runs `reset()`, which tears down every node and, with it, the
 *    only listener that could ever resolve the promise. A second provider
 *    generation over the same atom set then calls `settled(registry2, atom)`
 *    for a question that is genuinely pending: `pending.get(atom)` is empty
 *    (the first generation's resolve already deleted it), so the fast path
 *    correctly declines, but `subscribed.has(atom)` is still `true` from the
 *    first generation, so `registry2.subscribe` is never called — the promise
 *    can only be resolved by a listener that no longer exists, and the
 *    Suspense boundary hangs forever. The same starvation hits two
 *    *concurrently* mounted providers sharing one atom set.
 *
 *    Fixed by keying all three structures per registry instead of per atom:
 *    `pending`, `resolvers` and `subscribed` each live behind a
 *    `WeakMap<AtomRegistry.AtomRegistry, …>`, so every registry gets its own
 *    once-per-atom subscription. That preserves fix 2's guarantee — the
 *    listener count for an atom never reaches zero — within one registry's
 *    lifetime, while letting a later registry generation establish its own
 *    listener rather than depend on a dead one.
 */
import * as AsyncResult from "effect/unstable/reactivity/AsyncResult";
import type * as Atom from "effect/unstable/reactivity/Atom";
import type * as AtomRegistry from "effect/unstable/reactivity/AtomRegistry";
import type { DecisionResult } from "./QadiAtoms.ts";

/**
 * Whether a decision result is not yet an answer.
 *
 * `waiting` counts as pending deliberately: a decision being re-checked is not
 * a decision (ADR-QD-017), and resolving on one would surface the *previous*
 * verdict through the Suspense path. This is the one definition of "not an
 * answer yet" — {@link settled}'s resolve condition and
 * `useDecisionSuspense`'s throw condition both read it, so the two cannot
 * disagree again.
 */
export const isPending = (result: DecisionResult): boolean =>
  AsyncResult.isInitial(result) || result.waiting;

/** Per-registry copies of the three structures below — see defect 3 above. */
interface RegistryState {
  readonly pending: WeakMap<Atom.Atom<DecisionResult>, Promise<void>>;
  /** The resolver the atom's one long-lived listener should call right now. */
  readonly resolvers: WeakMap<Atom.Atom<DecisionResult>, () => void>;
  /** Atoms this registry has already attached its one long-lived listener to. */
  readonly subscribed: WeakSet<Atom.Atom<DecisionResult>>;
}

const registryState = new WeakMap<AtomRegistry.AtomRegistry, RegistryState>();

/** The state for `registry`, created on first use and kept for its lifetime. */
const stateFor = (registry: AtomRegistry.AtomRegistry): RegistryState => {
  const existing = registryState.get(registry);
  if (existing !== undefined) return existing;
  const created: RegistryState = {
    pending: new WeakMap(),
    resolvers: new WeakMap(),
    subscribed: new WeakSet(),
  };
  registryState.set(registry, created);
  return created;
};

/**
 * A promise that resolves when the decision for `atom` leaves `Initial`.
 *
 * Memoised per atom *and* per registry, because React re-renders on every
 * throw and a fresh promise per throw would suspend forever — and because a
 * registry that has torn down cannot be the one a later registry generation
 * waits on (defect 3 above).
 */
export const settled = (
  registry: AtomRegistry.AtomRegistry,
  atom: Atom.Atom<DecisionResult>,
): Promise<void> => {
  const state = stateFor(registry);

  const existing = state.pending.get(atom);
  if (existing !== undefined) return existing;

  // Read the atom's current value before subscribing to it, in one
  // uninterrupted synchronous block — nothing can interleave between the two,
  // which is what closes the TOCTOU window described above. A decision that
  // has already settled has no transition left to make, so a subscription
  // alone would wait forever; this is the branch that notices there is
  // nothing left to wait for. Not memoised: `useInvalidate` can send this
  // same atom back to pending, and a resolved promise cached here would be
  // handed straight back to a boundary that has genuinely gone pending again.
  if (!isPending(registry.get(atom))) return Promise.resolve();

  const promise = new Promise<void>((resolve) => {
    state.resolvers.set(atom, resolve);
    if (state.subscribed.has(atom)) return;
    state.subscribed.add(atom);
    // Established once per atom per registry and never unsubscribed — see
    // this module's doc comment for why tearing it down is the second defect,
    // not a cleanup opportunity. `resolvers` is what lets one long-lived
    // listener answer whichever call is current, including a later
    // re-check's fresh promise.
    registry.subscribe(atom, (result) => {
      if (isPending(result)) return;
      const resolveCurrent = state.resolvers.get(atom);
      if (resolveCurrent === undefined) return;
      state.resolvers.delete(atom);
      state.pending.delete(atom);
      resolveCurrent();
    });
  });
  state.pending.set(atom, promise);
  return promise;
};
