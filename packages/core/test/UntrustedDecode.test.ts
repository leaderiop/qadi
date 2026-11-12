/**
 * Pins ADR-QD-143's contract and INV-QD-305's property for `untrustedDecoder`:
 * the refusal kind is a function of the input, `TooDeep` exactly when the depth
 * guard says so over the part it walks, and decoding never throws.
 */
import { assert, describe, it } from "@effect/vitest";
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

const anything = untrustedDecoder(Schema.Unknown);
const slots = untrustedDecoder(Slots, { unwalked: ["entries", "raw"] });
const needs = untrustedDecoder(Needs);

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

    it("decodes identically with options omitted, {} and { unwalked: [] }", () => {
      const variants: ReadonlyArray<UntrustedDecoder<{ readonly a: number }, never>> = [
        untrustedDecoder(Needs),
        untrustedDecoder(Needs, {}),
        untrustedDecoder(Needs, { unwalked: [] }),
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
      const decoder = untrustedDecoder(Needs, { prepare: (): Result.Result<unknown, Bad> => Result.fail(bad) });
      const refused = decoder.decode({ a: "not a number" });
      assert.isTrue(Result.isFailure(refused));
      if (Result.isFailure(refused)) assert.strictEqual(refused.failure, bad);
    });

    it("decodes what prepare returns, not the input", () => {
      const decoder = untrustedDecoder(Needs, { prepare: () => Result.succeed({ a: 1 }) });
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

    it("refuses 60,000-deep valid text as TooDeep, and the same text missing its last brace as NotJson", () => {
      assert.strictEqual(tagOf(anything.decodeText(nestedText(60_000))), "TooDeep");
      assert.strictEqual(tagOf(anything.decodeText(nestedText(60_000, false))), "NotJson");
    });

    it("a decoder built inside the test reads text: valid is Success, broken is NotJson", () => {
      const fresh = untrustedDecoder(Needs);
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
