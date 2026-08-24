/**
 * The contract between a writer in `@qadi/react` and a reader in `@qadi/devtools`.
 *
 * Neither of those packages appears here, and that is the point: what binds them
 * is the metric registry, whose key is `type:id:description`. A test asserting
 * the *counts* would pass in whichever package it lived in and would say nothing
 * about whether the other one can see them. These assertions pin the key
 * instead.
 *
 * Every count assertion is a **delta**, and it has to be. A private registry is
 * not available: a `Metric` memoises its hooks on itself at first touch, keyed
 * on attributes and not on the registry, so the first registry to reach a metric
 * owns it for the process and a later `Context.make(MetricRegistry, new Map())`
 * reads the same numbers through an empty map. Absolute assertions would
 * therefore depend on test ordering across the whole suite.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import {
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
} from "../src/HydrationMetrics.ts";

/** Whatever registry these metrics were first touched through. */
const registry = Context.empty();

/** How much a counter moved while `act` ran. */
const counterDelta = (metric: Metric.Metric<number, { readonly count: number }>, act: () => void): number => {
  const before = metric.valueUnsafe(registry).count;
  act();
  return metric.valueUnsafe(registry).count - before;
};

/** How much one frequency key moved while `act` ran. */
const frequencyDelta = (
  metric: Metric.Metric<string, { readonly occurrences: ReadonlyMap<string, number> }>,
  word: string,
  act: () => void,
): number => {
  const before = metric.valueUnsafe(registry).occurrences.get(word) ?? 0;
  act();
  return (metric.valueUnsafe(registry).occurrences.get(word) ?? 0) - before;
};

