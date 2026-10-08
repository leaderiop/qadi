/**
 * The lifecycle around one question: id, clock, cache, walk, metrics, span, records.
 *
 * `decideQuestion` is what `evaluate` used to be, taking the {@link Question}
 * instead of building it; `ask` reads the subject, builds the question once and
 * returns it beside the decision. The enforcing entry points (`Qadi.ts`) call
 * `ask` so that `discharge` is handed the very `Question` that was cached and
 * recorded, never a second `questionOf` call that happens to agree today
 * (ADR-QD-100: a question is built once; this change: an obligation is
 * discharged against the question it answered).
 *
 * Package-private: out of the barrel (ADR-QD-099). It declares its own
 * `LifecycleOptions` rather than importing `EvaluateOptions`, because
 * `Evaluate.ts` imports this module and madge counts a type-only edge too
 * (ADR-QD-037).
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Record from "effect/Record";
import type { Concurrency } from "effect/Types";
import { CurrentSubject } from "./CurrentSubject.ts";
import type { CacheOutcome } from "./DecisionCache.ts";
import { DecisionCache } from "./DecisionCache.ts";
import type { Decision, Trace } from "./Decision.ts";
import { makeDecision } from "./Decision.ts";
import { Decided, Failed } from "./DecisionRecord.ts";
import type { EvaluationError } from "./Errors.ts";
import { EvaluationId } from "./EvaluationId.ts";
import { POLICY_TAGS } from "./Policy.ts";
import type { Policy } from "./Policy.ts";
import type { PortServices } from "./Ports.ts";
import { questionOf } from "./Question.ts";
import type { Question, QuestionOptions } from "./Question.ts";
import { decidedRecord, failedRecord, sinkEmitter } from "./SinkEmit.ts";
import type { Stamp } from "./SinkEmit.ts";
import { walk } from "./Walk.ts";

/**
 * Every decision `evaluate` reaches, tagged by outcome.
 *
 * The one metric every deployment of this library can use unconditionally:
 * no wiring beyond providing a `Metric.MetricRegistry` (or an exporter built
 * on one) is needed to see the allow/deny rate ADR-QD-009 asks observability
 * to answer.
 *
 * Two fixed, module-scope taggings — `Metric.withAttributes(decisionsTotal,
 * {...})` built fresh per call, the shape Effect's own docs show — rather
 * than one, deliberately: `Metric`'s untagged fast path memoises a metric's
 * resolved key on the metric object itself, the first time it is touched
 * (`Object.keys(extraAttributes).length === 0` in `effect/Metric`'s `hook`) —
 * cheap for a singleton reused across every call, defeated by rebuilding the
 * tagged wrapper on every `evaluate`, which recomputes the key each time.
 */
const decisionsTotal = Metric.counter("qadi_decisions_total", {
  description: "Authorization decisions reached by `evaluate`, tagged by outcome.",
});
const decisionsAllowedTotal = Metric.withAttributes(decisionsTotal, { outcome: "allow" });
const decisionsDeniedTotal = Metric.withAttributes(decisionsTotal, { outcome: "deny" });

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
 * caller-specific reason is still available — on the `Effect.logDebug` line below,
 * which a log pipeline retains and rotates rather than accumulating in-process.
 */
