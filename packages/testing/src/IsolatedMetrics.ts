/**
 * Runs an effect against its own, empty `MetricRegistry`.
 *
 * What it isolates is every metric update and read that happens **on the
 * effect's fiber**: a counter already touched in the ambient registry reads 0
 * inside, and what the effect records never reaches the ambient registry.
 * At effect 4.0.0 the registry owns the series and is looked up on every
 * update, so `provideService(Metric.MetricRegistry, new Map())` alone is
 * enough; the `CurrentMetricAttributes` override the five hand-written copies
 * of this helper carried guarded a first-touch memoisation that no longer
 * exists. `packages/core/test/v4-api-smoke.test.ts` pins the fact this relies
 * on, so a future effect that brings the memoisation back fails there first.
 *
 * **What it cannot isolate: an off-fiber write.** `@qadi/react`'s hydration
 * counters call `updateUnsafe(…, Context.empty())`, which resolves
 * `MetricRegistry` to its default whatever the fiber carries (also pinned by
 * the smoke test). A test of those counters asserts a delta against the
 * default registry rather than using this helper.
 */
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";

export const isolatedMetrics = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
): Effect.Effect<A, E, R> => Effect.provideService(effect, Metric.MetricRegistry, new Map());
