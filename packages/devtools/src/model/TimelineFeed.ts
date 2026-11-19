/**
 * One timeline read, owned by a scope, behind a store that outlives a capacity change.
 *
 * The dock model and the public `useTimeline` hook read a source the same way, so
 * the read lives here once. The store a host holds is stable across a capacity
 * change because a different bound is a different buffer, not a different review
 * session; the scope is the read's lifetime, so closing it interrupts the read and,
 * with an SSE source, closes its connection (ADR-QD-137).
 *
 * Exported from the package root (ADR-QD-173): a shell builds it in a scope it owns.
 */
import * as Cause from "effect/Cause";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { makeExternalStore } from "./ExternalStore.ts";
import { sourceFromRecords, type Source } from "./Source.ts";
import { makeSupersedingRun } from "./SupersedingRun.ts";
import { DEFAULT_TIMELINE_CAPACITY, emptyTimeline, type Timeline } from "./Timeline.ts";
import { makeTimelineStore, runSource, type TimelineStore } from "./TimelineStore.ts";

/** What a feed reads and how much it keeps. Each field is compared by identity when it is configured again. */
export interface TimelineFeedInputs {
  readonly capacity?: number | undefined;
  /** A new source (or capacity) supersedes the previous read. */
  readonly source?: Source | undefined;
}

/**
 * Where the timeline's read stands, as a closed set of states.
 *
 * A stop must be stated, not left as a timeline that looks current.
 */
export type TimelineStatus = Data.TaggedEnum<{
  /** The read has not failed: it is running, has ended by itself, or there was nothing to read. */
  Reading: {};
  /**
   * The read ended on a defect. `reason` is `Cause.pretty` of it, a trace with stack frames
   * and checkout paths for the host's own process: it must not cross a trust boundary. The
   * entries it delivered stay.
   */
  Stopped: { readonly reason: string };
}>;

export const TimelineStatus = Data.taggedEnum<TimelineStatus>();

/** One value, so a repeat `set` notifies nothing. */
const READING: TimelineStatus = TimelineStatus.Reading();

/**
 * Where the read stands, and the one command that reads the current source again.
 *
 * `restart` replays the source's backlog into the same timeline, and the timeline's
 * dedupe keeps each entry single. It does nothing once the feed's scope has closed.
 */
export interface TimelineStatusReadout {
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TimelineStatus;
  readonly restart: () => void;
}

export interface TimelineFeed {
  /** Stable across a capacity change: a different bound empties it, it does not replace it. */
  readonly timeline: TimelineStore;
  /** Where the read stands. */
  readonly status: TimelineStatusReadout;
  /** Re-reads only when the capacity or the source moved. An omitted input reads as `undefined`. Does nothing once the feed's scope has closed. */
  readonly configure: (inputs: TimelineFeedInputs) => void;
}

/** What a feed that gave no source reads: nothing, which ends at once. */
const NO_SOURCE: Source = sourceFromRecords([]);

const bounded = (capacity: number | undefined): TimelineStore =>
  makeTimelineStore({ capacity: capacity ?? DEFAULT_TIMELINE_CAPACITY });

const IDLE_TIMELINE: Timeline = emptyTimeline();

/**
 * The store a reader holds on the pass before its feed is built.
 *
 * Inert, so nothing can be fed into a store several components share: `accept`,
 * `clear` and `setPaused` do nothing, and it is never paused.
 */
export const idleTimeline: TimelineStore = {
  subscribe: () => () => {},
  getSnapshot: () => IDLE_TIMELINE,
  accept: () => {},
  clear: () => {},
  setPaused: () => {},
  isPaused: () => false,
};

/** What a hook reads on the pass before the feed exists. */
export const idleTimelineStatus: TimelineStatusReadout = {
  subscribe: () => () => {},
  getSnapshot: () => READING,
  restart: () => {},
};

/** Builds the feed in the caller's scope; closing it interrupts the read. */
export const makeTimelineFeed = Effect.fn("qadi.devtools.makeTimelineFeed")(function* (
  init?: TimelineFeedInputs,
): Effect.fn.Return<TimelineFeed, never, Scope.Scope> {
  let inputs: TimelineFeedInputs = init ?? {};
  let inner = bounded(inputs.capacity);
  // What the host subscribes to. It outlives every `inner`, so a capacity change is a new value, not a new store.
  const view = makeExternalStore<Timeline>(inner.getSnapshot());

  // A pause toggle changes the store's reading without moving the timeline, so it publishes too.
  const push = () => view.publish(inner.getSnapshot());
  inner.subscribe(push);

  const timeline: TimelineStore = {
    subscribe: view.subscribe,
    getSnapshot: view.getSnapshot,
    accept: (record) => inner.accept(record),
    clear: () => inner.clear(),
    setPaused: (paused) => inner.setPaused(paused),
    isPaused: () => inner.isPaused(),
  };

  const status = makeExternalStore<TimelineStatus>(READING);
  // One read at a time: a newer read supersedes and interrupts the one before it.
  const reads = yield* makeSupersedingRun();
  // A source that went away is replaced by an empty one.
  const readSource = (source: Source | undefined) => {
    const token = reads.begin();
    status.set(READING);
    const marking: Pick<TimelineStore, "accept"> = {
      accept: (record) => {
        if (!reads.isCurrent(token)) return;
        timeline.accept(record);
      },
    };
    reads.fork(token, runSource(marking, source ?? NO_SOURCE), {
      onFailure: (cause) => status.set(TimelineStatus.Stopped({ reason: Cause.pretty(cause) })),
    });
  };
  readSource(inputs.source);

  // A restart on a closed feed would publish a state nothing follows.
  const restart = () => {
    if (!reads.closed()) readSource(inputs.source);
  };

  return {
    timeline,
    status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart },
    configure: (next) => {
      // A command on a closed feed would publish a state nothing follows.
      if (reads.closed()) return;
      const before = inputs;
      inputs = next;
      const resized = next.capacity !== before.capacity;
      if (resized) {
        // The old store is dropped, not unsubscribed from: nothing can reach it again.
        inner = bounded(next.capacity);
        inner.subscribe(push);
        push();
      }
      if (resized || next.source !== before.source) readSource(next.source);
    },
  };
});
