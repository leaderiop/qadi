/**
 * Where a simulated evaluation's answers come from.
 *
 * Three modes, and the middle one is why all three exist:
 *
 * | Source     | Answers from                | A sweep of N edits costs |
 * | ---------- | --------------------------- | ------------------------ |
 * | `Fixtures` | data the reviewer typed     | N in-memory folds        |
 * | `Snapshot` | real answers captured once  | 1 live run + N folds     |
 * | `Live`     | the application's resolvers | N live sweeps            |
 *
 * A what-if sweep runs one evaluation *per edit*, so a subject with six grants
 * is seven evaluations from one click. Against `Live` that is a burst of round
 * trips from a debug panel; against `Snapshot` it is one real run and six folds
 * over what that run learned. `Snapshot` is therefore the mode a sweep should
 * use, and building it is what makes offering `Live` at all defensible.
 *
 * **All three are sealed the same way.** The seal is stated in `simulationLayer`,
 * not here: it supplies `CurrentSubject` and asks core's `evaluationEnvironment`
 * for `shadow: "sinkAndCache"`, which installs the discarding sink and a private
 * cache in every mode, so no source — `Live` included — can reach the subject a
 * request would use, write a record, or touch the application's cache.
 */
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import { fixturePortsLayer } from "@qadi/core";
import type { PortFixtureData, PortName } from "@qadi/core";
import type { CapturedAnswers } from "./Capture.ts";
import { capturing, replayLayer } from "./Capture.ts";
import type { FixtureCell } from "./SimulationFields.ts";
import { FIXTURE_DATA, fixtureData } from "./SimulationFields.ts";
import type { EvaluationPorts, EvaluationPortsLayer, SimulationInput } from "./SimulationInput.ts";

/** Answers typed by the reviewer. The default, and the only one that needs nothing. */
export interface FixtureSource {
  readonly _tag: "Fixtures";
}

/** Answers a real layer gave once, captured and replayed. */
export interface SnapshotSource {
  readonly _tag: "Snapshot";
  readonly answers: CapturedAnswers;
}

/**
 * The application's own resolvers.
 *
 * `CurrentSubject` and `EvaluationId` are excluded by the type, not by
 * convention — see `EvaluationPorts`. An application author constructs this
 * deliberately; nothing in `SimulationInput` can produce one.
 */
export interface LiveSource {
  readonly _tag: "Live";
  readonly ports: Layer.Layer<EvaluationPorts>;
}

export type SimulationSource = FixtureSource | SnapshotSource | LiveSource;

export const fixtures: FixtureSource = { _tag: "Fixtures" };

export const snapshot = (answers: CapturedAnswers): SnapshotSource => ({
  _tag: "Snapshot",
  answers,
});

export const live = (ports: Layer.Layer<EvaluationPorts>): LiveSource => ({
  _tag: "Live",
  ports,
});

/**
 * True when a sweep against this source performs I/O.
 *
 * The panel warns before a sweep that does, and counts the evaluations it is
 * about to run. A reviewer clicking "what if" should not discover afterwards
 * that they issued forty lookups against production.
 */
export const causesIO: (self: SimulationSource) => boolean = Match.type<SimulationSource>().pipe(
  Match.tagsExhaustive({
    Fixtures: () => false,
    // Captured once, replayed from memory.
    Snapshot: () => false,
    Live: () => true,
  }),
);

/**
 * The ports for one run.
 *
 * A `Match` rather than a `switch`, per AGENTS.md §5a — and
 * `tagsExhaustive` rather than a default, so a fourth source is a compile error
 * at this site rather than a silent fall-through to fixtures. Falling through
 * to fixtures would be the worst possible failure here: the screen would answer
 * confidently from data nobody supplied.
 */
export const portsOf = (
  source: SimulationSource | undefined,
  input: SimulationInput,
): Layer.Layer<EvaluationPorts> =>
  source === undefined ? fixtureLayer(input) : dispatch(source)(input);

