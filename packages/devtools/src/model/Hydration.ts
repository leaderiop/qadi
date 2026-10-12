/**
 * How many decisions crossed the network, and how many were lost on the way.
 *
 * The sibling of `portActivity` in `Wiring.ts`, read from metrics `@qadi/core`
 * declares, which needs **no wiring at all**. That matters more here than it does
 * for the ports, because the writer is `@qadi/react` and this package
 * deliberately does not depend on it — the metric registry is the only thing the
 * two share.
 *
 * Both ends name **the default registry** (`Context.empty()`): `@qadi/react`
 * writes off fiber (`HydrationCounts.ts`) and cannot see any fiber's registry,
 * and this reader reads the same one explicitly, so the two agree whatever
 * `MetricRegistry` a host wired on the fiber running the panel. At effect 4.0.0 a
 * metric looks its registry up on every update (it no longer remembers the first
 * one to reach it), so a reader that followed the fiber would read zero forever
 * under a host registry (ADR-QD-052, amended). A host exporting from its own
 * registry must export these counts from the default one.
 *
 * Re-declaring the metrics here instead would compile and read zero forever:
 * the registry key is `type:id:description`, so a description that drifted by a
 * word would silently detach this reader from that writer.
 *
 * The counts are **process-wide aggregates**, as the port counts are. On a
 * server they accumulate across every request the process has served, so
 * `dehydrated` is not "this page's payload" and a panel must not imply it is.
 */
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
  hydrationDehydratedTotal,
  hydrationDropMeaning,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
  isHydrationDropReason,
} from "@qadi/core";

/**
 * The registry the writer (`@qadi/react`'s `HydrationCounts.ts`) updates into,
 * and so the one this reader must read: the default one, named explicitly.
 */
const DEFAULT_REGISTRY = Context.empty();

/** Entries lost for one reason, with the sentence explaining it. */
export interface HydrationDrops {
  /**
   * The frequency key, as the registry holds it.
   *
   * `string` rather than `HydrationDropReason`, for the reason `PortCalls.ts`
   * gives about span attributes: this package reads a structure it does not own,
   * and any module in the process can write a word into it. A key outside the
   * closed set is reported rather than hidden — a count nobody can explain is
   * still a count, and dropping it would make the total stop adding up.
   */
  readonly reason: string;
  readonly count: number;
  /** What a reader should do about it: `hydrationDropMeaning(reason).summary` from `@qadi/core`. */
  readonly meaning: string;
}

export interface HydrationActivity {
  /** Decisions a server projected into a payload. */
  readonly dehydrated: number;
  /** Decisions a client seeded out of one. */
  readonly seeded: number;
  /** Seeded questions a client has since answered for itself. */
  readonly rechecked: number;
  /** Re-checks whose verdict disagreed with the seed. A subset of `rechecked`. */
  readonly mismatched: number;
  /** Every reason, in a fixed order, including the ones that never happened. */
  readonly drops: ReadonlyArray<HydrationDrops>;
}

const UNRECOGNISED = "not a reason this build knows — something else writes to this metric";

/**
 * The panel's sentence for a metric key.
 *
 * `summary` from `@qadi/core`'s `hydrationDropMeaning`, where the meaning of each
 * reason is stated once beside the union that defines the reasons. The console
 * warning in `@qadi/react` reads the same row's `remedy`.
 */
const meaningOf = (word: string): string =>
  isHydrationDropReason(word) ? hydrationDropMeaning(word).summary : UNRECOGNISED;

/**
 * Reads the hydration counts, **passively**.
 *
 * Every reason is reported, including at zero. The alternative — listing only
 * the reasons that fired — makes a healthy system and a system whose build has
 * lost a reason look identical, and it is the reasons at zero that tell a reader
 * the panel is watching for them at all.
 */
export const hydrationActivity: Effect.Effect<HydrationActivity> = Effect.sync(() => {
  const dehydrated = hydrationDehydratedTotal.valueUnsafe(DEFAULT_REGISTRY);
  const seeded = hydrationSeededTotal.valueUnsafe(DEFAULT_REGISTRY);
  const rechecked = hydrationRechecksTotal.valueUnsafe(DEFAULT_REGISTRY);
  const mismatched = hydrationMismatchesTotal.valueUnsafe(DEFAULT_REGISTRY);
  const drops = hydrationDroppedTotal.valueUnsafe(DEFAULT_REGISTRY);

  return {
    dehydrated: dehydrated.count,
    seeded: seeded.count,
    rechecked: rechecked.count,
    mismatched: mismatched.count,
    // The metric's **own** keys, rather than a walk of `hydrationDropReasons`
    // defaulting each miss to zero. Pre-registration is exactly what makes that
    // walk unnecessary: it puts every reason in `hydrationDropReasons` in the
    // map at zero when the hooks are created, so a reader that also defaulted
    // would be a second mechanism doing the first one's job — and its default could never fire, which is how the
    // mutation gate found it. Insertion order is the order `hydrationDropReasons`
    // declares, so the rows stay stable and any foreign key sorts after them.
    drops: [...drops.occurrences].map(([reason, count]) => ({
      reason,
      count,
      meaning: meaningOf(reason),
    })),
  };
});

/**
 * Entries a payload lost between the two ends.
 *
 * `dehydrated - seeded`, which is **not** the sum of the drop counts and must
 * not be presented as though it were: the aggregates are process-wide, so on a
 * server rendering pages for many clients the two counters are counting
 * different populations entirely. Negative where a client seeded from a payload
 * this process did not build — the ordinary case in a browser — so it is
 * reported as `undefined` there rather than as a nonsensical negative loss.
 */
export const unaccountedEntries = (self: HydrationActivity): number | undefined =>
  self.dehydrated >= self.seeded ? self.dehydrated - self.seeded : undefined;

/** Whether anything at all has been hydrated in this process. */
export const hasHydrated = (self: HydrationActivity): boolean =>
  self.dehydrated > 0 || self.seeded > 0 || self.rechecked > 0;
