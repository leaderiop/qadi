/**
 * `storedRecordOrder`, the one order a stored record is read in (INV-QD-039).
 *
 * It was two functions in devtools — a comparator for a merged backlog and a
 * predicate for the timeline — that agreed only by comment. The laws below are
 * checked over a closed grid that includes the values a `Clock` never produces
 * but a hand-built or hostile record can carry: `NaN`, both infinities and `-0`.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Order from "effect/Order";
import { storedRecordOrder } from "../src/DecisionRecord.ts";

const GRID = [Number.NaN, Number.NEGATIVE_INFINITY, -1, -0, 0, 1, 2, Number.POSITIVE_INFINITY];
const at = (value: number) => ({ at: value });

describe("storedRecordOrder", () => {
  it("is total, antisymmetric and transitive over the grid", () => {
    for (const a of GRID) {
      for (const b of GRID) {
        const ab = storedRecordOrder(at(a), at(b));
        const ba = storedRecordOrder(at(b), at(a));
        assert.include([-1, 0, 1], ab, `${a} vs ${b}`);
        assert.strictEqual(ab, -ba === 0 ? 0 : -ba, `antisymmetry ${a} vs ${b}`);
        for (const c of GRID) {
          if (ab <= 0 && storedRecordOrder(at(b), at(c)) <= 0) {
            assert.isAtMost(storedRecordOrder(at(a), at(c)), 0, `transitivity ${a} ≤ ${b} ≤ ${c}`);
          }
        }
      }
    }
  });

  it("puts an unknown (NaN) time after every known one", () => {
    for (const known of GRID.filter((value) => !Number.isNaN(value))) {
      assert.strictEqual(storedRecordOrder(at(Number.NaN), at(known)), 1, `NaN vs ${known}`);
      assert.strictEqual(storedRecordOrder(at(known), at(Number.NaN)), -1, `${known} vs NaN`);
    }
  });

  it("two NaNs compare equal, so a stable sort keeps arrival order", () => {
    assert.strictEqual(storedRecordOrder(at(Number.NaN), at(Number.NaN)), 0);
    const rows = [
      { at: Number.NaN, id: "first" },
      { at: 2, id: "two" },
      { at: Number.NaN, id: "second" },
      { at: 1, id: "one" },
    ];
    assert.deepStrictEqual(
      [...rows].sort(storedRecordOrder).map((row) => row.id),
      ["one", "two", "first", "second"],
    );
  });

  it("orders known times ascending, -0 equal to 0", () => {
    assert.strictEqual(storedRecordOrder(at(1), at(2)), -1);
    assert.strictEqual(storedRecordOrder(at(2), at(1)), 1);
    assert.strictEqual(storedRecordOrder(at(-0), at(0)), 0);
    assert.isTrue(Order.isGreaterThan(storedRecordOrder)(at(Number.POSITIVE_INFINITY), at(2)));
  });
});
