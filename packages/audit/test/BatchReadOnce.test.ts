/**
 * Pins that each input of a host batch is read once and that what was checked is what is used.
 *
 * A list, a policy or a getter that a store client or a JavaScript caller hands over can answer differently when it is
 * read again, and an answer read twice lets a check pass on one value while the work goes on with another. A
 * `maxAgeMs` read for the check and read again for every row could be a different number each time, a list whose first
 * index changes after the codec check would be archived, sequenced or planned as a row nothing checked, and a policy
 * that is not an object has no `maxAgeMs` to read. The rows hold whatever the step that reads the inputs looks like:
 * they count the reads and flip the answers, and say nothing about where the reading is done. The file is held byte for
 * byte from the commit that adds it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { RetentionInputRefusal, planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord, numbered } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/**
 * What a JavaScript caller can hand over where the type says something else: `Reflect.get`
 * on an `object` answers `any`, which is what an untyped store client's result is.
 */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

const host = (value: unknown): ReadonlyArray<AuditEntry> => handedOver(value);

/** A list that counts each property read of it, by key, and answers what the list it copies answers. */
const counting = (rows: ReadonlyArray<unknown>) => {
  const reads = new Map<string, number>();
  const proxy = new Proxy([...rows], {
    get(target, prop, receiver) {
      const key = typeof prop === "symbol" ? prop.toString() : prop;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      return Reflect.get(target, prop, receiver);
    },
  });
  return { rows: host(proxy), reads };
};

/** A list whose index `0` answers its own first value on the first read and `second` on every later read. */
const flipping = (rows: ReadonlyArray<unknown>, second: unknown) => {
  let reads = 0;
  const proxy = new Proxy([...rows], {
    get(target, prop, receiver) {
      if (prop === "0") {
        reads += 1;
        return reads === 1 ? Reflect.get(target, prop, receiver) : second;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return host(proxy);
};

/** A policy whose `maxAgeMs` counts the reads of it. */
const watched = (maxAgeMs: number) => {
  const state = { reads: 0 };
  const policy: RetentionPolicy = {
    get maxAgeMs() {
      state.reads += 1;
      return maxAgeMs;
    },
  };
  return { policy, state };
};

/** An archive read back from the bytes a store would return for `rows`. */
const storedArchive = (rows: ReadonlyArray<AuditEntry>) =>
  Result.getOrThrow(readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail(rows, 0))))));

const failureOf = (result: Result.Result<unknown, unknown>): unknown =>
  Result.isFailure(result) ? { ...Object(result.failure) } : assert.fail("the plan took the policy");

/** The reads of a counted list, ordered by key. */
const readsOf = (reads: Map<string, number>) => [...reads].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));

const good = codecRow("good");
const NOW = 100_000;

/** What a list read as its length once and each of three indexes once looks like. */
const LENGTH_AND_EACH_INDEX_ONCE = [
  ["0", 1],
  ["1", 1],
  ["2", 1],
  ["length", 1],
];

const maxAgeUndefined = {
  _tag: "RetentionInputInvalid",
  refusal: RetentionInputRefusal.MaxAgeInvalid({ value: undefined }),
};

describe("a policy is read once and a policy that is not an object is refused", () => {
  it("B1 planRetention reads maxAgeMs once over two rows", () => {
    const { policy, state } = watched(10);
    assert.isTrue(Result.isSuccess(planRetention([good, codecRow("other")], policy, NOW)));
    assert.strictEqual(state.reads, 1);
  });

  it("B2 planPurge reads maxAgeMs once over two rows", () => {
    const rows = [good, codecRow("other")];
    const { policy, state } = watched(10);
    assert.isTrue(Result.isSuccess(planPurge(rows, policy, NOW, storedArchive(rows))));
    assert.strictEqual(state.reads, 1);
  });

  it("B3 a refused maxAgeMs is read once by each plan", () => {
    const retention = watched(-1);
    const purge = watched(-1);
    assert.isTrue(Result.isFailure(planRetention([good], retention.policy, NOW)));
    assert.isTrue(Result.isFailure(planPurge([good], purge.policy, NOW, storedArchive([good]))));
    assert.deepStrictEqual({ retention: retention.state.reads, purge: purge.state.reads }, { retention: 1, purge: 1 });
  });

  it("B4 a null or undefined policy is MaxAgeInvalid with value undefined in each plan", () => {
    for (const given of [null, undefined]) {
      const policy = handedOver<RetentionPolicy>(given);
      assert.deepStrictEqual(failureOf(planRetention([good], policy, NOW)), maxAgeUndefined);
      assert.deepStrictEqual(failureOf(planPurge([good], policy, NOW, storedArchive([good]))), maxAgeUndefined);
    }
  });

  it("B5 a policy that is a number, a string or an empty object is MaxAgeInvalid with value undefined in each plan", () => {
    for (const given of [1, "x", {}]) {
      const policy = handedOver<RetentionPolicy>(given);
      assert.deepStrictEqual(failureOf(planRetention([good], policy, NOW)), maxAgeUndefined);
      assert.deepStrictEqual(failureOf(planPurge([good], policy, NOW, storedArchive([good]))), maxAgeUndefined);
    }
  });
});

