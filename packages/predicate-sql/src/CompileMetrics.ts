/**
 * The compile counter of @qadi/predicate-sql, declared once and read by its tests.
 *
 * Package-private: out of the package's `exports` map (ADR-QD-099), so the only
 * readers are this package's own tests, which import it by path instead of
 * matching an id string in a snapshot (ADR-QD-123). `Metric`'s registry key is
 * `type:id:description:attributes`, so a second declaration with another
 * description would read zero forever (ADR-QD-052).
 */
import * as Metric from "effect/Metric";

/**
 * The untagged base, deliberately not exported: reading it gives `0` and
 * registers a phantom untagged series an exporter then emits.
 */
const compiledBase = Metric.counter("qadi_predicate_sql_compiled_total", {
  description: "Predicates compiled by @qadi/predicate-sql's compileSql, tagged by outcome.",
});

/**
 * Compile volume and refusal rate, one counter series per outcome.
 *
 * Two fixed, module-scope taggings (`Metric.withAttributes` over one base
 * counter, not a tag applied per call): declaring either inside
 * `compileSql`'s body would create an unscoped object per call that nothing
 * can aggregate. Unlike `@qadi/core`'s `predicatesTranslatedTotal`, which counts
 * successes only, these carry an `outcome` attribute: `compiled` or `refused`.
 */
export const compiledTotal: {
  readonly compiled: Metric.Counter<number>;
  readonly refused: Metric.Counter<number>;
} = {
  compiled: Metric.withAttributes(compiledBase, { outcome: "compiled" }),
  refused: Metric.withAttributes(compiledBase, { outcome: "refused" }),
};
