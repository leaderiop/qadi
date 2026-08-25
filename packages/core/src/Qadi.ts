/**
 * Enforcement.
 *
 * `enforce` is an aspect: it wraps any Effect and fails it with
 * {@link AccessDenied} when the policy denies. The predecessor documented its
 * enforcement as an adapter wrapper that ran at resolution time, but it was
 * really an eight-argument function you had to remember to call. Here the
 * subject, resolvers and identifier generator all travel in the environment, so
 * the call site is `handler.pipe(Qadi.enforce(canEdit))`.
 *
 * The line that divides this module is **reporting versus enforcing**.
 * `decide` and `check` report: they hand back an answer and run nothing, so an
 * obligation they cannot discharge is the caller's to read off the decision.
 * `assert`, `enforce`, `enforceProjected` and `filter` enforce: each either runs
 * work or hands over data, so each must refuse an allow whose obligation nobody
 * has met (ADR-QD-019).
 */
import * as Brand from "effect/Brand";
import * as Clock from "effect/Clock";
import * as Effect from "effect/Effect";
import * as Option from "effect/Option";
import * as Stream from "effect/Stream";
import type { Authorized } from "./Authorized.ts";
import type { Allow, Decision } from "./Decision.ts";
import { isAllowed, project } from "./Decision.ts";
import type { ObligationOutcome } from "./DecisionRecord.ts";
import { ObligationRecord } from "./DecisionRecord.ts";
import { DecisionSink } from "./DecisionSink.ts";
import { AccessDenied, UndischargedObligation } from "./Errors.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluateOptions, EvaluationServices } from "./Evaluate.ts";
import { evaluate } from "./Evaluate.ts";
import type { Obligation } from "./Obligation.ts";
import { bindingObligations } from "./Obligation.ts";
import type { Permission } from "./Permission.ts";
import type { Policy } from "./Policy.ts";
import type { Resource } from "./Resource.ts";

/**
 * Discharges the obligations attached to an allow.
 *
 * Runs *before* the guarded effect, because an obligation is a condition on the
 * permission rather than a follow-up to it: if discharging fails, the protected
 * work must not happen.
 */
export interface ObligationHandler<E = never, R = never> {
  (obligations: ReadonlyArray<Obligation>): Effect.Effect<void, E, R>;
}

export interface EnforceOptions<E = never, R = never> extends EvaluateOptions {
  /**
   * How to discharge obligations. Without one, an allow carrying a binding
   * obligation fails with {@link UndischargedObligation} rather than proceeding.
   */
  readonly onObligations?: ObligationHandler<E, R>;
}

/** Errors any enforcing entry point can produce. */
export type EnforcementError = EvaluationError | AccessDenied | UndischargedObligation;

const discharge = <E, R>(
  decision: Allow,
  handler: ObligationHandler<E, R> | undefined,
): Effect.Effect<void, UndischargedObligation | E, R> =>
  Effect.gen(function* () {
    // Nothing to discharge and nothing to report, so an allow carrying no duties
    // costs exactly what it did before this existed.
    if (decision.obligations.length === 0) return;

    // Read the same way `evaluate` reads it: optional, contributing nothing to
    // the requirements, and unable to change the outcome (INV-QD-035).
    const sink = yield* Effect.serviceOption(DecisionSink);
    const at = yield* Clock.currentTimeMillis;
    const obligationIds = decision.obligations.map((o) => o.id);

    const emit = (outcome: ObligationOutcome): Effect.Effect<void> =>
      Option.isSome(sink)
        ? Effect.catchCause(
            sink.value.record(
              new ObligationRecord({
                evaluationId: decision.evaluationId,
                at,
                outcome,
                obligationIds,
              }),
            ),
            () => Effect.void,
          )
        : Effect.void;

    // The handler sees advisory obligations too: advice is information the caller
    // may act on, and only its *binding* siblings can block.
    if (handler !== undefined) {
      return yield* handler(decision.obligations).pipe(
        // `tapError` before `tap`, so a handler that fails reports
        // `HandlerFailed` and then fails unchanged — the sink cannot convert a
        // caller's error into a success or vice versa.
        Effect.tapError(() => emit("HandlerFailed")),
        Effect.tap(() => emit("Discharged")),
      );
    }

    const binding = bindingObligations(decision.obligations);
    if (binding.length === 0) {
      // Advisory only, so nothing blocked — distinct from having been met.
      yield* emit("NotRequired");
      return;
    }

    // The case the decision log could not show: this request was recorded as an
    // ALLOW and the caller received an error.
    yield* emit("Refused");
    return yield* Effect.fail(
      new UndischargedObligation({
        subjectId: decision.subjectId,
        obligationIds: binding.map((o) => o.id),
      }),
    );
  });

