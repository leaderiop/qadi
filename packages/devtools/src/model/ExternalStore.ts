/**
 * The mechanics every store in this package shares: a current value, a listener
 * set, and the `subscribe` / `getSnapshot` pair `useSyncExternalStore` wants.
 *
 * Internal scaffolding, kept out of the barrel (AGENTS.md §9). `TimelineStore`,
 * `SimulationSession` and `DiagnosticsStore` each wrote the same ten lines, and
 * three copies of a contract is where one of them drifts. What stays in each
 * store is its *policy*: the timeline's `ingest` identity, the session's
 * rebuild-per-command, the diagnostics' per-field `Equal.equals`. This file owns
 * the mechanics and the derived store built on them (ADR-QD-047's split, one level
 * down).
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
 *
 * **The derived store.** `makeDerivedStore` builds a store computed from a key on top
 * of `makeExternalStore`, so it holds both contracts above. Its own rules, when it
 * recomputes, the order it moves in and how it stops, are stated in its doc comment
 * and in BEH-QD-696 to BEH-QD-698.
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";

/** The read half of a store: what a component or a derived store reads. */
export interface ReadableStore<A> {
  /**
   * Registers a listener, and returns the function that removes it. A listener that
   * throws stops no other: see the listener contract in the file header. The
   * function it returns must not throw.
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

/**
 * Throws what a run of calls threw once every call ran: nothing when none threw, the
 * thrown value itself when one did and one `AggregateError` holding every one when more
 * did.
 */
function throwCollected(thrown: ReadonlyArray<unknown>, message: string): void {
  if (thrown.length === 0) return;
  if (thrown.length === 1) throw thrown[0];
  throw new AggregateError(thrown, message);
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
    throwCollected(thrown, "More than one of the store's listeners threw.");
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
 * Per-field identity over the own enumerable string-keyed fields of two keys, the
 * same identity `set` uses.
 *
 * A field on one key only counts as a change. A field that is inherited,
 * non-enumerable or symbol-keyed is not part of the key and is not compared.
 *
 * Exported from this module only, not from a barrel: the feeds and the dock
 * model compare their normalised inputs with it (ADR-QD-192), so one rule
 * decides whether an input moved.
 */
export function sameFields<K extends object>(a: K, b: K): boolean {
  const fromA = Object.entries(a);
  const fromB = new Map<string, unknown>(Object.entries(b));
  return (
    fromA.length === fromB.size &&
    fromA.every(([field, value]) => fromB.has(field) && fromB.get(field) === value)
  );
}

/**
 * `sameFields` over two inputs that may each be absent.
 *
 * Absent equals only absent. An absent input is a state of its own, the
 * diagnostics poll turned off, so `{}` and `undefined` differ even though the
 * first holds no field that moved (ADR-QD-192).
 */
export const sameFieldsOrAbsent = <K extends object>(
  a: K | undefined,
  b: K | undefined,
): boolean => (a === undefined || b === undefined ? a === b : sameFields(a, b));

/**
 * A store computed from a key read off its parents and inputs, recomputed only
 * when a field of the key changes identity, in the caller's scope.
 *
 * On a trigger with an unchanged key nothing runs. Otherwise it computes, then
 * commits the key, then `set`s the value, so a throwing compute commits nothing and
 * a compute returning the held reference notifies nothing. Its refresh is subscribed
 * to the parents in the order listed, when the store is built, so it moves before
 * every listener subscribed after it. Its listeners follow the listener contract
 * in the file header. After the scope closes nothing is read or computed, `refresh`
 * does nothing and the last snapshot stays.
 *
 * What enforces what: the compiler refuses a key type with an optional field, an
 * empty parent list and a compute reading a field outside its key. A test pins that
 * each field moved alone recomputes once and that keys of other shapes compare the
 * same way. A compute that reads state outside its key is checked by neither.
 *
 * A parent's `subscribe` that throws while the store is built fails the build with
 * that throw as a defect and returns no store; closing the scope releases every
 * parent subscribed before it. Closing releases every parent even when a release
 * throws, as the listener contract runs every listener, and then fails the close with
 * what was thrown, one value as itself and more than one as an `AggregateError`.
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

  const releases: Array<() => void> = [];
  yield* Effect.addFinalizer(() =>
    Effect.sync(() => {
      stopped = true;
      const thrown: Array<unknown> = [];
      for (const release of releases) {
        try {
          release();
        } catch (error) {
          thrown.push(error);
        }
      }
      throwCollected(thrown, "More than one of the store's parent releases threw.");
    }),
  );
  for (const parent of options.parents) releases.push(parent.subscribe(refresh));

  return { subscribe: store.subscribe, getSnapshot: store.getSnapshot, refresh };
});
