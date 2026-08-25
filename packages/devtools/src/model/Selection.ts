/**
 * Which row the inspector is showing, and what happened to it.
 *
 * A selection is held **by key rather than by reference**, because the entry it
 * points at is replaced whenever its obligation outcome arrives — the timeline
 * is immutable, so joining a duty to a decision builds a new entry. Holding the
 * old object would leave the inspector showing a row the log no longer contains.
 */
import * as Data from "effect/Data";
import { entryKey, type Timeline, type TimelineEntry } from "./Timeline.ts";

/** Nothing is selected. */
export class NoSelection extends Data.TaggedClass("NoSelection")<Record<never, never>> {}

export class Selected extends Data.TaggedClass("Selected")<{
  readonly entry: TimelineEntry;
}> {}

/**
 * The selected row fell out of the log.
 *
 * A third state rather than a silent return to `NoSelection`, because the two
 * are different things to a reader: nothing selected is a starting position,
 * while a row that scrolled off the end of a bounded buffer is an event — the
 * thing they were reading is gone, and a panel that simply empties itself
 * without saying so reads as a bug.
 */
export class Evicted extends Data.TaggedClass("Evicted")<{
  readonly key: string;
}> {}

export type Selection = NoSelection | Selected | Evicted;

/**
 * Resolves a held key against the current timeline.
 *
 * Deliberately not filtered: a selection survives a filter that would have
 * hidden its row. Clearing the inspector because someone typed in the search
 * box would be the tool second-guessing the reader.
 */
export const selectionOf = (timeline: Timeline, key: string | undefined): Selection => {
  if (key === undefined) return new NoSelection();
  const entry = timeline.entries.find((candidate) => entryKey(candidate) === key);
  return entry === undefined ? new Evicted({ key }) : new Selected({ entry });
};
