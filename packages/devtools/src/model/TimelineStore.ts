/**
 * A subscribable timeline, and the loop that feeds it from a `Source`.
 *
 * Framework-free on purpose. `useSyncExternalStore` wants exactly a `subscribe`
 * and a `getSnapshot`, and so does every other renderer worth supporting, so
 * the store belongs on the model side of this package where it is held to
 * core's coverage bar and mutated by the gate. `@qadi/devtools/react` adds one
 * hook over it and computes nothing — the same division AGENTS.md §13 already
 * enforces on `@qadi/react`.
 *
 * **Pausing freezes the view, not the feed.** A reader who pauses to study a
 * row wants the rows to stop moving, not the recording to stop: resuming and
 * finding a gap where the interesting decision was is the one outcome that
 * makes the pause button worse than useless. So records keep folding in and
 * `getSnapshot` keeps returning the timeline as it was when the pause began.
 */
import * as Effect from "effect/Effect";
import * as Stream from "effect/Stream";
import type { StoredRecord } from "@qadi/core";
import type { Source } from "./Source.ts";
import { emptyTimeline, ingest, type Timeline } from "./Timeline.ts";

export interface TimelineStore {
  /** Registers a listener, and returns the function that removes it. */
  readonly subscribe: (listener: () => void) => () => void;
  /**
   * The timeline to render.
   *
   * Stable between changes — the same reference is returned until something
   * actually changed — because `useSyncExternalStore` compares snapshots by
   * identity and would otherwise re-render on every replayed frame.
   */
  readonly getSnapshot: () => Timeline;
  /** Folds one record in. */
  readonly accept: (record: StoredRecord) => void;
  /** Empties the **view**. It does not reach back to any sink's own log. */
  readonly clear: () => void;
  readonly setPaused: (paused: boolean) => void;
  readonly isPaused: () => boolean;
}

export const makeTimelineStore = (options?: { readonly capacity?: number }): TimelineStore => {
  let timeline = emptyTimeline(options);
  let frozen: Timeline | undefined;
  const listeners = new Set<() => void>();

  const notify = () => {
    for (const listener of listeners) listener();
  };

  return {
    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    getSnapshot: () => frozen ?? timeline,

    accept: (record) => {
      const next = ingest(timeline, record);
      // A duplicate returns the identical timeline, so this is where a replaying
      // feed stops costing a render.
      if (next === timeline) return;
      timeline = next;
      if (frozen === undefined) notify();
    },

    clear: () => {
      timeline = emptyTimeline(options);
      frozen = undefined;
      notify();
    },

    setPaused: (paused) => {
      if (paused === (frozen !== undefined)) return;
      frozen = paused ? timeline : undefined;
      notify();
    },

    isPaused: () => frozen !== undefined,
  };
};

/**
 * Drives a store from a source until interrupted.
 *
 * The backlog first, then the live stream, and in that order deliberately: a
 * reader opening the panel wants what already happened before what happens
 * next, and the timeline orders by `at` anyway, so a backlog arriving after a
 * few live records would still land in the right place — just later, with the
 * rows visibly rearranging under the cursor.
 */
export const runSource = (store: TimelineStore, source: Source): Effect.Effect<void> =>
  Effect.gen(function* () {
    if (source.backlog !== undefined) {
      const records = yield* source.backlog;
      for (const record of records) store.accept(record);
    }
    yield* Stream.runForEach(source.live, (record) => Effect.sync(() => store.accept(record)));
  });
