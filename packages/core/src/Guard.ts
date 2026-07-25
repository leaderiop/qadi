/**
 * Enforcement.
 *
 * `enforce` is an aspect: it wraps any Effect and fails it with
 * {@link AccessDenied} when the policy denies. The predecessor documented its
 * enforcement as an adapter wrapper that ran at resolution time, but it was
 * really an eight-argument function you had to remember to call. Here the
 * subject, resolvers and identifier generator all travel in the environment, so
 * the call site is `handler.pipe(Guard.enforce(canEdit))`.
 */
import * as Effect from "effect/Effect";
import type { Decision } from "./Decision.ts";
import { isAllowed, project } from "./Decision.ts";
import { AccessDenied } from "./Errors.ts";
import type { EvaluationError } from "./Errors.ts";
import type { EvaluateOptions, EvaluationServices } from "./Evaluate.ts";
import { evaluate } from "./Evaluate.ts";
import type { Policy } from "./Policy.ts";

/** Evaluates a policy and returns the full decision, including its trace. */
export const decide = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<Decision, EvaluationError, EvaluationServices> =>
  evaluate(policy, options);

/** Evaluates a policy down to a boolean. */
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
export const assert = (
  policy: Policy,
  options?: EvaluateOptions,
): Effect.Effect<void, EvaluationError | AccessDenied, EvaluationServices> =>
  Effect.flatMap(evaluate(policy, options), (decision) =>
    isAllowed(decision)
      ? Effect.void
      : Effect.fail(
          new AccessDenied({
            subjectId: decision.subjectId,
            policyTag: policy._tag,
            reason: decision.reason,
          }),
        ),
  );

/**
 * Guards an effect with a policy.
 *
 * The wrapped effect runs only if the policy allows; otherwise the result fails
 * with {@link AccessDenied} and the effect is never started.
 *
 * @example
 * ```ts
 * const handler = updateDocument(id).pipe(Guard.enforce(canEditDocument))
 * ```
 */
export const enforce =
  (policy: Policy, options?: EvaluateOptions) =>
  <A, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<A, E | EvaluationError | AccessDenied, R | EvaluationServices> =>
    Effect.flatMap(assert(policy, options), () => self);

/**
 * Guards an effect and projects its result down to the visible fields.
 *
 * This is where field-level authorization earns its keep: the policy decides
 * both *whether* the caller may read the record and *which* of its fields come
 * back, in one pass.
 */
export const enforceProjected =
  (policy: Policy, options?: EvaluateOptions) =>
  <A extends Record<string, unknown>, E, R>(
    self: Effect.Effect<A, E, R>,
  ): Effect.Effect<
    Partial<A>,
    E | EvaluationError | AccessDenied,
    R | EvaluationServices
  > =>
    Effect.flatMap(
      evaluate(policy, options),
      // Annotated because the two branches otherwise infer as a union that TS
      // will not widen to the declared error channel.
      (decision): Effect.Effect<Partial<A>, E | AccessDenied, R> =>
        isAllowed(decision)
          ? Effect.map(self, (value) => project(decision, value))
          : Effect.fail(
              new AccessDenied({
                subjectId: decision.subjectId,
                policyTag: policy._tag,
                reason: decision.reason,
              }),
            ),
    );

/** Keeps only the elements a policy allows, evaluated per element as resource. */
export const filter = <A extends Record<string, unknown>>(
  policy: Policy,
  items: ReadonlyArray<A>,
): Effect.Effect<ReadonlyArray<A>, EvaluationError, EvaluationServices> =>
  Effect.map(
    Effect.forEach(items, (item) =>
      Effect.map(evaluate(policy, { resource: item }), (d) => ({ item, allowed: isAllowed(d) })),
    ),
    (results) => results.filter((r) => r.allowed).map((r) => r.item),
  );
