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

/**
 * A cache in the browser is a second layer of memoisation.
 *
 * `Atom.family` already keeps one evaluation per question, so this earns its
 * place mainly by surviving a re-render — on a server, where a hit spans
 * requests, it earns rather more.
 *
 * It was briefly suspected of defeating `useInvalidate()` and it is **not** the
 * cause: measured with and without it, in a production build, invalidating
 * `/edge/invalidate` produces no state transition and no port call either way.
 * That observation is open and recorded in the README rather than diagnosed
 * here; the cache stays because removing it changed nothing.
 */
/**
 * Everything the browser's evaluations run in, named so the Services panel can
 * be handed the **same** context the evaluator has.
 *
 * Exported for that reason and no other. `wiringReport` reports on the context
 * it is given, so providing it a subset makes the panel under-report — it said
 * `DecisionSink absent — decisions are made and not observed` while the sink was
 * what fed the Log directly below it. A wiring report that is wrong about the
 * wiring is worse than no wiring report.
 *
 * `CurrentSubject` is deliberately not here: it changes per evaluation, and the
 * panel says so of its own accord.
 */
export const browserLayer = Layer.mergeAll(
  browserPorts,
  EvaluationIdLive,
  decisionCacheLayer({ capacity: 256 }),
  decisionSinkAll([clientRing.layer, clientFeed.layer]),
  clientPortCalls.layer,
);

export const atoms = makeQadiAtoms(browserLayer, { onHydrationMismatch: record });
