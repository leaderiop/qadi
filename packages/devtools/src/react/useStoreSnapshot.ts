"use client";
/**
 * Reads an external store's snapshot as it changes: the dock's one `useSyncExternalStore` call.
 *
 * Every screen reads a model store the same way, and a second copy of this line is
 * how a constant-`undefined` run once crept into a plain read. Package-private
 * (AGENTS.md §9).
 */
import { useSyncExternalStore } from "react";
import type { ExternalStore } from "../model/ExternalStore.ts";
import type { TimelineStore } from "../model/TimelineStore.ts";

export const useStoreSnapshot = <A>(store: Pick<ExternalStore<A>, "subscribe" | "getSnapshot">): A =>
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
