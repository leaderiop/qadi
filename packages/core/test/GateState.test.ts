/**
 * Pins the five gate-state words, their order and the own-key guard.
 *
 * `gateStates` is what `@qadi/react` and `@qadi/devtools` both read, so the words
 * and their order are written out by hand here: an oracle read from the list
 * under test cannot notice that list changing. The order is observable, it is
 * the devtools panel's sort order, worst news first. The inherited names guard
 * the own-key test, which a prototype lookup would fail (ADR-QD-162 applying
 * ADR-QD-152, ARCH-96).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Barrel from "../src/index.ts";
import { gateStates, isGateState } from "../src/GateState.ts";

describe("the gate states, written out: five words in their order and no others", () => {
  it("are Failed, Denied, Rechecking, Pending, Allowed, once each", () => {
    assert.deepStrictEqual([...gateStates], ["Failed", "Denied", "Rechecking", "Pending", "Allowed"]);
    assert.strictEqual(new Set(gateStates).size, gateStates.length);
  });

  it("is the same list through the barrel", () => {
    assert.strictEqual(Barrel.gateStates, gateStates);
    assert.strictEqual(Barrel.isGateState, isGateState);
  });

  it("each of the five is a state", () => {
    for (const word of ["Failed", "Denied", "Rechecking", "Pending", "Allowed"]) {
      assert.isTrue(isGateState(word), word);
    }
  });

  it("a name every object inherits is not a state", () => {
    for (const word of ["toString", "constructor", "hasOwnProperty", "__proto__", "valueOf"]) {
      assert.isFalse(isGateState(word), word);
    }
  });

  it("a newer or differently written word is not a state", () => {
    for (const word of ["", "Suspended", "failed"]) {
      assert.isFalse(isGateState(word), JSON.stringify(word));
    }
  });
});
