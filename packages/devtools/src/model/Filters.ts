/**
 * Narrowing the log, and the counts that must not narrow with it.
 *
 * **Counts are of the whole timeline, never of the filtered view.** A header
 * reading "0 errors" because the reader happened to be filtering by subject is
 * a header that hides the thing they most need to see. Filtering answers "show
 * me these rows"; the counts answer "what is going on", and the second question
 * does not take a filter.
 */
import * as Match from "effect/Match";
import type { Resource } from "@qadi/core";
import type { TimelineDecision, TimelineEntry } from "./Timeline.ts";
import { verdictOf, type Verdict } from "./Verdict.ts";

export interface Filters {
  /** Matched literally and case-insensitively against subject, action, resource and ids. */
  readonly text: string;
  /** A specific environment, or `undefined` for all of them. */
  readonly environment: string | undefined;
  /** A specific verdict class, or `undefined` for any. */
  readonly verdict: Verdict | undefined;
}

export const noFilters: Filters = { text: "", environment: undefined, verdict: undefined };

/** True when nothing is being narrowed. */
export const isUnfiltered = (filters: Filters): boolean =>
  filters.text.trim() === "" && filters.environment === undefined && filters.verdict === undefined;

export const applyFilters = (
  entries: ReadonlyArray<TimelineEntry>,
  filters: Filters,
): ReadonlyArray<TimelineEntry> => {
  const needle = filters.text.trim().toLowerCase();
  return entries.filter(
    (entry) =>
      (filters.environment === undefined || entry.environment === filters.environment) &&
      (filters.verdict === undefined || verdictOf(entry) === filters.verdict) &&
      // No empty-needle guard: `includes("")` is already true for every row, so
      // one would be an optimisation with no observable effect — dead code by
      // the mutation gate's reckoning. A caller wanting to skip the work
      // entirely has `isUnfiltered`.
      searchTextOf(entry).includes(needle),
  );
};

/**
 * Every environment present, in the order first seen.
 *
 * Derived from the rows rather than from a fixed list, because `environment` is
 * a free-form label a sink stamped: a deployment naming its processes
 * `"eu-west"` and `"us-east"` gets exactly those two chips, and one naming them
 * `"Server"` and `"Client"` gets those. Hard-coding the pair would make the
 * filter useless for every deployment that is not a browser talking to a server.
 */
export const environmentsOf = (
  entries: ReadonlyArray<TimelineEntry>,
): ReadonlyArray<string> => [...new Set(entries.map((entry) => entry.environment))];

/**
 * Everything about a row a reader might type, lowercased and space-separated.
 *
 * Exported because it is the honest answer to "why did this row match", which a
 * screen wants in order to highlight — and because it is the only place the
 * matching rule is fully observable. Asserting the haystack exactly is what
 * pins the two properties below; asserting only which rows survived a filter
 * cannot see either.
 *
 * Matched with `includes` rather than a regular expression, and that is
 * behaviour rather than an implementation detail: a subject id containing `(`
 * or a resource path containing `.` must match itself, not be compiled into a
 * pattern that matches something else or throws.
 *
 * The separator is load-bearing rather than cosmetic: concatenating an
 * environment `Server` onto an action `read` would make `verre` match a row
 * containing neither word, and a filter that invents matches across field
 * boundaries is worse than one that misses.
 *
 * **A failed evaluation has no subject in it to search.** `subjectId` lives on
 * the `Decision`, and a `Failed` outcome has none — so filtering by subject
 * cannot find the rows where that subject's attribute lookup broke, which are
 * often the interesting ones. That is a limit of the record, not of this
 * function, and it is named here so a reader is not left guessing.
 */
export const searchTextOf = (entry: TimelineEntry): string =>
  partsOf(entry).join(" ").toLowerCase();

/**
 * Absent values are **omitted**, never rendered as a placeholder.
 *
 * A missing action written into the haystack as the string `"undefined"` would
 * make every such row match a search for "undefined" — the shape of false match
 * that erodes trust in a filter faster than a miss does. Spreading an empty
 * array removes the choice rather than making it carefully.
 */
const partsOf: (self: TimelineEntry) => ReadonlyArray<string> = Match.type<TimelineEntry>().pipe(
  Match.tagsExhaustive({
    TimelineDecision: (entry) => [
      entry.evaluationId,
      entry.environment,
      ...(entry.decision.action === undefined ? [] : [entry.decision.action]),
      ...subjectOf(entry),
      ...resourceText(entry.decision.resource),
    ],
    TimelineOrphan: (entry) => [
      entry.evaluationId,
      entry.environment,
      ...entry.obligations.obligationIds,
    ],
  }),
);

/** One element, or none: a failed evaluation has no subject. */
const subjectOf = (entry: TimelineDecision): ReadonlyArray<string> =>
  entry.decision.outcome._tag === "Decided" ? [entry.decision.outcome.decision.subjectId] : [];

/**
 * A resource is an open record, so its *values* are what a reader recognises —
 * `"invoice-42"` rather than `"id"`. Keys are searched too, since a reader
 * hunting for every row carrying a `tenantId` has nothing else to type.
 */
const resourceText = (resource: Resource | undefined): ReadonlyArray<string> =>
  Object.entries(resource ?? {}).flatMap(([key, value]) => [key, ...render(value)]);

/**
 * One element, or none.
 *
 * `JSON.stringify` returns `undefined` — the value, not the string — for a
 * function or a symbol, and throws on a circular object. A resource that
 * crossed the wire as JSON can be neither, but a locally-built one never did,
 * and neither a filter nor the panel it belongs to may be what falls over.
 */
const render = (value: unknown): ReadonlyArray<string> => {
  if (typeof value === "string") return [value];
  try {
    const rendered = JSON.stringify(value);
    return rendered === undefined ? [] : [rendered];
  } catch {
    return [];
  }
};
