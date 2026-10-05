/**
 * The `Layer.effect`/`Layer.build`/`Context.get` ceremony, and the retry
 * accounting (`retryCountingAttempts`), shared by
 * `attributeResolverRetrying` (`AttributeResolver.ts`),
 * `relationshipResolverRetrying` (`RelationshipResolver.ts`),
 * `customPredicateRetrying` (`CustomPredicate.ts`), and — through
 * `wrapServiceEffect` plus `boundedPermits` below — the three `*Bounded`
 * combinators alongside them. What's shared is this scaffolding and the retry
 * accounting, unlike the per-method wiring around them, which differs by method
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
import * as Metric from "effect/Metric";
import * as Ref from "effect/Ref";
import type * as Schedule from "effect/Schedule";
import * as Semaphore from "effect/Semaphore";
import { InvalidBoundedPermits } from "./Errors.ts";
import { portRetriesTotal } from "./PortMetrics.ts";
import type { RetryingPortName } from "./PortMetrics.ts";

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

/**
 * Runs `attempt` under `schedule`, counting failed attempts in
 * `portRetriesTotal` and annotating the caller's current span with how many
 * times `attempt` actually ran (`qadi.attempts`).
 *
 * Shared by all three `*Retrying` combinators. Only `attributeResolverRetrying`
 * used to annotate (KH-01); `relationshipResolverRetrying` and
 * `customPredicateRetrying` retried silently, though the latter's doc said it
 * mirrored the former exactly (ARCH-10 E2). KH-01's reason applies to every
 * retrying wrapper: `PortAccess.ts` opens one span around the whole wrapped
 * call, and every retry happens silently inside that one span's duration — a
 * trace reader sees one deceptively slow call rather than the N store round
 * trips that actually happened. `portRetriesTotal` counts failed attempts, but
 * as a process-wide aggregate with no correlation back to the request that
 * triggered them; this annotation is the per-call signal that aggregate
 * cannot give.
 *
 * The count is incremented once per actual invocation of `attempt`, not once
 * per failure — counting failures instead double-counts the exhausting
 * failure, the one `Effect.retry` decides not to retry: `tapError` cannot see
 * that decision, so it always assumed another call was coming.
 * `Effect.ensuring`, not a `tap` on only the success or only the failure
 * path: the count is worth recording whichever way the retried call finally
 * settles, and a finalizer runs either way.
 */
export const retryCountingAttempts = <A, E>(
  port: RetryingPortName,
  schedule: Schedule.Schedule<unknown, E>,
  attempt: Effect.Effect<A, E>,
): Effect.Effect<A, E> =>
  Effect.gen(function* () {
    const attempts = yield* Ref.make(0);
    return yield* Ref.update(attempts, (n) => n + 1).pipe(
      Effect.flatMap(() => attempt),
      Effect.tapError(() => Metric.update(portRetriesTotal, port)),
      Effect.retry(schedule),
      Effect.ensuring(
        Effect.flatMap(Ref.get(attempts), (n) => Effect.annotateCurrentSpan({ "qadi.attempts": n })),
      ),
    );
  });
