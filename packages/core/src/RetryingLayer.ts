/**
 * The `Layer.effect`/`Layer.build`/`Context.get` ceremony shared by
 * `attributeResolverRetrying` (`AttributeResolver.ts`),
 * `relationshipResolverRetrying` (`RelationshipResolver.ts`),
 * `customPredicateRetrying` (`CustomPredicate.ts`), and — through
 * `wrapServiceEffect` plus `boundedPermits` below — the three `*Bounded`
 * combinators alongside them. What's shared is exactly this scaffolding,
 * unlike the actual retry- or permit-wrapping logic, which differs by method
 * name and arity (`resolve(subjectId, attribute)` vs `check(request)` vs
 * `evaluate(name, subject, resource, params)`) and stays local to each
 * combinator rather than being forced through one generic signature.
 *
 * Deliberately out of the barrel (AGENTS.md §9): this is scaffolding for the
 * `*Retrying`/`*Bounded` combinators, not a general-purpose Layer utility the
 * library is offering.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Semaphore from "effect/Semaphore";
import { InvalidBoundedPermits } from "./Errors.ts";

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

/**
 * Effectful counterpart to `wrapService`: rebuilds `layer`'s service through
 * `wrap`, once, when the returned layer itself builds — but here `wrap` may
 * itself fail or require the effect context, unlike `wrapService`'s plain
 * function.
 *
 * This is what the three `*Bounded` combinators (`attributeResolverBounded`,
 * `relationshipResolverBounded`, `customPredicateBounded`) build on: each
 * needs to validate `permits` and construct a `Semaphore` — which
 * `boundedPermits` below does — before it has a wrapped shape to return,
 * something `wrapService`'s synchronous `wrap` cannot express.
 */
export const wrapServiceEffect = <Self, Shape, E>(
  service: Context.Key<Self, Shape>,
  layer: Layer.Layer<Self>,
  wrap: (inner: Shape) => Effect.Effect<Shape, E>,
): Layer.Layer<Self, E> =>
  Layer.effect(
    service,
    Effect.flatMap(Layer.build(layer), (context) => wrap(Context.get(context, service))),
  );

/**
 * Validates `permits` and builds the `Semaphore` every `*Bounded` combinator
 * guards its wrapped calls with — the part of the ceremony that is identical
 * across the three regardless of which method ends up behind the semaphore.
 *
 * Rejects `permits <= 0` (and non-integers, and `NaN`) rather than handing back
 * a semaphore that deadlocks every call: `Semaphore.make` performs no
 * validation of its own, so with `permits` zero, negative, `NaN` or infinite,
 * `free` is permanently below the `1` every `withPermit` call needs, and every
 * wrapped call enqueues in `waitForPermits` forever. Failing here, at layer
 * construction, turns that into a diagnosable `InvalidBoundedPermits` instead
 * of an unexplained hang the first time a caller reaches the wrapped service.
 */
export const boundedPermits = (
  permits: number,
): Effect.Effect<Semaphore.Semaphore, InvalidBoundedPermits> =>
  Number.isInteger(permits) && permits > 0
    ? Semaphore.make(permits)
    : Effect.fail(new InvalidBoundedPermits({ permits }));
