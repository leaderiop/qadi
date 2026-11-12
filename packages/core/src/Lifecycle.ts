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
 * The metrics it writes are declared in `EvaluationMetrics.ts` (ADR-QD-123),
 * which every reader imports; this module only updates them.
 *
 * Package-private: out of the barrel (ADR-QD-099). It reads `EvaluateOptions`
 * (`Question.ts`) and `EvaluationServices` (`EvaluationServices.ts`) from leaves
 * below both it and `Evaluate.ts`, so the import `Evaluate.ts` → `Lifecycle.ts`
 * stays one-way while madge counts type-only edges (ADR-QD-037).
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import { CurrentSubject } from "./CurrentSubject.ts";
import { DecisionCache } from "./DecisionCache.ts";
import type { Decision, Trace } from "./Decision.ts";
import { makeDecision } from "./Decision.ts";
import { Decided, Failed } from "./DecisionRecord.ts";
import type { EvaluationError } from "./Errors.ts";
import { EvaluationId } from "./EvaluationId.ts";
import {
  decisionsTotal,
  denialsByPolicyTagTotal,
  evaluationDurationMillis,
  evaluationErrorsTotal,
} from "./EvaluationMetrics.ts";
import type { CacheOutcome } from "./EvaluationMetrics.ts";
import type { EvaluationServices } from "./EvaluationServices.ts";
import type { Policy } from "./Policy.ts";
import type { PortServices } from "./Ports.ts";
import { questionOf } from "./Question.ts";
import type { EvaluateOptions, Question, QuestionOptions } from "./Question.ts";
import { decisionRecordFor, sinkEmitter } from "./SinkEmit.ts";
import type { Stamp } from "./SinkEmit.ts";
import { walk } from "./Walk.ts";

/** A trace plus how it was obtained — `undefined` when no cache was consulted. */
interface EvaluationLookup {
  readonly trace: Trace;
  readonly outcome: CacheOutcome | undefined;
}

/**
 * Decides a question: the lifecycle around `walk`.
 *
 * Mints the id, reads the clock and the optional cache and sink, and wraps the
 * walk's answer in metrics, a span, a log line and the records. The subject is
 * `question.subject`; this reads no `CurrentSubject`. Emits the `qadi.evaluate`
 * span carrying the decision (ADR-QD-051: the root, under its old name).
 *
 * Its options are `EvaluateOptions` less the question options, derived, so a
 * built question's resource, action and depth cannot be passed a second time.
 */
export const decideQuestion = Effect.fn("qadi.evaluate")(function* (
  question: Question,
  options?: Omit<EvaluateOptions, keyof QuestionOptions>,
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
        yield* emit(decisionRecordFor(question, stamp, new Failed({ error })));
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

  yield* Metric.update(decisionsTotal[decision._tag], 1);
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
  yield* emit(decisionRecordFor(question, stamp, new Decided({ decision }), lookup.outcome));

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
  options?: EvaluateOptions,
): Effect.Effect<Asked, EvaluationError, EvaluationServices> =>
  CurrentSubject.use((subject) => {
    const question = questionOf(subject, policy, options);
    return Effect.map(decideQuestion(question, options), (decision) => ({ question, decision }));
  });
