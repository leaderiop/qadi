/**
 * The `Layer.effect`/`Layer.build`/`Context.get` ceremony shared by
 * `attributeResolverRetrying` (`AttributeResolver.ts`) and
 * `relationshipResolverRetrying` (`RelationshipResolver.ts`) — the part that
 * was byte-for-byte identical between the two, unlike the actual
 * retry-wrapping logic, which differs by method name and arity
 * (`resolve(subjectId, attribute)` vs `check(request)`) and stays local to
 * each combinator rather than being forced through one generic signature.
 *
 * Deliberately out of the barrel (AGENTS.md §9): this is scaffolding for the
 * two `*Retrying` combinators, not a general-purpose Layer utility the
 * library is offering.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

/** Rebuilds `layer`'s service through `wrap`, once, when the returned layer itself builds. */
export const wrapService = <Self, Shape>(
  service: Context.Key<Self, Shape>,
  layer: Layer.Layer<Self>,
  wrap: (inner: Shape) => Shape,
): Layer.Layer<Self> =>
  Layer.effect(
    service,
    Effect.map(Layer.build(layer), (context) => wrap(Context.get(context, service))),
  );
