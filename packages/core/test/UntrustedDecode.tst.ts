/**
 * Pins the type contract of `untrustedDecoder` (ADR-QD-143): the error channel of
 * each entry point, which keys `unwalked` accepts, and that a `prepare` refusal may
 * not reuse one of the module's own tags. Contains no deliberate compile error,
 * because `tsconfig.test.json` also compiles every `*.tst.ts` under `tsc`.
 */
import type * as Result from "effect/Result";
import type * as Schema from "effect/Schema";
import { expect, test } from "tstyche";
import {
  MAX_DECODE_DEPTH,
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
  const decoder = untrustedDecoder(Plain);
  expect(decoder.decode).type.toBe<
    (input: unknown) => Result.Result<{ readonly a: number }, UntrustedValueRefusal>
  >();
  expect(decoder.decodeText).type.toBe<
    (text: string) => Result.Result<{ readonly a: number }, UntrustedRefusal>
  >();
  expect<Extract<UntrustedValueRefusal, { readonly _tag: "NotJson" }>>().type.toBe<never>();
});

test("a prepare refusal appears in both channels", () => {
  const decoder = untrustedDecoder(Plain, { prepare: badPrepare });
  expect(decoder.decode).type.toBe<
    (input: unknown) => Result.Result<{ readonly a: number }, UntrustedValueRefusal | Bad>
  >();
  expect(decoder.decodeText).type.toBe<
    (text: string) => Result.Result<{ readonly a: number }, UntrustedRefusal | Bad>
  >();
});

test("unwalked takes only keys typed unknown or ReadonlyArray<unknown>", () => {
  expect(untrustedDecoder).type.toBeCallableWith(WithSlots, { unwalked: ["entries", "raw"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(WithSlots, { unwalked: ["id"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(WithSlots, { unwalked: ["nope"] });
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { unwalked: ["a"] });
});

test("a prepare refusal tagged with one of the module's tags is rejected", () => {
  expect(untrustedDecoder).type.toBeCallableWith(Plain, { prepare: badPrepare });
  expect(untrustedDecoder).type.not.toBeCallableWith(Plain, { prepare: clashingPrepare });
});

test("MAX_DECODE_DEPTH is a number", () => {
  expect(MAX_DECODE_DEPTH).type.toBe<number>();
});
