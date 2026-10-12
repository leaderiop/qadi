"use client";
/**
 * The browser's atom set, built once at module scope.
 *
 * Once, because `makeQadiAtoms` builds one authorization context and
 * `Atom.family` keys structurally inside it — two separately built but *equal*
 * policies share an atom, and two separately built atom **sets** share nothing.
 * Building per render would give every render its own answers and its own cache.
 *
 * The mismatch reporter is supplied rather than left to the development-mode
 * default, because a supplied one runs in production too. A server and a browser
 * disagreeing about an authorization question is signal worth keeping: it means
 * one of the two is wired differently from the other, and the page has already
 * shown the server's answer by the time anyone notices.
 */
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { decisionCacheLayer, EvaluationIdLive, makeDecisionLog } from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import { makeQadiAtoms } from "@qadi/react";
import type { HydrationMismatch } from "@qadi/react";
import { browserPorts } from "./ports.ts";

/**
 * The browser's own decisions: their sink, their backlog and their live stream.
 *
 * The dock reads it as a source directly — a decision log is one — and its
 * label is stated here, once.
 */
export const clientLog = Effect.runSync(makeDecisionLog({ environment: "Client", capacity: 300 }));

/** What the browser's ports were asked, on the same terms as the server's. */
export const clientPortCalls = collectPortCalls({ capacity: 200 });

/** Every disagreement this page has seen, newest last. Read by the dock. */
const mismatches: Array<HydrationMismatch> = [];
const listeners = new Set<() => void>();

export const subscribeMismatches = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/**
 * A stable snapshot, because `useSyncExternalStore` compares by reference and a
 * fresh array every read is an infinite render loop.
 */
let snapshot: ReadonlyArray<HydrationMismatch> = [];
export const mismatchSnapshot = (): ReadonlyArray<HydrationMismatch> => snapshot;

const record = (mismatch: HydrationMismatch): void => {
  mismatches.push(mismatch);
  snapshot = [...mismatches];
  for (const listener of listeners) listener();
};

/**
 * The browser's services, with a decision cache in them like any other.
 *
 * The cache is a second layer of memoisation: `Atom.family` already keeps one
 * evaluation per question, so it earns its place mainly by surviving a
 * re-render, and on a server, where a hit spans requests, rather more. It is
 * one member of the layer and nothing more — the dock's wiring read gets the
 * instance the provider's decisions used from `useDevtoolsFeed`, which hands it
 * the registry's own build, so this file no longer builds the cache out of band
 * (it used to, to stop the dock reading a throwaway: a layer *value* built twice
 * is two caches, CCR-QD-200).
 *
 * It is here deliberately. Having one is what exposed `useInvalidate()` failing
 * to invalidate: the atoms were discarded, recomputed, and answered from this
 * cache, so the ports were never re-asked. That is fixed in `@qadi/react` —
 * invalidation clears a `DecisionCache` in its layer before the atoms
 * recompute — and keeping the cache is what keeps this example exercising the
 * path that found it.
 */
export const browserLayer = Layer.mergeAll(
  browserPorts,
  EvaluationIdLive,
  decisionCacheLayer({ capacity: 256 }),
  clientLog.layer,
  clientPortCalls.layer,
);

export const atoms = makeQadiAtoms(browserLayer, { onHydrationMismatch: record });
