/**
 * One ordered timeline, folded from records that arrive however they arrive.
 *
 * The devtools reads several processes at once — a browser's own decision log,
 * a server's SSE stream, an aggregator merging replicas — and none of them
 * promises order, uniqueness or completeness across sources. `EventSource`
 * reconnects on its own and re-reads the server's backlog, so the same record
 * arrives twice; a merge interleaves
 * two clocks, so records arrive out of order; and a decision's obligation
 * outcome is emitted from a different module *after* `evaluate` returned, so the
 * two halves of one story arrive separately and sometimes backwards.
 *
 * This module absorbs all of that and nothing else does. Everything downstream —
 * pairing, filters, the screens — reads entries and may assume they are ordered,
 * unique and joined.
 *
 * **A pure fold, not a store.** `ingest` returns a new timeline rather than
 * mutating one, so every property here is testable by calling a function with an
 * array, and the React layer's subscription is a thin wrapper rather than the
 * thing under test. That is the same division `@qadi/react` draws between the
 * atom graph and the components.
 */
import * as Data from "effect/Data";
import * as Order from "effect/Order";
import type { DecisionRecord, ObligationRecord, StoredRecord } from "@qadi/core";
import { DEFAULT_LOG_CAPACITY, storedRecordOrder } from "@qadi/core";

/** One evaluation, as one process saw it. */
export class TimelineDecision extends Data.TaggedClass("TimelineDecision")<{
  readonly evaluationId: string;
  readonly environment: string;
  readonly at: number;
  readonly decision: DecisionRecord;
  /**
   * What happened at the obligation gate, once it is known.
   *
   * `undefined` covers two different situations and the screens must say which:
   * the decision carried no obligations, or it did and the outcome has not
   * arrived. `decision.outcome` tells them apart — an allow with a non-empty
   * `obligations` array and no record here is still in flight.
   */
  readonly obligations: ObligationRecord | undefined;
}> {}

/**
 * An obligation outcome whose decision never arrived.
 *
 * Kept rather than dropped. A binding obligation nobody discharged turns an
 * allow into a refusal at the enforcement boundary, so "something was refused
 * and I cannot show you what it was" is a fact a reviewer needs — and silently
 * discarding it is how a log comes to disagree with what the caller saw.
 */
export class TimelineOrphan extends Data.TaggedClass("TimelineOrphan")<{
  readonly evaluationId: string;
  readonly environment: string;
  readonly at: number;
  readonly obligations: ObligationRecord;
}> {}

export type TimelineEntry = TimelineDecision | TimelineOrphan;

export interface Timeline {
  readonly entries: ReadonlyArray<TimelineEntry>;
  readonly capacity: number;
}

/**
 * How many entries a timeline keeps by default: the decision log's own bound.
 *
 * Defined as core's `DEFAULT_LOG_CAPACITY` rather than a literal kept equal to
 * it by a comment, so a reader of a default log is not bounded twice by two
 * numbers that drifted apart.
 */
export const DEFAULT_TIMELINE_CAPACITY: number = DEFAULT_LOG_CAPACITY;

export const emptyTimeline = (options?: { readonly capacity?: number }): Timeline => {
  const capacity = options?.capacity ?? DEFAULT_TIMELINE_CAPACITY;
  // Non-negative rather than positive, unlike the decision log's: a
  // zero-capacity timeline is a coherent "keep nothing" view, where a log's
  // capacity also sizes a `PubSub` that would be silently dead at zero.
  // Checked here for the reason the log gives
  // — a negative bound makes the drop loop's exit condition unsatisfiable and a
  // `NaN` one makes it always false, unbounding a thing asked to be bounded.
  if (!(Number.isInteger(capacity) && capacity >= 0)) {
    throw new Error(`emptyTimeline: capacity must be a non-negative integer, got ${capacity}`);
  }
  return { entries: [], capacity };
};

export const ingestAll = (self: Timeline, records: ReadonlyArray<StoredRecord>): Timeline =>
  records.reduce(ingest, self);

/**
 * A stable identity for one row.
 *
 * The same three fields the timeline dedupes on, and for the same reason: not
 * the evaluation id alone, because a server decision and its client re-check
 * share one. Serves as a React key and as what a selection holds on to, so that
 * a row surviving a re-fold stays selected and one dropped by capacity can be
 * told apart from one that was never there.
 */
export const entryKey = (entry: TimelineEntry): string =>
  `${entry._tag}|${entry.environment}|${entry.evaluationId}|${entry.at}`;

/**
 * Folds one record in, and returns the timeline that results.
 *
 * Every rejection is silent by design: a duplicate is not an error, it is the
 * ordinary consequence of a feed that replays and a client that reconnects.
 */
export const ingest = (self: Timeline, record: StoredRecord): Timeline =>
  record._tag === "Decision" ? ingestDecision(self, record) : ingestObligations(self, record);

