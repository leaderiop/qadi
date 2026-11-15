/**
 * Decides against the value an enforcing entry point hands over, discharges what
 * the allow obliges, and releases the value whole or projected.
 *
 * The rule "the resource decided on is the value handed over" (ADR-QD-104,
 * INV-QD-108, ADR-QD-156) was written four ways in `Qadi.ts`, and two of them
 * silently dropped a second resource. The ten entry points in `Qadi.ts` are
 * adapters over this module by shape: the effect shapes fail a refusal with
 * `AccessDenied`, the collection shapes partition by it.
 *
 * Package-private (ADR-QD-099): not exported from the barrel or any entry point.
 */
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { Allow, Deny } from "./Decision.ts";
import { isAllowed, project } from "./Decision.ts";
import { UndischargedObligation } from "./Errors.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluationServices } from "./EvaluationServices.ts";
import { ask } from "./Lifecycle.ts";
import { bindingObligations } from "./Obligation.ts";
import type { Policy } from "./Policy.ts";
import type { EvaluateOptions, Question } from "./Question.ts";
import type { Resource } from "./Resource.ts";
import { obligationRecordFor, sinkEmitter } from "./SinkEmit.ts";

/**
 * What a handler is told when an allow carries obligations: the question the
 * allow answered, and the allow itself.
 *
 * Built once by the lifecycle (`ask`, `Lifecycle.ts`) and handed over as it
 * stands, never reconstructed: `question` is the very value the decision was
 * cached and recorded under (ADR-QD-100), so a handler learns the decided
 * subject, resource and action without reading any ambient service. That
 * includes the subject — `question.subject` is who the allow was decided for,
 * which is not necessarily whoever `CurrentSubject` holds when the handler runs.
 *
 * `decision.obligations` is the one source of the duties (ADR-QD-019: the
 * obligations on a decision are those contributed by the allow that was
 * actually returned). Constructed only by `discharge`; a test builds one with
 * `questionOf` and an `Allow`.
 *
 * **What is stable across a retry, and what is not.** A caller that retries an
 * enforcing call re-runs evaluation from the top, so the handler is called again.
 * `question` is the same each time; `decision.evaluationId` is minted per
 * attempt and so is NOT a per-request key. Two distinct requests (two approvals
 * of one document) can also share a question, so a key derived from the
 * question would merge them and silently drop a duty. A handler that must not
 * double-fire keys on the caller's own request id, captured by the
 * `onObligations` closure; the library mints no key (ADR-QD-019, as amended).
 */
export interface ObligationDischarge {
  readonly question: Question;
  readonly decision: Allow;
}

/**
 * Discharges the obligations attached to an allow.
 *
 * Runs *before* the guarded effect, because an obligation is a condition on the
 * permission rather than a follow-up to it: if discharging fails, the protected
 * work must not happen.
 *
 * **Called at least once per logical request, never exactly once.** A caller
 * that retries a failed or transiently-erroring enforcing call re-runs
 * evaluation and discharge from the top, so a handler with side effects — an
 * audit write, a "notify purpose server" webhook — WILL see the same
 * obligations again on retry (PH-01). The handler is handed the facts of the
 * request ({@link ObligationDischarge}: the subject, resource and action, and
 * the allow), and `obligation.id` is explicitly not an identity
 * (`Obligation`). A handler that must not double-fire derives its
 * idempotency key from the caller's own request id, which the `onObligations`
 * closure can capture; `decision.evaluationId` changes on every attempt.
 *
 * **Independent obligations are not parallelized by this module.** All of a
 * decision's obligations — advisory and binding alike — go to one call of
 * this handler; nothing here iterates them separately, so running two
 * unrelated obligations (say, independent log writes) concurrently is this
 * handler's own choice — `Effect.forEach` with a `concurrency` option over
 * `discharge.decision.obligations` — not a behavior the library provides for it.
 */
