/**
 * Aggregate activity for the ports an evaluation depends on.
 *
 * Nothing counted port calls. A wiring panel could show which implementation was
 * wired (once `name` existed) but not whether it was ever *reached* — so an
 * operator could not tell an attribute store that was answering from one no
 * policy ever consulted, which are opposite problems with the same symptom.
 *
 * **Metrics rather than a sink, deliberately.** These are aggregates, and
 * `Metric.MetricRegistry`'s default registry is memoised on the reference, so a
 * reader calls `Metric.snapshotUnsafe(Context.empty())` and gets them with
 * **zero wiring** — the one Effect signal that can be read passively. A per-call
 * record would need a sink wired, and would put a write on the evaluation's hot
 * path for a debug view.
 *
 * That trade is the reason the decision *inspector* has no per-decision resolver
 * list: correlating calls to one evaluation means threading a collector through
 * `evaluateNode`, which risks the short-circuit guarantee
 * ([INV-QD-005](../../../spec/invariants.md#inv-qd-005-short-circuit-preservation))
 * for a panel. The Services screen gets aggregates; the inspector does without.
 *
 * Keyed on the port name — a closed set of values — for the cardinality reason
 * `Evaluate.ts` gives for keying denials on the policy tag. `portCallsTotal`
 * carries five: `AttributeResolver`, `DecisionHistory`, `RelationshipResolver`,
 * `CustomPredicate` and `SignatureHistory` — one per port `Evaluate.ts` can
 * call into. `portRetriesTotal` carries three: only the ports with a retrying
 * wrapper (`AttributeResolver.ts`, `RelationshipResolver.ts`,
 * `CustomPredicate.ts`) ever update it.
 *
 * `Predicate.ts`'s `translateNode` also calls into `AttributeResolver` and
 * `DecisionHistory` — it is a second interpreter over the same tree
 * (ADR-QD-024), not `Evaluate.ts` — and deliberately does not update
 * `portCallsTotal` for those calls, per the "`Evaluate.ts` can call into"
 * scoping above. A deployment that leans on `toPredicate` for row-level
 * security will see fewer calls counted here than actually reached a port.
 *

 * The `description` strings below survive mutation testing, as `DecisionCache`'s
 * do: nothing reads them back, so no test can distinguish a metric carrying one
 * from a metric carrying none. They are for whoever reads the exported metric,
 * and they stay.
 */
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";

/**
 * Every port `Evaluate.ts` can call into — {@link portCallsTotal}'s closed
 * domain.
 *
 * Written as a `Record<PortName, true>` rather than an array literal, the
 * `Decision.ts` `TRACE_TAGS_BY_TAG` idiom: TypeScript requires every key of
 * `PortName` to be present (TS2741 otherwise), so a sixth port added to the
 * evaluator without a matching entry here is a compile error rather than an
 * unregistered word silently missing from a snapshot.
 */
export type PortName =
  | "AttributeResolver"
  | "DecisionHistory"
  | "RelationshipResolver"
  | "CustomPredicate"
  | "SignatureHistory";

const PORT_NAMES_BY_NAME: Record<PortName, true> = {
  AttributeResolver: true,
  DecisionHistory: true,
  RelationshipResolver: true,
  CustomPredicate: true,
  SignatureHistory: true,
};

/** `PORT_NAMES_BY_NAME`'s keys, in the array form `preregisteredWords` takes. */
const PORT_NAMES: ReadonlyArray<PortName> = Record.keys(PORT_NAMES_BY_NAME);

/**
 * Every call the evaluator made into a port, by which port.
 *
 * Scoped to `Evaluate.ts` only — see this module's own doc comment above.
 * `Predicate.ts`'s `translateNode` reaches the same ports and does not update
 * this counter, so a deployment leaning on `toPredicate` (row-level security,
 * say) sees fewer calls here than actually reached a port. The caveat is
 * repeated in the description string itself (werner-vogels, WV-06) so an
 * operator reading `qadi_port_calls_total` sees the scoping where they read
 * the metric, not only in source a dashboard viewer never opens.
 */
