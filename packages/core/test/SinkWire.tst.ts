/**
 * Pins the record wire's version types: one constant and everything derived from it.
 *
 * `ignoreStatic` keeps Stryker off module-scope constants (ADR-QD-076), so this pin
 * and the byte goldens are what fail when the version is retyped (ADR-QD-151). Each
 * expectation is written by hand (`2`, `readonly [2]`), never read from the source,
 * because a pin that imports its own expectation cannot disagree with it.
 */
import { expect, test } from "tstyche";
import type { SinkRecordJson, WIRE_VERSION, WIRE_VERSIONS, WireVersion } from "../src/index.ts";

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
