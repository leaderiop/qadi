/**
 * Run one policy against many variations of one input, and say what each changed.
 *
 * The question is never "did the verdict flip" — that is one boolean the caller
 * already has — but **which node flipped it**, and `diffTraces` already answers
 * that node by node. So this module is the sweep and the bookkeeping around it:
 * derive the variations, run them one at a time, and pair each result with the
 * baseline it should be read against.
 *
 * **Comparison is a closed union, not a difference list plus a flag.** Four
 * things can happen across a pair of runs — both decided, the edit broke a
 * decision, the edit repaired a failure, or both failed — and only the first
 * has a trace on each side to walk. A shape carrying `differences: []` for the
 * other three would report *no difference* for an edit that turned an allow
 * into an outage, which is the inversion INV-QD-006 exists to prevent.
 *
 * **Every row is one sealed evaluation.** `simulate` provides its own sink and
 * cache, so a forty-row sweep writes nothing and caches nothing; that property
 * is what makes running a sweep from a debug panel defensible at all, and it is
 * asserted rather than assumed.
 */
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Match from "effect/Match";
import { diffTraces } from "@qadi/core";
import type {
  Decision,
  DecisionOutcome,
  EvaluationError,
  Policy,
  TraceDifference,
  VerdictChanged,
} from "@qadi/core";
import { pairEdits, singleEdits } from "./Edits.ts";
import type { SkippedRemedy } from "./Remedies.ts";
import { remedyEdits } from "./Remedies.ts";
import { simulate } from "./Simulation.ts";
import type { SimulationOptions } from "./Simulation.ts";
import type { SimulationEdit } from "./SimulationEdit.ts";
import type { SimulationInput } from "./SimulationInput.ts";
import { causesIO, fixtures } from "./Sources.ts";

/** Both runs decided, so the two traces can be walked against each other. */
export interface Compared {
  readonly _tag: "Compared";
  readonly differences: ReadonlyArray<TraceDifference>;
  /** The outermost node whose verdict turned, if one did. */
  readonly flipped: VerdictChanged | undefined;
}

/**
 * The baseline decided and the edit did not.
 *
 * Reported as its own case and rendered as an error, never as a denial: an edit
 * that makes a resolver unreachable has not shown that the subject would be
 * refused, it has shown that nothing could be decided.
 */
export interface BecameError {
  readonly _tag: "BecameError";
  readonly error: EvaluationError;
}

/** The baseline failed and the edit decided — the edit removed whatever broke. */
export interface Recovered {
  readonly _tag: "Recovered";
  readonly decision: Decision;
}

/**
 * Neither run decided.
 *
 * `same` compares the two errors structurally, which `Data.TaggedError` supports
 * per field: a different failure is a real finding (the edit moved the outage
 * from one port to another) and reporting it as *no change* would hide it.
 */
export interface StillFailed {
  readonly _tag: "StillFailed";
  readonly before: EvaluationError;
  readonly after: EvaluationError;
  readonly same: boolean;
}

export type Comparison = Compared | BecameError | Recovered | StillFailed;

/**
 * The baseline against the edited run.
 *
 * Both arguments are outcomes rather than decisions, so a sweep whose baseline
 * itself failed still runs and still reports every row — against *no* trace,
 * and saying so. Refusing to sweep in that case would withhold the answer
 * exactly when the reviewer most needs it: a failing baseline is what they came
 * to the screen about.
 */
export const compareOutcomes = (baseline: DecisionOutcome, edited: DecisionOutcome): Comparison => {
  if (baseline._tag === "Failed") {
    return edited._tag === "Failed"
      ? {
          _tag: "StillFailed",
          before: baseline.error,
          after: edited.error,
          same: Equal.equals(baseline.error, edited.error),
        }
      : { _tag: "Recovered", decision: edited.decision };
  }
  if (edited._tag === "Failed") return { _tag: "BecameError", error: edited.error };

  const differences = diffTraces(baseline.decision.trace, edited.decision.trace);
  return {
    _tag: "Compared",
    differences,
    flipped: differences.find((d): d is VerdictChanged => d._tag === "VerdictChanged"),
  };
};

/**
 * True when the edit made any difference at all.
 *
 * Broader than "the verdict flipped": a narrowed field set and a dropped duty
 * are both real changes to what a caller may do, and INV-QD-004 makes the first
 * of those a change a reviewer would act on.
 */
export const isChanged: (self: Comparison) => boolean = Match.type<Comparison>().pipe(
  Match.tagsExhaustive({
    Compared: (c) => c.differences.length > 0,
    BecameError: () => true,
    Recovered: () => true,
    StillFailed: (c) => !c.same,
  }),
);

