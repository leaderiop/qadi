/**
 * The same logical decision, told in two places.
 *
 * A decision made on the server, dehydrated, hydrated on the client and
 * re-checked is **one story with two rows**, and linking them is why
 * `EvaluateOptions.evaluationId` exists at all — the default of minting a fresh
 * id per call is right for a *repeat* of a question and wrong for a
 * *continuation* of one ([ADR-QD-012](../../../../spec/decisions/012-deterministic-time-and-ids.md),
 * as amended).
 *
 * **What this module deliberately does not claim.** The draft design called the
 * two halves `hydrated` and `recheck`, and nothing in a record says which is
 * which: `environment` is a free-form label a sink stamped, and no field marks
 * a record as having come from a dehydrated payload. Inventing that distinction
 * would mean guessing that a row labelled `"Client"` is a re-check, which is
 * false the moment someone labels their processes `"eu-west"` and `"us-east"`.
 *
 * So the roles are derived from the one fact the records really carry: **time**.
 * The earliest row for an evaluation is where the story started; the rest
 * continue it. That is true of a hydrated re-check, of a replica forwarding to
 * an aggregator, and of anything else that shares an id — which is the point.
 */
import type { Timeline, TimelineEntry } from "./Timeline.ts";
import { verdictOf } from "./Verdict.ts";

/**
 * `Alone` is the common case and gets no badge at all — not an "unpaired" one.
 * A column full of "unpaired" says nothing and costs a glance per row.
 */
export type PairRole = "Alone" | "Origin" | "Continuation";

/**
 * A plain interface, not a `Data.TaggedClass`: this is one shape rather than a
 * member of a union, so a `_tag` on it would be a field nothing reads. The
 * mutation gate is what noticed — the tag's own literal was the one mutant in
 * this package with no test covering it at all.
 */
export interface PairedEntry {
  readonly entry: TimelineEntry;
  readonly role: PairRole;
  /** The other rows for this evaluation, in timeline order. Empty when `Alone`. */
  readonly partners: ReadonlyArray<TimelineEntry>;
  /**
   * The partners do not agree on the verdict.
   *
   * The single most interesting thing this tool can show: a server `Allow` that
   * no longer holds client-side is a hydration mismatch, and the reviewer wants
   * it to be impossible to miss. An `Error` disagrees with a verdict — one row
   * decided something and the other never got to — but not with another
   * `Error`, since both say the same thing happened.
   */
  readonly disagrees: boolean;
}

/**
 * Every entry, told what else shares its evaluation.
 *
 * Order is preserved exactly — this annotates the timeline, it does not
 * regroup it. A view that clustered pairs together would break the one property
 * a chronological log has.
 *
 * A scan per entry rather than a grouping pass, and the trade is deliberate.
 * Grouping needs a lookup back out of the map, and that lookup has a branch
 * nothing can reach — every entry is in the map by construction, so the
 * `undefined` case is dead code the type system still demands a value for.
 * Scanning is quadratic in the number of entries, which is bounded by the
 * timeline's capacity (500 by default), and every branch of it is reachable
 * from a test.
 */
export const pairedEntries = (timeline: Timeline): ReadonlyArray<PairedEntry> =>
  timeline.entries.map((entry) => {
    const family = timeline.entries.filter(
      (other) => other.evaluationId === entry.evaluationId,
    );
    return {
      entry,
      role: roleOf(entry, family),
      partners: family.filter((other) => other !== entry),
      // Compared across the whole family rather than pairwise: three replicas
      // where one disagrees is a disagreement on every row, not on two of them.
      disagrees: new Set(family.map(verdictOf)).size > 1,
    };
  });

/**
 * The rows of every evaluation that has more than one.
 *
 * Keyed by evaluation id and **not** by environment, which is the opposite of
 * the timeline's own identity rule — deliberately. The timeline keeps a server
 * decision and its client re-check apart because they are two events; this puts
 * them back together because they are one story.
 */
export const pairsOf = (timeline: Timeline): ReadonlyMap<string, ReadonlyArray<TimelineEntry>> => {
  const grouped = groupByEvaluation(timeline.entries);
  return new Map([...grouped].filter(([, family]) => family.length > 1));
};

const groupByEvaluation = (
  entries: ReadonlyArray<TimelineEntry>,
): ReadonlyMap<string, ReadonlyArray<TimelineEntry>> => {
  const grouped = new Map<string, Array<TimelineEntry>>();
  for (const entry of entries) {
    const family = grouped.get(entry.evaluationId);
    if (family === undefined) grouped.set(entry.evaluationId, [entry]);
    else family.push(entry);
  }
  return grouped;
};

/**
 * The first row of a family started the story; the rest continue it.
 *
 * `family` is in timeline order, so "first" is "earliest" — and where two rows
 * genuinely share an instant, whichever reached the reader first. That tie is
 * arbitrary and it is *supposed* to be: two processes claiming the same
 * millisecond have no fact between them that could decide it, and picking one
 * deterministically beats rendering the pair differently on every reload.
 */
const roleOf = (entry: TimelineEntry, family: ReadonlyArray<TimelineEntry>): PairRole => {
  if (family.length < 2) return "Alone";
  return family[0] === entry ? "Origin" : "Continuation";
};
