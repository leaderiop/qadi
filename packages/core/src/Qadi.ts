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
import * as Effect from "effect/Effect";
import type { Allow, Decision } from "./Decision.ts";
import { isAllowed, project } from "./Decision.ts";
import { AccessDenied, UndischargedObligation } from "./Errors.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluateOptions, EvaluationServices } from "./Evaluate.ts";
import { evaluate } from "./Evaluate.ts";
import type { Obligation } from "./Obligation.ts";
import { bindingObligations } from "./Obligation.ts";
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
): Effect.Effect<void, UndischargedObligation | E, R> => {
  if (decision.obligations.length === 0) return Effect.void;
  // The handler sees advisory obligations too: advice is information the caller
  // may act on, and only its *binding* siblings can block.
  if (handler !== undefined) return handler(decision.obligations);

  const binding = bindingObligations(decision.obligations);
  return binding.length === 0
    ? Effect.void
    : Effect.fail(
        new UndischargedObligation({
          subjectId: decision.subjectId,
          obligationIds: binding.map((o) => o.id),
        }),
      );
};

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
    Effect.forEach(
      items,
      (item) =>
        Effect.flatMap(
          evaluate(policy, { ...options, resource: item }),
          (
            decision,
          ): Effect.Effect<
            { readonly item: A; readonly allowed: boolean },
            UndischargedObligation | EO,
            RO
          > =>
            isAllowed(decision)
              ? Effect.as(discharge(decision, options?.onObligations), {
                  item,
                  allowed: true,
                })
              : Effect.succeed({ item, allowed: false }),
        ),
      { concurrency: options?.concurrency },
    ),
    (results) => results.filter((r) => r.allowed).map((r) => r.item),
  );
