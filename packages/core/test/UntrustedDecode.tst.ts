/**
 * Pins the type contract of `untrustedDecoder` (ADR-QD-143, D-16): the unknown-key
 * policy every decoder states, the error channel of each entry point, which keys
 * `unwalked` accepts, and that a `prepare` refusal may not reuse one of the module's
 * own tags. Contains no deliberate compile error,
 * because `tsconfig.test.json` also compiles every `*.tst.ts` under `tsc`.
 */
import type * as Result from "effect/Result";
import type * as Schema from "effect/Schema";
import { expect, test } from "tstyche";
import {
  MAX_DECODE_DEPTH,
  type UnknownKeyPolicy,
  type UntrustedRefusal,
  type UntrustedValueRefusal,
  untrustedDecoder,
} from "../src/UntrustedDecode.ts";

declare const Plain: Schema.Struct<{ readonly a: Schema.Number }>;
declare const WithSlots: Schema.Struct<{
  readonly id: Schema.String;
  readonly entries: Schema.$Array<Schema.Unknown>;
  readonly raw: Schema.Unknown;
}>;

interface Bad {
  readonly _tag: "Bad";
  readonly reason: string;
}
interface Clashing {
  readonly _tag: "TooDeep";
}
declare const badPrepare: (input: unknown) => Result.Result<unknown, Bad>;
declare const clashingPrepare: (input: unknown) => Result.Result<unknown, Clashing>;

test("without prepare, decode cannot say NotJson and decodeText can", () => {
  const decoder = untrustedDecoder(Plain, { unknownKeys: "refuse" });
  expect(decoder.decode).type.toBe<
    (input: unknown) => Result.Result<{ readonly a: number }, UntrustedValueRefusal>
  >();
  expect(decoder.decodeText).type.toBe<
    (text: string) => Result.Result<{ readonly a: number }, UntrustedRefusal>
  >();
  expect<Extract<UntrustedValueRefusal, { readonly _tag: "NotJson" }>>().type.toBe<never>();
});

test("a prepare refusal appears in both channels", () => {
  const decoder = untrustedDecoder(Plain, { unknownKeys: "refuse", prepare: badPrepare });
  expect(decoder.decode).type.toBe<
    (input: unknown) => Result.Result<{ readonly a: number }, UntrustedValueRefusal | Bad>
  >();
  expect(decoder.decodeText).type.toBe<
    (text: string) => Result.Result<{ readonly a: number }, UntrustedRefusal | Bad>
  >();
});

test("unwalked takes only keys typed unknown or ReadonlyArray<unknown>", () => {
  expect(untrustedDecoder).type.toBeCallableWith(WithSlots, { unknownKeys: "refuse", unwalked: ["entries", "raw"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(WithSlots, { unknownKeys: "refuse", unwalked: ["id"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(WithSlots, { unknownKeys: "refuse", unwalked: ["nope"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { unknownKeys: "refuse", unwalked: ["a"] });
});

declare const EncodedSlots: Schema.Struct<{
  readonly slot: Schema.decodeTo<Schema.Number, Schema.Unknown>;
  readonly shown: Schema.decodeTo<Schema.Unknown, Schema.String>;
}>;

test("unwalked keys are read from the encoded side, the side the guard filters", () => {
  expect(untrustedDecoder).type.toBeCallableWith(EncodedSlots, { unknownKeys: "refuse", unwalked: ["slot"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(EncodedSlots, { unknownKeys: "refuse", unwalked: ["shown"] });
});

test("a prepare refusal tagged with one of the module's tags is rejected", () => {
  expect(untrustedDecoder).type.toBeCallableWith(Plain, { unknownKeys: "refuse", prepare: badPrepare });
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { unknownKeys: "refuse", prepare: clashingPrepare });
});

test("MAX_DECODE_DEPTH is a number", () => {
  expect(MAX_DECODE_DEPTH).type.toBe<number>();
});

test("the policy is a required, closed option (D-16)", () => {
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain);
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, {});
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { unknownKeys: "drop" });
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { unwalked: [] });
  expect(untrustedDecoder).type.toBeCallableWith(Plain, { unknownKeys: "refuse" });
  expect(untrustedDecoder).type.toBeCallableWith(Plain, { unknownKeys: "ignore" });
  expect(untrustedDecoder).type.toBeCallableWith(WithSlots, { unknownKeys: "ignore", unwalked: ["entries", "raw"] });
  expect(untrustedDecoder).type.toBeCallableWith(Plain, {
    unknownKeys: "ignore",
    prepare: badPrepare,
  });
  expect<UnknownKeyPolicy>().type.toBe<"refuse" | "ignore">();
});