describe("HydrationMetrics", () => {
  describe("the registry key", () => {
    // `makeKey` is `type:id:description`. Anything asserted below being wrong
    // detaches `@qadi/devtools` from `@qadi/react` **silently** — the reader
    // gets its own registry entry and reads zero, and nothing raises.
    it.effect("qadi_hydration_dehydrated_total is a Counter with its description", () =>
      Effect.gen(function* () {
        assert.strictEqual(hydrationDehydratedTotal.id, "qadi_hydration_dehydrated_total");
        assert.strictEqual(hydrationDehydratedTotal.type, "Counter");
        assert.strictEqual(
          hydrationDehydratedTotal.description,
          "Decisions projected into a payload by dehydrateDecisions.",
        );
      }),
    );

    it.effect("qadi_hydration_seeded_total is a Counter with its description", () =>
      Effect.gen(function* () {
        assert.strictEqual(hydrationSeededTotal.id, "qadi_hydration_seeded_total");
        assert.strictEqual(hydrationSeededTotal.type, "Counter");
        assert.strictEqual(
          hydrationSeededTotal.description,
          "Decisions seeded into an atom set by hydrateDecisions.",
        );
      }),
    );

    it.effect("qadi_hydration_dropped_total is a Frequency with its description", () =>
      Effect.gen(function* () {
        assert.strictEqual(hydrationDroppedTotal.id, "qadi_hydration_dropped_total");
        assert.strictEqual(hydrationDroppedTotal.type, "Frequency");
        assert.strictEqual(
          hydrationDroppedTotal.description,
          "Decisions a payload discarded rather than trusted, by reason.",
        );
      }),
    );

    it.effect("qadi_hydration_rechecks_total is a Counter with its description", () =>
      Effect.gen(function* () {
        assert.strictEqual(hydrationRechecksTotal.id, "qadi_hydration_rechecks_total");
        assert.strictEqual(hydrationRechecksTotal.type, "Counter");
        assert.strictEqual(
          hydrationRechecksTotal.description,
          "Seeded questions this client has re-answered for itself.",
        );
      }),
    );

    it.effect("qadi_hydration_mismatches_total is a Counter with its description", () =>
      Effect.gen(function* () {
        assert.strictEqual(hydrationMismatchesTotal.id, "qadi_hydration_mismatches_total");
        assert.strictEqual(hydrationMismatchesTotal.type, "Counter");
        assert.strictEqual(
          hydrationMismatchesTotal.description,
          "Re-checks whose verdict disagreed with the server's seed.",
        );
      }),
    );

    it.effect("the five ids are distinct", () =>
      Effect.gen(function* () {
        const ids = [
          hydrationDehydratedTotal.id,
          hydrationSeededTotal.id,
          hydrationDroppedTotal.id,
          hydrationRechecksTotal.id,
          hydrationMismatchesTotal.id,
        ];
        assert.strictEqual(new Set(ids).size, ids.length);
      }),
    );
  });

  describe("writing off a fiber", () => {
    // An off-fiber `updateUnsafe` and an on-fiber `Metric.value` meeting is the
    // property the whole design rests on: `dehydrateDecisions` runs on a server
    // rendering a page and `hydrateDecisions` during a client's first render,
    // and neither has a runtime, so `Metric.update` — an `Effect` — is not
    // available to them. Read back through the Effect API rather than through
    // `valueUnsafe`, so this asserts the two halves meet rather than that one
    // function round-trips with itself.
    it.effect("an off-fiber write is visible to an on-fiber read", () =>
      Effect.gen(function* () {
        const before = (yield* Metric.value(hydrationSeededTotal)).count;
        hydrationSeededTotal.updateUnsafe(10, registry);
        const after = (yield* Metric.value(hydrationSeededTotal)).count;
        assert.strictEqual(after - before, 10);
      }),
    );

    it.effect("a counter takes the whole batch in one call", () =>
      Effect.gen(function* () {
        // The reason these two are counters rather than keys on a shared
        // frequency: a thousand-entry payload must not be a thousand map writes.
        const moved = counterDelta(hydrationDehydratedTotal, () => {
          hydrationDehydratedTotal.updateUnsafe(1000, registry);
        });
        assert.strictEqual(moved, 1000);
      }),
    );

    // The reasons are written out rather than read from `hydrationDropReasons`,
    // and that is the whole point of this assertion. An earlier version looped
    // over the constant to check the constant, so emptying the array made the
    // loop run zero times and pass — five surviving mutants, all of them this
    // one mistake. A test may not use the thing it is verifying as its oracle.
    const REASONS = [
      "ForeignSubject",
      "PayloadSubjectMismatch",
      "UnregisteredAtoms",
      "UndecodablePolicy",
    ] as const;

    it.effect("names every drop reason, in order", () =>
      Effect.gen(function* () {
        assert.deepStrictEqual([...hydrationDropReasons], [...REASONS]);
      }),
    );

    it.effect("every reason is in the snapshot before this suite raises any", () =>
      Effect.gen(function* () {
        const state = hydrationDroppedTotal.valueUnsafe(registry);
        // Pre-registered, so a reader gets the closed key set off the metric and
        // an unraised reason reads as *did not happen* rather than *not known*.
        // Asserted as presence, not as zero: the suite may already have run.
        for (const reason of REASONS) {
          assert.notStrictEqual(state.occurrences.get(reason), undefined, reason);
        }
      }),
    );

    it.effect("a raised reason moves only its own key", () =>
      Effect.gen(function* () {
        let others = 0;
        const moved = frequencyDelta(hydrationDroppedTotal, "UndecodablePolicy", () => {
          const before = hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("ForeignSubject") ?? 0;
          hydrationDroppedTotal.updateUnsafe("UndecodablePolicy", registry);
          others =
            (hydrationDroppedTotal.valueUnsafe(registry).occurrences.get("ForeignSubject") ?? 0) - before;
        });
        assert.strictEqual(moved, 1);
        assert.strictEqual(others, 0);
      }),
    );

    it.effect("a mismatch moves both counters, so the pair is a rate", () =>
      Effect.gen(function* () {
        const rechecks = counterDelta(hydrationRechecksTotal, () => {
          hydrationRechecksTotal.updateUnsafe(1, registry);
          hydrationRechecksTotal.updateUnsafe(1, registry);
        });
        const mismatches = counterDelta(hydrationMismatchesTotal, () => {
          hydrationMismatchesTotal.updateUnsafe(1, registry);
        });
        assert.strictEqual(rechecks, 2);
        assert.strictEqual(mismatches, 1);
      }),
    );
  });
});
