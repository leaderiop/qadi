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
 * at is a field that is wrong somewhere. The environment is stamped by the sink
 * implementation, which does know.
 */
import * as Data from "effect/Data";
import type { Decision } from "./Decision.ts";
import type { CacheOutcome } from "./DecisionCache.ts";
import type { EvaluationError } from "./Errors.ts";
import type { Policy } from "./Policy.ts";
import type { Resource } from "./Resource.ts";

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

export interface DecisionRecord {
  readonly _tag: "Decision";
  readonly evaluationId: string;
  /**
   * When evaluation started, in epoch millis, from `Clock`.
   *
   * `Clock` rather than `Date.now()` so records are reproducible under
   * `TestClock` — the same reason durations are (see [Decision.ts](./Decision.ts)).
   * The start rather than the end, so a record's order matches the order the
   * questions were asked; the end is `at + durationMillis` for a `Decided` one.
   */
  readonly at: number;
  readonly policy: Policy;
  /** The resource under consideration, if any. */
  readonly resource?: Resource | undefined;
  /** What the caller was doing, if it said. */
  readonly action?: string | undefined;
  /**
   * How the decision cache answered, when one was wired.
   *
   * **Absent means no cache was consulted at all**, which is a different fact
   * from `"miss"` — that one says the cache was asked and did not have it. A
   * single optional field keeps the two apart without a third tag.
   *
   * Observability only. A hit still produces the same verdict, trace and fields
   * as a miss ([INV-QD-025](../../../spec/invariants.md)); this reports how the
   * answer was reached, in the same category as `durationMillis`.
   */
  readonly cache?: CacheOutcome | undefined;
  readonly outcome: DecisionOutcome;
}

/**
 * What happened at the obligation gate, for an allow that carried duties.
 *
 * **Per decision, not per obligation, and that is the honest limit.**
 * `ObligationHandler` receives the whole array and returns `void`, so the
 * library observes that a set was presented to a handler and that the handler
 * succeeded or failed — never which individual duty was met. Reporting
 * per-obligation state would mean changing the handler contract, and a handler
 * that reported falsely would still be unverifiable.
 *
 * Emitted only when the allow carried obligations, so a decision with none adds
 * no traffic.
 *
 * It closes a real gap in the log rather than decorating one: a binding
 * obligation nobody discharges turns an **allow** into a refusal at the
 * enforcement boundary, and until this the log showed such a request as `ALLOW`
 * while the caller received an error.
 */
export interface ObligationRecord {
  readonly _tag: "Obligations";
  /** The decision these duties came from, so the two rows pair. */
  readonly evaluationId: string;
  readonly at: number;
  readonly outcome: ObligationOutcome;
  readonly obligationIds: ReadonlyArray<string>;
}

/**
 * `Discharged` — a handler ran and succeeded.
 * `HandlerFailed` — a handler ran and failed with its own error.
 * `Refused` — no handler, and a binding obligation was present, so enforcement
 * refused with `UndischargedObligation`.
 * `NotRequired` — no handler, and every obligation was advisory, so nothing
 * blocked.
 */
export type ObligationOutcome =
  | "Discharged"
  | "HandlerFailed"
  | "Refused"
  | "NotRequired";

/** Anything `evaluate` or an enforcing entry point hands a sink. */
export type SinkRecord = DecisionRecord | ObligationRecord;