/**
 * Evaluates, refuses a denial, and discharges what the allow obliges.
 *
 * The single place the enforcing entry points share, so none of them can forget
 * half the rule.
 */
const permitted = <E = never, R = never>(
  policy: Policy,
  options?: EnforceOptions<E, R>,
): Effect.Effect<Allow, EnforcementError | E, EvaluationServices | R> =>
  Effect.flatMap(
    evaluate(policy, options),
    (decision): Effect.Effect<Allow, EnforcementError | E, R> =>
      isAllowed(decision)
        ? Effect.as(discharge(decision, options?.onObligations), decision)
        : Effect.fail(
            new AccessDenied({
              subjectId: decision.subjectId,
              policyTag: policy._tag,
              reason: decision.reason,
              trace: decision.trace,
            }),
          ),
  );

/**
 * Evaluates a policy and returns the full decision, including its trace.
 *
 * Reports rather than enforces: any obligations are on the decision for the
 * caller to discharge, and nothing here checks that they did.
 */
export const decide = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<Decision, EvaluationError, EvaluationServices> =>
  evaluate(policy, options);

/**
 * Evaluates a policy down to a boolean.
 *
 * Reports rather than enforces, and a boolean has no room for an obligation —
 * so a policy carrying one should not be asked this question. Use `decide`.
 */
export const check = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<boolean, EvaluationError, EvaluationServices> =>
  Effect.map(evaluate(policy, options), isAllowed);

/**
 * Fails with {@link AccessDenied} unless the policy allows.
 *
 * Useful as a standalone precondition when there is no effect to wrap.
 */
export const assert = <E = never, R = never>(
  policy: Policy,
  options?: EnforceOptions<E, R>,
): Effect.Effect<void, EnforcementError | E, EvaluationServices | R> =>
  Effect.asVoid(permitted(policy, options));

/**
 * Guards an effect with a policy.
 *
 * The wrapped effect runs only if the policy allows *and* its obligations have
 * been discharged; otherwise the result fails and the effect is never started.
 *
 * @example
 * ```ts
 * const handler = updateDocument(id).pipe(Qadi.enforce(canEditDocument))
 * ```
 */
export const enforce =
  <EO = never, RO = never>(policy: Policy, options?: EnforceOptions<EO, RO>) =>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    Effect.flatMap(permitted(policy, options), () => self);

/**
 * Guards an effect and projects its result down to the visible fields.
 *
 * This is where field-level authorization earns its keep: the policy decides
 * both *whether* the caller may read the record and *which* of its fields come
 * back, in one pass.
 */
export const enforceProjected =
  <EO = never, RO = never>(policy: Policy, options?: EnforceOptions<EO, RO>) =>
  <A extends Resource, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    Partial<A>,
    E | EnforcementError | EO,
    R | EvaluationServices | RO
  > =>
    Effect.flatMap(permitted(policy, options), (decision) =>
      Effect.map(self, (value) => project(decision, value)),
    );

/**
 * Guards a resource-scoped handler with a policy, and hands the handler a
 * witness that the check succeeded.
 *
 * Built on `enforce`, not a parallel evaluation path — the same obligation
 * discharge and denial handling every enforcing entry point in this file
 * shares. Differs from `enforce` in shape: rather than wrapping an existing
 * effect, it takes a resource and a handler *function*, and passes the
 * resulting witness to the handler as a value rather than through the
 * environment. Per-permission distinctness falls out of `permission` being a
 * real field on {@link Authorized}, not out of `Context`'s runtime tag
 * identity — a per-permission `Context.Service` registry was tried first and
 * rejected for needing an unsound cast at retrieval (ADR-QD-035).
 *
 * **`resource` is what the policy is evaluated against**, as well as what the
 * handler receives. It was previously only the latter: `enforce(policy,
 * options)` ran with `options.resource`, which every caller left unset, so a
 * resource-scoped policy was evaluated with no resource at all. A matcher
 * comparing against an absent resource does not deny — `neq` on `undefined` is
 * *true* — so a policy written to refuse a mismatched tenant allowed one
 * ([INV-QD-032](../../../spec/invariants.md#inv-qd-032-a-guarded-resource-is-the-evaluated-resource)).
 *
 * An explicit `options.resource` is overridden rather than merged. Two
 * channels for one value is what caused this; the handler, the witness and the
 * evaluation now cannot disagree about which resource was checked.
 */