export const portCallsTotal = Metric.frequency("qadi_port_calls_total", {
  description:
    "Calls the evaluator made into a resolver or history port, by port. " +
    "Scoped to Evaluate.ts only — Predicate.ts's translateNode reaches the " +
    "same ports via a second interpreter and is not counted here.",
  preregisteredWords: PORT_NAMES,
});

/**
 * The three ports with a retrying wrapper — {@link portRetriesTotal}'s closed
 * domain, and a proper subset of {@link PortName}: `DecisionHistory` and
 * `SignatureHistory` have no `*Retrying` combinator (`AttributeResolver.ts`,
 * `RelationshipResolver.ts`, `CustomPredicate.ts` do), so this cannot reuse
 * `PORT_NAMES_BY_NAME` itself — it needs its own exhaustive `Record` over the
 * narrower type, for the same reason and by the same idiom.
 */
export type RetryingPortName = "AttributeResolver" | "RelationshipResolver" | "CustomPredicate";

const RETRYING_PORT_NAMES_BY_NAME: Record<RetryingPortName, true> = {
  AttributeResolver: true,
  RelationshipResolver: true,
  CustomPredicate: true,
};

const RETRYING_PORT_NAMES: ReadonlyArray<RetryingPortName> = Record.keys(
  RETRYING_PORT_NAMES_BY_NAME,
);

/**
 * Failed attempts inside a retrying wrapper, by port.
 *
 * Counted on the error *before* `Effect.retry` sees it, so this is attempts that
 * failed rather than calls that ultimately did. A call retried twice and then
 * succeeding contributes two here and one to {@link portCallsTotal} — which is
 * the pair a reader needs to see a store degrading before it starts failing
 * outright.
 */
export const portRetriesTotal = Metric.frequency("qadi_port_retries_total", {
  description: "Failed port attempts inside a retrying wrapper, by port.",
  preregisteredWords: RETRYING_PORT_NAMES,
});

/**
 * The two ports with a timing-out wrapper — {@link portTimeoutsTotal}'s closed
 * domain, and a proper subset of {@link PortName}, the same shape as
 * {@link RetryingPortName} above. `attributeResolverTimingOut`
 * (`AttributeResolver.ts`) and `relationshipResolverTimingOut`
 * (`RelationshipResolver.ts`) are the only two `*TimingOut` combinators today
 * (JM-01/WV-01/SP-01) — `DecisionHistory`, `CustomPredicate` and
 * `SignatureHistory` share the same unbounded-latency gap but have no
 * combinator yet, so they stay out of this closed set until one exists,
 * rather than being pre-registered for a metric nothing can update.
 */
export type TimingOutPortName = "AttributeResolver" | "RelationshipResolver";

const TIMING_OUT_PORT_NAMES_BY_NAME: Record<TimingOutPortName, true> = {
  AttributeResolver: true,
  RelationshipResolver: true,
};

const TIMING_OUT_PORT_NAMES: ReadonlyArray<TimingOutPortName> = Record.keys(
  TIMING_OUT_PORT_NAMES_BY_NAME,
);

/**
 * Calls inside a timing-out wrapper that hit the deadline, by port —
 * `attributeResolverTimingOut`/`relationshipResolverTimingOut`'s counterpart to
 * {@link portRetriesTotal}: a store that stopped answering instead of
 * answering with failure produces no `AttributeResolveError`/
 * `RelationshipResolveError` for {@link portRetriesTotal} to count until the
 * deadline itself converts the hang into one, so this is the signal that
 * distinguishes "the store is slow" from "the store is down" in a trace-free
 * aggregate view.
 */
export const portTimeoutsTotal = Metric.frequency("qadi_port_timeouts_total", {
  description: "Port calls that hit their deadline inside a timing-out wrapper, by port.",
  preregisteredWords: TIMING_OUT_PORT_NAMES,
});
