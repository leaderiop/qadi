/**
 * The one place that hands a record to the optional `DecisionSink`.
 *
 * Internal (not in the barrel). `evaluate` and `discharge` each used to read
 * the sink, wrap the call and stamp the record by hand, so "an observer can
 * never deny" (INV-QD-035) was enforced twice; it is now enforced here, and
 * `scripts/check-house-style.mjs`'s `sink-read-once` rule refuses a second
 * read of the service (ADR-QD-044, ADR-QD-100).
 */
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import type { CacheOutcome } from "./DecisionCache.ts";
import { DecisionRecord } from "./DecisionRecord.ts";
import type { Decided, Failed, SinkRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import type { Question } from "./Question.ts";

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
