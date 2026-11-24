"use client";
/**
 * The public timeline hooks: a source read in a scope the hook holds, and a store fed by hand.
 *
 * The store owns the timeline, folds records into it and hands back the same
 * reference until something actually changed, which is the contract
 * `useStoreSnapshot` reads it through. The read itself lives in the model's
 * timeline feed, so nothing here forks a fiber (ADR-QD-137).
 *
 * Written this way for the reason AGENTS.md §13 gives for `@qadi/react`: the
 * interesting properties — merging, ordering, pairing, pausing — are properties
 * of the model, and proving them through components only makes the test slower
 * and vaguer. They are tested in `test/model/`; this is tested for the two
 * things only React can get wrong, which are subscribing and unsubscribing.
 */
import { useCallback, useLayoutEffect, useState } from "react";
import type { Source } from "../model/Source.ts";
import { idleTimeline, idleTimelineStatus, makeTimelineFeed, type TimelineStatus } from "../model/TimelineFeed.ts";
import { makeTimelineStore, type TimelineStore } from "../model/TimelineStore.ts";
import { DEFAULT_TIMELINE_CAPACITY, type Timeline } from "../model/Timeline.ts";
import { useScoped } from "./useScoped.ts";
import { usePaused, useStoreSnapshot } from "./useStoreSnapshot.ts";

export interface UseTimeline {
  readonly timeline: Timeline;
  readonly paused: boolean;
  readonly setPaused: (paused: boolean) => void;
  readonly clear: () => void;
  /** Exposed so a screen can drive the store directly in a test or a replay. */
  readonly store: TimelineStore;
  /** Whether the read is running or has ended on a defect. A hand-fed store never reads, so it is always `Reading`. */
  readonly status: TimelineStatus;
  /** Reads the current source again; does nothing before the feed exists and for a hand-fed store. */
  readonly restart: () => void;
}

/**
 * Subscribes to a source and returns the timeline it produces.
 *
 * The read lives in a scope the hook holds, so unmounting closes it, and with an
 * SSE source closes the connection rather than leaving a browser retrying a feed
 * nobody is watching. A hidden-then-shown tree, or StrictMode's simulated remount,
 * builds a fresh timeline: `paused` returns to `false` and the source is read
 * again. A capacity change keeps `store` and empties and re-reads it. On the pass
 * before the scope exists the hook returns an inert store that ignores what it is
 * given.
 *
 * `source` is held by identity: a new one supersedes the read, which is right for
 * a changed URL and wasteful for an object rebuilt every render. Build it at
 * module scope or in a `useMemo`, the same advice `@qadi/react` gives about
 * policies, and for the same reason.
 */
export const useTimeline = (
  source: Source,
  options?: { readonly capacity?: number },
): UseTimeline => {
  const capacity = options?.capacity;
  const feed = useScoped(() => makeTimelineFeed({ source, capacity }));

  // The feed compares the source by identity and the capacity by the bound it means.
  // It runs again on the render the feed appears, so an input changed in between
  // still lands.
  useLayoutEffect(() => {
    if (feed !== undefined) feed.configure({ source, capacity });
  }, [feed, source, capacity]);

  const store = feed?.timeline ?? idleTimeline;
  const timeline = useStoreSnapshot(store);
  const paused = usePaused(store);
  const readout = feed?.status ?? idleTimelineStatus;
  const status = useStoreSnapshot(readout);

  return {
    timeline,
    paused,
    setPaused: store.setPaused,
    clear: store.clear,
    store,
    status,
    restart: readout.restart,
  };
};

/**
 * A store fed by hand rather than by a source.
 *
 * For a screen rendering records it already holds — a replay, a fixture, a test.
 * The store survives every re-render, so a changed `capacity` resizes it (empties
 * it at the new bound and releases a pause) rather than replacing it, while the
 * same capacity, or none after none, changes nothing (ADR-QD-191). `useState`
 * rather than `useMemo` because the store must not be recreated by a re-render.
 */
export const useTimelineStore = (options?: { readonly capacity?: number }): UseTimeline => {
  const capacity = options?.capacity ?? DEFAULT_TIMELINE_CAPACITY;
  const [store] = useState(() => makeTimelineStore({ capacity }));

  // A layout effect, so a changed bound is shown before paint; its first run is a
  // no-op because the store was built at that bound.
  useLayoutEffect(() => {
    store.resize(capacity);
  }, [store, capacity]);

  const timeline = useStoreSnapshot(store);
  const paused = usePaused(store);

  const setPaused = useCallback((next: boolean) => store.setPaused(next), [store]);
  const clear = useCallback(() => store.clear(), [store]);
  const status = useStoreSnapshot(idleTimelineStatus);

  return { timeline, paused, setPaused, clear, store, status, restart: idleTimelineStatus.restart };
};
