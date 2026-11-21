/**
 * Pins ADR-QD-143's contract and INV-QD-305's property for `untrustedDecoder`:
 * the refusal kind is a function of the input, `TooDeep` exactly when the depth
 * guard says so over the part it walks, and decoding never throws.
 */
import { assert, describe, it, vi } from "@effect/vitest";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as FastCheck from "fast-check";
import { exceedsJsonDepth } from "../src/DecodeDepthGuard.ts";
import { DEFAULT_MAX_DEPTH } from "../src/Policy.ts";
import {
  MAX_DECODE_DEPTH,
  untrustedDecoder,
  type UntrustedDecoder,
} from "../src/UntrustedDecode.ts";

/** Wraps `leaf` in `depth` frames, innermost first, arrays where `asArray` says so; iterative. */
const nest = (leaf: unknown, depth: number, asArray: ReadonlyArray<boolean>): unknown => {
  let value = leaf;
  for (let i = 0; i < depth; i++) value = asArray[i] === true ? [value] : { inner: value };
  return value;
};

/** Same nesting as text, so 60,000 levels never meet a recursive `JSON.stringify`. */
const nestedText = (depth: number, close = true): string =>
  "[".repeat(depth) + (close ? "]".repeat(depth) : "]".repeat(depth - 1));

const tagOf = <A, E extends { readonly _tag: string }>(result: Result.Result<A, E>): string =>
  Result.match(result, { onSuccess: () => "Success", onFailure: (error) => error._tag });

const NUM_RUNS = 300;
const SEED = 3011;

const Slots = Schema.Struct({
  id: Schema.String,
  entries: Schema.Array(Schema.Unknown),
  raw: Schema.Unknown,
});
const Needs = Schema.Struct({ a: Schema.Number });

const anything = untrustedDecoder(Schema.Unknown, { unknownKeys: "refuse" });
const slots = untrustedDecoder(Slots, { unknownKeys: "refuse", unwalked: ["entries", "raw"] });
const needs = untrustedDecoder(Needs, { unknownKeys: "refuse" });

// Primitive leaves only: a container leaf would add a frame and move the bound off `depth`.
const leaves = FastCheck.oneof(
  FastCheck.constant(null),
  FastCheck.boolean(),
  FastCheck.integer(),
  FastCheck.string(),
);
const bits = FastCheck.array(FastCheck.boolean(), { minLength: 301, maxLength: 301 });
const depths = FastCheck.oneof(
  FastCheck.constantFrom(255, 256, 257, 258),
  FastCheck.integer({ min: 0, max: 300 }),
);
const nested = FastCheck.tuple(leaves, depths, bits).map(
  ([leaf, depth, asArray]) => ({ depth, value: nest(leaf, depth, asArray) }),
);
const flatRoots = FastCheck.oneof(
  FastCheck.constantFrom<unknown>(null, undefined, [], {}),
  FastCheck.boolean(),
  FastCheck.integer(),
  FastCheck.string(),
);

