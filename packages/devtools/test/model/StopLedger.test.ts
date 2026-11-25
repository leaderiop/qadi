/**
 * The stop ledger transition, pinned as a table.
 *
 * The key a stop box mounts under and whether it announces are read from the committed
 * ledger, and recording a stop must neither move the key nor make a new ledger for a known
 * stop, so the record never remounts the box. The rows name the property; this file is held
 * byte for byte from the commit that adds it, written before the module it imports.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { announcesStop, noStops, recordStop, stoppedKey } from "../../src/model/StopLedger.ts";
import type { StopLedger } from "../../src/model/StopLedger.ts";

interface Stop {
  readonly name: string;
}

const a: Stop = { name: "a" };
const b: Stop = { name: "b" };
const aAgain: Stop = { name: "a" };

const afterA: StopLedger<Stop> = recordStop(noStops, a);
const three: StopLedger<Stop> = recordStop(recordStop(afterA, b), a);

/** One row of the table: a ledger and a status in, what the three functions answer out. */
interface Row {
  readonly ledger: StopLedger<Stop>;
  readonly status: Stop;
  readonly key: number;
  readonly announces: boolean;
  /** The ledger the record returns, or the marker that it is the same ledger by identity. */
  readonly recorded: StopLedger<Stop> | "same";
}

const first: Row = { ledger: noStops, status: a, key: 1, announces: true, recorded: { stop: a, count: 1 } };
const again: Row = { ledger: afterA, status: a, key: 1, announces: false, recorded: "same" };
const second: Row = { ledger: afterA, status: b, key: 2, announces: true, recorded: { stop: b, count: 2 } };
const equalFields: Row = {
  ledger: afterA,
  status: aAgain,
  key: 2,
  announces: true,
  recorded: { stop: aAgain, count: 2 },
};
const fourth: Row = { ledger: three, status: b, key: 4, announces: true, recorded: { stop: b, count: 4 } };
const lastOfThree: Row = { ledger: three, status: a, key: 3, announces: false, recorded: "same" };

const rows: ReadonlyArray<Row> = [first, again, second, equalFields, fourth, lastOfThree];

const holds = (row: Row): void => {
  assert.strictEqual(stoppedKey(row.ledger, row.status), row.key);
  assert.strictEqual(announcesStop(row.ledger, row.status), row.announces);
  const recorded = recordStop(row.ledger, row.status);
  if (row.recorded === "same") {
    assert.strictEqual(recorded, row.ledger);
  } else {
    assert.deepStrictEqual(recorded, row.recorded);
  }
};

describe("StopLedger", () => {
  it("L1 an empty ledger and a first stop: key one, announces, recorded with count one", () => {
    holds(first);
  });

  it("L2 the recorded stop again: the same key, silent, and recording returns the same ledger", () => {
    holds(again);
  });

  it("L3 a second distinct stop: key two, announces, recorded with count two", () => {
    holds(second);
  });

  it("L4 an equal-field stop that is a new identity announces, because a stop is its identity", () => {
    holds(equalFields);
  });

  it("L5 a ledger of count three and a new stop: key four, announces, recorded with count four", () => {
    holds(fourth);
  });

  it("L6 the last stop of a ledger of count three: key three, silent, the same ledger", () => {
    holds(lastOfThree);
  });

  it("LAW1 the key is the same before and after the stop is recorded, for every row", () => {
    for (const row of rows) {
      assert.strictEqual(
        stoppedKey(recordStop(row.ledger, row.status), row.status),
        stoppedKey(row.ledger, row.status),
      );
    }
  });

  it("LAW2 recording a recorded stop returns the same ledger, for every row", () => {
    for (const row of rows) {
      const once = recordStop(row.ledger, row.status);
      assert.strictEqual(recordStop(once, row.status), once);
    }
  });

  it("LAW3 any sequence of stops: the count equals the number of changes and the key holds across each record", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.array(FastCheck.constantFrom(a, b, aAgain), { maxLength: 30 }),
        (stops) => {
          let ledger: StopLedger<Stop> = noStops;
          let changes = 0;
          let last: Stop | undefined = undefined;
          for (const stop of stops) {
            const before = stoppedKey(ledger, stop);
            ledger = recordStop(ledger, stop);
            if (stop !== last) {
              changes += 1;
            }
            last = stop;
            if (stoppedKey(ledger, stop) !== before) {
              return false;
            }
          }
          return ledger.count === changes;
        },
      ),
    );
  });
});
