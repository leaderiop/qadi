/**
 * The mechanics every store in this package shares: a current value, a listener
 * set, and the `subscribe` / `getSnapshot` pair `useSyncExternalStore` wants.
 *
 * Internal scaffolding, kept out of the barrel (AGENTS.md §9). `TimelineStore`,
 * `SimulationSession` and `DiagnosticsStore` each wrote the same ten lines, and
 * three copies of a contract is where one of them drifts. What stays in each
 * store is its *policy*: the timeline's `ingest` identity, the session's
 * rebuild-per-command, the diagnostics' per-field `Equal.equals`. This file owns
 * only the mechanics (ADR-QD-047's split, one level down).
 *
 * **The identity contract.** `getSnapshot` returns the same reference until the
 * value changed, because `useSyncExternalStore` compares snapshots by identity
 * and would otherwise re-render on every read. `set` therefore notifies only
 * when the new value is a different reference; `publish` notifies regardless,
 * for a change the value's reference cannot carry, such as a flag a second hook
 * reads.
 *
 * **The listener contract** (ADR-QD-177). `notify` calls every listener in the set,
 * even when one throws, and then rethrows what they threw: nothing when none did, the
 * thrown value itself when one did (`undefined` and `null` included), and one
 * `AggregateError` holding every thrown value in call order when more than one did. An
 * `AggregateError` a listener throws is one value like any other, never flattened. The
 * loop reads the live set, so a listener removed before its turn is not called and one
 * added during the notification is called in the same pass. The value is held before
 * any listener runs, and stays when one throws. A host's listener that throws therefore
 * silences no other, and its failure still reaches whatever published.
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";

/** The read half of a store: what a component or a derived store reads. */
export interface ReadableStore<A> {
  /**
   * Registers a listener, and returns the function that removes it. A listener that
   * throws stops no other: see the listener contract above.
   */
  readonly subscribe: (listener: () => void) => () => void;
  /** The current value. The same reference until something changed. */
  readonly getSnapshot: () => A;
}

/** The read half plus the two writes. */
export interface ExternalStore<A> extends ReadableStore<A> {
  /** Replaces the value, and notifies only when it is a different reference. */
  readonly set: (next: A) => void;
  /** Replaces the value and notifies, whether or not it is a different reference. */
  readonly publish: (next: A) => void;
}

export const makeExternalStore = <A>(initial: A): ExternalStore<A> => {
  let current = initial;
  const listeners = new Set<() => void>();

  const notify = () => {
    const thrown: Array<unknown> = [];
    for (const listener of listeners) {
      try {
        listener();
      } catch (error) {
        thrown.push(error);
      }
    }
    if (thrown.length === 0) return;
    if (thrown.length === 1) throw thrown[0];
    throw new AggregateError(thrown, "More than one of the store's listeners threw.");
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    getSnapshot: () => current,
    set: (next) => {
      if (next === current) return;
      current = next;
      notify();
    },
    publish: (next) => {
      current = next;
      notify();
    },
  };
};

/**
 * Whether two lists hold the very same elements in the same order.
 *
 * Reference equality per element, on purpose: a store's `setSightings` or
 * `setList` is called from a render path on every tick, and a deep comparison
 * of policies there would cost what the no-op is meant to save.
 */
export const sameElements = <A>(a: ReadonlyArray<A>, b: ReadonlyArray<A>): boolean =>
  a === b || (a.length === b.length && a.every((one, index) => one === b[index]));

/** A store computed from a key; it can also be told to read that key again. */
export interface DerivedStore<A> extends ReadableStore<A> {
  /**
   * Reads the key again and recomputes when it moved: the trigger for a key input
   * that is not a parent.
   */
  readonly refresh: () => void;
}

/** What a derived store listens to. */
export type Parent = Pick<ReadableStore<unknown>, "subscribe">;

/**
 * Per-field identity over the union of both keys' own fields, the same identity
 * `set` uses.
 */
function sameFields<K extends object>(a: K, b: K): boolean {
  for (const field in a) {
    if (!Object.hasOwn(b, field) || a[field] !== b[field]) return false;
  }
  for (const field in b) {
    if (!Object.hasOwn(a, field)) return false;
  }
  return true;
}

/**
 * A store computed from a key read off its parents and inputs, recomputed only
 * when a field of the key changes identity, in the caller's scope.
 *
 * On a trigger with an unchanged key nothing runs. Otherwise it computes, then
 * commits the key, then `set`s the value, so a throwing compute commits nothing and
 * a compute returning the held reference notifies nothing. Its refresh is subscribed
 * to the parents in the order listed, when the store is built, so it moves before
 * every listener subscribed after it. Its listeners follow the listener contract
 * above. After the scope closes nothing is read or computed, `refresh` does nothing
 * and the last snapshot stays.
 *
 * What enforces what: the compiler refuses a key type with an optional field, an
 * empty parent list and a compute reading a field outside its key. A test pins that
 * each field moved alone recomputes once and that keys of other shapes compare the
 * same way. A compute that reads state outside its key is checked by neither.
 */
export const makeDerivedStore = Effect.fn("qadi.devtools.makeDerivedStore")(function* <
  K extends object & Required<K>,
  A,
>(options: {
  readonly parents: readonly [Parent, ...Array<Parent>];
  readonly key: () => K;
  readonly compute: (key: K) => A;
}): Effect.fn.Return<DerivedStore<A>, never, Scope.Scope> {
  let held = options.key();
  const store = makeExternalStore(options.compute(held));
  let stopped = false;

  const refresh = () => {
    if (stopped) return;
    const next = options.key();
    if (sameFields(held, next)) return;
    const value = options.compute(next);
    held = next;
    store.set(value);
  };

  const releases = options.parents.map((parent) => parent.subscribe(refresh));
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      stopped = true;
      for (const release of releases) release();
    }),
  );

  return { subscribe: store.subscribe, getSnapshot: store.getSnapshot, refresh };
});