describe("what was checked is what is used when a list answers differently on a second read", () => {
  it("B6 the writer archives the row that was checked when the list answers differently on a second read, and its reader reads the bundle back", () => {
    const rows = flipping([good], { record: good.record, sequenceNumber: 1.5 });
    const archive = Effect.runSync(archiveAuditTrail(rows, 1_000));
    assert.strictEqual(archive.entries[0], good);
    assert.isTrue(Result.isSuccess(readAuditArchive(JSON.parse(JSON.stringify(archive)))));
  });

  it("B7 the sequence check judges the rows that were checked when the list answers differently on a second read", () => {
    const first = numbered(codecRow("a"), 1);
    const second = numbered(codecRow("b"), 2);
    const rows = flipping([first, second], { record: first.record, sequenceNumber: 5 });
    const result = Effect.runSync(Effect.result(verifySequenceIntegrity(rows)));
    assert.strictEqual(Result.isFailure(result) ? result.failure._tag : "success", "success");
  });

  it("B8 planRetention plans the row that was checked when the list answers differently on a second read", () => {
    const rows = flipping([good], { record: { ...good.record, at: 99_999 }, sequenceNumber: undefined });
    const plan = Result.getOrThrow(planRetention(rows, { maxAgeMs: 10 }, NOW));
    assert.strictEqual(plan.expired.length, 1);
    assert.strictEqual(plan.expired[0], good);
    assert.strictEqual(plan.retained.length, 0);
  });

  it("B9 planPurge plans the row that was checked when the list answers differently on a second read", () => {
    const rows = flipping([good], { record: { ...good.record, at: 99_999 }, sequenceNumber: undefined });
    const plan = Result.getOrThrow(planPurge(rows, { maxAgeMs: 10 }, NOW, storedArchive([good])));
    assert.strictEqual(plan.purge.length, 1);
    assert.strictEqual(plan.purge[0], good);
  });
});

describe("a rows list is read as its length once and each index once", () => {
  const trio = [good, codecRow("a"), codecRow("b")];
  const three = () => counting(trio);

  it("B10 the writer reads the rows list as its length once and each index once", () => {
    const { rows, reads } = three();
    assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(archiveAuditTrail(rows, 1_000)))));
    assert.deepStrictEqual(readsOf(reads), LENGTH_AND_EACH_INDEX_ONCE);
  });

  it("B11 the sequence check reads the rows list as its length once and each index once", () => {
    const { rows, reads } = three();
    assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(verifySequenceIntegrity(rows)))));
    assert.deepStrictEqual(readsOf(reads), LENGTH_AND_EACH_INDEX_ONCE);
  });

  it("B12 planRetention reads the rows list as its length once and each index once", () => {
    const { rows, reads } = three();
    assert.isTrue(Result.isSuccess(planRetention(rows, { maxAgeMs: 10 }, NOW)));
    assert.deepStrictEqual(readsOf(reads), LENGTH_AND_EACH_INDEX_ONCE);
  });

  it("B13 planPurge reads the rows list as its length once and each index once", () => {
    const { rows, reads } = three();
    const archive = storedArchive(trio);
    assert.isTrue(Result.isSuccess(planPurge(rows, { maxAgeMs: 10 }, NOW, archive)));
    assert.deepStrictEqual(readsOf(reads), LENGTH_AND_EACH_INDEX_ONCE);
  });
});