export const guard =
  <P extends Permission, EO = never, RO = never>(
    permission: P,
    policy: Policy,
    options?: EnforceOptions<EO, RO>,
  ) =>
  <A extends Resource, B, E, R>(
    resource: A,
    handler: (authorized: Authorized<P>, resource: A) => Effect.Effect<B, E, R>,
  ): Effect.Effect<B, E | EnforcementError | EO, R | EvaluationServices | RO> =>
    enforce(policy, { ...options, resource })(
      handler(Brand.nominal<Authorized<P>>()({ permission }), resource),
    );

/**
 * Keeps only the elements a policy allows, evaluated per element as resource.
 *
 * Enforces rather than reports, because it hands back data. An element whose
 * allow carries a binding obligation fails the call rather than being silently
 * dropped: dropping it would report a wiring mistake as a denial, which
 * [INV-QD-006] exists to prevent.
 *
 * `options.concurrency` does double duty here, deliberately: it still governs
 * each item's own `allOf`/`anyOf`/`rules` fan-out exactly as `EvaluateOptions`
 * documents, and it now also governs the fan-out **across items**. The two are
 * safe to share one knob because, unlike a composite's children, the items
 * have no short-circuit relationship — nothing here ever depends on which
 * item finished first, so there is no INV-QD-005-shaped invariant a second,
 * independent option would need to preserve.
 */
interface FilterVerdict<A> {
  readonly item: A;
  readonly allowed: boolean;
}

/**
 * Evaluates one item against `policy` and discharges its obligations if it
 * allows. The one place `filter` and `filterStream` share this logic, so an
 * item's fate can't be decided one way for the array form and another for the
 * streamed one.
 */
const decideOne = <A extends Resource, EO, RO>(
  policy: Policy,
  item: A,
  options: EnforceOptions<EO, RO> | undefined,
): Effect.Effect<FilterVerdict<A>, EvaluationError | UndischargedObligation | EO, EvaluationServices | RO> =>
  Effect.flatMap(
    evaluate(policy, { ...options, resource: item }),
    (decision): Effect.Effect<FilterVerdict<A>, UndischargedObligation | EO, RO> =>
      isAllowed(decision)
        ? Effect.as(discharge(decision, options?.onObligations), { item, allowed: true })
        : Effect.succeed({ item, allowed: false }),
  );

export const filter = <A extends Resource, EO = never, RO = never>(
  policy: Policy,
  items: ReadonlyArray<A>,
  options?: EnforceOptions<EO, RO>,
): Effect.Effect<
  ReadonlyArray<A>,
  EvaluationError | UndischargedObligation | EO,
  EvaluationServices | RO
> =>
  Effect.map(
    Effect.forEach(items, (item) => decideOne(policy, item, options), {
      concurrency: options?.concurrency,
    }),
    (results) => results.filter((r) => r.allowed).map((r) => r.item),
  );

/**
 * The streamed sibling of `filter`, for a collection too large to hold in
 * memory as a `ReadonlyArray` — or too large to wait on in full before the
 * first admitted item can be used.
 *
 * Additive: `filter` is unchanged and stays the default, least-surprising
 * entry point for the common case of "a collection I already have in hand".
 * Reach for this one when `items` is itself a stream — paginated rows from a
 * database, say — and the caller wants to start consuming admitted items as
 * they're decided rather than after every one has been.
 *
 * Shares `decideOne` with `filter`, so the two can never disagree about who
 * passes. `options.concurrency` does the same double duty documented on
 * `filter` — bounding both this stream's own fan-out and each item's
 * `allOf`/`anyOf`/`rules` fan-out — for the same reason: nothing here depends
 * on which item is decided first, so there is no short-circuit invariant a
 * second, independent knob would need to preserve.
 */
export const filterStream = <A extends Resource, E2 = never, R2 = never, EO = never, RO = never>(
  policy: Policy,
  items: Stream.Stream<A, E2, R2>,
  options?: EnforceOptions<EO, RO>,
): Stream.Stream<
  A,
  EvaluationError | UndischargedObligation | EO | E2,
  EvaluationServices | RO | R2
> =>
  items.pipe(
    Stream.mapEffect((item) => decideOne(policy, item, options), {
      concurrency: options?.concurrency,
    }),
    Stream.filter((r) => r.allowed),
    Stream.map((r) => r.item),
  );