export interface WhatIfOptions extends SimulationOptions {
  /**
   * Edits to run instead of the derived ones.
   *
   * Supplying these skips derivation entirely — including the remedies, which
   * would otherwise be silently appended to a list the caller thought was
   * theirs. `pairs` still applies, over what was supplied.
   */
  readonly edits?: ReadonlyArray<SimulationEdit>;
  /** Drop each grant in turn. Default on. */
  readonly weakenings?: boolean;
  /** Supply each requirement the policy names. Default on. */
  readonly remedies?: boolean;
  /** Every unordered pair of the first-order edits. Default **off** — see `pairEdits`. */
  readonly pairs?: boolean;
  readonly maxPairs?: number;
}

export interface SweepPlan {
  readonly edits: ReadonlyArray<SimulationEdit>;
  /** Requirements no remedy could be built for, with the reason. */
  readonly skipped: ReadonlyArray<SkippedRemedy>;
  /** Pairs the cap excluded. Stated rather than truncated in silence. */
  readonly omittedPairs: number;
  /** Rows plus the baseline — what the sweep will actually run. */
  readonly evaluations: number;
  /** Whether running it performs I/O, so the panel can warn *before* it does. */
  readonly causesIO: boolean;
}

/**
 * What a sweep would do, without doing it.
 *
 * Separate from `whatIf` so a panel can put "this will run 41 evaluations
 * against your live resolvers" in front of the reviewer rather than behind
 * them. A count discovered afterwards is not a warning.
 */
export const sweepPlan = (
  policy: Policy,
  input: SimulationInput,
  options?: WhatIfOptions,
): SweepPlan => {
  const derived = derive(policy, input, options);
  const paired =
    options?.pairs === true
      ? pairEdits(derived.edits, options.maxPairs)
      : { pairs: [], omitted: 0 };
  const edits = [...derived.edits, ...paired.pairs];

  return {
    edits,
    skipped: derived.skipped,
    omittedPairs: paired.omitted,
    // The baseline is an evaluation too, and a panel that omitted it from the
    // count would understate a live sweep by exactly one round trip.
    evaluations: edits.length + 1,
    causesIO: causesIO(options?.source ?? fixtures),
  };
};

const derive = (
  policy: Policy,
  input: SimulationInput,
  options: WhatIfOptions | undefined,
): { readonly edits: ReadonlyArray<SimulationEdit>; readonly skipped: ReadonlyArray<SkippedRemedy> } => {
  if (options?.edits !== undefined) return { edits: options.edits, skipped: [] };

  const weakenings = options?.weakenings === false ? [] : singleEdits(input);
  if (options?.remedies === false) return { edits: weakenings, skipped: [] };

  const remedies = remedyEdits(policy, input);
  return { edits: [...weakenings, ...remedies.edits], skipped: remedies.skipped };
};

export interface WhatIfRow {
  readonly edit: SimulationEdit;
  /** The edited input, so a panel can show it or promote it to the form. */
  readonly input: SimulationInput;
  readonly outcome: DecisionOutcome;
  readonly comparison: Comparison;
}

export interface WhatIfReport extends SweepPlan {
  readonly baseline: DecisionOutcome;
  readonly rows: ReadonlyArray<WhatIfRow>;
}

/**
 * The whole sweep: the baseline, then one row per edit.
 *
 * **Sequential**, which is `Effect.forEach`'s default and is load-bearing under
 * `Live`: a debug panel that fires forty concurrent lookups at a production
 * store is a denial of service with a friendly name. Under `Fixtures` and
 * `Snapshot` nothing leaves the process, so the only cost of running them in
 * order is that they run in order.
 *
 * Row order is the plan's order, which is derived from the input's — so the
 * same input sweeps to the same rows in the same places, and two sweeps can be
 * read side by side.
 */
export const whatIf = (
  policy: Policy,
  input: SimulationInput,
  options?: WhatIfOptions,
): Effect.Effect<WhatIfReport> =>
  Effect.gen(function* () {
    const plan = sweepPlan(policy, input, options);
    const baseline = yield* simulate(policy, input, options);

    const rows = yield* Effect.forEach(plan.edits, (edit) =>
      Effect.gen(function* () {
        const edited = edit.apply(input);
        const outcome = yield* simulate(policy, edited, options);
        return {
          edit,
          input: edited,
          outcome,
          comparison: compareOutcomes(baseline, outcome),
        };
      }),
    );

    return { ...plan, baseline, rows };
  });

/** The rows that made a difference — usually the only ones worth showing first. */
export const changedRows = (self: WhatIfReport): ReadonlyArray<WhatIfRow> =>
  self.rows.filter((row) => isChanged(row.comparison));
