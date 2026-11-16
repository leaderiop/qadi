/**
 * A gate registry that counts its listeners, for the tests of the dock model's questions store.
 *
 * It keeps `@qadi/react`'s registry contract: `instances()` is one array rebuilt on
 * the first read after a change, and every listener is called synchronously by the
 * change that moved it. It counts `subscribe` calls and live listeners so a test can
 * see a subscription's lifetime, which a plain registry cannot show.
 *
 * It is written here and not imported because `@qadi/devtools` does not depend on
 * `@qadi/react` (ADR-QD-053). One difference from react's registry is the default:
 * a listener that throws is not swallowed, so an assertion made inside a
 * subscriber fails the command that triggered it. `swallowListenerErrors` turns that
 * off and gives react's `makeGateRegistry.changed()` behaviour, where each listener
 * runs in a try/catch, for the tests that must see what production does.
 *
 * It can also be made to fail like a host's registry: `failReads` makes `instances()`
 * throw, `mendReads` stops it, `failSubscribe` makes the next `subscribe` calls throw and
 * `failRelease` makes the unsubscribe functions it hands out throw, leaving the listener live.
 */
import type { GateInstanceLike, GateRegistryLike } from "../src/model/Gates.ts";

export interface GateRegistryDouble {
  readonly registry: GateRegistryLike;
  readonly add: (instance: GateInstanceLike) => void;
  readonly remove: (id: string) => void;
  /** Moves one guard to another render state; nothing when it already is there. */
  readonly update: (id: string, state: string) => void;
  /** Listeners subscribed right now. */
  readonly listeners: () => number;
  /** `subscribe` calls ever made, released or not. */
  readonly subscriptions: () => number;
  /** Unsubscribe functions called, counting a repeat call on the same one. */
  readonly releases: () => number;
  /** `instances()` calls ever made, whether they threw or not. */
  readonly reads: () => number;
  /** From now on `instances()` throws `thrown`, and the change is announced like any other. */
  readonly failReads: (thrown: unknown) => void;
  /** `instances()` answers again, and the change is announced. */
  readonly mendReads: () => void;
  /** From now on `subscribe` throws `thrown`. */
  readonly failSubscribe: (thrown: unknown) => void;
  /** From now on each unsubscribe function throws `thrown` when called, and the listener stays subscribed. */
  readonly failRelease: (thrown: unknown) => void;
}

export interface GateRegistryDoubleOptions {
  /** Isolate each listener in a try/catch, as `@qadi/react`'s registry does. */
  readonly swallowListenerErrors?: boolean;
}

export const makeGateRegistryDouble = (
  initial: ReadonlyArray<GateInstanceLike> = [],
  options?: GateRegistryDoubleOptions,
): GateRegistryDouble => {
  const entries = new Map<string, GateInstanceLike>(initial.map((instance) => [instance.id, instance]));
  const live = new Set<() => void>();
  let subscribed = 0;
  let snapshot: ReadonlyArray<GateInstanceLike> = [...entries.values()];
  let stale = false;
  let released = 0;
  let read = 0;
  let readFailure: { readonly thrown: unknown } | undefined;
  let subscribeFailure: { readonly thrown: unknown } | undefined;
  let releaseFailure: { readonly thrown: unknown } | undefined;

  const changed = () => {
    stale = true;
    for (const listener of live) {
      if (options?.swallowListenerErrors !== true) {
        listener();
        continue;
      }
      try {
        listener();
      } catch {
        // Isolated per listener, as `makeGateRegistry.changed()` does.
      }
    }
  };

  return {
    registry: {
      instances: () => {
        read += 1;
        if (readFailure !== undefined) throw readFailure.thrown;
        if (stale) {
          snapshot = [...entries.values()];
          stale = false;
        }
        return snapshot;
      },
      subscribe: (listener) => {
        subscribed += 1;
        if (subscribeFailure !== undefined) throw subscribeFailure.thrown;
        live.add(listener);
        return () => {
          released += 1;
          if (releaseFailure !== undefined) throw releaseFailure.thrown;
          live.delete(listener);
        };
      },
    },
    add: (instance) => {
      entries.set(instance.id, instance);
      changed();
    },
    remove: (id) => {
      if (entries.delete(id)) changed();
    },
    update: (id, state) => {
      const existing = entries.get(id);
      if (existing === undefined || existing.state === state) return;
      entries.set(id, { ...existing, state });
      changed();
    },
    listeners: () => live.size,
    subscriptions: () => subscribed,
    releases: () => released,
    reads: () => read,
    failReads: (thrown) => {
      readFailure = { thrown };
      changed();
    },
    mendReads: () => {
      readFailure = undefined;
      changed();
    },
    failSubscribe: (thrown) => {
      subscribeFailure = { thrown };
    },
    failRelease: (thrown) => {
      releaseFailure = { thrown };
    },
  };
};
