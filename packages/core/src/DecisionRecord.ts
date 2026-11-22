/**
 * One complete, observable evaluation: everything `evaluate` knew, in one value.
 *
 * The library had no such value. A `Decision` carries `evaluationId`,
 * `subjectId`, `durationMillis`, `trace` and the verdict's payload — but not the
 * `action`, not the `resource`, and no wall-clock time, so a consumer could not
 * reconstruct the question that was asked. Worse, it carries only
 * `trace.policyTag`, a string, while `explain` takes a `Policy`
 * ([Explanation.ts](./Explanation.ts)) — so the one thing a reader most wants
 * from a denial, the explanation, was unreachable from the denial itself.
 *
 * `DecisionEntry` in `@qadi/react`'s hydration already paired a policy with its
 * decision for a neighbouring purpose. This generalises that pairing into core
 * rather than inventing a second shape for it.
 *
 * **No `environment` field.** Core cannot know whether it is running in a
 * browser, on a server, or in an edge worker, and a field it would have to guess
 * at is a field that is wrong somewhere. The sink implementation does know, so
 * it supplies the environment, and it sits beside the record in
 * {@link StoredRecord}, never inside it.
 */
import * as Data from "effect/Data";
import * as Order from "effect/Order";
import type { Decision } from "./Decision.ts";
import type { EvaluationError } from "./Errors.ts";
import type {
  decisionRecordFields,
  obligationRecordFields,
  ObligationOutcomeSchema,
} from "./SinkRecordFields.ts";
import { DECISION_RECORD_TAG, OBLIGATION_RECORD_TAG } from "./SinkRecordFields.ts";

/** The evaluation produced a verdict. */
export class Decided extends Data.TaggedClass("Decided")<{
  readonly decision: Decision;
}> {}

/**
 * A lookup this evaluation depended on broke, so there is no verdict.
 *
 * Not a denial, and the distinction is the whole reason this variant exists
 * ([INV-QD-006](../../../spec/invariants.md#inv-qd-006-failure-is-not-denial)).
 * An `EvaluationError` leaves `evaluate` through the error channel and, before
 * this, reached no observer at all: no span attribute, no metric, no log. A
 * consumer counting denials would have counted an attribute-store outage as
 * zero of everything.
 */
export class Failed extends Data.TaggedClass("Failed")<{
  readonly error: EvaluationError;
}> {}

/**
 * What an evaluation came to.
 *
 * A closed two-tag union rather than an optional `decision` beside an optional
 * `error`: exactly one of them is always present, and a shape permitting both or
 * neither would push a "cannot happen" branch onto every consumer.
 */
export type DecisionOutcome = Decided | Failed;

/**
 * One evaluation, as a sink receives it.
 *
 * The fields are {@link decisionRecordFields}'s `Type` plus `outcome`, so the
 * record's field list and the version-2 wire's are one statement and cannot
 * differ (ARCH-71, ADR-QD-135). Their documentation is on that struct's entries.
 * `outcome` is added here because in memory it is `Decided | Failed`, which the
 * wire carries as its own tagged value.
 */
export class DecisionRecord extends Data.TaggedClass(DECISION_RECORD_TAG)<
  typeof decisionRecordFields.Type & { readonly outcome: DecisionOutcome }
> {}

/**
 * What happened at the obligation gate, for an allow that carried duties.
 *
 * **Per decision, not per obligation, and that is the honest limit.**
 * `ObligationHandler` receives one `ObligationDischarge` (the question and the
 * allow, so every duty at once) and returns `void`, so the library observes
 * that a set was presented to a handler and that the handler succeeded or
 * failed — never which individual duty was met. Reporting per-obligation state
 * would mean changing the handler contract again, and a handler that reported
 * falsely would still be unverifiable.
 *
 * Emitted only when the allow carried obligations, so a decision with none adds
 * no traffic.
 *
 * It closes a real gap in the log rather than decorating one: a binding
 * obligation nobody discharges turns an **allow** into a refusal at the
 * enforcement boundary, and until this the log showed such a request as `ALLOW`
 * while the caller received an error.
 *
 * Its fields are {@link obligationRecordFields}'s `Type`, stated once and shared
 * with the wire (ARCH-71, ADR-QD-135); their documentation is on that struct's
 * entries.
 */
