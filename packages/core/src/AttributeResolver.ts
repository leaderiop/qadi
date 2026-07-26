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
