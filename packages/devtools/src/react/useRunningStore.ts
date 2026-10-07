"use client";
/**
 * Runs an Effect against a store for as long as a component is mounted, and
 * reads the store.
 *
 * Internal scaffolding, kept out of the barrel (AGENTS.md §9): the fork on mount,
 * the interrupt on unmount, and the `useSyncExternalStore` call that
 * `useTimeline` and `useDiagnostics` would otherwise each write. Interrupting is
 * the point of the unmount half — with a source that holds a connection or a
 * layer that holds a resource, the fiber's scope is what closes it.
 *
 * An absent `run` starts nothing and still reads the store, for a caller whose
 * run is opt-in.
 *
 * `deps` decides when the run restarts, exactly as `useEffect`'s does, and the
 * `run` description is not one of them: it is rebuilt each render and is only
 * read when the effect fires.
 */
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { useEffect, useSyncExternalStore, type DependencyList } from "react";

export const useRunningStore = <A>(
  store: {
    readonly subscribe: (listener: () => void) => () => void;
    readonly getSnapshot: () => A;
  },
  run: Effect.Effect<void> | undefined,
  deps: DependencyList,
): A => {
  useEffect(() => {
    if (run === undefined) return undefined;
    const fiber = Effect.runFork(run);
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
    // `run` is deliberately not a dependency: see the module comment.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
};
