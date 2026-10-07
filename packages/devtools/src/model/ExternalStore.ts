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
 */
export interface ExternalStore<A> {
  /** Registers a listener, and returns the function that removes it. */
  readonly subscribe: (listener: () => void) => () => void;
  /** The current value. The same reference until something changed. */
  readonly getSnapshot: () => A;
  /** Replaces the value, and notifies only when it is a different reference. */
  readonly set: (next: A) => void;
  /** Replaces the value and notifies, whether or not it is a different reference. */
  readonly publish: (next: A) => void;
}

export const makeExternalStore = <A>(initial: A): ExternalStore<A> => {
  let current = initial;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
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
