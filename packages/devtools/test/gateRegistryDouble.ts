/**
 * A gate registry that counts its listeners, for the tests of the dock model's questions store.
 *
 * It keeps `@qadi/react`'s registry contract: `instances()` is one array rebuilt on
 * the first read after a change, and every listener is called synchronously by the
 * change that moved it. It counts `subscribe` calls and live listeners so a test can
 * see a subscription's lifetime, which a plain registry cannot show.
 *
 * It is written here and not imported because `@qadi/devtools` does not depend on
 * `@qadi/react` (ADR-QD-053). One difference from react's registry is deliberate:
 * a listener that throws is not swallowed, so an assertion made inside a
 * subscriber fails the command that triggered it.
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
}

export const makeGateRegistryDouble = (initial: ReadonlyArray<GateInstanceLike> = []): GateRegistryDouble => {
  const entries = new Map<string, GateInstanceLike>(initial.map((instance) => [instance.id, instance]));
  const live = new Set<() => void>();
  let subscribed = 0;
  let snapshot: ReadonlyArray<GateInstanceLike> = [...entries.values()];
  let stale = false;

  const changed = () => {
    stale = true;
    for (const listener of [...live]) listener();
  };

  return {
    registry: {
      instances: () => {
        if (stale) {
          snapshot = [...entries.values()];
          stale = false;
        }
        return snapshot;
      },
      subscribe: (listener) => {
        subscribed += 1;
        live.add(listener);
        return () => {
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
  };
};