export interface ObligationHandler<E = never, R = never> {
  (discharge: ObligationDischarge): Effect.Effect<void, E, R>;
}

export interface EnforceOptions<E = never, R = never> extends EvaluateOptions {
  /**
   * How to discharge obligations. Without one, an allow carrying a binding
   * obligation fails with {@link UndischargedObligation} rather than proceeding.
   */
  readonly onObligations?: ObligationHandler<E, R>;
}

/**
 * Enforcement options for an entry point that hands over a value.
 *
 * `resource` is refused (`never`) because the resource decided on is the value
 * handed over, and a second one is how `enforceProjected` came to decide on one
 * record and project another, and how `guard` and `filter` came to accept and
 * silently drop one (ADR-QD-104, INV-QD-108, INV-QD-032).
 *
 * `{ resource: undefined }` is refused only under `exactOptionalPropertyTypes`,
 * and an untyped caller's resource is dropped at runtime.
 */
export type HandoverOptions<E = never, R = never> = Omit<EnforceOptions<E, R>, "resource"> & {
  readonly resource?: never;
};

const discharge = Effect.fn("qadi.discharge")(function* <E, R>(
  asked: ObligationDischarge,
  handler: ObligationHandler<E, R> | undefined,
): Effect.fn.Return<void, UndischargedObligation | E, R> {
  const { decision, question } = asked;
  // Nothing to discharge and nothing to report, so an allow carrying no duties
  // costs exactly what it did before this existed.
  if (decision.obligations.length === 0) return;

  // Read through `sinkEmitter`, the one reader of the sink: optional,
  // contributing nothing to the requirements, and unable to change the outcome
  // (INV-QD-035). After the early return, so an allow with no duties reads nothing.
  const emit = yield* sinkEmitter;
  const at = yield* Clock.currentTimeMillis;
  // Projected once, before the handler runs, so the row carries the identity
  // the allow was decided for however the handler treats the caller's resource.
  const record = obligationRecordFor(question, decision, at);

  // The handler sees advisory obligations too: advice is information the caller
  // may act on, and only its *binding* siblings can block.
  if (handler !== undefined) {
    return yield* handler(asked).pipe(
      // `tapError` before `tap`, so a handler that fails reports
      // `HandlerFailed` and then fails unchanged — the sink cannot convert a
      // caller's error into a success or vice versa.
      Effect.tapError(() => emit(record("HandlerFailed"))),
      Effect.tap(() => emit(record("Discharged"))),
    );
  }

  const binding = bindingObligations(decision.obligations);
  if (binding.length === 0) {
    // Advisory only, so nothing blocked — distinct from having been met.
    yield* emit(record("NotRequired"));
    return;
  }

  // The case the decision log could not show: this request was recorded as an
  // ALLOW and the caller received an error.
  yield* emit(record("Refused"));
  return yield* Effect.fail(
    new UndischargedObligation({
      subjectId: decision.subjectId,
      obligationIds: binding.map((o) => o.id),
    }),
  );
});

/** An allow whose obligations are discharged: the value may be handed over. */
export interface Admitted {
  readonly _tag: "Admitted";
  readonly decision: Allow;
}

/** A denial: nothing is handed over. */
export interface Refused {
  readonly _tag: "Refused";
  readonly decision: Deny;
}

/** What an enforcing call concluded, closed over the two answers a decision can give. */
export type Verdict = Admitted | Refused;

/** Narrows a verdict to the one that admits. */
export const isAdmitted = (verdict: Verdict): verdict is Admitted => verdict._tag === "Admitted";

