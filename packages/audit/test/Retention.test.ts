import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import type { VerifiedArchive } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";
import { decisionRecord, obligationRecord } from "./helpers.ts";

const entryAt = (at: number) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${at}`, at })));

/** An entry whose stored `at` is whatever a hand-built or mis-decoded row holds. */
const entryWithAt = (at: number): AuditEntry => {
  const e = entryAt(1_000);
  return { ...e, record: { ...e.record, at } };
};

/**
 * The archive a store hands back: bundled, serialized, parsed, read — the real
 * write-to-read path, so membership is tested across the storage seam.
 */
const archiveOf = (entries: ReadonlyArray<AuditEntry>): VerifiedArchive =>
  Result.getOrThrow(
    readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail(entries, 0))))),
  );

/** A row as a store gives it back: through JSON text and `decodeAuditEntry`. */
const fromStore = (entry: AuditEntry): AuditEntry =>
  Result.getOrThrow(decodeAuditEntry(JSON.parse(JSON.stringify(entry)))).entry;

const plan = (entries: ReadonlyArray<AuditEntry>, policy: RetentionPolicy, now: number) =>
  Result.getOrThrow(planRetention(entries, policy, now));

describe("planRetention: age semantics", () => {
  it("an entry older than maxAgeMs is expired", () => {
    const entries = [entryAt(0)];
    const result = plan(entries, { maxAgeMs: 1_000 }, 2_000);
    assert.strictEqual(result.expired.length, 1);
    assert.strictEqual(result.retained.length, 0);
  });

  it("an entry younger than maxAgeMs is retained", () => {
    const result = plan([entryAt(1_500)], { maxAgeMs: 1_000 }, 2_000);
    assert.strictEqual(result.expired.length, 0);
    assert.strictEqual(result.retained.length, 1);
  });

  it("an entry exactly at the boundary is retained, not expired", () => {
    // now - at === maxAgeMs, not strictly greater than it.
    const result = plan([entryAt(1_000)], { maxAgeMs: 1_000 }, 2_000);
    assert.strictEqual(result.expired.length, 0);
    assert.strictEqual(result.retained.length, 1);
  });
});

describe("an impossible age is never selected (INV-QD-101)", () => {
  const policy: RetentionPolicy = { maxAgeMs: 1_000 };

  /** Neither the age report nor a purge against an archive holding every row selects anything. */
  const neverSelected = (entries: ReadonlyArray<AuditEntry>, p: RetentionPolicy, now: number) => {
    const age = planRetention(entries, p, now);
    if (Result.isSuccess(age)) {
      assert.deepStrictEqual(age.success.expired, []);
      assert.deepStrictEqual(age.success.retained, entries);
    }
    const finite = entries.filter((e) => Number.isFinite(e.record.at));
    const purge = planPurge(entries, p, now, archiveOf(finite));
    if (Result.isSuccess(purge)) {
      assert.deepStrictEqual(purge.success.purge, []);
      assert.deepStrictEqual(purge.success.retain, entries);
    }
  };

  it("at = -Infinity (a stored -1e400) is retained, not purged at once", () => {
    neverSelected([entryWithAt(Number.NEGATIVE_INFINITY)], policy, 2_000);
  });

  it("now = +Infinity purges nothing", () => {
    neverSelected([entryAt(0), entryAt(1_000)], policy, Number.POSITIVE_INFINITY);
  });

  it("maxAgeMs = -1 purges nothing", () => {
    neverSelected([entryAt(0), entryAt(2_000)], { maxAgeMs: -1 }, 2_000);
  });

  it("maxAgeMs = -Infinity purges nothing", () => {
    neverSelected([entryAt(0)], { maxAgeMs: Number.NEGATIVE_INFINITY }, 2_000);
  });

  it("at = NaN is retained", () => {
    neverSelected([entryWithAt(Number.NaN)], policy, 2_000);
  });

  it("at = +Infinity is retained", () => {
    neverSelected([entryWithAt(Number.POSITIVE_INFINITY)], policy, 2_000);
  });

  it("now = NaN purges nothing", () => {
    neverSelected([entryAt(0)], policy, Number.NaN);
  });

  it("maxAgeMs = NaN purges nothing", () => {
    neverSelected([entryAt(0)], { maxAgeMs: Number.NaN }, 2_000);
  });
});

describe("planRetention", () => {
  const old = entryAt(0);
  const young = entryAt(1_500);
  const nan = entryWithAt(Number.NaN);
  const negInf = entryWithAt(Number.NEGATIVE_INFINITY);
  const entries = [old, young, nan, negInf];

  it("splits expired, retained and undated; undated rows are retained", () => {
    const result = plan(entries, { maxAgeMs: 1_000 }, 2_000);
    assert.deepStrictEqual(result.expired, [old]);
    assert.deepStrictEqual(result.retained, [young, nan, negInf]);
    assert.deepStrictEqual(result.undated, [nan, negInf]);
  });

  it("maxAgeMs = +Infinity is valid and expires nothing", () => {
    const result = plan(entries, { maxAgeMs: Number.POSITIVE_INFINITY }, 2_000);
    assert.deepStrictEqual(result.expired, []);
    assert.strictEqual(result.retained.length, entries.length);
  });

  it("maxAgeMs = 0 is valid: an entry older than now is expired", () => {
    const result = plan([entryAt(1_999), entryAt(2_000)], { maxAgeMs: 0 }, 2_000);
    assert.strictEqual(result.expired.length, 1);
    assert.strictEqual(result.retained.length, 1);
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

describe("planPurge", () => {
  const policy: RetentionPolicy = { maxAgeMs: 1_000 };
  const purgePlan = (entries: ReadonlyArray<AuditEntry>, archive: VerifiedArchive, now = 2_000) =>
    Result.getOrThrow(planPurge(entries, policy, now, archive));

  it("no archived row, nothing selected: an empty archive purges nothing and lists every expired row", () => {
    const [oldest, old, young] = [entryAt(0), entryAt(100), entryAt(1_900)];
    const entries = [oldest, old, young];
    const result = purgePlan(entries, archiveOf([]));
    assert.deepStrictEqual(result.purge, []);
    assert.deepStrictEqual(result.retain, entries);
    assert.deepStrictEqual(result.unarchived, [oldest, old]);
  });

  it("an unarchived entry is retained", () => {
    const e1 = entryAt(0);
    const e2 = entryAt(100);
    const result = purgePlan([e1, e2], archiveOf([e1]));
    assert.deepStrictEqual(result.purge, [e1]);
    assert.deepStrictEqual(result.retain, [e2]);
    assert.deepStrictEqual(result.unarchived, [e2]);
  });

  it("an archived row that is not yet past its age is retained and is not unarchived", () => {
    const young = entryAt(1_900);
    const result = purgePlan([young], archiveOf([young]));
    assert.deepStrictEqual(result.purge, []);
    assert.deepStrictEqual(result.retain, [young]);
    assert.deepStrictEqual(result.unarchived, []);
  });

  it("a row edited after archiving is retained", () => {
    const original = { ...entryAt(0), sequenceNumber: 1 };
    const edited: AuditEntry = { ...original, record: { ...original.record, at: 1 } };
    const result = purgePlan([edited], archiveOf([original]));
    assert.deepStrictEqual(result.purge, []);
    assert.deepStrictEqual(result.unarchived, [edited]);
  });

  it("a row renumbered after archiving is retained", () => {
    const original = { ...entryAt(0), sequenceNumber: 1 };
    const renumbered: AuditEntry = { ...original, sequenceNumber: 2 };
    const result = purgePlan([renumbered], archiveOf([original]));
    assert.deepStrictEqual(result.purge, []);
    assert.deepStrictEqual(result.unarchived, [renumbered]);
  });

  it("two identical rows need two archived copies", () => {
    const first = entryAt(0);
    const second: AuditEntry = { ...first };
    const one = purgePlan([first, second], archiveOf([first]));
    assert.deepStrictEqual(one.purge, [first]);
    assert.deepStrictEqual(one.unarchived, [second]);
    const two = purgePlan([first, second], archiveOf([first, second]));
    assert.deepStrictEqual(two.purge, [first, second]);
    assert.deepStrictEqual(two.unarchived, []);
  });

  it("a round-tripped archive matches rows read back from a store", () => {
    const entries = [{ ...entryAt(0), sequenceNumber: 1 }, { ...entryAt(100), sequenceNumber: 2 }];
    const archive = archiveOf(entries);
    const stored = entries.map(fromStore);
    assert.isTrue(stored.every((row, i) => row !== entries[i]));
    const result = purgePlan(stored, archive);
    assert.deepStrictEqual(result.purge, stored);
    assert.deepStrictEqual(result.unarchived, []);
  });

  it("a sibling row of the same evaluation is a different row", () => {
    const decision = entryAt(0);
    const sibling = Effect.runSync(encodeAuditEntry(obligationRecord({ evaluationId: "e-0", at: 0 })));
    const result = purgePlan([decision, sibling], archiveOf([decision]));
    assert.deepStrictEqual(result.purge, [decision]);
    assert.deepStrictEqual(result.unarchived, [sibling]);
  });

  it("an undated row is retained even when its archive holds it, and is not unarchived", () => {
    const nan = entryWithAt(Number.NaN);
    const result = purgePlan([nan], archiveOf([]));
    assert.deepStrictEqual(result.purge, []);
    assert.deepStrictEqual(result.undated, [nan]);
    assert.deepStrictEqual(result.unarchived, []);
  });

  it("copies the archive's sequenceIntegrityVerified onto the plan", () => {
    const sequenced = [
      { ...entryAt(0), sequenceNumber: 1 },
      { ...entryAt(100), sequenceNumber: 2 },
    ];
    assert.isTrue(purgePlan(sequenced, archiveOf(sequenced)).sequenceIntegrityVerified);
    assert.isFalse(purgePlan([entryAt(0)], archiveOf([entryAt(0)])).sequenceIntegrityVerified);
  });

  it("refuses the same invalid input planRetention does", () => {
    const result = planPurge([entryAt(0)], { maxAgeMs: -1 }, 2_000, archiveOf([]));
    if (!Result.isFailure(result)) return assert.fail("expected a refusal");
    assert.strictEqual(result.failure._tag, "RetentionInputInvalid");
    assert.strictEqual(result.failure.field, "maxAgeMs");
  });
});

describe("PROPERTY: retained and expired partition entries", () => {
  it("retained ∪ expired = entries, retained ∩ expired = ∅, and an expiry has a provable age", () => {
    const number = FastCheck.oneof(
      FastCheck.integer({ min: 0, max: 200_000 }),
      FastCheck.integer({ min: -1_000, max: -1 }),
      FastCheck.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
    );
    const arb = FastCheck.tuple(FastCheck.array(number, { maxLength: 30 }), number, number);

    FastCheck.assert(
      FastCheck.property(arb, ([timestamps, maxAgeMs, now]) => {
        const entries = timestamps.map((at) => entryWithAt(at));
        const result = planRetention(entries, { maxAgeMs }, now);
        if (Result.isFailure(result)) return true;
        const { retained, expired, undated } = result.success;

        const union = new Set<AuditEntry>([...retained, ...expired]);
        const intersection = retained.filter((e) => expired.includes(e));
        const provable = expired.every(
          (e) =>
            Number.isFinite(e.record.at) &&
            Number.isFinite(now) &&
            maxAgeMs >= 0 &&
            now - e.record.at > maxAgeMs,
        );
        return (
          union.size === entries.length &&
          retained.length + expired.length === entries.length &&
          intersection.length === 0 &&
          provable &&
          undated.every((e) => retained.includes(e))
        );
      }),
      { numRuns: 500 },
    );
  });
});

describe("PROPERTY: a purge never selects a row its archive does not hold (INV-QD-130)", () => {
  const number = FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 40 }),
    FastCheck.integer({ min: -10, max: -1 }),
    FastCheck.constantFrom(Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
  );
  const arb = FastCheck.tuple(
    FastCheck.array(FastCheck.record({ at: number, archived: FastCheck.boolean() }), { maxLength: 24 }),
    number,
    number,
  );

  it("purge is a sub-multiset of the archive; every other expired row is retained and unarchived", () => {
    FastCheck.assert(
      FastCheck.property(arb, ([rows, maxAgeMs, now]) => {
        const entries = rows.map(({ at }) => entryWithAt(at));
        // Only rows with a finite `at` survive JSON; the archive is a random sub-multiset of them.
        const archive = archiveOf(rows.flatMap(({ at, archived }, i) => {
          const entry = entries[i];
          return archived && entry !== undefined && Number.isFinite(at) ? [entry] : [];
        }));
        const result = planPurge(entries, { maxAgeMs }, now, archive);
        if (Result.isFailure(result)) return true;
        const { purge, retain, undated, unarchived } = result.success;

        const age = planRetention(entries, { maxAgeMs }, now);
        if (Result.isFailure(age)) return false;
        const eligible = age.success.expired;

        const refsOf = (rowsOf: ReadonlyArray<AuditEntry>) => new Set<AuditEntry>(rowsOf);
        const purgeRefs = refsOf(purge);
        const retainRefs = refsOf(retain);
        const partition =
          purge.length + retain.length === entries.length &&
          purgeRefs.size === purge.length &&
          retainRefs.size === retain.length &&
          entries.every((e) => purgeRefs.has(e) !== retainRefs.has(e));

        const multiset = purge.every((p) => {
          const purgedCopies = purge.filter((q) => Equal.equals(p, q)).length;
          const eligibleCopies = eligible.filter((q) => Equal.equals(p, q)).length;
          return purgedCopies <= archive.holds(p) && purgedCopies === Math.min(eligibleCopies, archive.holds(p));
        });
        const waiting = eligible.every((e) => purgeRefs.has(e) || (retainRefs.has(e) && unarchived.includes(e)));
        const contained =
          undated.every((e) => retainRefs.has(e)) &&
          unarchived.every((e) => retainRefs.has(e) && !purgeRefs.has(e));
        const provable = purge.every(
          (e) =>
            Number.isFinite(e.record.at) &&
            Number.isFinite(now) &&
            maxAgeMs >= 0 &&
            now - e.record.at > maxAgeMs,
        );
        return partition && multiset && waiting && contained && provable;
      }),
      { numRuns: 500 },
    );
  });
});
