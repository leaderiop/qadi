/**
 * The request key's law: two values key alike exactly when `Equal.equals` says they are equal.
 *
 * The leaf pool is chosen so that a JSON-based key collides: a `Date` and its ISO string, the
 * non-finite numbers and `null`, an `undefined`-valued key and an absent one, a `Set` or `Map`
 * and the array JSON writes it as, and a `bigint`, which JSON cannot write at all. The key must
 * also be total: a cycle, a bigint and a very deep value each get an answer, never a throw.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { describeKeyRefusal, KeyRefusal } from "../src/PortDescription.ts";
import { canonicalKey } from "../src/PortKey.ts";

/** Why the key refused `v`, asserting it did. */
const refusalOf = (v: unknown): KeyRefusal => {
  const key = canonicalKey(v);
  if (Result.isSuccess(key)) return assert.fail(`keyed as ${key.success}`);
  return key.failure;
};

/** The key's text, asserting the value is inside the key's domain. */
const keyText = (v: unknown): string => {
  const key = canonicalKey(v);
  if (Result.isFailure(key)) return assert.fail(`refused: ${key.failure._tag}`);
  return key.success;
};

const leaf: FastCheck.Arbitrary<unknown> = FastCheck.constantFrom(
  new Date(0),
  "1970-01-01T00:00:00.000Z",
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
  null,
  undefined,
  0,
  -0,
  1,
  "1",
  "",
  true,
  1n,
);

const value: FastCheck.Arbitrary<unknown> = FastCheck.letrec<{ value: unknown }>((tie) => ({
  value: FastCheck.oneof(
    { maxDepth: 3, withCrossShrink: true },
    leaf,
    FastCheck.array(tie("value"), { maxLength: 3 }),
    FastCheck.dictionary(FastCheck.constantFrom("a", "b"), tie("value"), {
      maxKeys: 2,
      noNullPrototype: true,
    }),
    FastCheck.array(tie("value"), { maxLength: 3 }).map((members) => new Set(members)),
    FastCheck.array(FastCheck.tuple(tie("value"), tie("value")), { maxLength: 3 }).map(
      (entries) => new Map(entries),
    ),
  ),
})).value;

/** `v` rebuilt equal: object keys, Set members and Map entries in reverse order, each Date a new instance. */
const rebuilt = (v: unknown): unknown => {
  if (v instanceof Date) return new Date(v.getTime());
  if (v instanceof Set) return new Set(Array.from(v, rebuilt).toReversed());
  if (v instanceof Map) {
    return new Map(Array.from(v, ([k, x]): [unknown, unknown] => [rebuilt(k), rebuilt(x)]).toReversed());
  }
  if (Array.isArray(v)) return v.map(rebuilt);
  if (typeof v === "object" && v !== null) {
    return Object.fromEntries(
      Object.entries(v)
        .toReversed()
        .map(([k, x]) => [k, rebuilt(x)]),
    );
  }
  return v;
};

describe("canonicalKey — the key law (ARCH-65)", () => {
  it("agrees with Equal.equals over values chosen to collide", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.tuple(value, value), ([a, b]) => {
        assert.strictEqual(
          keyText(a) === keyText(b),
          Equal.equals(a, b),
          "key equality must be Equal.equals",
        );
      }),
      { numRuns: 1000 },
    );
  });

  it("an equal value rebuilt in another order keys alike", () => {
    FastCheck.assert(
      FastCheck.property(value, (v) => {
        const twin = rebuilt(v);
        assert.isTrue(Equal.equals(v, twin), "the rebuilt value is Equal.equals to the original");
        assert.strictEqual(keyText(v), keyText(twin));
      }),
      { numRuns: 500 },
    );
  });

  it("a Date keys apart from its ISO string", () => {
    assert.notStrictEqual(keyText(new Date(0)), keyText("1970-01-01T00:00:00.000Z"));
  });

  it("NaN, Infinity and -Infinity key apart from null and from each other", () => {
    const keys = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, null].map(keyText);
    assert.strictEqual(new Set(keys).size, 4, keys.join(" | "));
  });

  it("an undefined-valued key keys apart from an absent one", () => {
    assert.notStrictEqual(keyText({ a: undefined }), keyText({}));
  });

  it("a Set keys apart from the array of its members", () => {
    assert.notStrictEqual(keyText(new Set([1])), keyText([1]));
  });

  it("a Map keys apart from the array of its entries", () => {
    assert.notStrictEqual(keyText(new Map([[1, 2]])), keyText([[1, 2]]));
  });

  it("[undefined] keys apart from [null]", () => {
    assert.notStrictEqual(keyText([undefined]), keyText([null]));
  });

  it("-0 keys like 0, as Equal.equals has them equal", () => {
    assert.strictEqual(keyText(-0), keyText(0));
  });
});

