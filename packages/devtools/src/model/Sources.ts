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
 * **All three are sealed the same way.** The seal lives in `simulationLayer`,
 * not here: `CurrentSubject`, `DecisionSink` and `DecisionCache` are supplied
 * there in every mode, so no source — `Live` included — can reach the subject a
 * request would use, write a record, or touch the application's cache.
 */
import * as Layer from "effect/Layer";
import * as Match from "effect/Match";
import {
  attributeResolverFromRecord,
  AttributeResolverNone,
  decisionHistoryFromEvents,
  DecisionHistoryUnknown,
  relationshipResolverFromEdges,
  RelationshipResolverNever,
} from "@qadi/core";
import type { CapturedAnswers } from "./Capture.ts";
import { replayLayer } from "./Capture.ts";
import type { EvaluationPorts, SimulationInput } from "./SimulationInput.ts";

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
 * devtools panel would be a strange trade. The defaults are the same
 * fail-closed ones a real deployment gets when a port is left unwired, so a
 * simulation with no fixtures denies for exactly the reason a real evaluation
 * would.
 */
const fixtureLayer = (input: SimulationInput): Layer.Layer<EvaluationPorts> =>
  Layer.mergeAll(
    input.attributes === undefined
      ? AttributeResolverNone
      : attributeResolverFromRecord(input.attributes),
    input.relationships === undefined
      ? RelationshipResolverNever
      : relationshipResolverFromEdges(input.relationships),
    input.history === undefined
      ? DecisionHistoryUnknown
      : decisionHistoryFromEvents(input.history),
  );
