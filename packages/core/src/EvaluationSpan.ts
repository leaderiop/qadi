/**
 * The spans of the evaluate family, each declared once: its name, the question
 * annotated before the work, and the answer annotated after it.
 *
 * Each key is spelled once, in this file, and the subject id is the port spans'
 * own (`sharedQuestionKeys`), so a trace reads one fact under one key whichever
 * span carries it. A writer annotates its question through {@link annotateAsked},
 * which must name every member, and its answer through {@link annotateSpan}, so both
 * are written from the declaration, and a failed span still
 * carries its question because that is annotated before the work, not after it
 * (ADR-QD-188, extending ADR-QD-051 and ADR-QD-109).
 *
 * A key spelled anywhere else in library source, or typed by hand in a test outside its
 * counted goldens, is refused by `[span-key-source]` and `[span-key-literal]` in
 * `scripts/check-house-style.mjs` (ADR-QD-188).
 *
 * Every field is a {@link SpanValue} leaf by type, which is INV-QD-044: a span
 * of this family cannot hold a resolved attribute, a resource or a policy body.
 *
 * Out of the barrel (AGENTS.md §9): a host has no span of this family to write.
 * What holds it is the compiler (the field types, the outcome tie below, `name`
 * typed {@link SpanKey}) and `EvaluationSpan.contract.test.ts`, which pins the keys
 * a tracer receives.
 */
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import type { Decision } from "./Decision.ts";
import { POLICY_TAGS } from "./Policy.ts";
import type { SpanFields, SpanKey, SpanStruct, SpanType } from "./PortSpan.ts";
import type { PoseOf } from "./PortSpanEncode.ts";
import type { Question } from "./Question.ts";
import {
  encodeSpan,
  sharedQuestionFields,
  sharedQuestionKeys,
  spanStruct,
} from "./PortSpanEncode.ts";

/**
 * What an evaluation came to: a decision's tag, or `"Failed"`.
 *
 * A failure is not a decision, so it is the third value rather than a member of
 * {@link Decision}.
 */
export type SpanOutcome = Decision["_tag"] | "Failed";

/**
 * A typed identity: it returns its argument, so `name` is a {@link SpanKey} with
 * no cast, as `portSpan` does for a port's span.
 */
const declareSpan = <const Q extends SpanFields, const A extends SpanFields>(span: {
  readonly name: SpanKey;
  readonly question: SpanStruct<Q>;
  readonly answer: SpanStruct<A>;
}) => span;

/** What was asked, for each span of the family that has a subject and a policy. */
const askedFields = {
  subjectId: sharedQuestionFields.subjectId,
  policyTag: Schema.optionalKey(Schema.Literals(POLICY_TAGS)),
  action: Schema.optionalKey(Schema.String),
};

/** Their keys; `as const` because a widened `string` is not a {@link SpanKey}. */
const askedKeys = {
  subjectId: sharedQuestionKeys.subjectId,
  policyTag: "qadi.policy_tag",
  action: "qadi.action",
} as const;

/**
 * What a built question asks: its subject's id, its policy's tag and its action.
 *
 * The one projection from a {@link Question} to the shared question fields, read by
 * every writer that holds one, so the subject, the policy and the action a span
 * states are always the question's own and never a second source beside it.
 */
export const askedOf = (
  question: Question,
): PoseOf<SpanStruct<typeof askedFields>> => ({
  subjectId: question.subject.id,
  policyTag: question.policy._tag,
  action: question.action,
});

/** The tag of the failure a span ended on. */
const failedFields = { errorTag: Schema.optionalKey(Schema.String) };

/** Its key. */
const failedKeys = { errorTag: "qadi.error_tag" } as const;

/** Every {@link SpanOutcome}; `satisfies` makes a literal outside it a compile error. */
const outcomes = [
  "Allow",
  "Deny",
  "Failed",
] as const satisfies ReadonlyArray<SpanOutcome>;

/**
 * The `qadi.evaluate` span: one per decided question.
 *
 * The question is who asked what: the subject, the evaluation id, the policy's
 * tag and the action when there is one. The answer is the outcome on every path
 * that ends in a decision or a typed failure, the error tag only on `Failed`, and
 * the obligations comma-joined only on an allow that owes some. An interrupted or
 * defected evaluation carries its question and no outcome; its status says why.
 */
export const evaluateSpan = declareSpan({
  name: "qadi.evaluate",
  question: spanStruct(
    { ...askedFields, evaluationId: Schema.optionalKey(Schema.String) },
    { ...askedKeys, evaluationId: "qadi.evaluation_id" },
  ),
  answer: spanStruct(
    {
      outcome: Schema.optionalKey(Schema.Literals(outcomes)),
      ...failedFields,
      obligations: Schema.optionalKey(Schema.String),
    },
    { outcome: "qadi.outcome", ...failedKeys, obligations: "qadi.obligations" },
  ),
});