describe("canonicalKey — totality (ARCH-65)", () => {
  it("answers a cyclic object without throwing", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    assert.doesNotThrow(() => canonicalKey(cyclic));
  });

  it("answers a bigint without throwing", () => {
    assert.doesNotThrow(() => canonicalKey(1n));
  });

  it("answers an array nested 100,000 levels deep without throwing", () => {
    let deep: unknown = [];
    for (let i = 0; i < 100_000; i++) deep = [deep];
    assert.doesNotThrow(() => canonicalKey(deep));
  });
});

describe("canonicalKey — the refusals (ARCH-65)", () => {
  it("refuses a cycle, naming where it closes", () => {
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    assert.deepStrictEqual(refusalOf(cyclic), KeyRefusal.Circular({ path: ["self"] }));
  });

  it("keys a shared, acyclic reference at each place it occurs", () => {
    const shared = { a: 1 };
    assert.strictEqual(keyText([shared, shared]), '[{"a":d1;},{"a":d1;}]');
  });

  it("refuses a function, a symbol and a symbol key", () => {
    assert.deepStrictEqual(
      refusalOf({ f: () => 1 }),
      KeyRefusal.Unkeyable({ path: ["f"], kind: "function", brand: "Function" }),
    );
    assert.deepStrictEqual(
      refusalOf(Symbol("x")),
      KeyRefusal.Unkeyable({ path: [], kind: "symbol", brand: "Symbol" }),
    );
    assert.deepStrictEqual(
      refusalOf({ [Symbol("k")]: 1 }),
      KeyRefusal.Unkeyable({ path: [], kind: "symbol-key", brand: "Object" }),
    );
  });

  it("refuses a class instance, a boxed primitive and binary data by constructor name", () => {
    class Point {
      x = 1;
    }
    const brands = [new Number(1), new Uint8Array([1]), new Point()].map((v) => {
      const refusal = refusalOf(v);
      return refusal._tag === "Unkeyable" ? `${refusal.kind}:${refusal.brand}` : refusal._tag;
    });
    assert.deepStrictEqual(brands, ["instance:Number", "instance:Uint8Array", "instance:Point"]);
  });

  it("names an anonymous or constructor-less instance by its toString brand", () => {
    const anonymous = new (class {})();
    const orphan: object = Object.create(Object.create(null));
    assert.deepStrictEqual(
      [refusalOf(anonymous), refusalOf(orphan)],
      [
        KeyRefusal.Unkeyable({ path: [], kind: "instance", brand: "Object" }),
        KeyRefusal.Unkeyable({ path: [], kind: "instance", brand: "Object" }),
      ],
    );
  });

  it("refuses a value implementing Equal itself, even an array", () => {
    class Tagged extends Array<number> {
      [Equal.symbol](that: unknown): boolean {
        return this === that;
      }
      [Hash.symbol](): number {
        return 0;
      }
    }
    assert.deepStrictEqual(
      refusalOf([Tagged.from([1])]),
      KeyRefusal.Unkeyable({ path: [0], kind: "instance", brand: "Tagged" }),
    );
  });

  it("refuses a getter that throws, with its message and where it sits", () => {
    const throwing = {
      get x(): number {
        throw new Error("boom");
      },
    };
    const throwingText = {
      get y(): number {
        throw "plain";
      },
    };
    assert.deepStrictEqual(refusalOf({ a: throwing }), KeyRefusal.Unreadable({ path: ["a", "x"], message: "boom" }));
    assert.deepStrictEqual(refusalOf(throwingText), KeyRefusal.Unreadable({ path: ["y"], message: "plain" }));
  });

  it("names the path through arrays, objects, Sets and Maps, past finished siblings", () => {
    const f = () => 1;
    assert.deepStrictEqual(refusalOf([{ a: 1, b: [0, { c: [] }, f] }]), KeyRefusal.Unkeyable({
      path: [0, "b", 2],
      kind: "function",
      brand: "Function",
    }));
    assert.deepStrictEqual(
      refusalOf(new Set([1, f])),
      KeyRefusal.Unkeyable({ path: [1], kind: "function", brand: "Function" }),
    );
    assert.deepStrictEqual(
      refusalOf(new Map<unknown, unknown>([[1, 1], [2, 2], [3, f]])),
      KeyRefusal.Unkeyable({ path: [2], kind: "function", brand: "Function" }),
    );
  });

  it("keys an array nested 100,000 levels deep", () => {
    let deep: unknown = [];
    for (let i = 0; i < 100_000; i++) deep = [deep];
    const key = keyText(deep);
    assert.strictEqual(key.length, 200_002);
    assert.isTrue(key.startsWith("[[[") && key.endsWith("]]]"));
  });

  it("reads a non-enumerable own key, as Equal does", () => {
    const hidden = Object.defineProperty({}, "h", { value: 1 });
    assert.isFalse(Equal.equals(hidden, {}));
    assert.strictEqual(keyText(hidden), '{"h":d1;}');
  });
});

