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
import * as FastCheck from "fast-check";
import { canonicalKey } from "../src/PortKey.ts";

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
          canonicalKey(a) === canonicalKey(b),
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
        assert.strictEqual(canonicalKey(v), canonicalKey(twin));
      }),
      { numRuns: 500 },
    );
  });

  it("a Date keys apart from its ISO string", () => {
    assert.notStrictEqual(canonicalKey(new Date(0)), canonicalKey("1970-01-01T00:00:00.000Z"));
  });

  it("NaN, Infinity and -Infinity key apart from null and from each other", () => {
    const keys = [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, null].map(canonicalKey);
    assert.strictEqual(new Set(keys).size, 4, keys.join(" | "));
  });

  it("an undefined-valued key keys apart from an absent one", () => {
    assert.notStrictEqual(canonicalKey({ a: undefined }), canonicalKey({}));
  });

  it("a Set keys apart from the array of its members", () => {
    assert.notStrictEqual(canonicalKey(new Set([1])), canonicalKey([1]));
  });

  it("a Map keys apart from the array of its entries", () => {
    assert.notStrictEqual(canonicalKey(new Map([[1, 2]])), canonicalKey([[1, 2]]));
  });

  it("[undefined] keys apart from [null]", () => {
    assert.notStrictEqual(canonicalKey([undefined]), canonicalKey([null]));
  });

  it("-0 keys like 0, as Equal.equals has them equal", () => {
    assert.strictEqual(canonicalKey(-0), canonicalKey(0));
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