/**
 * The `qadi.toPredicate` span: one per translation of a policy into a row filter.
 *
 * The question is who asked what: the subject, the policy's tag and the action
 * when there is one, annotated before admission, so a translation that fails still
 * says what it was asked. It has no resource, because a translation answers for
 * rows not yet loaded. The answer is the predicate's tag on success, or the error's
 * tag on any failure: too deep, a fields restriction, an untranslatable node or a
 * port failure.
 *
 * The predicate's tag is a string, not a closed list, because the predicate's tags
 * are declared in `Predicate.ts`, which reads this module.
 */
export const toPredicateSpan = declareSpan({
  name: "qadi.toPredicate",
  question: spanStruct(askedFields, askedKeys),
  answer: spanStruct(
    { predicateTag: Schema.optionalKey(Schema.String), ...failedFields },
    { predicateTag: "qadi.predicate_tag", ...failedKeys },
  ),
});

/**
 * The `qadi.guardHealthCheck` span: one per probe.
 *
 * The question is the canary's: the subject, the policy's tag and the action when
 * there is one, annotated before the walk. The answer is whether the probe was
 * healthy, and the error tag only when it was not, so a tracer still sees a failed
 * probe.
 */
export const guardHealthCheckSpan = declareSpan({
  name: "qadi.guardHealthCheck",
  question: spanStruct(askedFields, askedKeys),
  answer: spanStruct(
    { healthy: Schema.optionalKey(Schema.Boolean), ...failedFields },
    { healthy: "qadi.healthy", ...failedKeys },
  ),
});

/**
 * What a batch's span answers: nothing of its own.
 *
 * Each subject's decision is its own `qadi.evaluate` span.
 */
const answersNothing = spanStruct({}, {});

/**
 * The `qadi.decideSubjects` span: one per batch held as an array.
 *
 * The question is the batch's: how many subjects, the policy's tag and the action
 * when there is one, annotated before the first subject runs.
 */
export const decideSubjectsSpan = declareSpan({
  name: "qadi.decideSubjects",
  question: spanStruct(
    {
      subjectCount: Schema.optionalKey(Schema.Number),
      policyTag: askedFields.policyTag,
      action: askedFields.action,
    },
    {
      subjectCount: "qadi.subject_count",
      policyTag: askedKeys.policyTag,
      action: askedKeys.action,
    },
  ),
  answer: answersNothing,
});

/**
 * The `qadi.decideSubjectsStream` span: one per batch held as a stream.
 *
 * The question is the policy's tag and the action when there is one, the facts known
 * before a single element runs. It has no subject count, because a stream's length is
 * not known in advance and may not be finite.
 */
export const decideSubjectsStreamSpan = declareSpan({
  name: "qadi.decideSubjectsStream",
  question: spanStruct(
    { policyTag: askedFields.policyTag, action: askedFields.action },
    { policyTag: askedKeys.policyTag, action: askedKeys.action },
  ),
  answer: answersNothing,
});

/**
 * The annotations of the denial log line: the policy tag, the subject and the
 * reason.
 *
 * The reason stays on the log line and is never copied to a span.
 */
export const denialEvent = spanStruct(
  {
    policyTag: askedFields.policyTag,
    subjectId: askedFields.subjectId,
    reason: Schema.optionalKey(Schema.String),
  },
  {
    policyTag: askedKeys.policyTag,
    subjectId: askedKeys.subjectId,
    reason: "qadi.reason",
  },
);

/**
 * Annotates the current span with one struct of the family, any member left out.
 *
 * A plain function: it opens no span, it writes to the one the caller opened. It
 * writes answers, each naming only what its ending says; a question is written with
 * {@link annotateAsked}.
 */
export const annotateSpan = <F extends SpanFields>(
  struct: SpanStruct<F>,
  value: SpanType<SpanStruct<F>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(struct, value));

/**
 * Annotates the current span with a family span's question, every member named.
 *
 * The value is a {@link PoseOf} the question, so a writer that leaves a member out,
 * such as the evaluation id or the policy's tag, fails to compile where it writes,
 * as a port's `pose` does (ADR-QD-133). A member that is absent this time, such as
 * an action not supplied, is named with `undefined`. An answer, which names only
 * what this ending says, is written with {@link annotateSpan}.
 */
export const annotateAsked = <F extends SpanFields>(
  struct: SpanStruct<F>,
  value: PoseOf<SpanStruct<F>>,
): Effect.Effect<void> => annotateSpan<SpanFields>(struct, value);
