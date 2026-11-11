"use client";
/**
 * Builds a value in a scope that lives exactly as long as the component is mounted.
 *
 * Internal scaffolding, kept out of the barrel (AGENTS.md §9). A scoped value, such
 * as a session that owns fibers, is acquired by the effect and released by its
 * cleanup, so StrictMode's simulated unmount closes the first scope and the remount
 * builds a fresh value, and nothing is built during render, where a discarded
 * render would leave a scope open. It is a layout effect so the value exists before
 * the first paint; the one pass before it does sees `undefined`, and a caller
 * renders nothing for that pass (ADR-QD-137).
 */
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Scope from "effect/Scope";
import { useLayoutEffect, useState } from "react";

export const useScoped = <A>(make: () => Effect.Effect<A, never, Scope.Scope>): A | undefined => {
  const [value, setValue] = useState<A | undefined>(undefined);

  useLayoutEffect(() => {
    const scope = Effect.runSync(Scope.make());
    const built = Effect.runSync(Scope.provide(make(), scope));
    // A function value would be taken for an updater.
    setValue(() => built);
    return () => {
      Effect.runFork(Scope.close(scope, Exit.void));
    };
    // `make` is read once per mount: later inputs arrive as commands, as
    // `useRunningStore.ts` says of its `run`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return value;
};
