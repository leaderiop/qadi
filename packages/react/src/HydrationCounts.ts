/**
 * The write half of `@qadi/core`'s hydration metrics.
 *
 * Deliberately out of the barrel (AGENTS.md §9), same as `HydrationEngine.ts`
 * and `useGate.ts`: this is the write side of an internal metric,
 * not something a consumer should be updating directly.
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
 * it, and `MetricRegistry`'s default is the reference's default — so an
 * off-fiber write with an empty context lands in the **default registry**, which
 * is where `@qadi/devtools`' reader looks (it names `Context.empty()` too).
 * `packages/core/test/HydrationMetrics.test.ts` pins that.
 *
 * A `Context.Context` passed here is **not** a way to scope these counts, and
 * that is worth knowing before someone tries it: at effect 4.0.0 a `Metric`
 * looks its registry up on **every** update, so a different context writes a
 * different registry's series, which the reader would never see. Writer and
 * reader agree because both name the default registry, not because the metric
 * remembers one (ADR-QD-052, amended). A host exporting hydration counts from
 * its own registry must export them from the default one.
 *
 * Confined to one named file for the reason `DeveloperSignals.ts` confines
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
