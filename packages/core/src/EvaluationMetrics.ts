/**
 * Every evaluation metric, declared once.
 *
 * Effect keys a metric on its type, id and description, so a second declaration
 * of the same id with a drifted description silently forks a series that reads
 * zero forever and still compiles; and a test that compared an id string in a
 * snapshot kept passing when the id was renamed, so a negative "not counted"
 * test could pass vacuously (ARCH-61, porting lost commit `d089c1d`; ADR-QD-123
 * amends ADR-QD-052). So `decideQuestion` (`Lifecycle.ts`), `getOrCompute`
 * (`DecisionCache.ts`) and `toPredicate` (`Predicate.ts`) write through the
 * values below, and a host's tests, an exporter wiring or a future devtools
 * reading import the same values and read them typed.
 *
 * | Export                      | Id                                  | Type      | Written by       |
 * | --------------------------- | ----------------------------------- | --------- | ---------------- |
 * | `decisionsTotal`            | `qadi_decisions_total`              | Counter   | `decideQuestion` |
 * | `denialsByPolicyTagTotal`   | `qadi_denials_by_policy_tag_total`  | Frequency | `decideQuestion` |
 * | `evaluationDurationMillis`  | `qadi_evaluation_duration_millis`   | Histogram | `decideQuestion` |
 * | `evaluationErrorsTotal`     | `qadi_evaluation_errors_total`      | Frequency | `decideQuestion` |
 * | `decisionCacheLookupsTotal` | `qadi_decision_cache_lookups_total` | Frequency | `getOrCompute`   |
 * | `predicatesTranslatedTotal` | `qadi_predicates_translated_total`  | Counter   | `toPredicate`    |
 *
 * These six are rows of the table every `qadi_*` metric has in
 * `spec/behaviors/25-inspection.md` (BEH-QD-368), which `scripts/check-house-style.mjs`
 * checks against the declarations in both directions on id, type and file
 * (`[metric-table]`); the same script refuses a core metric that is not exported
 * (`[metric-declaration]`) and a test that matches an id outside its budgeted pins
 * (`METRIC_ID_LITERAL_BUDGET`).
 *
 * All six are written on the evaluating fiber, so a `MetricRegistry` provided to
 * that fiber (`isolatedMetrics`, a host's own registry) receives them. The
 * hydration counters are the off-fiber exception (`HydrationMetrics.ts`).
 *
 * `decisionsTotal` is exported as its two series, never as the untagged base
 * counter: reading the base gives `0` and registers a phantom `attributes: null`
 * series an exporter then emits. Its `Record` is keyed by `Decision["_tag"]`, so
 * a third decision tag is a compile error here until it gets a series.
 *
 * `CacheOutcome` is declared here, not in `DecisionCache.ts`, because the
 * frequency's closed domain must sit beside it and `DecisionCache.ts` imports
 * this module: the other direction is a madge cycle (ADR-QD-037). `PortMetrics.ts`
 * owns `PortName` for the same reason.
 */
import * as Metric from "effect/Metric";
import * as Record from "effect/Record";
import type { Decision } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import { POLICY_TAGS } from "./Policy.ts";
import type { CacheOutcomeSchema } from "./SinkRecordFields.ts";

/**
 * Which of the cache's three documented paths a lookup took.
 *
 * `hit` — an already-completed entry. `coalesced` — joined another fiber's
 * in-flight `compute`. `miss` — this fiber ran `compute` itself.
 */
export type CacheOutcome = typeof CacheOutcomeSchema.Type;

/**
 * The untagged `qadi_decisions_total` counter, deliberately not exported.
 *
 * Reading it gives `0` and registers a third, untagged series (ADR-QD-123); the
 * two tagged series below are its only readable surface.
 */
const decisionsBase = Metric.counter("qadi_decisions_total", {
  description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
});

/**
 * Every decision `evaluate` reaches, one counter series per `Decision` tag.
 *
 * The one metric every deployment of this library can use unconditionally:
 * no wiring beyond providing a `Metric.MetricRegistry` (or an exporter built
 * on one) is needed to see the allow/deny rate ADR-QD-009 asks observability
 * to answer. `.Allow` carries `outcome: "allow"` and `.Deny` `outcome: "deny"`.
 *
 * Two fixed, module-scope taggings — `Metric.withAttributes(base, {...})` built
 * once, the shape Effect's own docs show — rather than one built fresh per
 * call, deliberately: `Metric`'s untagged fast path memoises a metric's
 * resolved key on the metric object itself, the first time it is touched —
 * cheap for a singleton reused across every call, defeated by rebuilding the
 * tagged wrapper on every `evaluate`, which recomputes the key each time.
 */
export const decisionsTotal: { readonly [T in Decision["_tag"]]: Metric.Counter<number> } = {
  Allow: Metric.withAttributes(decisionsBase, { outcome: "allow" }),
  Deny: Metric.withAttributes(decisionsBase, { outcome: "deny" }),
};