const denialsByPolicyTagTotal = Metric.frequency("qadi_denials_by_policy_tag_total", {
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
const evaluationDurationMillis = Metric.histogram("qadi_evaluation_duration_millis", {
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
 * Keyed on `_tag` for the cardinality reason `denialsByPolicyTagTotal` gives:
 * the tag union is closed and small, while the errors themselves carry
 * caller-supplied identifiers.
 */
const evaluationErrorsTotal = Metric.frequency("qadi_evaluation_errors_total", {
  description: "Evaluations that failed instead of deciding, keyed by error tag.",
  preregisteredWords: EVALUATION_ERROR_TAGS,
});

/** A trace plus how it was obtained — `undefined` when no cache was consulted. */
interface EvaluationLookup {
  readonly trace: Trace;
  readonly outcome: CacheOutcome | undefined;
}

/**
 * The two options that are not part of the {@link Question}: they change how an
 * evaluation runs and is correlated, never its answer.
 *
 * `EvaluateOptions` (`Evaluate.ts`) is `QuestionOptions` plus these two, and
 * carries their documentation.
 */
export interface LifecycleOptions {
  /** See `EvaluateOptions.concurrency`. */
  readonly concurrency?: Concurrency;
  /** See `EvaluateOptions.evaluationId`. */
  readonly evaluationId?: string;
}

/**
 * Decides a question: the lifecycle around `walk`.
 *
 * Mints the id, reads the clock and the optional cache and sink, and wraps the
 * walk's answer in metrics, a span, a log line and the records. The subject is
 * `question.subject`; this reads no `CurrentSubject`. Emits the `qadi.evaluate`
 * span carrying the decision (ADR-QD-051: the root, under its old name).
 */
export const decideQuestion = Effect.fn("qadi.evaluate")(function* (
  question: Question,
  options?: LifecycleOptions,
) {
  // A caller-supplied id names a continuation of an evaluation made elsewhere;
  // its absence — the default — mints a fresh one. `EvaluationId.next` is still
  // read either way rather than skipped, so which branch runs cannot change how
  // many ids a sequential generator has issued, and a test's expectations do not
  // depend on whether some *other* call happened to correlate.
  const mintedId = yield* EvaluationId.next;
  const evaluationId = options?.evaluationId ?? mintedId;
  const startedAt = yield* Clock.currentTimeMillis;

  // Optional by construction: `serviceOption` adds nothing to the requirements, so
  // `EvaluationServices` is unchanged and an application that never provides a cache
  // behaves exactly as it did (ADR-QD-031).
  const cache = yield* Effect.serviceOption(DecisionCache);
  // The one emitter (`SinkEmit.ts`): optional, a no-op when absent, and unable to
  // fail or die into the decision (INV-QD-035).
  const emit = yield* sinkEmitter;
  const stamp: Stamp = { evaluationId, at: startedAt };

  // The question was built once by the caller: the cache key, the walk's input
  // and the record's request half all read it, never `options` again.
  const answer = walk(question, options?.concurrency);

  // The TRACE is cached, never the `Decision`. A cached decision would carry a
  // duplicate `evaluationId`, so two log lines would claim to be the same event and
  // correlation — the one thing the identifier exists for — would stop working. The
  // id and the duration below are stamped per call, hit or miss, so a hit is
  // indistinguishable from a fresh evaluation except that it was faster.
  //
  // `getOrCompute` also coalesces concurrent identical asks into one walk
  // — including sharing a genuine failure with every waiter — rather than
  // each racing its own (ADR-QD-031's follow-up: absence is still free, since
  // this is still read through `serviceOption`). The key is the `Question`: see
  // its doc comment for why the whole subject and `maxDepth` are in it.
  //
  // `tapError`, so a failure is recorded and then propagates **unchanged**. This
  // is the only place an `EvaluationError` was ever observable from, and it was
  // not observable at all: no span attribute, no metric, no log. A consumer that
  // cannot see failures reports a broken attribute store as an absence of
  // traffic, or — worse, if it infers one — as a denial, which is the exact
  // confusion INV-QD-006 exists to prevent.
  //
  // `cacheOutcome` is `undefined` when no cache is wired at all, which is a
  // different statement from `"miss"` and is kept distinct on the record: a
  // reader seeing "miss" learns the cache was consulted and did not have it,
  // where absence means there was nothing to consult.
  //
  // Annotated rather than inferred: the two branches are `Effect<CacheLookup>`
  // and `Effect<{trace, outcome: undefined}>`, and TypeScript unions the two
  // `Effect`s rather than widening `outcome`, which then has no common `.pipe`.
  const lookupEffect: Effect.Effect<EvaluationLookup, EvaluationError, PortServices> = Option.isSome(
    cache,
  )
    ? cache.value.getOrCompute(question, answer)
    : Effect.map(answer, (trace) => ({ trace, outcome: undefined }));

  const lookup = yield* lookupEffect.pipe(
    Effect.tapError((error) =>
      Effect.gen(function* () {
        yield* Metric.update(evaluationErrorsTotal, error._tag);
        yield* Effect.annotateCurrentSpan({
          "qadi.outcome": "Failed",
          "qadi.error_tag": error._tag,
        });
        yield* emit(failedRecord(question, stamp, new Failed({ error })));
      }),
    ),
  );

  const trace = lookup.trace;
  const durationMillis = (yield* Clock.currentTimeMillis) - startedAt;

  const decision: Decision = makeDecision(
    { evaluationId, subjectId: question.subject.id, durationMillis },
    trace,
  );

  yield* Effect.annotateCurrentSpan({
    "qadi.decision": decision._tag,
    "qadi.subject_id": question.subject.id,
    "qadi.evaluation_id": evaluationId,
    "qadi.policy_tag": question.policy._tag,
    // Only when supplied: an absent action must not become the string
    // "undefined" in a trace viewer, and adding a key unconditionally would
    // change every existing span.
    ...(question.action === undefined ? {} : { "qadi.action": question.action }),
    // Obligations are reported, never run. Present only when there are some, so
    // an evaluation that carries none looks exactly as it did before E2.
    ...(decision._tag === "Allow" && decision.obligations.length > 0
      ? { "qadi.obligations": decision.obligations.map((o) => o.id).join(",") }
      : {}),
  });

  yield* Metric.update(decision._tag === "Allow" ? decisionsAllowedTotal : decisionsDeniedTotal, 1);
  yield* Metric.update(evaluationDurationMillis, durationMillis);

  if (decision._tag === "Deny") {
    yield* Metric.update(denialsByPolicyTagTotal, question.policy._tag);
    yield* Effect.logDebug("qadi: policy denied").pipe(
      Effect.annotateLogs({
        "qadi.policy_tag": question.policy._tag,
        "qadi.subject_id": question.subject.id,
        "qadi.reason": decision.reason,
      }),
    );
  }

  // Last, after every other emission, so a sink cannot observe a decision the
  // metrics and span have not yet recorded — and so that nothing below it could
  // be skipped were the sink to misbehave.
  yield* emit(decidedRecord(question, stamp, new Decided({ decision }), lookup.outcome));

  return decision;
});

/** A question and the decision it received: what the enforcing entry points need. */
export interface Asked {
  readonly question: Question;
  readonly decision: Decision;
}

/**
 * Reads the current subject, builds the {@link Question} once, and decides it.
 *
 * The only place in `src` that calls `questionOf` for a decision. `evaluate` is
 * `ask`'s decision; the enforcing entry points keep the question as well, so a
 * discharged obligation is told what its allow was about.
 */
export const ask = (
  policy: Policy,
  options?: QuestionOptions & LifecycleOptions,
): Effect.Effect<Asked, EvaluationError, CurrentSubject | EvaluationId | PortServices> =>
  CurrentSubject.use((subject) => {
    const question = questionOf(subject, policy, options);
    return Effect.map(decideQuestion(question, options), (decision) => ({ question, decision }));
  });
