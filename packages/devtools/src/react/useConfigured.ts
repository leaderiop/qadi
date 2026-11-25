"use client";
/**
 * Builds a value that has `configure` in a scope, and configures it with the latest
 * inputs before anything reads it.
 *
 * Internal scaffolding, kept out of the barrel (AGENTS.md §9). The value is configured
 * inside the scoped build, so a reader that commits on the render the value appears sees
 * it already holding the host's inputs, never an unconfigured one: a commit that reads
 * a dock model before it was handed its gates would say it was handed none. The inputs
 * reach a rebuild through the latest committed render's closure, which React keeps for
 * an effect whose dependencies did not change, so no ref carries them. This hook decides
 * nothing about whether an input moved: it hands the inputs over each time their record
 * changes identity, and the value's own `configure` is the rule (ADR-QD-192).
 */
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { useLayoutEffect } from "react";
import { useScoped } from "./useScoped.ts";

/**
 * A value that takes its inputs through its own `configure`.
 *
 * The constraint `useConfigured` asks of its value, pinned by `useConfigured.tst.ts`.
 * Exported because the hook's signature names it; kept out of both barrels (AGENTS.md §9).
 */
export interface Configurable<I> {
  readonly configure: (inputs: I) => void;
}

export const useConfigured = <A extends Configurable<I>, I>(
  make: () => Effect.Effect<A, never, Scope.Scope>,
  inputs: I,
): A | undefined => {
  const value = useScoped(() => Effect.tap(make(), (built) => Effect.sync(() => built.configure(inputs))));

  // Runs again on the render the value appears, so an input changed in between still lands.
  useLayoutEffect(() => {
    if (value !== undefined) value.configure(inputs);
  }, [value, inputs]);

  return value;
};
