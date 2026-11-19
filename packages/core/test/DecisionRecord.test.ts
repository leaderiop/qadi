/**
 * `sinkRecordOrder` and `storedRecordOrder`, the one order a record is read in
 * (INV-QD-039).
 *
 * It was two functions in devtools — a comparator for a merged backlog and a
 * predicate for the timeline — that agreed only by comment. The laws below are
 * checked over a closed grid that includes the values a `Clock` never produces
 * but a hand-built or hostile record can carry: `NaN`, both infinities and `-0`.
 * The grid is built on real `ObligationRecord`s, the order's own subject, and
 * `storedRecordOrder` is checked to agree with it through the envelope (D-03).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Order from "effect/Order";
import { ObligationRecord, sinkRecordOrder, StoredRecord, storedRecordOrder } from "../src/DecisionRecord.ts";

const GRID = [Number.NaN, Number.NEGATIVE_INFINITY, -1, -0, 0, 1, 2, Number.POSITIVE_INFINITY];
const at = (value: number, evaluationId = "e") =>
  new ObligationRecord({ evaluationId, at: value, outcome: "Discharged", obligationIds: [] });
const stored = (value: number, environment = "Server") => new StoredRecord({ environment, record: at(value) });

describe("sinkRecordOrder", () => {
  it("is total, antisymmetric and transitive over the grid", () => {
    for (const a of GRID) {
      for (const b of GRID) {
        const ab = sinkRecordOrder(at(a), at(b));
        const ba = sinkRecordOrder(at(b), at(a));
        assert.include([-1, 0, 1], ab, `${a} vs ${b}`);
        assert.strictEqual(ab, -ba === 0 ? 0 : -ba, `antisymmetry ${a} vs ${b}`);
        for (const c of GRID) {
          if (ab <= 0 && sinkRecordOrder(at(b), at(c)) <= 0) {
            assert.isAtMost(sinkRecordOrder(at(a), at(c)), 0, `transitivity ${a} ≤ ${b} ≤ ${c}`);
          }
        }
      }
    }
  });

  it("puts an unknown (NaN) time after every known one", () => {
    for (const known of GRID.filter((value) => !Number.isNaN(value))) {
      assert.strictEqual(sinkRecordOrder(at(Number.NaN), at(known)), 1, `NaN vs ${known}`);
      assert.strictEqual(sinkRecordOrder(at(known), at(Number.NaN)), -1, `${known} vs NaN`);
    }
  });

  it("two NaNs compare equal, so a stable sort keeps arrival order", () => {
    assert.strictEqual(sinkRecordOrder(at(Number.NaN), at(Number.NaN)), 0);
    const rows = [at(Number.NaN, "first"), at(2, "two"), at(Number.NaN, "second"), at(1, "one")];
    assert.deepStrictEqual(
      [...rows].sort(sinkRecordOrder).map((row) => row.evaluationId),
      ["one", "two", "first", "second"],
    );
  });

  it("orders known times ascending, -0 equal to 0", () => {
    assert.strictEqual(sinkRecordOrder(at(1), at(2)), -1);
    assert.strictEqual(sinkRecordOrder(at(2), at(1)), 1);
    assert.strictEqual(sinkRecordOrder(at(-0), at(0)), 0);
    assert.isTrue(Order.isGreaterThan(sinkRecordOrder)(at(Number.POSITIVE_INFINITY), at(2)));
  });
});

describe("storedRecordOrder", () => {
  it("agrees with sinkRecordOrder over the records it holds, for every pair in the grid", () => {
    for (const a of GRID) {
      for (const b of GRID) {
        assert.strictEqual(storedRecordOrder(stored(a), stored(b)), sinkRecordOrder(at(a), at(b)), `${a} vs ${b}`);
      }
    }
  });

  it("reads the record's time, never the environment: equal records in different environments compare equal", () => {
    assert.strictEqual(storedRecordOrder(stored(1, "Server"), stored(1, "Client")), 0);
    assert.strictEqual(storedRecordOrder(stored(Number.NaN, "Server"), stored(Number.NaN, "Client")), 0);
    assert.strictEqual(storedRecordOrder(stored(1, "Z"), stored(2, "A")), -1);
  });

  it("sorts stored records by their record's time, an unknown time last and arrival kept", () => {
    const rows = [
      new StoredRecord({ environment: "a", record: at(Number.NaN, "first") }),
      new StoredRecord({ environment: "b", record: at(2, "two") }),
      new StoredRecord({ environment: "c", record: at(Number.NaN, "second") }),
      new StoredRecord({ environment: "d", record: at(1, "one") }),
    ];
    assert.deepStrictEqual(
      [...rows].sort(storedRecordOrder).map((row) => row.record.evaluationId),
      ["one", "two", "first", "second"],
    );
  });
});
