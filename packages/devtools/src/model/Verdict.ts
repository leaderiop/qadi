/**
 * What a row says happened — in **four** classes, not two.
 *
 * This is the vocabulary rule the whole tool rests on, and getting it wrong is
 * the one UI defect that becomes a security misreading. An `EvaluationError` is
 * not a denial ([INV-QD-006](../../../../spec/invariants.md)): the attribute
 * store was unreachable, so *no verdict exists*. A reviewer who reads that row
 * as `DENY` concludes their policy is working when in fact it never ran.
 *
 * The predecessor collapsed the two, which is why `Failed` exists as its own
 * variant of `DecisionOutcome` rather than as a `Deny` with a reason.
 */
import * as Match from "effect/Match";
import { isAllowed } from "@qadi/core";
import type { DecisionOutcome } from "@qadi/core";
import type { TimelineEntry } from "./Timeline.ts";

/**
 * `Unknown` is not a fourth verdict so much as the absence of one: an
 * obligation outcome whose decision never arrived has no verdict to show, and
 * rendering it as anything else would invent a fact.
 */
export type Verdict = "Allow" | "Deny" | "Error" | "Unknown";

/**
 * The verdict of an outcome that is in hand — a simulated one, say, which
 * belongs to no timeline row.
 *
 * `as const` on each arm because `Match.tagsExhaustive` widens a bare literal to
 * `string`, and the annotation on the const would then reject the whole matcher
 * rather than the arm that widened. The same shape `SinkCodec`'s `encodeError`
 * uses.
 */
export const verdictOfOutcome: (outcome: DecisionOutcome) => Verdict = Match.type<
  DecisionOutcome
>().pipe(
  Match.tagsExhaustive({
    Decided: (o) => (isAllowed(o.decision) ? ("Allow" as const) : ("Deny" as const)),
    Failed: () => "Error" as const,
  }),
);

export const verdictOf: (entry: TimelineEntry) => Verdict = Match.type<TimelineEntry>().pipe(
  Match.tagsExhaustive({
    TimelineDecision: (entry) => verdictOfOutcome(entry.decision.outcome),
    TimelineOrphan: () => "Unknown" as const,
  }),
);

/**
 * Counts for the header.
 *
 * Errors are counted apart from denials rather than folded into them, for the
 * reason above: a header reading "40 decisions, 0 denies" while every lookup is
 * failing is worse than no header.
 */
export interface Counts {
  readonly decisions: number;
  readonly allows: number;
  readonly denies: number;
  readonly errors: number;
  /** Outcomes with no decision to attach to. */
  readonly orphans: number;
}

export const countsOf = (entries: ReadonlyArray<TimelineEntry>): Counts => {
  const of = (verdict: Verdict) => entries.filter((e) => verdictOf(e) === verdict).length;
  const allows = of("Allow");
  const denies = of("Deny");
  const errors = of("Error");
  return {
    // Decisions, not rows: an orphan is an outcome without one.
    decisions: allows + denies + errors,
    allows,
    denies,
    errors,
    orphans: of("Unknown"),
  };
};
