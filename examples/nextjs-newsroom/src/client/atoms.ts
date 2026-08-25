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
import { decisionCacheLayer, decisionSinkAll, decisionSinkFeed, decisionSinkRing, EvaluationIdLive } from "@qadi/core";
import { collectPortCalls } from "@qadi/devtools";
import { makeQadiAtoms } from "@qadi/react";
import type { HydrationMismatch } from "@qadi/react";
import { browserPorts } from "./ports.ts";

/** The browser's own decisions, for a reader who opened the dock late. */
export const clientRing = decisionSinkRing({ environment: "Client", capacity: 300 });

/** The browser's own decisions, for a reader watching. */
export const clientFeed = Effect.runSync(decisionSinkFeed({ capacity: 128, replay: 16 }));

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

export const atoms = makeQadiAtoms(
  Layer.mergeAll(
    browserPorts,
    EvaluationIdLive,
    decisionCacheLayer({ capacity: 256 }),
    decisionSinkAll([clientRing.layer, clientFeed.layer]),
    clientPortCalls.layer,
  ),
  { onHydrationMismatch: record },
);
