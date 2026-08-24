/**
 * Seed a simulation from a logged decision, and check the reconstruction against it.
 *
 * This is what turns the simulator from a scratchpad into an investigation
 * tool. On its own a what-if answers a hypothetical; seeded from a real row it
 * answers **"was it these grants?"** — the reviewer types what they believe the
 * subject held, replays, and the diff says whether that belief reproduces what
 * actually happened.
 *
 * **The log is already the snapshot.** A `DecisionRecord` carries the real
 * `Trace`, so checking a reconstruction against reality needs no live resolvers
 * and no captured answers — the thing to compare against is in hand. That is
 * why this module runs nothing: it produces an input, and it compares two
 * outcomes.
 *
 * **What a record cannot seed is the interesting half.** It names the subject
 * by id and carries nothing else about them, and it carries what the ports
 * answered only *inside* the trace, never as fixtures a rerun could use. So the
 * reviewer supplies the grants, which is exactly the question they came with —
 * but the screen has to say so, or a form that filled itself in reads as a
 * faithful reproduction when half of it was guessed
 * ([INV-QD-043](../../../../spec/invariants.md) is the neighbouring property
 * for captures).
 */
import type { DecisionOutcome, Policy } from "@qadi/core";
import { inspect, isTruncated } from "./Inspect.ts";
import type { SimulationInput } from "./SimulationInput.ts";
import type { TimelineEntry } from "./Timeline.ts";
import type { Comparison } from "./WhatIf.ts";
import { compareOutcomes, isChanged } from "./WhatIf.ts";

/** A part of the form a replay leaves for the reviewer, and why it had to. */
export interface UnseededField {
  readonly field: string;
  readonly reason: string;
}

/**
 * Named once and shared, because these two sentences are the whole of what
 * replay cannot do and repeating them per field would let them drift apart.
 */
const NOTHING_BUT_AN_ID = "a record names the subject by id and carries nothing else about them";
const ANSWERS_NOT_FIXTURES =
  "a record carries what the ports answered inside its trace, never as fixtures a rerun could use";

/**
 * Everything a replayed row leaves blank.
 *
 * Per field rather than in two sentences, so a form can badge each section it
 * could not fill rather than printing one paragraph nobody maps back to the
 * inputs in front of them.
 */
export const unseededByReplay: ReadonlyArray<UnseededField> = [
  { field: "roles", reason: NOTHING_BUT_AN_ID },
  { field: "permissions", reason: NOTHING_BUT_AN_ID },
  { field: "subject attributes", reason: NOTHING_BUT_AN_ID },
  { field: "resolver attributes", reason: ANSWERS_NOT_FIXTURES },
  { field: "relationships", reason: ANSWERS_NOT_FIXTURES },
  { field: "history", reason: ANSWERS_NOT_FIXTURES },
];

/**
 * The subject id is missing too when the logged evaluation never decided.
 *
 * `subjectId` lives on the `Decision`, so a `Failed` row carries no subject at
 * all. The row is still worth replaying — reproducing an outage is a real thing
 * to want — so this is one more blank rather than a refusal.
 */
const UNSEEDED_SUBJECT_ID: UnseededField = {
  field: "subject id",
  reason: "the evaluation failed before deciding, and the id lives on the decision",
};

export type Replay =
  | {
      readonly _tag: "Replayable";
      readonly evaluationId: string;
      readonly policy: Policy;
      readonly input: SimulationInput;
      readonly unseeded: ReadonlyArray<UnseededField>;
    }
  | { readonly _tag: "NotReplayable"; readonly reason: string };

/**
 * The policy, action and resource of a logged row, as a simulation input.
 *
 * An orphan is refused rather than replayed as an empty form: it is an
 * obligation outcome whose decision never arrived, so there is no policy on it
 * and nothing to run.
 */
export const replayInput = (entry: TimelineEntry): Replay => {
  if (entry._tag !== "TimelineDecision") {
    return {
      _tag: "NotReplayable",
      reason: "this row is an obligation outcome with no decision on it, so it carries no policy",
    };
  }

  const decision = entry.decision;
  const outcome = decision.outcome;
  const subjectId = outcome._tag === "Decided" ? outcome.decision.subjectId : "";

  return {
    _tag: "Replayable",
    evaluationId: entry.evaluationId,
    policy: decision.policy,
    input: {
      subject: { id: subjectId },
      ...(decision.action === undefined ? {} : { action: decision.action }),
      ...(decision.resource === undefined ? {} : { resource: decision.resource }),
    },
    unseeded:
      outcome._tag === "Decided"
        ? unseededByReplay
        : [UNSEEDED_SUBJECT_ID, ...unseededByReplay],
  };
};

/** Why a comparison against a logged row cannot be taken at face value. */
export type BaselineCaveat =
  | { readonly _tag: "TraceUndisclosed"; readonly reason: string }
  | { readonly _tag: "BaselineFailed"; readonly reason: string };

export type Baseline =
  | { readonly _tag: "Unavailable"; readonly reason: string }
  | {
      readonly _tag: "Checked";
      readonly evaluationId: string;
      readonly comparison: Comparison;
      /** Absent when the record can attest to the comparison outright. */
      readonly caveat: BaselineCaveat | undefined;
    };

/**
 * The reconstruction against the row it was seeded from.
 *
 * The comparison itself is `compareOutcomes` — the same four cases a what-if
 * row gets, because they are the same four things that can happen across a pair
 * of runs. What this adds is **whether the record can attest to it**, which a
 * what-if never has to ask: its baseline is a run this process just made, and a
 * logged one may be a reduced payload or a failure that produced no trace at
 * all.
 */
export const baselineDiff = (entry: TimelineEntry, simulated: DecisionOutcome): Baseline => {
  if (entry._tag !== "TimelineDecision") {
    return { _tag: "Unavailable", reason: "an orphan carries no decision to compare against" };
  }

  const decision = entry.decision;
  return {
    _tag: "Checked",
    evaluationId: entry.evaluationId,
    comparison: compareOutcomes(decision.outcome, simulated),
    caveat: caveatOf(decision.policy, decision.outcome),
  };
};

const caveatOf = (policy: Policy, outcome: DecisionOutcome): BaselineCaveat | undefined => {
  if (outcome._tag === "Failed") {
    return {
      _tag: "BaselineFailed",
      reason: "the logged evaluation failed, so it produced no trace to compare against",
    };
  }
  return isTruncated(inspect(policy, outcome.decision.trace))
    ? {
        _tag: "TraceUndisclosed",
        // The difference `diffTraces` reports here is a child count of zero
        // against a full tree — a disclosure boundary showing up as a shape
        // change, which reads as behavioural to anybody not told otherwise.
        reason:
          "the logged trace stops at the root, so any difference below it is a disclosure boundary rather than a change",
      }
    : undefined;
};

/**
 * True only when the record can attest that the reconstruction reproduces it.
 *
 * Strict about the caveat on purpose: a truncated baseline or a failed one
 * cannot vouch for agreement it never recorded, so this claims nothing rather
 * than claiming a match. That is the difference between *no difference found*
 * and *no difference to find*, and only the first is worth a green tick.
 */
export const matchesBaseline = (self: Baseline): boolean =>
  self._tag === "Checked" && self.caveat === undefined && !isChanged(self.comparison);
