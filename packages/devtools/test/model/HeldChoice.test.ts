/**
 * The held-choice rule, tested once for every screen that uses it.
 *
 * Every arm of `resolveHeld` is per-call, so each is pinned by an output
 * (ADR-QD-076). The screens' own tests keep only what is theirs.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { pinHead, resolveHeld } from "../../src/model/HeldChoice.ts";

interface Item {
  readonly key: string;
  readonly n: number;
}
const item = (key: string, n = 0): Item => ({ key, n });
const sameKey = (a: Item, b: Item) => a.key === b.key;

describe("resolveHeld", () => {
  it("is Empty for an empty list with nothing held", () => {
    assert.deepStrictEqual(resolveHeld([], undefined, sameKey), { _tag: "Empty" });
  });

  it("reads nothing held as the head of the list", () => {
    const list = [item("a"), item("b")];
    assert.deepStrictEqual(resolveHeld(list, undefined, sameKey), {
      _tag: "Listed",
      value: item("a"),
      index: 0,
    });
  });

  it("finds a held value and returns the list's own element", () => {
    const newest = item("b", 2);
    const result = resolveHeld([item("a"), newest], item("b", 1), sameKey);
    assert.strictEqual(result._tag, "Listed");
    if (result._tag !== "Listed") return;
    assert.strictEqual(result.index, 1);
    assert.strictEqual(result.value, newest);
  });

  it("follows a held value through a reorder", () => {
    const result = resolveHeld([item("b"), item("a")], item("b"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("b"), index: 0 });
  });

  it("follows a held value past a head insertion", () => {
    const result = resolveHeld([item("c"), item("a"), item("b")], item("b"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("b"), index: 2 });
  });

  it("keeps a value that left the list, as Evicted", () => {
    const held = item("b");
    assert.deepStrictEqual(resolveHeld([item("a")], held, sameKey), {
      _tag: "Evicted",
      value: held,
    });
  });

  it("keeps a held value through an empty list", () => {
    const held = item("b");
    assert.deepStrictEqual(resolveHeld([], held, sameKey), { _tag: "Evicted", value: held });
  });

  it("matches the first of two equal elements", () => {
    const result = resolveHeld([item("x", 1), item("x", 2)], item("x"), sameKey);
    assert.deepStrictEqual(result, { _tag: "Listed", value: item("x", 1), index: 0 });
  });

  it("names the held value under any permutation of the list", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.uniqueArray(FastCheck.integer(), { minLength: 1 }).chain((list) =>
          FastCheck.tuple(
            FastCheck.constant(list),
            FastCheck.shuffledSubarray(list, { minLength: list.length, maxLength: list.length }),
            FastCheck.nat(list.length - 1),
          ),
        ),
        ([list, permuted, pick]) => {
          const held = list[pick];
          const result = resolveHeld(permuted, held, (a, b) => a === b);
          return result._tag === "Listed" && result.value === held && permuted[result.index] === held;
        },
      ),
    );
  });
});

describe("pinHead", () => {
  it("keeps what is held", () => {
    assert.strictEqual(pinHead([item("a")], item("z"))?.key, "z");
  });

  it("holds the head when nothing is held", () => {
    const list = [item("a"), item("b")];
    assert.strictEqual(pinHead(list, undefined), list[0]);
  });

  it("holds nothing from an empty list", () => {
    assert.isUndefined(pinHead([], undefined));
  });
});
