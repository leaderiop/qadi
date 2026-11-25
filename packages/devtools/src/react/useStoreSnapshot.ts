"use client";
/**
 * Reads an external store's snapshot as it changes: the dock's one `useSyncExternalStore` call.
 *
 * Every screen reads a model store the same way, and a second copy of this line is
 * how a constant-`undefined` run once crept into a plain read. Package-private
 * (AGENTS.md §9).
 */
import { useSyncExternalStore } from "react";
import type { DiagnosticsReadout, DiagnosticsStatus } from "../model/DiagnosticsFeed.ts";
import type { ReadableStore } from "../model/ExternalStore.ts";
import type { TimelineStore } from "../model/TimelineStore.ts";

export const useStoreSnapshot = <A>(store: ReadableStore<A>): A =>
  useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);

/**
 * Whether a timeline is paused.
 *
 * It reads through `useStoreSnapshot` rather than a second `useSyncExternalStore`: pausing
 * publishes the same timeline, so the timeline's own subscription carries the change, and
 * `isPaused` returns a boolean React compares exactly. One subscription, the one a direct
 * call would make. The buffer itself is read through the dock's snapshot.
 */
export const usePaused = (timeline: TimelineStore): boolean =>
  useStoreSnapshot({ subscribe: timeline.subscribe, getSnapshot: timeline.isPaused });

/**
 * The diagnostics poll's status alone.
 *
 * It reads through `useStoreSnapshot` with a `getSnapshot` that picks the status out of the
 * readout's snapshot: one subscription, the store's own. The feed keeps the status object
 * across samples that change nothing, so React compares it exactly, and a poll that moved
 * only the reading re-renders nothing that reads this.
 */
export const useDiagnosticsStatus = (readout: DiagnosticsReadout): DiagnosticsStatus =>
  useStoreSnapshot({
    subscribe: readout.subscribe,
    getSnapshot: () => readout.getSnapshot().status,
  });