const dispatch: (self: SimulationSource) => (input: SimulationInput) => Layer.Layer<EvaluationPorts> =
  Match.type<SimulationSource>().pipe(
    Match.tagsExhaustive({
      Fixtures: () => fixtureLayer,
      Snapshot: (self) => () => replayLayer(self.answers),
      Live: (self) => () => self.ports,
    }),
  );

/**
 * Fixture-backed ports, from `@qadi/core` alone.
 *
 * Not `@qadi/testing`'s: everything needed is already public in core, and
 * shipping test fixtures into an application's production bundle to power a
 * devtools panel would be a strange trade. A port with no fixture sits at
 * the same fail-closed default a real deployment gets when a port is left
 * unwired (`portsLayer`), so a simulation with no fixtures denies for exactly
 * the reason a real evaluation would.
 */
const fixtureLayer = (input: SimulationInput): Layer.Layer<EvaluationPorts> =>
  fixturePortsLayer(setupsOf(input));

/**
 * One port's setup from the table: its fixture data as `answers`, or nothing
 * when the input holds none or the form has no vocabulary for the port.
 */
const setupOf = <K extends PortName>(
  cell: FixtureCell<K>,
  input: SimulationInput,
): { readonly answers: PortFixtureData[K] } | undefined => {
  const data = fixtureData(cell, input);
  return data === undefined ? undefined : { answers: data };
};

/**
 * Every port named, so a port added to core's registry is a missing key here and
 * in `FIXTURE_DATA` (TS2741) rather than a port the simulator silently leaves at
 * its default. Closed over `PortName`, which core's `PortFixtures` (every key
 * optional) is not. `CustomPredicate` stays unfed, and the table says why.
 */
const setupsOf = (
  input: SimulationInput,
): { readonly [K in PortName]: { readonly answers: PortFixtureData[K] } | undefined } => ({
  AttributeResolver: setupOf(FIXTURE_DATA.AttributeResolver, input),
  RelationshipResolver: setupOf(FIXTURE_DATA.RelationshipResolver, input),
  DecisionHistory: setupOf(FIXTURE_DATA.DecisionHistory, input),
  SignatureHistory: setupOf(FIXTURE_DATA.SignatureHistory, input),
  CustomPredicate: setupOf(FIXTURE_DATA.CustomPredicate, input),
});

/** Which of the three answer sources the reviewer picked. */
export type SourceChoice = SimulationSource["_tag"];

/** One source button: whether it can be used, and the sentence that says why (or why not). */
export interface SourceOption {
  readonly id: SourceChoice;
  readonly enabled: boolean;
  readonly why: string;
}

/** Why a chosen source cannot be honoured. A data state: nothing failed, the run was declined. */
export type SourceRefusal =
  | { readonly _tag: "LiveWithoutPorts"; readonly reason: string }
  | { readonly _tag: "SnapshotWithoutCapture"; readonly reason: string };

/**
 * A source a run can evaluate against.
 *
 * `captured` reads what a `Live` source's own recorder saw; it is `undefined` for
 * the two sources that record nothing.
 */
export interface ReadySource {
  readonly _tag: "Ready";
  readonly source: SimulationSource;
  readonly captured: Effect.Effect<CapturedAnswers> | undefined;
}

/** A source choice that was declined, with the reason. */
export interface RefusedSource {
  readonly _tag: "Refused";
  readonly refusal: SourceRefusal;
}

/** What a run evaluates against, or the reason it cannot. */
export type PreparedSource = ReadySource | RefusedSource;

/**
 * A source the host can have: the sentence for its button, the plain source the
 * dock describes, and how to build its run.
 */
type SourceRow =
  | {
      readonly usable: true;
      readonly why: string;
      readonly source: SimulationSource;
      readonly prepare: () => ReadySource;
    }
  | { readonly usable: false; readonly refusal: SourceRefusal };

/**
 * Every source's availability and sentence, written once.
 *
 * Closed over `SourceChoice`, so a fourth source is a missing key here (TS2741)
 * rather than a button the dock offers and nothing answers.
 */