describe("untrustedDecoder", () => {
  describe("the bound", () => {
    it("is DEFAULT_MAX_DEPTH * 4, stated as the literal 256", () => {
      assert.strictEqual(MAX_DECODE_DEPTH, DEFAULT_MAX_DEPTH * 4);
      assert.strictEqual(MAX_DECODE_DEPTH, 256);
    });
  });

  describe("property: the kind is a function of the input", () => {
    it("is TooDeep exactly when exceedsJsonDepth, on both sides of the bound, never throwing", () => {
      FastCheck.assert(
        FastCheck.property(nested, ({ depth, value }) => {
          const guard = exceedsJsonDepth(value, MAX_DECODE_DEPTH);
          assert.strictEqual(guard, depth > MAX_DECODE_DEPTH);
          const first = tagOf(anything.decode(value));
          assert.strictEqual(first, guard ? "TooDeep" : "Success");
          assert.strictEqual(tagOf(anything.decode(value)), first);
          assert.strictEqual(tagOf(anything.decodeText(JSON.stringify(value))), first);
        }),
        { numRuns: NUM_RUNS, seed: SEED },
      );
    });

    it("draws 255, 256, 257 and 258 explicitly, so both sides of the bound run every time", () => {
      FastCheck.assert(
        FastCheck.property(
          FastCheck.constantFrom(255, 256, 257, 258),
          bits,
          (depth, asArray) => {
            const expected = depth > 256 ? "TooDeep" : "Success";
            assert.strictEqual(tagOf(anything.decode(nest(null, depth, asArray))), expected);
          },
        ),
        { numRuns: 100, seed: SEED },
      );
    });

    it("never calls a root that is null, a primitive, [] or {} TooDeep", () => {
      FastCheck.assert(
        FastCheck.property(flatRoots, (root) => {
          assert.notStrictEqual(tagOf(anything.decode(root)), "TooDeep");
          assert.notStrictEqual(tagOf(needs.decode(root)), "TooDeep");
        }),
        { numRuns: NUM_RUNS, seed: SEED },
      );
    });

    it("is TooDeep through a walked key and decodes through an unwalked one (struct decoder)", () => {
      FastCheck.assert(
        FastCheck.property(nested, ({ value }) => {
          const inEntries = { id: "x", entries: [value], raw: value };
          assert.strictEqual(tagOf(slots.decode(inEntries)), "Success");
          const inId = { id: value, entries: [], raw: null };
          const guard = exceedsJsonDepth(inId, MAX_DECODE_DEPTH);
          const rest = typeof value === "string" ? "Success" : "Malformed";
          assert.strictEqual(tagOf(slots.decode(inId)), guard ? "TooDeep" : rest);
        }),
        { numRuns: NUM_RUNS, seed: SEED },
      );
    });

    it("decodes identically with { unknownKeys: refuse } and { unknownKeys: refuse, unwalked: [] }", () => {
      const variants: ReadonlyArray<UntrustedDecoder<{ readonly a: number }, never>> = [
        untrustedDecoder(Needs, { unknownKeys: "refuse" }),
        untrustedDecoder(Needs, { unknownKeys: "refuse", unwalked: [] }),
      ];
      const inputs = FastCheck.oneof(
        nested.map(({ value }) => value),
        nested.map(({ value }) => ({ a: 1, extra: value })),
        FastCheck.record({ a: FastCheck.integer() }),
        flatRoots,
      );
      FastCheck.assert(
        FastCheck.property(inputs, (input) => {
          const [base, ...rest] = variants.map((decoder) => decoder.decode(input));
          for (const other of rest) assert.deepStrictEqual(other, base);
        }),
        { numRuns: NUM_RUNS, seed: SEED },
      );
    });
  });

  describe("order: guard, prepare, decode", () => {
    interface Bad {
      readonly _tag: "Bad";
    }
    const bad: Bad = { _tag: "Bad" };

    it("does not call prepare when the guard refuses", () => {
      let calls = 0;
      const decoder = untrustedDecoder(Needs, {
        unknownKeys: "refuse",
        prepare: (input) => {
          calls++;
          return Result.succeed(input);
        },
      });
      assert.strictEqual(tagOf(decoder.decode(nest({ a: 1 }, 257, []))), "TooDeep");
      assert.strictEqual(calls, 0);
      assert.strictEqual(tagOf(decoder.decode({ a: 1 })), "Success");
      assert.strictEqual(calls, 1);
    });

    it("returns prepare's refusal unchanged, and never reaches the decode", () => {
      const decoder = untrustedDecoder(Needs, {
        unknownKeys: "refuse",
        prepare: (): Result.Result<unknown, Bad> => Result.fail(bad),
      });
      const refused = decoder.decode({ a: "not a number" });
      assert.isTrue(Result.isFailure(refused));
      if (Result.isFailure(refused)) assert.strictEqual(refused.failure, bad);
    });

    it("decodes what prepare returns, not the input", () => {
      const decoder = untrustedDecoder(Needs, {
        unknownKeys: "refuse",
        prepare: () => Result.succeed({ a: 1 }),
      });
      const decoded = decoder.decode({ a: "not a number" });
      assert.isTrue(Result.isSuccess(decoded));
      if (Result.isSuccess(decoded)) assert.deepStrictEqual(decoded.success, { a: 1 });
    });

    it("guards before the decode: over-deep and malformed (or with an excess key) is TooDeep", () => {
      const deep = nest(null, 257, []);
      assert.strictEqual(tagOf(needs.decode({ a: "x", extra: deep })), "TooDeep");
      assert.strictEqual(tagOf(needs.decode({ a: 1, extra: deep })), "TooDeep");
      assert.strictEqual(tagOf(needs.decode({ a: 1, extra: 1 })), "Malformed");
    });

    it("does not depend on key order", () => {
      const deep = nest(null, 257, []);
      assert.strictEqual(tagOf(needs.decode({ deep, a: 1 })), "TooDeep");
      assert.strictEqual(tagOf(needs.decode({ a: 1, deep })), "TooDeep");
    });
  });

  describe("text", () => {
    it("refuses empty and broken text as NotJson, carrying the parser's message", () => {
      for (const text of ["", "}{"]) {
        const refused = anything.decodeText(text);
        let parserMessage = "";
        try {
          JSON.parse(text);
        } catch (error) {
          parserMessage = error instanceof Error ? error.message : "";
        }
        assert.isTrue(Result.isFailure(refused));
        if (Result.isFailure(refused) && refused.failure._tag === "NotJson") {
          assert.isTrue(parserMessage.length > 0);
          // the parser's own text, without the `SyntaxError: ` prefix `String(error)` would add
          assert.strictEqual(refused.failure.message, parserMessage);
        } else assert.fail(`${JSON.stringify(text)} was not NotJson`);
      }
    });

    it("a parser that throws a non-Error is still NotJson, with the constant message", () => {
      // `JSON.parse` throws only a `SyntaxError`; this pins the defensive arm that keeps the message free of a `String(error)` prefix.
      const parse = vi.spyOn(JSON, "parse").mockImplementationOnce(() => {
        throw "boom";
      });
      try {
        const refused = anything.decodeText("{}");
        assert.isTrue(Result.isFailure(refused));
        if (Result.isFailure(refused) && refused.failure._tag === "NotJson") {
          assert.strictEqual(refused.failure.message, "not JSON");
        } else assert.fail("a non-Error throw was not NotJson");
      } finally {
        parse.mockRestore();
      }
    });

    it("refuses 60,000-deep valid text as TooDeep, and the same text missing its last brace as NotJson", () => {
      assert.strictEqual(tagOf(anything.decodeText(nestedText(60_000))), "TooDeep");
      assert.strictEqual(tagOf(anything.decodeText(nestedText(60_000, false))), "NotJson");
    });

    it("a decoder built inside the test reads text: valid is Success, broken is NotJson", () => {
      const fresh = untrustedDecoder(Needs, { unknownKeys: "refuse" });
      assert.strictEqual(tagOf(fresh.decodeText('{"a":1}')), "Success");
      assert.strictEqual(tagOf(fresh.decodeText("{")), "NotJson");
    });

    it("refuses a 60,000-deep value without overflowing the stack", () => {
      assert.strictEqual(tagOf(anything.decode(nest(null, 60_000, [true]))), "TooDeep");
    });
  });

  describe("empty and malformed input", () => {
    it("is Malformed, never TooDeep and never a throw, for null, undefined and {} against a required key", () => {
      for (const input of [null, undefined, {}]) assert.strictEqual(tagOf(needs.decode(input)), "Malformed");
    });

    it("an excess key is Malformed with the SchemaError's own message", () => {
      const refused = needs.decode({ a: 1, extra: 2 });
      assert.isTrue(Result.isFailure(refused));
      if (Result.isFailure(refused) && refused.failure._tag === "Malformed") {
        assert.instanceOf(refused.failure.error, Schema.SchemaError);
        assert.strictEqual(refused.failure.message, refused.failure.error.message);
      } else assert.fail("an excess key was not Malformed");
    });

    it("a root that is not a plain object is never filtered: null, undefined, primitives and arrays", () => {
      for (const input of [null, undefined, 5, "text", true]) assert.strictEqual(tagOf(slots.decode(input)), "Malformed");
      assert.strictEqual(tagOf(slots.decode([])), "Malformed");
      assert.strictEqual(tagOf(slots.decode(nest(null, 257, [true]))), "TooDeep");
    });

    it("decodes a 60,000-deep value held in an unwalked slot", () => {
      const deep = nest(null, 60_000, [true]);
      assert.strictEqual(tagOf(slots.decode({ id: "x", entries: [deep], raw: deep })), "Success");
    });
  });

  describe("depth counts JSON frames, not content", () => {
    it("a 10,000-character string and a lone surrogate at depth 1 are not TooDeep", () => {
      assert.strictEqual(tagOf(anything.decode(["x".repeat(10_000)])), "Success");
      assert.strictEqual(tagOf(anything.decode(["\uD800"])), "Success");
    });

    it("a number JSON.parse reads as Infinity at depth 1 is not TooDeep", () => {
      assert.strictEqual(tagOf(anything.decodeText("[1e400]")), "Success");
    });
  });
});

