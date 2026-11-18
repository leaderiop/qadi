import { assert, describe, it } from "@effect/vitest";
import * as M from "../src/Matcher.ts";
import { getByPath, isOwnKey, ownValue } from "../src/Operand.ts";

// Every prototype-named fixture is built with JSON.parse: an object literal with a
// `__proto__` key sets the real prototype instead of an own key.
const PROTOTYPE_NAMES = [
  "__proto__",
  "constructor",
  "toString",
  "hasOwnProperty",
  "valueOf",
] as const;

describe("ownValue", () => {
  it("reads an own key", () => {
    assert.strictEqual(ownValue({ a: 1 }, "a"), 1);
  });

  it("reads undefined for an own key holding undefined and for a missing key", () => {
    assert.isUndefined(ownValue({ a: undefined }, "a"));
    assert.isUndefined(ownValue({ a: 1 }, "b"));
  });

  it("reads each prototype name as absent on a plain object", () => {
    for (const name of PROTOTYPE_NAMES) {
      assert.isUndefined(ownValue({}, name), name);
    }
  });

  it("reads JSON.parse's own `__proto__` and `constructor` as data", () => {
    const parsed: Record<string, unknown> = JSON.parse(
      '{"__proto__":{"x":1},"constructor":"c"}',
    );
    assert.deepStrictEqual(ownValue(parsed, "__proto__"), { x: 1 });
    assert.strictEqual(ownValue(parsed, "constructor"), "c");
  });

  it("reads a null-prototype object", () => {
    const bare: Record<string, number> = Object.create(null);
    bare["k"] = 7;
    assert.strictEqual(ownValue(bare, "k"), 7);
    assert.isUndefined(ownValue(bare, "missing"));
  });
});

describe("isOwnKey", () => {
  it("is true for an own key, even one holding undefined", () => {
    assert.isTrue(isOwnKey({ a: 1 }, "a"));
    assert.isTrue(isOwnKey({ a: undefined }, "a"));
    assert.isFalse(isOwnKey({ a: 1 }, "b"));
  });

  it("is false for each prototype name on a plain object", () => {
    for (const name of PROTOTYPE_NAMES) {
      assert.isFalse(isOwnKey({}, name), name);
    }
  });

  it("is true for JSON.parse's own `__proto__`", () => {
    const parsed: object = JSON.parse('{"__proto__":{"x":1}}');
    assert.isTrue(isOwnKey(parsed, "__proto__"));
  });

  it("answers on a null-prototype object", () => {
    const bare: Record<string, number> = Object.create(null);
    bare["k"] = 1;
    assert.isTrue(isOwnKey(bare, "k"));
    assert.isFalse(isOwnKey(bare, "missing"));
  });
});

describe("getByPath", () => {
  it("returns the input for an empty path", () => {
    assert.deepStrictEqual(getByPath({ a: 1 }, ""), { a: 1 });
  });

  it("walks a dot path", () => {
    assert.strictEqual(getByPath({ a: { b: { c: 3 } } }, "a.b.c"), 3);
  });

  it("returns undefined at any missing step", () => {
    assert.isUndefined(getByPath({ a: 1 }, "a.b.c"));
    assert.isUndefined(getByPath(undefined, "a"));
  });

  // These three pin the boundaries `path.split(".")` used to produce, so the
  // `indexOf`-based walk (added to avoid allocating a segment array on every
  // call — the most frequently called allocator in the library) provably
  // matches it rather than merely resembling it.
  it("resolves a single segment with no dot at all", () => {
    assert.strictEqual(getByPath({ a: 1 }, "a"), 1);
  });

  it("treats a trailing dot as an empty final segment", () => {
    assert.strictEqual(getByPath({ a: { "": 5 } }, "a."), 5);
    assert.isUndefined(getByPath({ a: { b: 5 } }, "a."));
  });

  it("treats a doubled dot as an empty middle segment", () => {
    assert.strictEqual(getByPath({ a: { "": { b: 9 } } }, "a..b"), 9);
  });

  it("reads an inherited member as absent", () => {
    assert.isUndefined(getByPath({ a: {} }, "a.constructor"));
    assert.isUndefined(getByPath({ a: {} }, "a.toString"));
  });

  it("reads JSON.parse's own `__proto__` as data", () => {
    const parsed: unknown = JSON.parse('{"__proto__":{"x":1}}');
    assert.strictEqual(getByPath(parsed, "__proto__.x"), 1);
  });

  it("gives undefined for a null root and a null intermediate", () => {
    assert.isUndefined(getByPath(null, "a"));
    assert.isUndefined(getByPath({ a: null }, "a.b"));
  });

  it("reads an array's own length and index, and a string's nothing", () => {
    assert.strictEqual(getByPath({ a: [1, 2] }, "a.length"), 2);
    assert.strictEqual(getByPath({ a: [1, 2] }, "a.0"), 1);
    assert.isUndefined(getByPath({ s: "ab" }, "s.length"));
  });
});

describe("Matcher.ts re-exports Operand.ts's getByPath", () => {
  it("is the same function", () => {
    assert.strictEqual(M.getByPath, getByPath);
  });
});
