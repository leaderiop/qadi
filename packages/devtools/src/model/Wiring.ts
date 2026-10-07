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
  CurrentSubject,
  DecisionCache,
  DecisionSink,
  EvaluationId,
  forEveryPort,
  portCallsTotal,
  portRetriesTotal,
  portTimeoutsTotal,
  predicatePortCallsTotal,
} from "@qadi/core";
import type { PortName } from "@qadi/core";

/**
 * Every row of the wiring report: the five ports of the registry, and the four
 * services that are not ports (`EvaluationId`, `CurrentSubject`, `DecisionCache`,
 * `DecisionSink` — no request, no typed failure, or optional).
 */
export type WiredServiceName =
  | PortName
  | "EvaluationId"
  | "CurrentSubject"
  | "DecisionCache"
  | "DecisionSink";

export interface PortReport {
  readonly port: WiredServiceName;
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
  /**
   * Whether this port is its description's fail-closed default, or a wrapper
   * around it (`"<default> (retrying)"`, BEH-QD-196's naming contract).
   *
   * `undefined` when there is nothing to say: the port is absent from the
   * layer, or the row is not a port at all. A reader's label, derived from
   * `name` for display — core never branches on a name, and a host that names
   * its own adapter after a default is reported as defaulted, which is what it
   * asked for.
   */
  readonly defaulted: boolean | undefined;
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
  // The five ports come from the registry, in its order: a sixth port is a row
  // here without an edit, and a missing consequence below is a compile error.
  const ports = yield* Effect.all(
    forEveryPort((d) =>
      Effect.map(Effect.serviceOption(d.service), (shape) =>
        portRow(d.port, d.none.name, shape),
      ),
    ),
  );
  const ids = yield* Effect.serviceOption(EvaluationId);
  const subject = yield* Effect.serviceOption(CurrentSubject);
  const cache = yield* Effect.serviceOption(DecisionCache);
  const sink = yield* Effect.serviceOption(DecisionSink);

  const size = Option.isSome(cache) ? yield* cache.value.size : undefined;

  return {
    ports: [
      ...ports,
      required("EvaluationId", nameOf(ids), Option.isSome(ids),
        "identifiers correlate a decision with its trace; nothing else depends on them"),
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

/** What it costs for each port to be defaulted, by port — exhaustive over the registry. */
const CONSEQUENCES: { readonly [K in PortName]: string } = {
  AttributeResolver: "a missing attribute resolves to undefined, so an attribute policy denies",
  DecisionHistory: "the three-valued default denies hasActed and hasNotActed alike",
  RelationshipResolver: "an unanswered relationship denies",
  CustomPredicate: "every hasCustom node denies, since no registered predicate can be reached",
  SignatureHistory:
    "an unwired signature history answers no signatures on file, so every hasSignature node denies",
};

/**
 * Whether `name` is the description's default, or a wrapper around it.
 *
 * A wrapper composes its inner name as `"<inner> (<suffix>)"` (BEH-QD-196), so
 * a retrying default reads `"AttributeResolverNone (retrying)"` and exact
 * equality would call it a real adapter.
 */
const isDefaultName = (name: string, noneName: string): boolean =>
  name === noneName || name.startsWith(`${noneName} (`);

const portRow = (
  port: PortName,
  noneName: string,
  service: Option.Option<{ readonly name?: string | undefined }>,
): PortReport => {
  const name = nameOf(service);
  return {
    port,
    name,
    required: true,
    present: Option.isSome(service),
    defaulted: Option.isSome(service)
      ? name !== undefined && isDefaultName(name, noneName)
      : undefined,
    consequence: CONSEQUENCES[port],
  };
};

export interface PortActivity {
  readonly port: string;
  /** Calls the evaluator made (`qadi_port_calls_total`). */
  readonly calls: number;
  readonly retries: number;
  /**
   * Calls that hit their deadline inside a timing-out wrapper
   * (`qadi_port_timeouts_total`). With every port able to carry a deadline, a
   * timeout is the signal that tells a slow store from a down one: a store
   * that stopped answering produces no failed attempt for `retries` to count
   * until the deadline converts the hang into one.
   */
  readonly timeouts: number;
  /**
   * Calls `toPredicate` made (`qadi_predicate_port_calls_total`), kept apart
   * from `calls` so that field keeps meaning what it always meant. Only the two
   * ports translation can read ever have a non-zero value.
   */
  readonly translationCalls: number;
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
 *
 * **Filtered to ports actually reached** (issue #107). `portCallsTotal`/
 * `portRetriesTotal` gained `preregisteredWords` — every port name is a key in
 * `occurrences` the moment either metric is first read, whether or not
 * anything ever called into it — so `calls.occurrences.keys()` alone would
 * report every port on every call to this Effect, silently widening from
 * "reached" to "known to exist". The `> 0` filter below is what keeps this
 * function's own contract (and `Wiring.test.ts`'s "reports nothing when no
 * port has been reached") true under that change.
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
  const timeouts = yield* Metric.value(portTimeoutsTotal);
  const translated = yield* Metric.value(predicatePortCallsTotal);

  const ports = new Set([
    ...calls.occurrences.keys(),
    ...retries.occurrences.keys(),
    ...timeouts.occurrences.keys(),
    ...translated.occurrences.keys(),
  ]);
  return [...ports]
    .map((port) => ({
      port,
      calls: calls.occurrences.get(port) ?? 0,
      retries: retries.occurrences.get(port) ?? 0,
      timeouts: timeouts.occurrences.get(port) ?? 0,
      translationCalls: translated.occurrences.get(port) ?? 0,
    }))
    .filter(
      (activity) =>
        activity.calls > 0 ||
        activity.retries > 0 ||
        activity.timeouts > 0 ||
        activity.translationCalls > 0,
    );
});

const nameOf = (service: Option.Option<{ readonly name?: string | undefined }>): string | undefined =>
  Option.isSome(service) ? service.value.name : undefined;

const required = (
  port: WiredServiceName,
  name: string | undefined,
  present: boolean,
  consequence: string,
): PortReport => ({ port, name, required: true, present, defaulted: undefined, consequence });

const optional = (port: WiredServiceName, present: boolean, consequence: string): PortReport => ({
  port,
  name: undefined,
  required: false,
  present,
  defaulted: undefined,
  consequence,
});
