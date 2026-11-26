/**
 * The questions tab's hydration block, one pure function of the shown reading.
 *
 * Whether the block waits, asks for wiring or shows counts, and every sentence that depends
 * on a count (the re-check rate, the all-clear, the scope note) are decided here and the
 * panel only renders them. This is the counterpart of `portCards` (`PortCards.ts`) for the
 * hydration block, and the reason is the same: a rule written in a render function is
 * reachable only by rendering, and the mutation gate measures `src/model/`.
 *
 * The input is the reading's `hydration` and whether the poll has not sampled, never the
 * status, because the decision reads only those two. The fixed advice of the unwired state
 * and the pending phrase are not rules and stay beside the markup.
 *
 * Package-private: the dock model holds the result and nothing exports it. Every sentence
 * is built inside a function body, so no literal runs once at import.
 */
import * as Data from "effect/Data";
import { unaccountedEntries } from "./Hydration.ts";
import type { HydrationActivity, HydrationDrops } from "./Hydration.ts";

/** What the block reads: the counts, when there are any, and whether no sample has been taken. */
export interface HydrationInput {
  readonly hydration: HydrationActivity | undefined;
  /** No sample has been taken, so missing counts are not yet a statement about the host. */
  readonly unsampled: boolean;
}

/**
 * What the block says of the drop reasons.
 *
 * `None` is the all-clear, said rather than left blank because every reason is watched for
 * and none fired; `Raised` is exactly the reasons whose count is above zero, as given.
 */
export type HydrationDropsView = Data.TaggedEnum<{
  None: { readonly text: string };
  Raised: { readonly rows: ReadonlyArray<HydrationDrops> };
}>;

export const HydrationDropsView = Data.taggedEnum<HydrationDropsView>();

/**
 * What the block shows.
 *
 * `Pending` is no counts and no sample yet; `Unwired` is no counts after a sample, which
 * the panel answers with how to wire them. `Counts` carries the four numbers, the rate
 * (absent when nothing was re-checked), the drops and the scope note.
 */
export type HydrationView = Data.TaggedEnum<{
  Pending: {};
  Unwired: {};
  Counts: {
    readonly dehydrated: number;
    readonly seeded: number;
    readonly rechecked: number;
    readonly mismatched: number;
    readonly rate: string | undefined;
    readonly drops: HydrationDropsView;
    readonly scope: string;
  };
}>;

export const HydrationView = Data.taggedEnum<HydrationView>();

/** The re-check rate in words; none when nothing was re-checked, since a rate of nothing is no rate. */
function rateOf(activity: HydrationActivity): string | undefined {
  return activity.rechecked === 0
    ? undefined
    : `${activity.mismatched} of ${activity.rechecked} re-checked question${activity.rechecked === 1 ? "" : "s"} disagreed with the server.`;
}

/** The reasons that fired, or the all-clear counting every reason the reading lists. */
function dropsOf(drops: ReadonlyArray<HydrationDrops>): HydrationDropsView {
  const raised = drops.filter((drop) => drop.count > 0);
  return raised.length === 0
    ? HydrationDropsView.None({ text: `Nothing was dropped. All ${drops.length} reasons are watched.` })
    : HydrationDropsView.Raised({ rows: raised });
}

/**
 * The note that the totals are process-wide, with what the difference of the two counters means.
 *
 * `unaccountedEntries` refuses the difference where it would be negative, which is the
 * ordinary case in a browser that seeds from payloads another process built.
 */
function scopeOf(activity: HydrationActivity): string {
  const unaccounted = unaccountedEntries(activity);
  const reading =
    unaccounted === undefined
      ? "This process seeded more than it built, so it is a client reading payloads rendered elsewhere."
      : `${unaccounted} dehydrated entr${unaccounted === 1 ? "y" : "ies"} have no seeding counted in this process.`;
  return `Process-wide totals, not this page's. ${reading}`;
}

function countsOf(activity: HydrationActivity): HydrationView {
  return HydrationView.Counts({
    dehydrated: activity.dehydrated,
    seeded: activity.seeded,
    rechecked: activity.rechecked,
    mismatched: activity.mismatched,
    rate: rateOf(activity),
    drops: dropsOf(activity.drops),
    scope: scopeOf(activity),
  });
}

/**
 * The hydration block for one reading: the one place its decision and words are made.
 *
 * Counts that are present win whatever `unsampled` says, because a host that passed them
 * has answered the question the pending phrase asks.
 */
export function hydrationView(input: HydrationInput): HydrationView {
  return input.hydration !== undefined
    ? countsOf(input.hydration)
    : input.unsampled
      ? HydrationView.Pending()
      : HydrationView.Unwired();
}