const rowsOf = (have: {
  readonly ports: EvaluationPortsLayer | undefined;
  readonly capture: CapturedAnswers | undefined;
}): { readonly [K in SourceChoice]: SourceRow } => {
  const { ports, capture } = have;
  return {
    Fixtures: {
      usable: true,
      why: "answers you typed below",
      source: fixtures,
      prepare: () => ({ _tag: "Ready", source: fixtures, captured: undefined }),
    },
    Snapshot:
      capture === undefined
        ? {
            usable: false,
            refusal: {
              _tag: "SnapshotWithoutCapture",
              reason: "run once against Live first; this replays what that run learned",
            },
          }
        : {
            usable: true,
            why: "real answers, captured once and replayed — one round of I/O for a whole sweep",
            source: snapshot(capture),
            prepare: () => ({ _tag: "Ready", source: snapshot(capture), captured: undefined }),
          },
    Live:
      ports === undefined
        ? {
            usable: false,
            refusal: {
              _tag: "LiveWithoutPorts",
              reason: "the host did not pass a `ports` layer, so this panel cannot reach any resolver",
            },
          }
        : {
            usable: true,
            why: "the application's own resolvers — every row is real I/O",
            source: live(ports),
            prepare: () => {
              const recorder = capturing(ports);
              return { _tag: "Ready", source: live(recorder.layer), captured: recorder.answers };
            },
          },
  };
};

/**
 * The order the buttons are shown in, closed over `SourceChoice` like `rowsOf`: a
 * fourth source is a missing key here too (TS2741), and a source cannot appear twice.
 * Property order is the display order.
 */
const SOURCE_ORDER: ReadonlyArray<SourceChoice> = Object.values<SourceChoice>({
  Fixtures: "Fixtures",
  Snapshot: "Snapshot",
  Live: "Live",
} satisfies { readonly [K in SourceChoice]: K });

/** The three buttons, in display order, each with its sentence. */
const optionsOf = (rows: { readonly [K in SourceChoice]: SourceRow }): ReadonlyArray<SourceOption> =>
  SOURCE_ORDER.map((id) => {
    const row = rows[id];
    return row.usable
      ? { id, enabled: true, why: row.why }
      : { id, enabled: false, why: row.refusal.reason };
  });

/**
 * Turns a source choice into what a run evaluates against, or the reason it cannot.
 *
 * Never a fall back to fixtures: `portsOf` treats an absent source as fixtures,
 * which is the right default for a caller who never chose and the wrong answer
 * for one who chose `Live` and is entitled to know it did not happen.
 *
 * A `Live` run captures, which is what makes `Snapshot` available: the answers
 * cost nothing extra to record and they are what makes `Snapshot` reachable, the
 * mode a sweep should use, one round of I/O instead of one per edit. So a `Ready`
 * `Live` source is the application's ports wrapped in a fresh recorder, and each
 * call makes its own: a run never reuses a preparation.
 */
export const prepareSource = (
  choice: SourceChoice,
  have: {
    readonly ports: EvaluationPortsLayer | undefined;
    readonly capture: CapturedAnswers | undefined;
  },
): PreparedSource => {
  const chosen = rowsOf(have)[choice];
  return chosen.usable ? chosen.prepare() : { _tag: "Refused", refusal: chosen.refusal };
};

/**
 * What the dock shows for a source choice: its options, the refusal if it cannot be
 * had, and the chosen source as the host gave it.
 *
 * Enough for `causesIO`; a run needs `prepareSource`, which builds a recorder.
 * The three options are offered and disabled with a reason, never removed: a control
 * that disappears teaches nobody it exists, which matters most for `Snapshot`.
 */
export interface SourceDescription {
  readonly options: ReadonlyArray<SourceOption>;
  readonly refusal: SourceRefusal | undefined;
  readonly source: SimulationSource | undefined;
}

/** Describes a source choice without running it. */
export const describeSource = (
  choice: SourceChoice,
  have: {
    readonly ports: EvaluationPortsLayer | undefined;
    readonly capture: CapturedAnswers | undefined;
  },
): SourceDescription => {
  const rows = rowsOf(have);
  const chosen = rows[choice];
  return {
    options: optionsOf(rows),
    refusal: chosen.usable ? undefined : chosen.refusal,
    source: chosen.usable ? chosen.source : undefined,
  };
};
