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
 * Keyed on the port name — three closed values — for the cardinality reason
 * `Evaluate.ts` gives for keying denials on the policy tag.
 *
 * The `description` strings below survive mutation testing, as `DecisionCache`'s
 * do: nothing reads them back, so no test can distinguish a metric carrying one
 * from a metric carrying none. They are for whoever reads the exported metric,
 * and they stay.
 */
import * as Metric from "effect/Metric";

/** Every call the evaluator made into a port, by which port. */
export const portCallsTotal = Metric.frequency("qadi_port_calls_total", {
  description: "Calls the evaluator made into a resolver or history port, by port.",
});

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
});
