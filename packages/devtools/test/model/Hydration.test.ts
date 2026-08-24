/**
 * Reading the hydration counts without depending on whoever writes them.
 *
 * `@qadi/react` is deliberately absent from this file, as it is from the
 * package: the two share a metric registry and nothing else. So the writes here
 * go through the metric handles `@qadi/core` exports — the same objects
 * `HydrationCounts.ts` writes through — which is exactly the contract under
 * test. Importing the React package to drive it would prove the reader agrees
 * with itself.
 *
 * Every count assertion is a **delta**. A `Metric` memoises its hooks on itself
 * at first touch and ignores the registry thereafter, so a per-test registry is
 * not available and absolute numbers would depend on suite ordering.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import {
  hydrationDehydratedTotal,
  hydrationDropReasons,
  hydrationDroppedTotal,
  hydrationMismatchesTotal,
  hydrationRechecksTotal,
  hydrationSeededTotal,
} from "@qadi/core";
import {
  hasHydrated,
  hydrationActivity,
  unaccountedEntries,
} from "../../src/model/Hydration.ts";
import type { HydrationActivity } from "../../src/model/Hydration.ts";

const registry = Context.empty();

/** A fabricated reading, for the two functions that only fold one. */
const activity = (fields: Partial<HydrationActivity>): HydrationActivity => ({
  dehydrated: 0,
  seeded: 0,
  rechecked: 0,
  mismatched: 0,
  drops: [],
  ...fields,
});

describe("hydrationActivity", () => {
  it.effect("runs with no layer at all", () =>
    Effect.gen(function* () {
      // The property that makes this readable from a panel: the default metric
      // registry is memoised on the reference, so nothing has to be wired.
      const read = yield* hydrationActivity;

      assert.isNumber(read.dehydrated);
      assert.isNumber(read.seeded);
      assert.isNumber(read.rechecked);
      assert.isNumber(read.mismatched);
    }));

  it.effect("reads what a writer wrote through core's own handles", () =>
    Effect.gen(function* () {
      const before = yield* hydrationActivity;

      hydrationDehydratedTotal.updateUnsafe(4, registry);
      hydrationSeededTotal.updateUnsafe(3, registry);
      hydrationRechecksTotal.updateUnsafe(2, registry);
      hydrationMismatchesTotal.updateUnsafe(1, registry);

      const after = yield* hydrationActivity;

      assert.strictEqual(after.dehydrated - before.dehydrated, 4);
      assert.strictEqual(after.seeded - before.seeded, 3);
      assert.strictEqual(after.rechecked - before.rechecked, 2);
      assert.strictEqual(after.mismatched - before.mismatched, 1);
    }));

  it.effect("reports every reason, including the ones that never fired", () =>
    Effect.gen(function* () {
      const read = yield* hydrationActivity;

      // A healthy system and a build that has lost a reason must not look the
      // same. It is the reasons at zero that tell a reader they are watched for.
      assert.deepStrictEqual(
        read.drops.map((drop) => drop.reason),
        [...hydrationDropReasons],
      );
    }));

  it.effect("gives every reason a distinct sentence", () =>
    Effect.gen(function* () {
      const read = yield* hydrationActivity;
      const meanings = read.drops.map((drop) => drop.meaning);

      assert.strictEqual(new Set(meanings).size, meanings.length);
      assert.isTrue(meanings.every((meaning) => meaning.length > 0));
    }));

  it.effect("counts a raised reason against its own row", () =>
    Effect.gen(function* () {
      const countOf = (self: HydrationActivity, reason: string): number =>
        self.drops.find((drop) => drop.reason === reason)?.count ?? -1;

      const before = yield* hydrationActivity;
      hydrationDroppedTotal.updateUnsafe("UndecodablePolicy", registry);
      const after = yield* hydrationActivity;

      assert.strictEqual(
        countOf(after, "UndecodablePolicy") - countOf(before, "UndecodablePolicy"),
        1,
      );
      assert.strictEqual(
        countOf(after, "PayloadSubjectMismatch") - countOf(before, "PayloadSubjectMismatch"),
        0,
      );
    }));

  it.effect("reports an unraised reason as zero, never as absent", () =>
    Effect.gen(function* () {
      const read = yield* hydrationActivity;

      // The panel renders these; `undefined` reaching it would print as blank
      // and read as "not measured".
      assert.isTrue(read.drops.every((drop) => typeof drop.count === "number"));
      assert.isTrue(read.drops.every((drop) => drop.count >= 0));
    }));
});

describe("unaccountedEntries", () => {
  it("is the shortfall where a process built more than it seeded", () => {
    assert.strictEqual(unaccountedEntries(activity({ dehydrated: 10, seeded: 4 })), 6);
  });

  it("is zero where the two agree", () => {
    assert.strictEqual(unaccountedEntries(activity({ dehydrated: 4, seeded: 4 })), 0);
  });

  it("REFUSES THE SUBTRACTION where it would be negative", () => {
    // A browser seeds from payloads it did not build, so `seeded` exceeding
    // `dehydrated` is the ordinary case there rather than a fault. Reporting
    // "-4 unaccounted" would invite a reader to hunt a bug that is not one.
    assert.isUndefined(unaccountedEntries(activity({ dehydrated: 0, seeded: 4 })));
  });
});

describe("hasHydrated", () => {
  it("is false for a process that has hydrated nothing", () => {
    assert.isFalse(hasHydrated(activity({})));
  });

  it("is true once anything has been built, seeded or re-checked", () => {
    assert.isTrue(hasHydrated(activity({ dehydrated: 1 })));
    assert.isTrue(hasHydrated(activity({ seeded: 1 })));
    assert.isTrue(hasHydrated(activity({ rechecked: 1 })));
  });

  it("is false for a process that only dropped", () => {
    // Deliberate: a drop count with no hydration at all means a payload arrived
    // and was refused entire, which is a different screen's story. Reporting
    // "has hydrated" for it would be a claim nothing supports.
    assert.isFalse(hasHydrated(activity({ mismatched: 3 })));
  });
});