const ingestDecision = (self: Timeline, record: DecisionRecord & { environment: string }): Timeline => {
  // Identity is (environment, id, at). Not the id alone: a server decision and
  // its client re-check deliberately *share* one, which is the whole pairing
  // story, and collapsing them here would erase it. Not the whole record
  // either: a structural comparison would cost a deep walk of a policy tree on
  // every frame to answer a question these three fields already answer.
  if (self.entries.some((e) => e._tag === "TimelineDecision" && sameSlot(e, record))) return self;

  // An outcome that arrived before its decision is waiting for exactly this.
  const orphan = self.entries.find(
    (e): e is TimelineOrphan => e._tag === "TimelineOrphan" && sameEvaluation(e, record),
  );

  const entry = new TimelineDecision({
    evaluationId: record.evaluationId,
    environment: record.environment,
    at: record.at,
    decision: record,
    obligations: orphan?.obligations,
  });

  // Unconditional: when there is no orphan nothing equals `undefined`, so the
  // filter keeps everything. A guard for that case was dead code — the mutation
  // gate removed it and every test still passed.
  const kept = self.entries.filter((e) => e !== orphan);
  return bound({ ...self, entries: insert(kept, entry) });
};

const ingestObligations = (
  self: Timeline,
  record: ObligationRecord & { environment: string },
): Timeline => {
  // The latest decision this process made for that evaluation. Latest rather
  // than first because a re-used id means the outcome belongs to the most
  // recent question, and `evaluate` emits at most one outcome per evaluation.
  const target = last(
    self.entries.filter(
      (e): e is TimelineDecision => e._tag === "TimelineDecision" && sameEvaluation(e, record),
    ),
  );

  if (target === undefined) {
    // No `_tag` check: `target` being undefined means no decision entry shares
    // this evaluation, so anything matching the slot is already an orphan.
    if (self.entries.some((e) => sameSlot(e, record))) return self;
    const entry = new TimelineOrphan({
      evaluationId: record.evaluationId,
      environment: record.environment,
      at: record.at,
      obligations: record,
    });
    return bound({ ...self, entries: insert(self.entries, entry) });
  }

  // Same outcome delivered twice by a replaying feed.
  if (target.obligations?.at === record.at) return self;

  const merged = new TimelineDecision({ ...target, obligations: record });
  return { ...self, entries: self.entries.map((e) => (e === target ? merged : e)) };
};

const sameSlot = (
  entry: TimelineEntry,
  record: { evaluationId: string; environment: string; at: number },
): boolean => sameEvaluation(entry, record) && entry.at === record.at;

const sameEvaluation = (
  entry: TimelineEntry,
  record: { evaluationId: string; environment: string },
): boolean =>
  entry.evaluationId === record.evaluationId && entry.environment === record.environment;

const last = <A>(items: ReadonlyArray<A>): A | undefined => items[items.length - 1];

/**
 * True when an entry `a` must appear after one `b`, by core's `storedRecordOrder`.
 *
 * The comparator is shared — it is the one order a stored record is read in
 * (INV-QD-039), so a merged backlog and this timeline cannot disagree — and this
 * file asks only the greater-than question. A three-way answer was never read
 * here: `insert` asks "does this existing entry belong after the newcomer", and
 * a comparator's `-1` and `0` are the same answer to that. Two unknown (`NaN`)
 * times are equal, so neither is after the other and the newcomer lands after
 * its equals, in arrival order.
 *
 * Hoisted to module scope: `insert` runs once per ingested record.
 */
const isAfter = Order.isGreaterThan(storedRecordOrder);

/**
 * Places one entry in an already-ordered list.
 *
 * An insertion rather than an append-and-re-sort, and the reason is that the
 * re-sort version had a tie-break nothing could observe. Entries carried a
 * sequence number so that equal `at` values fell back to arrival order — but
 * `Array.prototype.sort` is stable and the appended entry is always the newest,
 * so stability already produced exactly that order. Four separate mutants of
 * the comparator survived the whole suite because they were equivalent, which
 * is mutation testing's way of saying the code was dead. It is gone, and this
 * says so rather than a future reader re-deriving it.
 *
 * The list is sorted and the entry belongs somewhere in it, so a scan for the
 * first entry that must come *after* it is the whole algorithm — and being a
 * scan rather than a sort, every branch of it is reachable from a test.
 */
const insert = (
  entries: ReadonlyArray<TimelineEntry>,
  entry: TimelineEntry,
): ReadonlyArray<TimelineEntry> => {
  const at = entries.findIndex((existing) => isAfter(existing, entry));
  // Ties place the newcomer last among its equals, which is what a log reads
  // like: things that happened at the same instant appear in the order they
  // reached the reader.
  return at === -1
    ? [...entries, entry]
    : [...entries.slice(0, at), entry, ...entries.slice(at)];
};

/**
 * Drops the oldest, as a decision log evicts.
 *
 * Unconditional: `slice` from a clamped offset is the whole rule, and the
 * under-capacity guard it replaces had no observable else — slicing from zero
 * returns the same entries, so the mutation gate could not tell the two apart.
 * The clamp is not optional, though: a negative offset would slice from the
 * *end* and silently keep the wrong rows.
 */
const bound = (self: Timeline): Timeline => ({
  ...self,
  entries: self.entries.slice(Math.max(0, self.entries.length - self.capacity)),
});
