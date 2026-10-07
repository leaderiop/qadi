import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { enforceRetention, getPurgeableEntries, planRetention } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";
import { decisionRecord } from "./helpers.ts";

const entryAt = (at: number) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${at}`, at })));

describe("getPurgeableEntries / enforceRetention", () => {
  it("an entry older than maxAgeMs is purgeable", () => {
    const entries = [entryAt(0)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 1);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 0);
  });

  it("an entry younger than maxAgeMs is retained", () => {
    const entries = [entryAt(1_500)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 0);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 1);
  });

  it("an entry exactly at the boundary is retained, not purged", () => {
    // now - at === maxAgeMs, not strictly greater than it.
    const entries = [entryAt(1_000)];
    const policy: RetentionPolicy = { maxAgeMs: 1_000 };
    assert.strictEqual(getPurgeableEntries(entries, policy, 2_000).length, 0);
    assert.strictEqual(enforceRetention(entries, policy, 2_000).length, 1);
  });
});

/** An entry whose stored `at` is whatever a hand-built or mis-decoded row holds. */
const entryWithAt = (at: number): AuditEntry => {
  const e = entryAt(1_000);
  return { ...e, record: { ...e.record, at } };
};

describe("an impossible age is never purged (INV-QD-101)", () => {
  const policy: RetentionPolicy = { maxAgeMs: 1_000 };

  const neverPurged = (entries: ReadonlyArray<AuditEntry>, p: RetentionPolicy, now: number) => {
    assert.deepStrictEqual(getPurgeableEntries(entries, p, now), []);
    assert.deepStrictEqual(enforceRetention(entries, p, now), entries);
  };

  it("at = -Infinity (a stored -1e400) is retained, not purged at once", () => {
    neverPurged([entryWithAt(Number.NEGATIVE_INFINITY)], policy, 2_000);
  });

  it("now = +Infinity purges nothing", () => {
    neverPurged([entryAt(0), entryAt(1_000)], policy, Number.POSITIVE_INFINITY);
  });

  it("maxAgeMs = -1 purges nothing", () => {
    neverPurged([entryAt(0), entryAt(2_000)], { maxAgeMs: -1 }, 2_000);
  });

  it("maxAgeMs = -Infinity purges nothing", () => {
    neverPurged([entryAt(0)], { maxAgeMs: Number.NEGATIVE_INFINITY }, 2_000);
  });

  it("at = NaN is retained", () => {
    neverPurged([entryWithAt(Number.NaN)], policy, 2_000);
  });

  it("at = +Infinity is retained", () => {
    neverPurged([entryWithAt(Number.POSITIVE_INFINITY)], policy, 2_000);
  });

  it("now = NaN purges nothing", () => {
    neverPurged([entryAt(0)], policy, Number.NaN);
  });

  it("maxAgeMs = NaN purges nothing", () => {
    neverPurged([entryAt(0)], { maxAgeMs: Number.NaN }, 2_000);
  });
});

describe("planRetention", () => {
  const old = entryAt(0);
  const young = entryAt(1_500);
  const nan = entryWithAt(Number.NaN);
  const negInf = entryWithAt(Number.NEGATIVE_INFINITY);
  const entries = [old, young, nan, negInf];

  it("splits purged, retained and undated; undated rows are retained", () => {
    const plan = Result.getOrThrow(planRetention(entries, { maxAgeMs: 1_000 }, 2_000));
    assert.deepStrictEqual(plan.purged, [old]);
    assert.deepStrictEqual(plan.retained, [young, nan, negInf]);
    assert.deepStrictEqual(plan.undated, [nan, negInf]);
  });

  it("maxAgeMs = +Infinity is valid and purges nothing", () => {
    const plan = Result.getOrThrow(planRetention(entries, { maxAgeMs: Number.POSITIVE_INFINITY }, 2_000));
    assert.deepStrictEqual(plan.purged, []);
    assert.strictEqual(plan.retained.length, entries.length);
  });

  it("maxAgeMs = 0 is valid: an entry older than now is purged", () => {
    const plan = Result.getOrThrow(planRetention([entryAt(1_999), entryAt(2_000)], { maxAgeMs: 0 }, 2_000));
    assert.strictEqual(plan.purged.length, 1);
    assert.strictEqual(plan.retained.length, 1);
  });

  const refused = (policy: RetentionPolicy, now: number) => {
    const result = planRetention(entries, policy, now);
    if (!Result.isFailure(result)) return assert.fail("expected a refusal");
    return result.failure;
  };

  it("refuses a non-finite now, naming the field and the value", () => {
    for (const now of [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NaN]) {
      const error = refused({ maxAgeMs: 1_000 }, now);
      assert.strictEqual(error._tag, "RetentionInputInvalid");
      assert.strictEqual(error.field, "now");
      assert.isTrue(Object.is(error.value, now));
    }
  });

  it("refuses a maxAgeMs that is NaN or negative, naming the field and the value", () => {
    for (const maxAgeMs of [Number.NaN, -1, Number.NEGATIVE_INFINITY]) {
      const error = refused({ maxAgeMs }, 2_000);
      assert.strictEqual(error.field, "maxAgeMs");
      assert.isTrue(Object.is(error.value, maxAgeMs));
    }
  });

  it("checks now before maxAgeMs", () => {
    assert.strictEqual(refused({ maxAgeMs: -1 }, Number.NaN).field, "now");
  });
});

describe("PROPERTY: retained and purged partition entries", () => {
  it("retained ∪ purged = entries, retained ∩ purged = ∅, and a purge has a provable age", () => {
    const number = FastCheck.oneof(
      FastCheck.integer({ min: 0, max: 200_000 }),
      FastCheck.integer({ min: -1_000, max: -1 }),
      FastCheck.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    );
    const arb = FastCheck.tuple(FastCheck.array(number, { maxLength: 30 }), number, number);

    FastCheck.assert(
      FastCheck.property(arb, ([timestamps, maxAgeMs, now]) => {
        const entries = timestamps.map((at) => entryWithAt(at));
        const policy: RetentionPolicy = { maxAgeMs };

        const retained = enforceRetention(entries, policy, now);
        const purged = getPurgeableEntries(entries, policy, now);

        const union = new Set<AuditEntry>([...retained, ...purged]);
        const intersection = retained.filter((e) => purged.includes(e));
        const provable = purged.every(
          (e) =>
            Number.isFinite(e.record.at) &&
            Number.isFinite(now) &&
            maxAgeMs >= 0 &&
            now - e.record.at > maxAgeMs,
        );

        const plan = planRetention(entries, policy, now);
        const undatedRetained = Result.isFailure(plan)
          ? true
          : plan.success.undated.every((e) => plan.success.retained.includes(e));

        return (
          union.size === entries.length &&
          retained.length + purged.length === entries.length &&
          intersection.length === 0 &&
          provable &&
          undatedRetained
        );
      }),
      { numRuns: 500 },
    );
  });
});