export class ObligationRecord extends Data.TaggedClass(OBLIGATION_RECORD_TAG)<
  typeof obligationRecordFields.Type
> {}

/**
 * `Discharged` — a handler ran and succeeded.
 * `HandlerFailed` — a handler ran and failed with its own error.
 * `Refused` — no handler, and a binding obligation was present, so enforcement
 * refused with `UndischargedObligation`.
 * `NotRequired` — no handler, and every obligation was advisory, so nothing
 * blocked.
 *
 * The literals are stated once, in `SinkRecordFields.ts`, where the wire checks
 * them too.
 */
export type ObligationOutcome = typeof ObligationOutcomeSchema.Type;

/** Anything `evaluate` or an enforcing entry point hands a sink. */
export type SinkRecord = DecisionRecord | ObligationRecord;

/**
 * A record as a decision log stores it: the producer's environment beside the
 * record core reported.
 *
 * It is the wire's `{ environment, record }` (ADR-QD-097), true in memory too
 * (ADR-QD-171): one `Data.Class`, so `Equal`, `Hash` and `.pipe` come with it, and
 * a reader narrows on `stored.record._tag` to reach `policy` on a decision or
 * `obligationIds` on an obligation gate. The record is held by reference, never
 * copied or read, so nothing is lost to a spread and nothing fires on the way in.
 */
export class StoredRecord extends Data.Class<{
  /**
   * Where this evaluation happened — `"Server"`, `"Client"`, whatever a caller
   * names its runtime.
   *
   * A plain `string`, not a closed union, and the distinction from the rest of
   * this library is worth stating: nothing branches on this value. It is a
   * label a reader sees, not an input a decision is computed from, so an
   * unrecognised one degrades to an unfamiliar badge rather than to a wrong
   * answer. Closed unions are reserved here for values that decide something.
   */
  readonly environment: string;
  /** What core reported, unchanged. */
  readonly record: SinkRecord;
}> {}

/**
 * The one order a stored record is read in (INV-QD-039): by `at`, an unknown
 * (`NaN`) time after every known one, and two unknowns equal.
 *
 * Equal unknowns are what "keep arrival order" means: a stable sort leaves two
 * of them where they arrived, and `Order.isGreaterThan` says neither belongs
 * after the other. `at` comes off a `Clock` in whichever process made the
 * decision, and a merged log holds several, so it can be anything — including
 * `NaN` from a hand-built or hostile record, which `a.at - b.at` would sort
 * wherever it happened to land. `-0` and `0` compare equal, as `<` and `>` say.
 *
 * It was written twice before — devtools' `compareByAt` for a merged backlog
 * and `isAfter` for the timeline's insertion — linked only by a comment saying
 * they agreed. Both now read this one, and so does the decision log's own
 * `snapshot`, which is why it lives in core beside the `at` field it orders.
 * Each reader orders what it holds: a record by this, a {@link StoredRecord}
 * by {@link storedRecordOrder}.
 */
export const sinkRecordOrder: Order.Order<SinkRecord> = Order.make((a, b) => {
  const aUnknown = Number.isNaN(a.at);
  const bUnknown = Number.isNaN(b.at);
  if (aUnknown || bUnknown) return aUnknown === bUnknown ? 0 : aUnknown ? 1 : -1;
  return a.at < b.at ? -1 : a.at > b.at ? 1 : 0;
});

/** {@link sinkRecordOrder} over the record a {@link StoredRecord} holds. */
export const storedRecordOrder: Order.Order<StoredRecord> = Order.mapInput(
  sinkRecordOrder,
  (stored) => stored.record,
);