/** The result's kind and, when there is one, its message: what a caller can tell apart. */
const answerOf = <A, E extends { readonly _tag: string }>(result: Result.Result<A, E>): string =>
  Result.match(result, {
    onSuccess: (value) => `Success ${JSON.stringify(value)}`,
    onFailure: (error) => `${error._tag} ${"message" in error ? String(error.message) : ""}`,
  });

const successOf = <A, E>(result: Result.Result<A, E>): A => {
  if (Result.isSuccess(result)) return result.success;
  return assert.fail("expected a Success");
};

// Every decoder here is built inside its test: a decoder built at module scope is static to Stryker, which would hide
// the key derivation's mutants.
describe("unknownKeys (KEYP-02, D-16)", () => {
  const deep = (): unknown => nest(null, MAX_DECODE_DEPTH + 1, []);

  it("U1 a shallow unknown key: refuse is Malformed, ignore decodes the declared key", () => {
    const refuse = untrustedDecoder(Needs, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    const input = { a: 1, extra: 2 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
    assert.deepStrictEqual(successOf(ignore.decodeText('{"a":1,"extra":2}')), { a: 1 });
  });

  it("U2 an unknown key past the bound: refuse is TooDeep, ignore decodes", () => {
    const refuse = untrustedDecoder(Needs, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    const input = { a: 1, extra: deep() };
    assert.strictEqual(tagOf(refuse.decode(input)), "TooDeep");
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
  });

  it("U3 an unknown key 60,000 deep under ignore decodes, value and text, no throw", () => {
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    const value = { a: 1, extra: nest(null, 60_000, [true]) };
    const text = '{"a":1,"extra":' + "[".repeat(60_000) + "]".repeat(60_000) + "}";
    assert.doesNotThrow(() => ignore.decode(value));
    assert.doesNotThrow(() => ignore.decodeText(text));
    assert.deepStrictEqual(successOf(ignore.decode(value)), { a: 1 });
    assert.deepStrictEqual(successOf(ignore.decodeText(text)), { a: 1 });
  });

  it("U4 an excess key inside a nested struct is Malformed under both", () => {
    const Outer = Schema.Struct({ inner: Needs });
    const refuse = untrustedDecoder(Outer, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Outer, { unknownKeys: "ignore" });
    const input = { inner: { a: 1, extra: 2 } };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.strictEqual(tagOf(ignore.decode(input)), "Malformed");
    assert.strictEqual(answerOf(ignore.decode(input)), answerOf(refuse.decode(input)));
  });

  it("U5 5, null, [] and a string answer identically under both", () => {
    const refuse = untrustedDecoder(Needs, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    for (const input of [5, null, [], "text"]) {
      assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
      assert.strictEqual(answerOf(ignore.decode(input)), answerOf(refuse.decode(input)));
    }
  });

  it("U6 ignore with unwalked: a deep unwalked slot and a deep unknown key decode, a deep walked declared key is TooDeep", () => {
    const refuse = untrustedDecoder(Slots, { unknownKeys: "refuse", unwalked: ["entries", "raw"] });
    const ignore = untrustedDecoder(Slots, { unknownKeys: "ignore", unwalked: ["entries", "raw"] });
    const tooDeepKey = { id: "x", entries: [deep()], raw: deep(), extra: deep() };
    assert.strictEqual(tagOf(refuse.decode(tooDeepKey)), "TooDeep");
    assert.strictEqual(tagOf(ignore.decode(tooDeepKey)), "Success");
    const walked = { id: deep(), entries: [], raw: null };
    assert.strictEqual(tagOf(ignore.decode(walked)), "TooDeep");
    assert.strictEqual(tagOf(refuse.decode(walked)), "TooDeep");
  });

  it("U7 under ignore, prepare receives the projection without the unknown key", () => {
    let seen: unknown = undefined;
    const ignore = untrustedDecoder(Needs, {
      unknownKeys: "ignore",
      prepare: (input) => {
        seen = input;
        return Result.succeed(input);
      },
    });
    assert.deepStrictEqual(successOf(ignore.decode({ a: 1, extra: 2 })), { a: 1 });
    assert.deepStrictEqual(seen, { a: 1 });
  });

  it("U8 under ignore, prepare is not called when the guard refuses a declared key", () => {
    let calls = 0;
    const ignore = untrustedDecoder(Needs, {
      unknownKeys: "ignore",
      prepare: (input) => {
        calls++;
        return Result.succeed(input);
      },
    });
    assert.strictEqual(tagOf(ignore.decode({ a: deep(), extra: 1 })), "TooDeep");
    assert.strictEqual(calls, 0);
    assert.strictEqual(tagOf(ignore.decode({ a: 1 })), "Success");
    assert.strictEqual(calls, 1);
  });

  it("U9 under refuse, prepare receives the input itself", () => {
    let seen: unknown = undefined;
    const refuse = untrustedDecoder(Needs, {
      unknownKeys: "refuse",
      prepare: (input) => {
        seen = input;
        return Result.succeed(input);
      },
    });
    const input = { a: 1, extra: 2 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.strictEqual(seen, input);
  });

  const TwoMembers = () =>
    Schema.Union([
      Schema.TaggedStruct("A", { a: Schema.Number }),
      Schema.TaggedStruct("B", { b: Schema.Number }),
    ]);

  it("U10 a discriminated union keeps the keys of the member its _tag names", () => {
    const refuse = untrustedDecoder(TwoMembers(), { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(TwoMembers(), { unknownKeys: "ignore" });
    const sideA = { _tag: "A", a: 1, b: 2 };
    const sideB = { _tag: "B", a: 1, b: 2 };
    assert.strictEqual(tagOf(refuse.decode(sideA)), "Malformed");
    assert.strictEqual(tagOf(refuse.decode(sideB)), "Malformed");
    assert.deepStrictEqual(successOf(ignore.decode(sideA)), { _tag: "A", a: 1 });
    assert.deepStrictEqual(successOf(ignore.decode(sideB)), { _tag: "B", b: 2 });
  });

  it("U11 an unknown _tag falls to the first member and is Malformed", () => {
    const refuse = untrustedDecoder(TwoMembers(), { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(TwoMembers(), { unknownKeys: "ignore" });
    const input = { _tag: "C", a: 1 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.strictEqual(tagOf(ignore.decode(input)), "Malformed");
    assert.strictEqual(answerOf(ignore.decode(input)), answerOf(refuse.decode(input)));
  });

  it("U12 an absent _tag falls to the first member and is Malformed, missing _tag", () => {
    const refuse = untrustedDecoder(TwoMembers(), { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(TwoMembers(), { unknownKeys: "ignore" });
    const refused = ignore.decode({ a: 1 });
    assert.isTrue(Result.isFailure(refused));
    if (Result.isFailure(refused) && refused.failure._tag === "Malformed") {
      // The union's own message: no member is selected, so the decode reports every member, the first one named first.
      assert.strictEqual(refused.failure.message, 'Expected { readonly "_tag": "A", ... } | { readonly "_tag": "B", ... }');
    } else assert.fail("an absent _tag was not Malformed");
    assert.strictEqual(answerOf(ignore.decode({ a: 1 })), answerOf(refuse.decode({ a: 1 })));
  });

  it("U13 encodeKeys: the declared key is the encoded name", () => {
    const Renamed = Schema.Struct({ a: Schema.Number }).pipe(Schema.encodeKeys({ a: "A" }));
    const refuse = untrustedDecoder(Renamed, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Renamed, { unknownKeys: "ignore" });
    const input = { A: 1, a: 2 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
  });

  it("U14 a Suspend of a struct keeps its keys", () => {
    const Lazy = Schema.suspend(() => Needs);
    const refuse = untrustedDecoder(Lazy, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Lazy, { unknownKeys: "ignore" });
    const input = { a: 1, extra: 2 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
    assert.strictEqual(tagOf(ignore.decode({ extra: 2 })), "Malformed");
  });

  it("U15 a one-member union needs no discriminant", () => {
    const Only = Schema.Union([Schema.TaggedStruct("A", { a: Schema.Number })]);
    const refuse = untrustedDecoder(Only, { unknownKeys: "refuse" });
    const ignore = untrustedDecoder(Only, { unknownKeys: "ignore" });
    const input = { _tag: "A", a: 1, extra: 2 };
    assert.strictEqual(tagOf(refuse.decode(input)), "Malformed");
    assert.deepStrictEqual(successOf(ignore.decode(input)), { _tag: "A", a: 1 });
  });

  it("U16 under ignore, Schema.Unknown, an array schema and an undiscriminated union throw at build, and under refuse they build", () => {
    const Undiscriminated = Schema.Union([
      Schema.Struct({ a: Schema.Number }),
      Schema.Struct({ b: Schema.Number }),
    ]);
    assert.throws(() => untrustedDecoder(Schema.Unknown, { unknownKeys: "ignore" }), /unknownKeys "ignore" needs/);
    assert.throws(
      () => untrustedDecoder(Schema.Array(Schema.String), { unknownKeys: "ignore" }),
      /unknownKeys "ignore" needs/,
    );
    assert.throws(() => untrustedDecoder(Undiscriminated, { unknownKeys: "ignore" }), /unknownKeys "ignore" needs/);
    assert.doesNotThrow(() => untrustedDecoder(Schema.Unknown, { unknownKeys: "refuse" }));
    assert.doesNotThrow(() => untrustedDecoder(Schema.Array(Schema.String), { unknownKeys: "refuse" }));
    assert.doesNotThrow(() => untrustedDecoder(Undiscriminated, { unknownKeys: "refuse" }));
  });

  const ignoreNeeds = /unknownKeys "ignore" needs/;

  it("U17 under ignore, a union member with no _tag literal is no discriminant (a lone tagged sibling does not make one)", () => {
    const Untagged = Schema.Union([
      Schema.TaggedStruct("A", { a: Schema.Number }),
      Schema.Struct({ b: Schema.Number }),
    ]);
    assert.throws(() => untrustedDecoder(Untagged, { unknownKeys: "ignore" }), ignoreNeeds);
  });

  it("U18 under ignore, a non-literal _tag slot is no discriminant, and neither is a duplicated literal", () => {
    const Loose = Schema.Union([
      Schema.Struct({ _tag: Schema.String, a: Schema.Number }),
      Schema.TaggedStruct("B", { b: Schema.Number }),
    ]);
    const Twin = Schema.Union([
      Schema.TaggedStruct("A", { a: Schema.Number }),
      Schema.TaggedStruct("A", { b: Schema.Number }),
    ]);
    assert.throws(() => untrustedDecoder(Loose, { unknownKeys: "ignore" }), ignoreNeeds);
    assert.throws(() => untrustedDecoder(Twin, { unknownKeys: "ignore" }), ignoreNeeds);
  });

  it("U19 the _tag is read by its key, wherever it sits among the input's entries", () => {
    const ignore = untrustedDecoder(TwoMembers(), { unknownKeys: "ignore" });
    assert.deepStrictEqual(successOf(ignore.decode({ a: 1, _tag: "B", b: 2 })), { _tag: "B", b: 2 });
  });

  it("U20 under ignore, an index signature or a rest declares no key list, so the build refuses it, whole or as a union member", () => {
    const Rest = Schema.StructWithRest(Schema.Struct({ a: Schema.Number }), [
      Schema.Record(Schema.String, Schema.Number),
    ]);
    assert.throws(
      () => untrustedDecoder(Schema.Record(Schema.String, Schema.Number), { unknownKeys: "ignore" }),
      ignoreNeeds,
    );
    assert.throws(() => untrustedDecoder(Rest, { unknownKeys: "ignore" }), ignoreNeeds);
    assert.throws(
      () =>
        untrustedDecoder(
          Schema.Union([
            Schema.TaggedStruct("A", { a: Schema.Number }),
            Schema.StructWithRest(Schema.TaggedStruct("B", {}), [Schema.Record(Schema.String, Schema.Number)]),
          ]),
          { unknownKeys: "ignore" },
        ),
      ignoreNeeds,
    );
    assert.doesNotThrow(() => untrustedDecoder(Schema.Record(Schema.String, Schema.Number), { unknownKeys: "refuse" }));
    assert.doesNotThrow(() => untrustedDecoder(Rest, { unknownKeys: "refuse" }));
    assert.deepStrictEqual(
      successOf(untrustedDecoder(Needs, { unknownKeys: "ignore" }).decode({ a: 1, extra: 2 })),
      { a: 1 },
    );
  });

  it("U21 a policy outside the closed set, read off JSON by an untyped caller, throws at build naming the option, even when Object.prototype owns the name", () => {
    for (const name of ["constructor", "toString", "nope"]) {
      // `JSON.parse` is typed `any`, so this is how a config-driven value reaches the option without a cast.
      const options = JSON.parse(JSON.stringify({ unknownKeys: name }));
      assert.throws(
        () => untrustedDecoder(Needs, options),
        `untrustedDecoder: unknownKeys must be "refuse" or "ignore", got ${name}`,
      );
    }
  });
});

/**
 * What the `ignore` projection reads of an in-process value, counted by accessors: the own enumerable key names, then
 * each kept value once, and an own `_tag` once more where a union's member is chosen by it. A one-object schema chooses
 * no member, so its `_tag`, when declared, is read once, as a kept value. The projection is the top level only: one level
 * down the depth guard and the decode read what they walk, and under `refuse` nothing is projected, so the walk and the
 * guard read the input's own accessors. Each input is built with `Object.defineProperty`, because a spread would run the
 * accessors it copies.
 */
describe("what the ignore projection reads of an in-process value", () => {
  /** An object of enumerable accessors, in the order given, each counting its reads and answering what `answer` returns. */
  const accessors = (answers: ReadonlyArray<readonly [string, () => unknown]>) => {
    const reads = new Map<string, number>();
    const input = {};
    for (const [key, answer] of answers) {
      Object.defineProperty(input, key, {
        enumerable: true,
        get: (): unknown => {
          reads.set(key, (reads.get(key) ?? 0) + 1);
          return answer();
        },
      });
    }
    return { input, reads: (key: string): number => reads.get(key) ?? 0 };
  };
  const throwing = (): never => {
    throw new Error("the accessor was read");
  };
  const TwoMembers = () =>
    Schema.Union([
      Schema.TaggedStruct("A", { a: Schema.Number }),
      Schema.TaggedStruct("B", { b: Schema.Number }),
    ]);

  it("U22 an undeclared accessor that throws is never invoked, and the declared value is read once", () => {
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    const { input, reads } = accessors([["a", () => 1], ["extra", throwing]]);
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
    assert.deepStrictEqual([reads("a"), reads("extra")], [1, 0]);
  });

  it("U23 a one-object schema chooses no member, so an undeclared _tag accessor is never invoked", () => {
    const ignore = untrustedDecoder(Needs, { unknownKeys: "ignore" });
    const { input, reads } = accessors([["_tag", throwing], ["a", () => 1]]);
    assert.deepStrictEqual(successOf(ignore.decode(input)), { a: 1 });
    assert.deepStrictEqual([reads("_tag"), reads("a")], [0, 1]);
  });

  it("U24 a union reads its own _tag twice, to choose the member and to copy it, the member's value once, and the other member's key never", () => {
    const ignore = untrustedDecoder(TwoMembers(), { unknownKeys: "ignore" });
    const { input, reads } = accessors([["a", throwing], ["_tag", () => "B"], ["b", () => 2]]);
    assert.deepStrictEqual(successOf(ignore.decode(input)), { _tag: "B", b: 2 });
    assert.deepStrictEqual([reads("_tag"), reads("b"), reads("a")], [2, 1, 0]);
  });

  it("U25 with unwalked slots, each declared value is read once, by the projection, and an undeclared accessor never", () => {
    const ignore = untrustedDecoder(Slots, { unknownKeys: "ignore", unwalked: ["entries", "raw"] });
    const { input, reads } = accessors([["id", () => "x"], ["entries", () => []], ["raw", () => null], ["extra", throwing]]);
    assert.deepStrictEqual(successOf(ignore.decode(input)), { id: "x", entries: [], raw: null });
    assert.deepStrictEqual([reads("id"), reads("entries"), reads("raw"), reads("extra")], [1, 1, 1, 0]);
  });

  it("U26 an inherited or a non-enumerable _tag chooses no member: prepare receives the first member's keys", () => {
    const seen: Array<unknown> = [];
    const ignore = untrustedDecoder(TwoMembers(), {
      unknownKeys: "ignore",
      prepare: (input) => {
        seen.push(input);
        return Result.succeed(input);
      },
    });
    class InheritsB {
      get _tag(): string {
        return "B";
      }
    }
    const hidden = { a: 1, b: 2 };
    Object.defineProperty(hidden, "_tag", { enumerable: false, value: "B" });
    assert.strictEqual(tagOf(ignore.decode(Object.assign(new InheritsB(), { a: 1, b: 2 }))), "Malformed");
    assert.strictEqual(tagOf(ignore.decode(hidden)), "Malformed");
    assert.deepStrictEqual(seen, [{ a: 1 }, { a: 1 }]);
  });

  it("U27 under refuse nothing is projected: the walk and the guard read the input's own accessors, so one that throws is thrown out of the decode", () => {
    const refuse = untrustedDecoder(Needs, { unknownKeys: "refuse" });
    const flat = accessors([["a", () => 1], ["extra", throwing]]);
    assert.throws(() => refuse.decode(flat.input), "the accessor was read");
    assert.strictEqual(flat.reads("extra"), 1);
    const refuseSlots = untrustedDecoder(Slots, { unknownKeys: "refuse", unwalked: ["entries", "raw"] });
    const unwalked = accessors([["id", () => "x"], ["entries", () => []], ["raw", throwing]]);
    assert.throws(() => refuseSlots.decode(unwalked.input), "the accessor was read");
    assert.strictEqual(unwalked.reads("raw"), 1);
  });

  it("U28 the projection is the top level only: an undeclared accessor one level down is read by the depth guard", () => {
    const ignore = untrustedDecoder(Schema.Struct({ inner: Needs }), { unknownKeys: "ignore" });
    const inner = accessors([["a", () => 1], ["extra", throwing]]);
    assert.throws(() => ignore.decode({ inner: inner.input }), "the accessor was read");
    assert.strictEqual(inner.reads("extra"), 1);
  });

  it("U29 a one-object schema that declares _tag reads it once, as a kept value, and never to choose a member", () => {
    const ignore = untrustedDecoder(Schema.TaggedStruct("A", { a: Schema.Number }), { unknownKeys: "ignore" });
    const { input, reads } = accessors([["_tag", () => "A"], ["a", () => 1]]);
    assert.deepStrictEqual(successOf(ignore.decode(input)), { _tag: "A", a: 1 });
    assert.deepStrictEqual([reads("_tag"), reads("a")], [1, 1]);
  });

  it("U30 a union's _tag that answers differently on its second read chooses one member's keys and is copied as the other's tag, which the strict decode refuses", () => {
    const seen: Array<unknown> = [];
    const ignore = untrustedDecoder(TwoMembers(), {
      unknownKeys: "ignore",
      prepare: (input) => {
        seen.push(input);
        return Result.succeed(input);
      },
    });
    const answers = ["B", "A"];
    const { input, reads } = accessors([["_tag", () => answers.shift()], ["a", () => 1], ["b", () => 2]]);
    assert.strictEqual(tagOf(ignore.decode(input)), "Malformed");
    assert.deepStrictEqual(seen, [{ _tag: "A", b: 2 }]);
    assert.deepStrictEqual([reads("_tag"), reads("a"), reads("b")], [2, 0, 1]);
  });

  it("U31 an accessor that deletes a later own key leaves that key in the projection with no value, so the refusal names the value's type and not a missing key", () => {
    const ignore = untrustedDecoder(Schema.Struct({ a: Schema.Number, b: Schema.Number }), { unknownKeys: "ignore" });
    const input: { a?: number; b?: number } = {};
    Object.defineProperty(input, "a", {
      enumerable: true,
      get: (): number => {
        delete input.b;
        return 1;
      },
    });
    input.b = 2;
    const absent = ignore.decode({ a: 1 });
    const deleted = ignore.decode(input);
    assert.isTrue(Result.isFailure(absent) && Result.isFailure(deleted));
    if (Result.isFailure(absent) && Result.isFailure(deleted)) {
      assert.include(absent.failure.message, "Missing key");
      assert.notInclude(deleted.failure.message, "Missing key");
      assert.include(deleted.failure.message, "Expected number");
    }
  });
});
