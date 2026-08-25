"use client";
/**
 * The one subscription in this package.
 *
 * `useSyncExternalStore` and nothing else — the store owns the timeline, folds
 * records into it and hands back the same reference until something actually
 * changed, which is exactly the contract that hook wants. Every other file
 * under `react/` renders what this returns.
 *
 * Written this way for the reason AGENTS.md §13 gives for `@qadi/react`: the
 * interesting properties — merging, ordering, pairing, pausing — are properties
 * of the model, and proving them through components only makes the test slower
 * and vaguer. They are tested in `test/model/`; this is tested for the two
 * things only React can get wrong, which are subscribing and unsubscribing.
 */
import * as Effect from "effect/Effect";
import * as Fiber from "effect/Fiber";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { Source } from "../model/Source.ts";
import { makeTimelineStore, runSource, type TimelineStore } from "../model/TimelineStore.ts";
import type { Timeline } from "../model/Timeline.ts";

export interface UseTimeline {
  readonly timeline: Timeline;
  readonly paused: boolean;
  readonly setPaused: (paused: boolean) => void;
  readonly clear: () => void;
  /** Exposed so a screen can drive the store directly in a test or a replay. */
  readonly store: TimelineStore;
}

/**
 * Subscribes to a source and returns the timeline it produces.
 *
 * `source` is held by identity: a new one tears the subscription down and opens
 * a fresh one, which is right for a changed URL and wasteful for an object
 * rebuilt every render. Build it at module scope or in a `useMemo` — the same
 * advice `@qadi/react` gives about policies, and for the same reason.
 */
export const useTimeline = (
  source: Source,
  options?: { readonly capacity?: number },
): UseTimeline => {
  const capacity = options?.capacity;
  const store = useMemo(
    () => makeTimelineStore(capacity === undefined ? undefined : { capacity }),
    [capacity],
  );

  useEffect(() => {
    const fiber = Effect.runFork(runSource(store, source));
    // Interrupted on unmount, so a panel that is closed stops reading — and,
    // with an SSE source, closes the connection through the stream's scope
    // rather than leaving a browser retrying a feed nobody is watching.
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [store, source]);

  const timeline = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const paused = useSyncExternalStore(store.subscribe, store.isPaused, store.isPaused);

  const setPaused = useCallback((next: boolean) => store.setPaused(next), [store]);
  const clear = useCallback(() => store.clear(), [store]);

  return { timeline, paused, setPaused, clear, store };
};

/**
 * A store fed by hand rather than by a source.
 *
 * For a screen rendering records it already holds — a replay, a fixture, a
 * test. `useState` rather than `useMemo` because the store must survive a
 * re-render with different arguments; recreating it would drop the timeline.
 */
export const useTimelineStore = (options?: { readonly capacity?: number }): UseTimeline => {
  const [store] = useState(() => makeTimelineStore(options));

  const timeline = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const paused = useSyncExternalStore(store.subscribe, store.isPaused, store.isPaused);

  const setPaused = useCallback((next: boolean) => store.setPaused(next), [store]);
  const clear = useCallback(() => store.clear(), [store]);

  return { timeline, paused, setPaused, clear, store };
};