describe("describeKeyRefusal", () => {
  it("names where and what kind, never the value", () => {
    assert.deepStrictEqual(
      [
        KeyRefusal.Circular({ path: ["params", 0] }),
        KeyRefusal.Unkeyable({ path: [], kind: "instance", brand: "Point" }),
        KeyRefusal.Unreadable({ path: ["x"], message: "boom" }),
      ].map(describeKeyRefusal),
      [
        "params.0: a circular reference has no request key",
        "the request: an unkeyable instance (Point) has no request key",
        "x: reading it threw: boom",
      ],
    );
  });
});

describe("canonicalKey — the format (ARCH-65)", () => {
  const nullProto: { a?: number } = Object.create(null);
  nullProto.a = 1;
  class Stamp extends Date {}
  const rows: ReadonlyArray<readonly [string, unknown, string]> = [
    ["a tuple", [1, "a", undefined], '[d1;,s"a",u]'],
    ["null", null, "n"],
    ["true", true, "t"],
    ["false", false, "f"],
    ["NaN", Number.NaN, "dNaN;"],
    ["-0", -0, "d0;"],
    ["Infinity", Number.POSITIVE_INFINITY, "dInfinity;"],
    ["-Infinity", Number.NEGATIVE_INFINITY, "d-Infinity;"],
    ["a fraction", 1.5, "d1.5;"],
    ["a bigint", 10n, "b10;"],
    ["a negative bigint", -3n, "b-3;"],
    ["a string", 'q"', 's"q\\""'],
    ["a Date", new Date(0), "D0;"],
    ["an invalid Date", new Date(Number.NaN), "DNaN;"],
    ["a Date subclass", new Stamp(0), "D0;"],
    ["a RegExp", /a/g, 'R"/a/g"'],
    ["an empty array", [], "[]"],
    // oxlint-disable-next-line no-sparse-arrays
    ["a hole", [, 1], "[u,d1;]"],
    ["an object, keys sorted", { b: 1, a: undefined }, '{"a":u,"b":d1;}'],
    ["a null-prototype object", nullProto, '{"a":d1;}'],
    ["a Set, members sorted", new Set([2, 1]), "S{d1;,d2;}"],
    ["a Set of two equal members", new Set([{ a: 1 }, { a: 1 }]), 'S{{"a":d1;},{"a":d1;}}'],
    ["a Map, entries sorted", new Map<unknown, unknown>([[2, "b"], [1, "a"]]), 'M{d1;=s"a",d2;=s"b"}'],
    ["a nested Map", new Map([[[1], new Map([[2, 3]])]]), "M{[d1;]=M{d2;=d3;}}"],
  ];
  for (const [name, value, text] of rows) {
    it(`${name} keys as ${text}`, () => {
      assert.strictEqual(keyText(value), text);
    });
  }
});

/** A wider pool than the collision law's: RegExps, invalid Dates, bigints, null-prototype objects. */
const wideLeaf: FastCheck.Arbitrary<unknown> = FastCheck.constantFrom(
  /a/g,
  /a/i,
  new Date(Number.NaN),
  new Date(0),
  1n,
  2n,
  "a",
  'a"',
  0,
  Number.NaN,
  undefined,
);

const wideValue: FastCheck.Arbitrary<unknown> = FastCheck.letrec<{ value: unknown }>((tie) => ({
  value: FastCheck.oneof(
    { maxDepth: 3, withCrossShrink: true },
    wideLeaf,
    FastCheck.array(tie("value"), { maxLength: 3 }),
    FastCheck.dictionary(FastCheck.constantFrom("a", "b", "a\"b"), tie("value"), { maxKeys: 2 }),
    FastCheck.array(tie("value"), { maxLength: 3 }).map((members) => new Set(members)),
    FastCheck.array(FastCheck.tuple(tie("value"), tie("value")), { maxLength: 3 }).map(
      (entries) => new Map(entries),
    ),
  ),
})).value;

describe("canonicalKey — the key law over the wider domain (ARCH-65)", () => {
  it("agrees with Equal.equals", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.tuple(wideValue, wideValue), ([a, b]) => {
        assert.strictEqual(keyText(a) === keyText(b), Equal.equals(a, b), "key equality must be Equal.equals");
      }),
      { numRuns: 1000 },
    );
  });
});
