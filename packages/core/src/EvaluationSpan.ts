/**
 * The spans of the evaluate family, each declared once: its name, the question
 * annotated before the work, and the answer annotated after it.
 *
 * Each key is spelled once, in this file, and the subject id is the port spans'
 * own (`sharedQuestionKeys`), so a trace reads one fact under one key whichever
 * span carries it. A writer annotates through {@link annotateSpan}, so the question
 * and the answer are written from the declaration, and a failed span still
 * carries its question because that is annotated before the work, not after it
 * (ADR-QD-188, extending ADR-QD-051 and ADR-QD-109).
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
 * tag and the action when there is one. The answer is the outcome on every path,
 * the error tag only on `Failed`, and the obligations comma-joined only on an
 * allow that owes some.
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
 * Annotates the current span with one struct of the family.
 *
 * A plain function: it opens no span, it writes to the one the caller opened.
 */
export const annotateSpan = <F extends SpanFields>(
  struct: SpanStruct<F>,
  value: SpanType<SpanStruct<F>>,
): Effect.Effect<void> => Effect.annotateCurrentSpan(encodeSpan(struct, value));
