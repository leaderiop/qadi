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
import { describeTracePath, inspect, isTruncated } from "./Inspect.ts";
import type { SimulationField } from "./SimulationFields.ts";
import { FIELD_ORDER, SIMULATION_FIELDS, unseededReason } from "./SimulationFields.ts";
import type { SimulationInput } from "./SimulationInput.ts";
import type { TimelineEntry } from "./Timeline.ts";
import type { Comparison } from "./WhatIf.ts";
import { compareOutcomes, isChanged } from "./WhatIf.ts";

/** A part of the form a replay leaves for the reviewer, and why it had to. */
export interface UnseededField {
  /** The field, as a host can key on it without reading prose. */
  readonly key: SimulationField;
  /** The caption the form shows that field under. */
  readonly field: string;
  readonly reason: string;
}

/**
 * Everything a replayed row leaves blank.
 *
 * Per field rather than in two sentences, so a form can badge each section it
 * could not fill rather than printing one paragraph nobody maps back to the
 * inputs in front of them. Derived from the field table (`SimulationFields.ts`):
 * the name is the label the form shows, the order is the form's, and the reason
 * is selected by who answers the field.
 */
export const unseededByReplay: ReadonlyArray<UnseededField> = FIELD_ORDER.map((key) => ({
  key,
  field: SIMULATION_FIELDS[key].label,
  reason: unseededReason(SIMULATION_FIELDS[key].answeredBy),
}));

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

  return {
    _tag: "Replayable",
    evaluationId: entry.evaluationId,
    policy: decision.policy,
    input: {
      // `subjectId` is top-level on `DecisionRecord`, for both outcomes
      // (`DecisionRecord.ts`) — a `Failed` row names its subject exactly as a
      // `Decided` one does, so there is nothing to default here.
      subject: { id: decision.subjectId },
      ...(decision.action === undefined ? {} : { action: decision.action }),
      ...(decision.resource === undefined ? {} : { resource: decision.resource }),
    },
    unseeded: unseededByReplay,
  };
};

/** Why a comparison against a logged row cannot be taken at face value. */
export type BaselineCaveat =
  | { readonly _tag: "TraceUndisclosed"; readonly reason: string }
  | { readonly _tag: "BaselineFailed"; readonly reason: string };

/** A baseline in one line, with the one bit a view colours it by. */
export interface BaselineReading {
  readonly matches: boolean;
  readonly sentence: string;
}

export type Baseline =
  | { readonly _tag: "Unavailable"; readonly reason: string }
  | {
      readonly _tag: "Checked";
      readonly evaluationId: string;
      readonly comparison: Comparison;
      /** Absent when the record can attest to the comparison outright. */
      readonly caveat: BaselineCaveat | undefined;
      /** The comparison in one line, and whether it reproduces the row; decided once, here. */
      readonly reading: BaselineReading;
    };

/** The part of a checked baseline its reading is read from. */
type Compared = Pick<Extract<Baseline, { _tag: "Checked" }>, "comparison" | "caveat">;

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
  const compared: Compared = {
    comparison: compareOutcomes(decision.outcome, simulated),
    caveat: caveatOf(decision.policy, decision.outcome),
  };
  return { _tag: "Checked", evaluationId: entry.evaluationId, ...compared, reading: readBaseline(compared) };
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
export const matchesBaseline = (self: Baseline): boolean => self._tag === "Checked" && reproduces(self);

const reproduces = (self: Compared): boolean => self.caveat === undefined && !isChanged(self.comparison);

/**
 * What differed, in one line.
 *
 * The `Compared` arm names the outermost node whose verdict turned when one did,
 * because "the verdict flipped" is a boolean the reader already has and "at
 * which node" is the thing they came for.
 */
const summarise = (baseline: Compared): string => {
  const comparison = baseline.comparison;
  if (comparison._tag === "BecameError") {
    return `this reconstruction failed with ${comparison.error._tag} where the logged one decided`;
  }
  if (comparison._tag === "Recovered") {
    return "this reconstruction decided where the logged one failed";
  }
  if (comparison._tag === "StillFailed") {
    return comparison.same
      ? `the same failure, ${comparison.after._tag}`
      : `a different failure: ${comparison.before._tag} then, ${comparison.after._tag} now`;
  }
  const flipped = comparison.flipped;
  if (flipped !== undefined) {
    return `differs — ${flipped.policyTag} at ${describeTracePath(flipped.path)} was ${
      flipped.before ? "allowed" : "denied"
    } and is now ${flipped.after ? "allowed" : "denied"}`;
  }
  return `differs at ${String(comparison.differences.length)} node${
    comparison.differences.length === 1 ? "" : "s"
  }, with the same verdict`;
};

/**
 * Reads a comparison: whether the reconstruction reproduces the row, and the
 * sentence that says so.
 *
 * The sentence was the Simulator's, computed on every render outside the
 * mutation gate (ARCH-73); it is here so that what a reviewer is told about a
 * reconstruction is decided once, under test.
 */
const readBaseline = (self: Compared): BaselineReading => {
  const matches = reproduces(self);
  return {
    matches,
    sentence: matches ? "matches — this reconstruction reproduces the logged decision" : summarise(self),
  };
};
