import { assert, describe, it } from "@effect/vitest";
import type { FieldStrategy } from "../src/Policy.ts";
import { anyOfStopsAtAllow, rulesDecisiveEffect } from "../src/ShortCircuit.ts";

/** In-process values outside the union, built via `JSON.parse` (no `as`, AGENTS.md §6). */
const BOGUS_VALUES = ["Xor", "toString", "constructor", "__proto__", "hasOwnProperty"];

/**
 * The whole contract is a literal table — one row per strategy and per combining
 * algorithm — so each row is asserted, which is what kills a flipped literal.
 */
describe("anyOfStopsAtAllow (ADR-QD-013, INV-QD-005)", () => {
  it("only First stops at the first allowing child", () => {
    assert.isTrue(anyOfStopsAtAllow("First"));
    assert.isFalse(anyOfStopsAtAllow("Intersection"));
    assert.isFalse(anyOfStopsAtAllow("Union"));
  });

  it("a value outside the union never stops early — not even a prototype key", () => {
    for (const raw of BOGUS_VALUES) {
      const bogus: FieldStrategy = JSON.parse(JSON.stringify(raw));
      assert.strictEqual(anyOfStopsAtAllow(bogus), false, raw);
    }
  });
});

describe("rulesDecisiveEffect (INV-QD-017)", () => {
  it("the overrides stop at the effect nothing later can beat", () => {
    assert.strictEqual(rulesDecisiveEffect("DenyOverrides"), "Deny");
    assert.strictEqual(rulesDecisiveEffect("PermitOverrides"), "Permit");
  });

  it("FirstApplicable has no overriding effect", () => {
    assert.isUndefined(rulesDecisiveEffect("FirstApplicable"));
  });
});
