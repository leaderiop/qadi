/**
 * Every live guard under one atom set, while instrumentation is on.
 *
 * This is the thing [BEH-QD-217](../../../spec/behaviors/28-devtools-screens.md)
 * said could not exist, and the reasoning it gave was sound as far as it went:
 * `Atom.family` keys **structurally**, so ten `<Can policy={isAdmin}>` in
 * different places share one atom, and a panel counting atoms cannot tell them
 * apart. What that argument establishes is that the *atom layer* cannot see
 * instances, not that nothing can. A component knows perfectly well that it
 * exists; nothing was asking it.
 *
 * So the two views are different questions rather than rival answers:
 * `QadiAtoms.asked()` says what has been **asked**, and `QadiAtoms.gates` says
 * who is **asking**. Both belong to the atom set, so they share one scope and one
 * lifetime ([ADR-QD-080](../../../spec/decisions/080-a-gate-registry-belongs-to-its-atom-set.md),
 * which moved this out of module scope).
 *
 * **No React state, and no decisions here.** A registration is a `useEffect` call
 * on a handle into closure state — nothing re-renders because a guard registered,
 * and nothing in this file can affect what a guard renders (AGENTS.md §13). The
 * registry is plain closure state, never an `Atom` in an `AtomRegistry`, so it
 * stays away from the scheduler knobs ADR-QD-014 fences off.
 *
 * **Off by default, and off means absent.** `QadiProvider` takes `instrument`,
 * and without it no guard registers, no marker element is rendered, and a
 * registry stays empty for the life of its atom set.
 *
 * **Ordering is whatever React's effects give it, and that is enough.**
 * `register` and the handle it returns apply in the order they happen to fire.
 * There is no sequence number and no guarantee that one component's effects run
 * before or after another's. The registry is eventually consistent, and it only
 * ever feeds a devtools panel (ADR-QD-053), so a brief, self-correcting glitch is
 * nothing a consumer can observe. What is guaranteed is that two live
 * registrations never overwrite each other: a colliding id is disambiguated, and
 * `onIdCollision` hears about it once (React's `useId` is unique within a root,
 * and two *hydrated* roots derive ids from tree position, so they collide).
 *
 * **Every mutation is synchronous; nothing here ever yields.** A listener added
 * *during* a notification is visited in the same pass, because that is what
 * iterating a `Set` one is still adding to does. A future change that introduces
 * a yield point would change this and needs to say so here first.
 */
import { bindGateWriter } from "./GateWriter.ts";
import type { GateHandle, GateInstance, GateRenderState } from "./GateWriter.ts";

export type { GateInstance, GateKind, GateRenderState } from "./GateWriter.ts";

/**
 * The read side of a gate registry.
 *
 * Both members are plain functions with stable identity, safe to pass straight
 * to `useSyncExternalStore`. The write side is not on this interface: only
 * `@qadi/react` can reach it.
 */
export interface GateRegistry {
  /** Every instance currently mounted, in registration order. Same reference until a change. */
  readonly instances: () => ReadonlyArray<GateInstance>;
  /** Subscribes to mounts, unmounts and render-state changes. Returns the unsubscribe. */
  readonly subscribe: (listener: () => void) => () => void;
}

export interface GateRegistryOptions {
  /**
   * Told once per id when two live registrations minted the same one.
   *
   * A `QadiAtoms`' own registry defaults to a development-mode console warning
   * (`HydrationWarning.ts`, the one confinement point, ADR-QD-041); a registry
   * built here reports nowhere unless this is supplied.
   */
  readonly onIdCollision?: (id: string) => void;
}

/**
 * Builds an empty gate registry.
 *
 * Every atom set builds its own (`QadiAtoms.gates`); call this directly only to
 * hand `QadiProvider` one registry for several atom sets, and build it once, at
 * module scope, like `makeQadiAtoms`.
 */
export const makeGateRegistry = (options?: GateRegistryOptions): GateRegistry => {
  const entries = new Map<string, GateInstance>();
  const listeners = new Set<() => void>();
  const reported = new Set<string>();
  let collisions = 0;

  // The cached array `useSyncExternalStore` compares by reference: rebuilt on
  // the first read after a change and not before, or React re-renders forever.
  let snapshot: ReadonlyArray<GateInstance> = [];
  let stale = false;

  const changed = (): void => {
    stale = true;
    // Isolated per listener: a subscriber's own bug must not stop the rest of
    // the fan-out from being notified, and must not propagate into the guard
    // effect that triggered it. Swallowed rather than logged: this module has no
    // reporter of its own, and a bare `console.*` call here would be a second,
    // undeclared confinement point alongside `HydrationWarning.ts`'s.
    for (const listener of listeners) {
      try {
        listener();
      } catch {
        // Intentionally ignored — see above.
      }
    }
  };

  const register = (instance: GateInstance): GateHandle => {
    let key = instance.id;
    if (entries.has(key)) {
      key = `${instance.id}~${++collisions}`;
      if (!reported.has(instance.id)) {
        reported.add(instance.id);
        options?.onIdCollision?.(instance.id);
      }
    }
    entries.set(key, { ...instance, id: key });
    changed();

    // `live` and `key` are this registration's own: the handle *is* the
    // per-registration token, so a stale cleanup can only touch the entry it made.
    let live = true;
    return {
      update: (state: GateRenderState) => {
        const existing = entries.get(key);
        if (!live || existing === undefined || existing.state === state) return;
        entries.set(key, { ...existing, state });
        changed();
      },
      unregister: () => {
        if (!live) return;
        live = false;
        entries.delete(key);
        changed();
      },
    };
  };

  const registry: GateRegistry = {
    instances: () => {
      if (stale) {
        snapshot = [...entries.values()];
        stale = false;
      }
      return snapshot;
    },
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
  bindGateWriter(registry, { register });
  return registry;
};
