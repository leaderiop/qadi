/**
 * One timeline read, owned by a scope, behind the one store a host holds.
 *
 * The dock model and the public `useTimeline` hook read a source the same way, so
 * the read lives here once. The store is the feed's for its whole life, and a capacity
 * change is that store's own `resize` (ADR-QD-191); the scope is the read's lifetime,
 * so closing it interrupts the read and, with an SSE source, closes its connection
 * (ADR-QD-137).
 *
 * Exported from the package root (ADR-QD-173): a shell builds it in a scope it owns.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import type * as Scope from "effect/Scope";
import { makeConfigure } from "./ConfigurePrologue.ts";
import { callAll, makeExternalStore, sameFields } from "./ExternalStore.ts";
import { sourceFromRecords, type Source } from "./Source.ts";
import { makeStatedRun, type RunPlan } from "./StatedRun.ts";
import { DEFAULT_TIMELINE_CAPACITY, emptyTimeline, type Timeline } from "./Timeline.ts";
import { makeTimelineStore, runSource, type TimelineStore } from "./TimelineStore.ts";

/**
 * What a feed reads and how much it keeps.
 *
 * The source is compared by identity when the feed is configured again, the capacity by
 * the bound it means: an omitted one is `DEFAULT_TIMELINE_CAPACITY`.
 */
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
  /** The read has not stopped: it is running, has ended by itself, or there was nothing to read. */
  Reading: {};
  /**
   * The read's own work ended on anything but success, an interruption it gave itself
   * included. An interruption from outside (a new source, none, a capacity change, the scope
   * closing), a source that ends by itself and a restart never stop it. `reason` is
   * `causeMessage`'s text of the cause: a `Cause.pretty` trace with stack frames and checkout
   * paths whenever one renders, and the one placeholder when the failed value cannot be read,
   * so the feed always states that it stopped. It is for the host's own process and must not
   * cross a trust boundary. The entries it delivered stay.
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
  /**
   * Registers a listener, and returns the function that removes it. What a listener throws
   * on the `Reading` that `restart` or `configure` publishes is rethrown once the new read
   * has started (see `StatedRun.ts`).
   */
  readonly subscribe: (listener: () => void) => () => void;
  readonly getSnapshot: () => TimelineStatus;
  readonly restart: () => void;
}

export interface TimelineFeed {
  /**
   * The one store for the feed's life, never replaced: a capacity change is its `resize`,
   * which empties it at the new bound.
   * Every listener on its `subscribe` is called, and it runs on every record; what they
   * threw is rethrown out of whatever published, and the rest of that call does not run,
   * except that a capacity change goes on to start the read that refills it, whose throw is
   * rethrown after it (see `configure`).
   */
  readonly timeline: TimelineStore;
  /** Where the read stands. */
  readonly status: TimelineStatusReadout;
  /**
   * Re-reads only when the effective capacity or the source moved: a configure in which
   * no field moved changes nothing. An omitted capacity and `DEFAULT_TIMELINE_CAPACITY`
   * are one bound. A capacity the timeline refuses throws
   * before anything moves and leaves the inputs, the timeline and the read as they were.
   * Does nothing once the feed's scope has closed. A capacity change publishes
   * the emptied timeline and then starts the read that refills it, from the same source or
   * a new one. Its resize and its read both run, whatever a listener throws on either, and
   * what they threw is rethrown after: one value as itself, both as one `AggregateError`,
   * the resize's first (ADR-QD-194, ADR-QD-177).
   */
  readonly configure: (inputs: TimelineFeedInputs) => void;
}

/**
 * The one normaliser of a timeline feed's inputs.
 *
 * An omitted field and one holding `undefined` become one field, the capacity is
 * compared by the bound it means, and a refused bound throws here, before anything
 * moves. The declared return type makes a new input a compile error until it is
 * listed here (ADR-QD-192).
 */
export const completeTimelineInputs = (
  inputs: TimelineFeedInputs,
): Required<TimelineFeedInputs> & { readonly capacity: number } => ({
  capacity: effectiveCapacity(inputs.capacity),
  source: inputs.source,
});

/** What a feed that gave no source reads: nothing, which ends at once. */
const NO_SOURCE: Source = sourceFromRecords([]);

/**
 * The bound a feed input means.
 *
 * An omitted capacity is `DEFAULT_TIMELINE_CAPACITY` and one the timeline refuses throws
 * `emptyTimeline`'s error, so a caller that checks first moves nothing for a refused
 * bound (ADR-QD-191).
 */
export function effectiveCapacity(capacity: number | undefined): number {
  return emptyTimeline({ capacity: capacity ?? DEFAULT_TIMELINE_CAPACITY }).capacity;
}

const IDLE_TIMELINE: Timeline = emptyTimeline();

/**
 * The store a reader holds on the pass before its feed is built.
 *
 * Inert, so nothing can be fed into a store several components share: `accept`,
 * `clear`, `resize` and `setPaused` change nothing, and it is never paused.
 */
export const idleTimeline: TimelineStore = {
  subscribe: () => () => {},
  getSnapshot: () => IDLE_TIMELINE,
  accept: () => {},
  clear: () => {},
  resize: () => false,
  setPaused: () => {},
  isPaused: () => false,
};

/** What a hook reads on the pass before the feed exists. */
export const idleTimelineStatus: TimelineStatusReadout = {
  subscribe: () => () => {},
  getSnapshot: () => READING,
  restart: () => {},
};

/**
 * Builds the feed bare in the caller's scope; closing it interrupts the read.
 *
 * The feed takes its inputs only through `configure` (ADR-QD-192), so a bare feed holds
 * the default capacity and reads no source until it is handed one.
 */
export const makeTimelineFeed = Effect.fn("qadi.devtools.makeTimelineFeed")(function* (): Effect.fn.Return<
  TimelineFeed,
  never,
  Scope.Scope
> {
  let held = completeTimelineInputs({});
  const timeline = makeTimelineStore();

  const status = makeExternalStore<TimelineStatus>(READING);
  // One read at a time; a source that went away is replaced by an empty one.
  const reads = yield* makeStatedRun((reason) => status.set(TimelineStatus.Stopped({ reason })));
  const plan = (): RunPlan => ({
    starting: () => status.set(READING),
    engine: ({ guard }) =>
      runSource({ accept: guard((record) => timeline.accept(record)) }, held.source ?? NO_SOURCE),
  });
  const restart = () => reads.start(plan());

  return {
    timeline,
    status: { subscribe: status.subscribe, getSnapshot: status.getSnapshot, restart },
    // Past the check an input moved, so the read starts again whichever one it was; both
    // steps run whatever a listener throws on either, and `resize` throws only from its
    // publish, after it has resized. Each step reads the held inputs when it runs, so a
    // nested `configure` from a listener decides the capacity and the source.
    configure: makeConfigure(
      {
        closed: reads.closed,
        complete: completeTimelineInputs,
        held: () => held,
        same: sameFields,
        hold: (wanted) => {
          held = wanted;
        },
      },
      () =>
        callAll(
          [() => timeline.resize(held.capacity), restart],
          "More than one step of the timeline feed's configure threw.",
        ),
    ),
  };
});
