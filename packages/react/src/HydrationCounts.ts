/**
 * The write half of `@qadi/core`'s hydration metrics.
 *
 * Every function here is **synchronous and total**, because its callers are.
 * `dehydrateDecisions` and `hydrateDecisions` are documented as pure and
 * synchronous and their callers are a server rendering a page and a client's
 * first render — neither of which has an Effect runtime, so `Metric.update`,
 * which is an `Effect`, is not available to them. `updateUnsafe` is, and it
 * takes the context explicitly.
 *
 * **`Context.empty()` is the whole subtlety, so it lives in one file.** A
 * `Context.Reference` resolves to its default when the context does not carry
 * it, and `MetricRegistry`'s default is memoised on the reference — so an
 * off-fiber write with an empty context lands in exactly the registry a reader's
 * `Metric.value` finds. `packages/core/test/HydrationMetrics.test.ts` pins that.
 *
 * A `Context.Context` passed here is **not** a way to scope these counts, and
 * that is worth knowing before someone tries it: a `Metric` memoises its hooks
 * on the metric object at first touch, keyed on attributes and not on the
 * registry, so the first registry to reach a metric owns it for the life of the
 * process and every later context reads that one whatever it carries. The
 * useful consequence is that a writer and a reader **sharing one metric object**
 * — which is why these are declared in `@qadi/core` — cannot diverge, whatever
 * registry a host wires and whenever it wires it.
 *
 * Confined to one named file for the reason `HydrationWarning.ts` confines
 * `console` and `process.env`: a boundary in a file with a name stays visible,
 * where one spread across three call sites dissolves into convention.
 */
import type { HydrationDropReason } from "@qadi/core";
import {
  hydrationDehydratedTotal,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
} from "@qadi/core";
import * as Context from "effect/Context";

/** The empty context, built once. Resolves every reference to its default. */
const registry = Context.empty();

/** Records entries a server put into a payload. */
export const countDehydrated = (count: number): void => {
  hydrationDehydratedTotal.updateUnsafe(count, registry);
};

/** Records entries a client seeded out of one. */
export const countSeeded = (count: number): void => {
  hydrationSeededTotal.updateUnsafe(count, registry);
};

/**
 * Records `count` entries lost for one reason.
 *
 * A frequency increments by one per call, so this loops — bounded by the number
 * of entries already going in the bin, on a path that only runs when a payload
 * is malformed. Zero iterations write nothing, and the reason still appears in
 * the snapshot at zero because the metric pre-registers its whole key set.
 */
export const countDropped = (reason: HydrationDropReason, count: number): void => {
  for (let index = 0; index < count; index += 1) {
    hydrationDroppedTotal.updateUnsafe(reason, registry);
  }
};

/**
 * Records one seeded question answered again by this client.
 *
 * Both counters move together when the answers disagree, so
 * `hydrationMismatchesTotal` is a strict subset of `hydrationRechecksTotal` and
 * the pair reads as a rate rather than as two unrelated numbers.
 */
export const countRecheck = (mismatched: boolean): void => {
  hydrationRechecksTotal.updateUnsafe(1, registry);
  if (mismatched) hydrationMismatchesTotal.updateUnsafe(1, registry);
};