/**
 * Evaluates, discharges what an allow obliges, and says whether the value may be handed over.
 *
 * The single place the enforcing entry points share, so none of them can forget
 * half the rule. A denial is a value here, not a failure: each adapter says what
 * a refusal means to it.
 *
 * **Discharge is not transactional with the guarded effect (DS-01).**
 * Obligations are discharged here, before the caller's effect ever runs; if
 * that effect is later interrupted or fails, the duty's side effects (an
 * audit write, a notification) have already run for work that never
 * completed. The collection entry points have the same window per item: one item's
 * `EvaluationError` fails the whole `filter` call while earlier items'
 * obligations already stand discharged. This is a stated consequence of
 * enforcement-as-an-aspect (ADR-QD-011) — discharge must precede the guarded
 * work so an undischarged duty can block it — not a defect to route around
 * silently; a caller whose obligation side effects must be undone on a later
 * failure needs its own compensation, not a rollback this module performs.
 */
export const verdictOf = <E = never, R = never>(
  policy: Policy,
  options: EnforceOptions<E, R> | undefined,
): Effect.Effect<
  Verdict,
  EvaluationError | UndischargedObligation | E,
  EvaluationServices | R
> =>
  Effect.flatMap(
    ask(policy, options),
    ({ question, decision }): Effect.Effect<Verdict, UndischargedObligation | E, R> =>
      isAllowed(decision)
        ? Effect.map(
            discharge({ question, decision }, options?.onObligations),
            (): Verdict => ({ _tag: "Admitted", decision }),
          )
        : Effect.succeed({ _tag: "Refused", decision }),
  );

/**
 * Drops any runtime `resource` from the options.
 *
 * With {@link decidedOn}, the only place a resource enters or leaves enforcement
 * options. `HandoverOptions` refuses one at compile time; this is what an
 * untyped caller meets at runtime, so an entry point that decides with no
 * resource, or with the one it hands over, never evaluates another.
 */
export const resourceFree = <E, R>(options: HandoverOptions<E, R> = {}): EnforceOptions<E, R> => {
  const { resource: _resource, ...rest } = options;
  return rest;
};

/**
 * The options with the handed-over value as the resource to decide on.
 *
 * The positional value is written last, so an untyped caller's resource never wins.
 */
export const decidedOn = <E, R>(
  options: HandoverOptions<E, R> | undefined,
  value: Resource,
): EnforceOptions<E, R> => ({ ...resourceFree(options), resource: value });

/** How an admitted value is released: whole, or projected to the allow's visible fields. */
export type Release = "Whole" | "Projected";

/**
 * How an admitted value is released: whole, or projected to the allow's visible fields.
 *
 * The only place `project` is applied. `Whole` returns the caller's own
 * reference; a member missing from this table is a compile error, as in
 * `FieldLattice.ts` (ADR-QD-092).
 */
export const RELEASE: {
  readonly [K in Release]: <A extends Resource>(
    decision: Allow,
    value: A,
  ) => K extends "Whole" ? A : Partial<A>;
} = {
  Whole: (_decision, value) => value,
  Projected: (decision, value) => project(decision, value),
};

/**
 * Decides one value an entry point may hand over, discharges what its allow obliges, and
 * releases it, or says it was refused.
 *
 * The one per-item step the array and stream forms of a collection share, so an item's
 * fate cannot differ between them (BEH-QD-050). A refusal is a value, not an error,
 * because a collection partitions (JA-04): `Result.failVoid` for a refused item,
 * `Result.succeed` of what `release` made of an admitted one.
 *
 * The scoped options keep `concurrency`, which also bounds each item's own composite
 * fan-out; `HandoverOptions` has no `resource`, so the item is the resource of its own
 * decision and is released under that decision alone.
 */
export const handOver = <A extends Resource, B, E = never, R = never>(
  policy: Policy,
  value: A,
  options: HandoverOptions<E, R> | undefined,
  release: (decision: Allow, value: A) => B,
): Effect.Effect<
  Result.Result<B, void>,
  EvaluationError | UndischargedObligation | E,
  EvaluationServices | R
> =>
  Effect.map(verdictOf(policy, decidedOn(options, value)), (verdict) =>
    isAdmitted(verdict) ? Result.succeed(release(verdict.decision, value)) : Result.failVoid,
  );
