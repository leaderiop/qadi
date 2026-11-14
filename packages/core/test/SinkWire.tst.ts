/**
 * Pins the record wire's types: the version, and the readers of the refusal vocabulary.
 *
 * `ignoreStatic` keeps Stryker off module-scope constants (ADR-QD-076), so this pin
 * and the byte goldens are what fail when the version is retyped (ADR-QD-151). Each
 * expectation is written by hand (`2`, `readonly [2]`), never read from the source,
 * because a pin that imports its own expectation cannot disagree with it. The readers
 * (`describeDecodeRefusal`, `decodeRefusalAnnotations`, `decodeRefusalOf`) are pinned
 * the same way, so a changed signature or a widened domain fails here (ADR-QD-153).
 */
import type * as Result from "effect/Result";
import { expect, test } from "tstyche";
import type {
  DecodedSinkRecord,
  DecodeRefusalAnnotations,
  SinkRecord,
  SinkRecordJson,
  SinkRecordNotDecodable,
  UntrustedRefusal,
  UntrustedValueRefusal,
  WIRE_VERSION,
  WIRE_VERSIONS,
  WireVersion,
} from "../src/index.ts";
import {
  DecodeRefusal,
  decodeRefusalAnnotations,
  decodeRefusalOf,
  decodeSinkRecordWithJson,
  describeDecodeRefusal,
} from "../src/index.ts";

test("WIRE_VERSION is the literal 2, not number", () => {
  expect<typeof WIRE_VERSION>().type.toBe<2>();
});

test("WireVersion is 2", () => {
  expect<WireVersion>().type.toBe<2>();
});

test("WIRE_VERSIONS is the tuple readonly [2]", () => {
  expect<typeof WIRE_VERSIONS>().type.toBe<readonly [2]>();
});

test("a decision record carries version 2 on the wire", () => {
  expect<Extract<SinkRecordJson, { readonly _tag: "Decision" }>["version"]>().type.toBe<2>();
});

test("an obligation record carries version 2 on the wire", () => {
  expect<Extract<SinkRecordJson, { readonly _tag: "Obligations" }>["version"]>().type.toBe<2>();
});

test("decodeRefusalAnnotations carries the refusal's tag under one key", () => {
  expect<DecodeRefusalAnnotations>().type.toBe<{
    readonly "qadi.refusal": "NotJson" | "TooDeep" | "Malformed" | "Inconsistent" | "UnsupportedVersion";
  }>();
});

test("describeDecodeRefusal and decodeRefusalAnnotations read any DecodeRefusal", () => {
  expect(describeDecodeRefusal).type.toBe<(self: DecodeRefusal) => string>();
  expect(decodeRefusalAnnotations).type.toBe<(self: DecodeRefusal) => DecodeRefusalAnnotations>();
});

test("decodeRefusalOf maps an untrusted refusal or a version refusal, and nothing else", () => {
  expect<UntrustedRefusal>().type.toBeAssignableTo<Parameters<typeof decodeRefusalOf>[0]>();
  expect<UntrustedValueRefusal>().type.toBeAssignableTo<Parameters<typeof decodeRefusalOf>[0]>();
  expect<Extract<DecodeRefusal, { readonly _tag: "UnsupportedVersion" }>>().type.toBeAssignableTo<
    Parameters<typeof decodeRefusalOf>[0]
  >();
  expect<ReturnType<typeof decodeRefusalOf>>().type.toBe<DecodeRefusal>();
  // @ts-expect-error is not assignable to parameter of type
  decodeRefusalOf(DecodeRefusal.Inconsistent({ disagreement: "Verdict" }));
});

test("a decoded record carries the record and its JSON form, nothing else", () => {
  expect<DecodedSinkRecord>().type.toBe<{ readonly record: SinkRecord; readonly json: SinkRecordJson }>();
});

test("decodeSinkRecordWithJson reads unknown input", () => {
  expect(decodeSinkRecordWithJson).type.toBe<
    (input: unknown) => Result.Result<DecodedSinkRecord, SinkRecordNotDecodable>
  >();
});
