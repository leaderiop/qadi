/**
 * The one place that hands a record to the optional `DecisionSink`, and the
 * one place a record is projected from its question.
 *
 * Internal (not in the barrel). `evaluate` and `discharge` each used to read
 * the sink, wrap the call and stamp the record by hand, so "an observer can
 * never deny" (INV-QD-035) was enforced twice; it is now enforced here, and
 * `scripts/check-house-style.mjs`'s `sink-read-once` rule refuses a second
 * read of the service (ADR-QD-044, ADR-QD-100).
 *
 * `failedRecord`, `decidedRecord` and `obligationRecordFor` are the three
 * projections of a {@link Question} into a record, so no record can disagree
 * with the question it reports (ADR-QD-100, ADR-QD-105, ARCH-54).
 */
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { Allow } from "./Decision.ts";
import { DecisionRecord, ObligationRecord } from "./DecisionRecord.ts";
import type { Decided, Failed, ObligationOutcome, SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import type { CacheOutcome } from "./EvaluationMetrics.ts";
import type { Question } from "./Question.ts";
import { resourceIdOf } from "./Resource.ts";

/** What an evaluation stamps on every record it makes. */
export interface Stamp {
  readonly evaluationId: string;
  readonly at: number;
}

/**
 * Reads the sink once and returns a function that hands it one record and
 * swallows everything; a no-op when no sink is wired.
 *
 * Optional by construction: `serviceOption` adds nothing to the requirements,
 * and ADR-QD-009 deleted four always-on observability ports, so an optional
 * one that is absent unless wired is not a return to them.
 *
 * `catchCause` rather than `catchAll` because the shape's `never` error
 * channel is not on its own enough — BEH-QD-175 recorded exactly how that gets
 * subverted, by `Effect.die`, and a dying sink would otherwise take the
 * decision with it.
 *
 * This is the inverse of the `Effect.orDie` AGENTS.md §4 forbids on this path,
 * not an instance of it: that turns a failure into a defect, this stops a
 * *bystander's* defect from becoming an authorization outcome. An observer
 * must never be able to deny.
 */
export const sinkEmitter: Effect.Effect<(record: SinkRecord) => Effect.Effect<void>> = Effect.map(
  Effect.serviceOption(DecisionSink),
  (sink) =>
    Option.isSome(sink)
      ? (record) => Effect.catchCause(sink.value.record(record), () => Effect.void)
      : () => Effect.void,
);

/**
 * Projects a {@link Question} and a {@link Stamp} into a decision record's
 * request half, so the record cannot disagree with what was asked.
 *
 * `maxDepth` is deliberately not on the wire (ADR-QD-096). Two arities rather
 * than an options bag: this runs once per evaluation, and a `Failed` record
 * must leave `cache` absent (not `undefined`-valued) — it says nothing about
 * the cache — which an explicit pair of constructors states without a spread.
 */
export const failedRecord = (question: Question, stamp: Stamp, outcome: Failed): DecisionRecord =>
  new DecisionRecord({
    evaluationId: stamp.evaluationId,
    at: stamp.at,
    subjectId: question.subject.id,
    policy: question.policy,
    resource: question.resource,
    action: question.action,
    outcome,
  });

/** The record of a decided evaluation: `failedRecord`'s request half plus how the cache answered. */
export const decidedRecord = (
  question: Question,
  stamp: Stamp,
  outcome: Decided,
  cache: CacheOutcome | undefined,
): DecisionRecord =>
  new DecisionRecord({
    evaluationId: stamp.evaluationId,
    at: stamp.at,
    subjectId: question.subject.id,
    policy: question.policy,
    resource: question.resource,
    action: question.action,
    cache,
    outcome,
  });

/**
 * Projects an allow's question once and returns the function that stamps an
 * obligation outcome onto it: the record of what the obligation gate did with
 * the allow's duties.
 *
 * Identity, never content: the resource itself stays on the decision row so
 * customer data is not disclosed twice to every sink (BEH-QD-195). The question
 * is the one the lifecycle decided and handed to the handler (ADR-QD-105), so
 * the row cannot disagree with what was asked. `at` is the caller's, read after
 * `discharge`'s early return, so an allow with no duties reads no clock.
 *
 * Everything except the outcome is read here, eagerly, so the caller calls this
 * before the duty handler runs. The `Question`'s resource is the caller's own
 * object, not a snapshot: a handler that reassigns its `id`, or a throwing `id`
 * getter, must neither make the row disagree with the decision row already
 * emitted nor turn a duty already performed into a defect (INV-QD-035). Only
 * the outcome is chosen afterwards, and stamping it reads nothing mutable.
 *
 * An absent `action` or resource id is an absent key, never an `undefined`-valued
 * one, hence the conditional spreads.
 */
export const obligationRecordFor = (
  question: Question,
  decision: Allow,
  at: number,
): ((outcome: ObligationOutcome) => ObligationRecord) => {
  const resourceId = resourceIdOf(question.resource);
  const obligationIds = decision.obligations.map((o) => o.id);
  return (outcome) =>
    new ObligationRecord({
      evaluationId: decision.evaluationId,
      at,
      outcome,
      obligationIds,
      subjectId: question.subject.id,
      ...(question.action === undefined ? {} : { action: question.action }),
      ...(resourceId === undefined ? {} : { resourceId }),
    });
};
