/**
 * Resolves a policy's `HasCustom` node — a named, externally-registered
 * predicate for logic the built-in matchers cannot express.
 *
 * A `HasCustom` node stores a name, never a function (ADR-QD-055): the policy
 * tree stays serializable, and the actual logic lives here, behind a service,
 * the same shape `AttributeResolver` already uses. `CustomPredicateNone`
 * denying when nothing is wired is the same fail-closed default every other
 * required service pays for; a registry that *is* wired but has no entry for a
 * given name fails instead of denying, because that is a wiring mistake, not a
 * legitimate answer — the same distinction `AttributeResolver.resolve`'s own
 * doc comment draws between an absent value and a broken lookup.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import type * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import type { AuthSubject } from "./AuthSubject.ts";
import { CustomPredicateError } from "./Errors.ts";
import { portRetriesTotal } from "./PortMetrics.ts";
import type { Resource } from "./Resource.ts";
import { wrapService } from "./RetryingLayer.ts";

export interface CustomPredicateShape {
  /**
   * Which implementation this is — same purpose and the same "nothing may
   * branch on it" rule as {@link AttributeResolverShape.name}.
   */
  readonly name?: string | undefined;
  /**
   * Evaluates the named predicate.
   *
   * `params` is whatever `hasCustom`'s caller passed, handed over exactly as
   * decoded from the policy — this service, not the policy tree, is where a
   * caller validates its shape.
   */
  readonly evaluate: (
    name: string,
    subject: AuthSubject,
    resource: Resource | undefined,
    params: unknown,
  ) => Effect.Effect<boolean, CustomPredicateError>;
}

export class CustomPredicate extends Context.Service<
  CustomPredicate,
  CustomPredicateShape
>()("qadi/CustomPredicate") {
  /** One-step accessor. `use` requires its callback to return an Effect. */
  static readonly evaluate = (
    name: string,
    subject: AuthSubject,
    resource: Resource | undefined,
    params: unknown,
  ) => CustomPredicate.use((r) => r.evaluate(name, subject, resource, params));
}

/**
 * Registers nothing.
 *
 * The default. Every name denies — the same fail-closed shape as
 * `AttributeResolverNone`. This is a `succeed`, not a `fail`, for the same
 * reason: an application that never reaches for `hasCustom` should be able to
 * wire this in and never observe it again.
 */
export const CustomPredicateNone: Layer.Layer<CustomPredicate> = Layer.succeed(CustomPredicate, {
  name: "CustomPredicateNone",
  evaluate: () => Effect.succeed(false),
});

/**
 * Resolves from a static table of named predicate functions.
 *
 * A name absent from `table` **fails** rather than denies: unlike
 * `CustomPredicateNone`'s blanket absence, a populated table missing one
 * entry is a wiring mistake — most likely a typo in `hasCustom`'s `name` —
 * and "failure is not denial" applies to a misconfigured registry exactly as
 * it does to a broken attribute lookup.
 */
export const customPredicateFromRecord = (
  table: Readonly<
    Record<
      string,
      (
        subject: AuthSubject,
        resource: Resource | undefined,
        params: unknown,
      ) => Effect.Effect<boolean, CustomPredicateError>
    >
  >,
): Layer.Layer<CustomPredicate> =>
  Layer.succeed(CustomPredicate, {
    name: "customPredicateFromRecord",
    evaluate: (name, subject, resource, params) => {
      const registered = table[name];
      return registered === undefined
        ? Effect.fail(
            new CustomPredicateError({
              name,
              reason: "no predicate is registered under this name",
            }),
          )
        : registered(subject, resource, params);
    },
  });

/**
 * Wraps a registry layer so every `evaluate` call retries on
 * `CustomPredicateError` under the given schedule before surfacing it.
 *
 * Mirrors `attributeResolverRetrying` exactly — see its own doc comment for
 * why this is additive rather than a change to `CustomPredicateShape`.
 */
export const customPredicateRetrying =
  (schedule: Schedule.Schedule<unknown, CustomPredicateError>) =>
  (layer: Layer.Layer<CustomPredicate>): Layer.Layer<CustomPredicate> =>
    wrapService(CustomPredicate, layer, (inner) => ({
      name: `${inner.name ?? "?"} (retrying)`,
      evaluate: (name, subject, resource, params) =>
        inner
          .evaluate(name, subject, resource, params)
          .pipe(
            Effect.tapError(() => Metric.update(portRetriesTotal, "CustomPredicate")),
            Effect.retry(schedule),
          ),
    }));

/**
 * Wraps a registry layer so no more than `permits` calls to `evaluate` run at
 * once, queuing the rest. Mirrors `attributeResolverBounded` exactly.
 */
export const customPredicateBounded =
  (permits: number) =>
  (layer: Layer.Layer<CustomPredicate>): Layer.Layer<CustomPredicate> =>
    Layer.effect(
      CustomPredicate,
      Effect.gen(function* () {
        const semaphore = yield* Semaphore.make(permits);
        const inner = yield* Layer.build(layer).pipe(
          Effect.map((context) => Context.get(context, CustomPredicate)),
        );
        return {
          name: `${inner.name ?? "?"} (bounded ${permits})`,
          evaluate: (name, subject, resource, params) =>
            Semaphore.withPermit(semaphore)(inner.evaluate(name, subject, resource, params)),
        };
      }),
    );
