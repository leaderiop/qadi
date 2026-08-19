/**
 * Resolves subject attributes that are not already on the subject.
 *
 * The evaluator consults the subject's own `attributes` first and calls this
 * service only on a miss, at the node that needs it. The predecessor resolved
 * every attribute in the whole policy tree up front, which destroyed
 * short-circuiting: an `anyOf` whose first branch allowed still paid for every
 * lookup in every other branch.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import type * as Schedule from "effect/Schedule";
import type { AttributeResolveError } from "./Errors.ts";

export interface AttributeResolverShape {
  /**
   * Resolves an attribute for the given subject.
   *
   * Returning `undefined` means "no value", which is a legitimate answer and
   * will simply fail the matcher. Failing the Effect means the lookup itself
   * broke, which propagates as an evaluation error rather than a denial.
   */
  readonly resolve: (
    subjectId: string,
    attribute: string,
  ) => Effect.Effect<unknown, AttributeResolveError>;
}

export class AttributeResolver extends Context.Service<
  AttributeResolver,
  AttributeResolverShape
>()("qadi/AttributeResolver") {
  /** One-step accessor. `use` requires its callback to return an Effect. */
  static readonly resolve = (subjectId: string, attribute: string) =>
    AttributeResolver.use((r) => r.resolve(subjectId, attribute));
}

/**
 * Resolves nothing.
 *
 * The default. Policies that reference only attributes already present on the
 * subject need no resolver, and this layer lets them run without one.
 */
export const AttributeResolverNone: Layer.Layer<AttributeResolver> = Layer.succeed(
  AttributeResolver,
  { resolve: () => Effect.succeed(undefined) },
);

/** Resolves from a static table. Useful for tests and fixed configuration. */
export const attributeResolverFromRecord = (
  table: Readonly<Record<string, unknown>>,
): Layer.Layer<AttributeResolver> =>
  Layer.succeed(AttributeResolver, {
    resolve: (_subjectId, attribute) => Effect.succeed(table[attribute]),
  });

/**
 * Wraps a resolver layer so every `resolve` call retries on
 * `AttributeResolveError` under the given schedule before surfacing it.
 *
 * Additive, not a change to {@link AttributeResolverShape}: a schedule that
 * exhausts still surfaces the same `AttributeResolveError` it always would,
 * just after retrying. Every shipped resolver here is a static in-memory
 * fixture and never fails this way, so nothing needs this today — it exists
 * for the resolver this module's own doc comment anticipates, "backed by a
 * graph database or a remote service", which does.
 */
export const attributeResolverRetrying =
  (schedule: Schedule.Schedule<unknown, AttributeResolveError>) =>
  (layer: Layer.Layer<AttributeResolver>): Layer.Layer<AttributeResolver> =>
    Layer.effect(
      AttributeResolver,
      Effect.map(Layer.build(layer), (context) => {
        const inner = Context.get(context, AttributeResolver);
        return {
          resolve: (subjectId: string, attribute: string) =>
            inner.resolve(subjectId, attribute).pipe(Effect.retry(schedule)),
        };
      }),
    );
