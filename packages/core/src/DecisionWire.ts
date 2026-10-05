/**
 * The wire form of a `Decision`, shared by every module that ships one.
 *
 * `SinkCodec.ts` embeds it in the record wire's outcome — `OutcomeWire`'s
 * `Decided` member in version 2, the `decided` field in version 1 — and
 * `@qadi/react`'s hydration payload derives its entry schema from
 * {@link DecisionWire}'s own fields rather than restating them. One definition
 * means one set of tests and no second hand-rolled codec drifting beside the
 * first ([ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md)).
 *
 * [ADR-QD-028](../../../spec/decisions/028-decision-hydration.md) rejected
 * "serializing the whole `Decision` with a `Schema` codec" because decisions
 * were not a wire format. The record wire overtook that when it began carrying
 * decisions across processes (BEH-QD-199, CCR-QD-063), so the codec lives here,
 * in `@qadi/core`, where both consumers can reach it.
 */
import * as Match from "effect/Match";
import * as Schema from "effect/Schema";
import type { Decision } from "./Decision.ts";
import { Allow, Deny, TraceSchema } from "./Decision.ts";
import { makeSubjectId } from "./Identity.ts";
import { Obligation } from "./Obligation.ts";

/** What both verdicts carry. */
const common = {
  evaluationId: Schema.String,
  subjectId: Schema.String,
  durationMillis: Schema.Number,
  trace: TraceSchema,
};

/**
 * An `Allow` on the wire.
 *
 * Exported beside the union so a consumer that derives its own payload from one
 * verdict's fields — `@qadi/react`'s hydration entry — derives from the variant
 * rather than from a flat shape that lets either verdict carry either field.
 */
export const DecisionWireAllow = Schema.TaggedStruct("Allow", {
  ...common,
  visibleFields: Schema.optional(Schema.Array(Schema.String)),
  obligations: Schema.Array(Obligation),
});

/**
 * A `Deny` on the wire. Its `reason` is required: a denial without a sentence
 * is not one this module ever encodes, so decoding one is refused rather than
 * given an invented reason.
 */
export const DecisionWireDeny = Schema.TaggedStruct("Deny", {
  ...common,
  obligations: Schema.Array(Obligation),
  reason: Schema.String,
});

/**
 * A `Decision` on the wire: a tagged union, so an `Allow` cannot carry a
 * `reason` and a `Deny` cannot lack one.
 *
 * Originally one flat struct with `_tag: Literals(["Allow","Deny"])` and an
 * optional `reason` for both, which is why `decodeDecision` had to invent a
 * `"denied"` sentence for a `Deny` that had none. Every record this module
 * encodes already satisfies the stricter shape, so the bytes are unchanged —
 * pinned by `SinkCodec.test.ts`'s golden tests.
 */
export const DecisionWire = Schema.Union([DecisionWireAllow, DecisionWireDeny]);

export type DecisionWire = typeof DecisionWire.Type;

/**
 * Projects a `Decision` onto its wire form.
 *
 * `visibleFields` is omitted when `undefined` (INV-QD-004: absent means "every
 * field", which is not the same as `[]`), and a `Deny` ships an empty
 * `obligations` array because the wire shape requires one.
 */
export const encodeDecision = (decision: Decision): DecisionWire =>
  decision._tag === "Allow"
    ? {
        _tag: "Allow",
        evaluationId: decision.evaluationId,
        subjectId: decision.subjectId,
        durationMillis: decision.durationMillis,
        trace: decision.trace,
        obligations: decision.obligations,
        ...(decision.visibleFields === undefined
          ? {}
          : { visibleFields: decision.visibleFields }),
      }
    : {
        _tag: "Deny",
        evaluationId: decision.evaluationId,
        subjectId: decision.subjectId,
        durationMillis: decision.durationMillis,
        trace: decision.trace,
        obligations: [],
        reason: decision.reason,
      };

/** Rebuilds a `Decision` from its (already validated) wire form. */
export const decodeDecision: (wire: DecisionWire) => Decision = Match.type<DecisionWire>().pipe(
  Match.tagsExhaustive({
    Allow: (wire) =>
      new Allow({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        visibleFields: wire.visibleFields,
        obligations: wire.obligations,
      }),
    Deny: (wire) =>
      new Deny({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        reason: wire.reason,
      }),
  }),
);
