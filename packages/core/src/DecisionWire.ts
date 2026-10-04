/**
 * The wire form of a `Decision`, shared by every module that ships one.
 *
 * `SinkCodec.ts` embeds it in `SinkRecordWire`'s `decided` field, and
 * `@qadi/react`'s hydration payload derives its entry schema from
 * {@link DecisionWire}'s own fields rather than restating them. One definition
 * means one set of tests and no second hand-rolled codec drifting beside the
 * first ([ADR-QD-002](../../../spec/decisions/002-schema-derived-policy-adt.md)).
 *
 * [ADR-QD-028](../../../spec/decisions/028-decision-hydration.md) rejected
 * "serializing the whole `Decision` with a `Schema` codec" because decisions
 * were not a wire format. `SinkRecordWire` overtook that when it began carrying
 * `decided` across processes (BEH-QD-199, CCR-QD-063), so the codec lives here,
 * in `@qadi/core`, where both consumers can reach it.
 */
import * as Schema from "effect/Schema";
import type { Decision } from "./Decision.ts";
import { Allow, Deny, TraceSchema } from "./Decision.ts";
import { makeSubjectId } from "./Identity.ts";
import { Obligation } from "./Obligation.ts";

/** A `Decision` on the wire. */
export const DecisionWire = Schema.Struct({
  _tag: Schema.Literals(["Allow", "Deny"]),
  evaluationId: Schema.String,
  subjectId: Schema.String,
  durationMillis: Schema.Number,
  trace: TraceSchema,
  visibleFields: Schema.optional(Schema.Array(Schema.String)),
  obligations: Schema.Array(Obligation),
  reason: Schema.optional(Schema.String),
});

export type DecisionWire = typeof DecisionWire.Type;

/**
 * Projects a `Decision` onto its wire form.
 *
 * `visibleFields` is omitted when `undefined` (INV-QD-004: absent means "every
 * field", which is not the same as `[]`), and a `Deny` ships an empty
 * `obligations` array because the wire shape requires one.
 */
export const encodeDecision = (decision: Decision): DecisionWire => {
  const base = {
    evaluationId: decision.evaluationId,
    subjectId: decision.subjectId,
    durationMillis: decision.durationMillis,
    trace: decision.trace,
    obligations: decision._tag === "Allow" ? decision.obligations : [],
  };
  return decision._tag === "Allow"
    ? {
        ...base,
        _tag: "Allow",
        ...(decision.visibleFields === undefined
          ? {}
          : { visibleFields: decision.visibleFields }),
      }
    : { ...base, _tag: "Deny", reason: decision.reason };
};

/** Rebuilds a `Decision` from its (already validated) wire form. */
export const decodeDecision = (wire: DecisionWire): Decision =>
  wire._tag === "Allow"
    ? new Allow({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        visibleFields: wire.visibleFields,
        obligations: wire.obligations,
      })
    : new Deny({
        evaluationId: wire.evaluationId,
        subjectId: makeSubjectId(wire.subjectId),
        durationMillis: wire.durationMillis,
        trace: wire.trace,
        reason: wire.reason ?? "denied",
      });
