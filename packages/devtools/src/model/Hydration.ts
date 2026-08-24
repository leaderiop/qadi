/**
 * How many decisions crossed the network, and how many were lost on the way.
 *
 * The sibling of `portActivity` in `Wiring.ts`, and read the same way: through
 * `Metric.value` on metrics `@qadi/core` declares, which needs **no wiring at
 * all** because the default registry is memoised on the reference. That matters
 * more here than it does for the ports, because the writer is `@qadi/react` and
 * this package deliberately does not depend on it — the metric registry is the
 * only thing the two share.
 *
 * Re-declaring the metrics here instead would compile and read zero forever:
 * the registry key is `type:id:description`, so a description that drifted by a
 * word would silently detach this reader from that writer.
 *
 * The counts are **process-wide aggregates**, as the port counts are. On a
 * server they accumulate across every request the process has served, so
 * `dehydrated` is not "this page's payload" and a panel must not imply it is.
 */
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import {
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
} from "@qadi/core";
import type { HydrationDropReason } from "@qadi/core";

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
  /** What a reader should do about it. Constant per reason. */
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

/**
 * What each reason means for whoever is reading the panel.
 *
 * A `Record` over the closed union rather than a `Match`: there is no dispatch
 * here, only a constant per key, and the exhaustiveness a `Record` over a closed
 * union gives is the same compile error a `Match.exhaustive` would.
 *
 * These sentences are shorter than `@qadi/react`'s console warnings and say the
 * same things. The warning is read once by whoever caused it; this is read on a
 * panel beside a number, by someone who may not have.
 */
const MEANINGS: Record<HydrationDropReason, string> = {
  ForeignSubject: "the server put two subjects' decisions in one payload",
  PayloadSubjectMismatch: "a payload reached a client it was not rendered for",
  UnregisteredAtoms: "hydrateDecisions was handed an atom set makeQadiAtoms did not build",
  UndecodablePolicy: "a policy shape the client's schema does not know — usually version skew",
};

const UNRECOGNISED = "not a reason this build knows — something else writes to this metric";

const isReason = (word: string): word is HydrationDropReason =>
  hydrationDropReasons.some((one) => one === word);

const meaningOf = (word: string): string => (isReason(word) ? MEANINGS[word] : UNRECOGNISED);

/**
 * Reads the hydration counts, **passively**.
 *
 * Every reason is reported, including at zero. The alternative — listing only
 * the reasons that fired — makes a healthy system and a system whose build has
 * lost a reason look identical, and it is the reasons at zero that tell a reader
 * the panel is watching for them at all.
 */
export const hydrationActivity: Effect.Effect<HydrationActivity> = Effect.gen(function* () {
  const dehydrated = yield* Metric.value(hydrationDehydratedTotal);
  const seeded = yield* Metric.value(hydrationSeededTotal);
  const rechecked = yield* Metric.value(hydrationRechecksTotal);
  const mismatched = yield* Metric.value(hydrationMismatchesTotal);
  const drops = yield* Metric.value(hydrationDroppedTotal);

  return {
    dehydrated: dehydrated.count,
    seeded: seeded.count,
    rechecked: rechecked.count,
    mismatched: mismatched.count,
    // The metric's **own** keys, rather than a walk of `hydrationDropReasons`
    // defaulting each miss to zero. Pre-registration is exactly what makes that
    // walk unnecessary: it puts all four in the map at zero when the hooks are
    // created, so a reader that also defaulted would be a second mechanism doing
    // the first one's job — and its default could never fire, which is how the
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
