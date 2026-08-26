/**
 * Which implementation is behind each port, and whether anything ever reached it.
 *
 * Two facts that look like one and are opposite problems: an attribute store
 * that is *wired but never consulted* and one that is *not wired at all* both
 * show up as an empty screen. `name` answers the first, and the port metrics
 * answer the second.
 *
 * **"Unwired" is a misnomer for seven of the nine services** and this module
 * refuses to use the word for them. `AttributeResolver`, `RelationshipResolver`,
 * `DecisionHistory`, `EvaluationId`, `CustomPredicate`, `SignatureHistory` and
 * `CurrentSubject` are in `EvaluationServices`: a program that has not
 * provided them does not run, so what a card can truthfully report is that
 * one is *defaulted to a fail-closed implementation*
 * ([INV-QD-007](../../../../spec/invariants.md#inv-qd-007-defaults-fail-closed)).
 * `DecisionCache` and `DecisionSink` are the only two genuinely optional ones.
 */
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import {
  AttributeResolver,
  CurrentSubject,
  CustomPredicate,
  DecisionCache,
  DecisionHistory,
  DecisionSink,
  EvaluationId,
  portCallsTotal,
  portRetriesTotal,
  RelationshipResolver,
  SignatureHistory,
} from "@qadi/core";

export interface PortReport {
  readonly port: string;
  /**
   * The implementation's own name, when it declares one.
   *
   * `undefined` is **unnamed**, never unwired: a service value is an anonymous
   * object literal unless its author set `name`, and most are.
   */
  readonly name: string | undefined;
  /** In `EvaluationServices`, so a program cannot run without it. */
  readonly required: boolean;
  readonly present: boolean;
  /** What it means for this one to be defaulted or absent. */
  readonly consequence: string;
}

export interface CacheReport {
  readonly present: boolean;
  /** Completed entries held. Absent when no cache is wired. */
  readonly size: number | undefined;
}

export interface WiringReport {
  readonly ports: ReadonlyArray<PortReport>;
  readonly cache: CacheReport;
}

/**
 * Reads the ports out of whatever layer the caller provides it.
 *
 * `R` is `never` — every read goes through `Effect.serviceOption`, so this runs
 * with the application's layer, with a partial one, or with nothing at all, and
 * reports what it found either way. A devtools panel that could only run inside
 * a fully-wired program would be unavailable exactly when a wiring question
 * arises.
 */
export const wiringReport: Effect.Effect<WiringReport> = Effect.gen(function* () {
  const attribute = yield* Effect.serviceOption(AttributeResolver);
  const relationship = yield* Effect.serviceOption(RelationshipResolver);
  const history = yield* Effect.serviceOption(DecisionHistory);
  const ids = yield* Effect.serviceOption(EvaluationId);
  const custom = yield* Effect.serviceOption(CustomPredicate);
  const subject = yield* Effect.serviceOption(CurrentSubject);
  const signature = yield* Effect.serviceOption(SignatureHistory);
  const cache = yield* Effect.serviceOption(DecisionCache);
  const sink = yield* Effect.serviceOption(DecisionSink);

  const size = Option.isSome(cache) ? yield* cache.value.size : undefined;

  return {
    ports: [
      required("AttributeResolver", nameOf(attribute), Option.isSome(attribute),
        "a missing attribute resolves to undefined, so an attribute policy denies"),
      required("RelationshipResolver", nameOf(relationship), Option.isSome(relationship),
        "an unanswered relationship denies"),
      required("DecisionHistory", nameOf(history), Option.isSome(history),
        "the three-valued default denies hasActed and hasNotActed alike"),
      required("EvaluationId", nameOf(ids), Option.isSome(ids),
        "identifiers correlate a decision with its trace; nothing else depends on them"),
      required("CustomPredicate", nameOf(custom), Option.isSome(custom),
        "every hasCustom node denies, since no registered predicate can be reached"),
      required("SignatureHistory", nameOf(signature), Option.isSome(signature),
        "an unwired signature history answers no signatures on file, so every hasSignature node denies"),
      required("CurrentSubject", undefined, Option.isSome(subject),
        "supplied per request, so its absence here says nothing about the application"),
      optional("DecisionCache", Option.isSome(cache),
        "every evaluation is computed; a hit and a miss would decide identically"),
      optional("DecisionSink", Option.isSome(sink),
        "decisions are made and not observed, so this panel has no log to read"),
    ],
    cache: { present: Option.isSome(cache), size },
  };
});

export interface PortActivity {
  readonly port: string;
  readonly calls: number;
  readonly retries: number;
}

/**
 * How often each port was actually reached, read **passively**.
 *
 * `Metric`'s default registry is memoised on the reference, so this needs no
 * wiring at all — the one Effect signal a reader can take without the
 * application having arranged anything. That is why `PortMetrics` counts
 * aggregates rather than emitting a record per call: a per-call record would
 * need a sink wired, and would put a write on the evaluation's hot path for a
 * debug view.
 *
 * The counts are **process-wide aggregates**, not per request and not per
 * decision. A panel that implied otherwise would be inviting a reader to
 * attribute one number to one row.
 */
export const portActivity: Effect.Effect<ReadonlyArray<PortActivity>> = Effect.gen(function* () {
  // `Metric.value` rather than a scan of `Metric.snapshot` for the two ids.
  // The scan needed a `type === "Frequency"` guard to narrow the snapshot
  // union, and that guard can never fail at runtime — two metrics cannot share
  // an id — so the mutation gate reported it as unkillable. Reading the metric
  // this module already holds a reference to asks the same question with no
  // branch in it.
  const calls = yield* Metric.value(portCallsTotal);
  const retries = yield* Metric.value(portRetriesTotal);

  const ports = new Set([...calls.occurrences.keys(), ...retries.occurrences.keys()]);
  return [...ports].map((port) => ({
    port,
    calls: calls.occurrences.get(port) ?? 0,
    retries: retries.occurrences.get(port) ?? 0,
  }));
});

const nameOf = (service: Option.Option<{ readonly name?: string | undefined }>): string | undefined =>
  Option.isSome(service) ? service.value.name : undefined;

const required = (
  port: string,
  name: string | undefined,
  present: boolean,
  consequence: string,
): PortReport => ({ port, name, required: true, present, consequence });

const optional = (port: string, present: boolean, consequence: string): PortReport => ({
  port,
  name: undefined,
  required: false,
  present,
  consequence,
});