/**
 * Denials, by the top-level policy tag `evaluate` was asked to decide.
 *
 * Keyed on `policy._tag` — a closed, small union — rather than `decision.reason`,
 * which was tried first and reverted: `evaluateActed` and `evaluateHasRelationship`
 * both build their denial reason from caller-supplied identifiers (`subject.id`, a
 * resource id), so a frequency keyed on the raw sentence would grow one permanent
 * entry per distinct (subject, resource) pair ever denied — unbounded, in a
 * structure this cache-free service holds in memory for the life of the registry.
 * `policy._tag` answers a coarser but still useful question ("which *kind* of
 * policy is denying") with a cardinality bounded by the ADT itself. The full,
 * caller-specific reason is still available — on the `Effect.logDebug` line in
 * `Lifecycle.ts`, which a log pipeline retains and rotates rather than
 * accumulating in-process.
 */
export const denialsByPolicyTagTotal = Metric.frequency("qadi_denials_by_policy_tag_total", {
  description: "Denials, keyed by the top-level policy tag evaluate was asked to decide.",
  preregisteredWords: POLICY_TAGS,
});

/**
 * The distribution of `evaluate`'s own duration, in milliseconds.
 *
 * `durationMillis` was already computed for every `Decision` — this exports it
 * as an aggregate a deployment can alert or graph on without instrumenting its
 * own call site. Exponential boundaries because evaluation latency is the
 * usual case for one: sub-millisecond for an uncached, resolver-free policy,
 * seconds for one waiting on a slow attribute or relationship store, with
 * nothing meaningful in between to resolve at linear width.
 */
export const evaluationDurationMillis = Metric.histogram("qadi_evaluation_duration_millis", {
  description: "Distribution of evaluate's wall-clock duration, in milliseconds.",
  boundaries: Metric.exponentialBoundaries({ start: 1, factor: 2, count: 15 }),
});

/**
 * Every `EvaluationError` tag — {@link evaluationErrorsTotal}'s closed domain,
 * by the `Record<Tag, true>` exhaustiveness idiom: a tenth error added to the
 * union without a matching entry here is a compile error rather than a
 * silently-missing word. (The policy tag list used the same idiom until
 * `Policy.ts` derived it from the schema union.)
 */
const EVALUATION_ERROR_TAGS_BY_TAG: Record<EvaluationError["_tag"], true> = {
  AttributeResolveError: true,
  RelationshipResolveError: true,
  DecisionHistoryUnavailable: true,
  CustomPredicateError: true,
  SignatureHistoryUnavailable: true,
  MissingAction: true,
  MissingResource: true,
  MissingResourceId: true,
  PolicyTooDeep: true,
};

/** `EVALUATION_ERROR_TAGS_BY_TAG`'s keys, in the array form `preregisteredWords` takes. */
const EVALUATION_ERROR_TAGS: ReadonlyArray<EvaluationError["_tag"]> = Record.keys(
  EVALUATION_ERROR_TAGS_BY_TAG,
);

/**
 * Evaluations that raised instead of deciding, by error tag.
 *
 * An `EvaluationError` reached **no** observer before this: it left through the
 * error channel with no span attribute, no metric and no log. So a deployment
 * watching `qadi_decisions_total` saw an attribute-store outage as a *drop in
 * traffic* rather than as a fault — the one reading that sends an operator
 * somewhere other than the broken dependency.
 *
 * Keyed on `_tag` for the cardinality reason {@link denialsByPolicyTagTotal} gives:
 * the tag union is closed and small, while the errors themselves carry
 * caller-supplied identifiers.
 */
export const evaluationErrorsTotal = Metric.frequency("qadi_evaluation_errors_total", {
  description: "Evaluations that failed instead of deciding, keyed by error tag.",
  preregisteredWords: EVALUATION_ERROR_TAGS,
});

const CACHE_OUTCOMES_BY_OUTCOME: Record<CacheOutcome, true> = {
  hit: true,
  coalesced: true,
  miss: true,
};

/** `CACHE_OUTCOMES_BY_OUTCOME`'s keys, in the array form `preregisteredWords` takes. */
const CACHE_OUTCOMES: ReadonlyArray<CacheOutcome> = Record.keys(CACHE_OUTCOMES_BY_OUTCOME);

/**
 * Every `getOrCompute` lookup, by which of the cache's three documented paths
 * it took: `hit` (an already-completed entry), `coalesced` (joined another
 * fiber's in-flight `compute`), or `miss` (this fiber ran `compute` itself).
 *
 * The metric a caller needs to answer "is this cache earning its keep" —
 * `hit / (hit + coalesced + miss)` — without instrumenting their own call
 * sites, and the closest thing to the "production cache hit rate" this
 * library could not previously report at all.
 */
export const decisionCacheLookupsTotal = Metric.frequency("qadi_decision_cache_lookups_total", {
  description: "DecisionCache.getOrCompute lookups, by outcome (hit / coalesced / miss).",
  preregisteredWords: CACHE_OUTCOMES,
});

/**
 * Successful policy-to-`Predicate` translations.
 *
 * The complementary case to `PolicyNotTranslatable`, which is already a typed
 * failure a caller can catch and count on its own: this is a metric a
 * deployment can watch for the successful path without wiring a catch clause
 * of its own, the same reason `decisionsTotal` exists. It counts successes
 * only and carries no outcome attribute.
 */
export const predicatesTranslatedTotal = Metric.counter("qadi_predicates_translated_total", {
  description: "Policies successfully compiled to a Predicate by `toPredicate`.",
});
