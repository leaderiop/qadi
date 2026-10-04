import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import {
  isRangeBound,
  isRenderableIdentifier,
  isSafeLiteral,
  type IdentifierRule,
} from "../src/PredicateLiteral.ts";

describe("isSafeLiteral: what a renderer may bind as a parameter", () => {
  it("admits a string, a finite number, a boolean and null", () => {
    for (const value of ["", "t-1", 0, -0, 3, -2.5, Number.MAX_VALUE, true, false, null]) {
      assert.isTrue(isSafeLiteral(value), String(value));
    }
  });

  it("refuses NaN and both infinities (CCR-QD-120)", () => {
    for (const value of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      assert.isFalse(isSafeLiteral(value), String(value));
    }
  });

  it("refuses everything else: Date, undefined, objects, arrays, functions, symbols, bigint", () => {
    const refused: ReadonlyArray<unknown> = [
      new Date("2026-01-01T00:00:00.000Z"),
      undefined,
      {},
      { foo: 1 },
      [],
      ["a"],
      () => 1,
      Symbol("s"),
      10n,
    ];
    for (const value of refused) {
      assert.isFalse(isSafeLiteral(value), String(typeof value));
    }
  });

  it("PROPERTY: it is exactly string | finite number | boolean | null", () => {
    const anything = FastCheck.oneof(
      FastCheck.string(),
      FastCheck.double({ noNaN: false }),
      FastCheck.boolean(),
      FastCheck.constant(null),
      FastCheck.constant(undefined),
      FastCheck.object(),
      FastCheck.date(),
    );
    for (const value of FastCheck.sample(anything, { numRuns: 300, seed: 7 })) {
      const expected =
        value === null ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        (typeof value === "number" && !Number.isNaN(value) && Math.abs(value) !== Infinity);
      assert.strictEqual(isSafeLiteral(value), expected, String(value));
    }
  });
});

describe("isRangeBound: what `Gte`/`Lt` can compare against", () => {
  it("is exactly a finite number", () => {
    for (const value of [0, -0, 1, -1, 3.5, Number.MAX_VALUE, Number.MIN_VALUE]) {
      assert.isTrue(isRangeBound(value), String(value));
    }
    for (const value of [
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      "3",
      true,
      null,
      undefined,
      {},
      10n,
    ]) {
      assert.isFalse(isRangeBound(value), String(value));
    }
  });
});

describe("isRenderableIdentifier: a column a renderer may interpolate", () => {
  const accepted = (column: string, rule: IdentifierRule) =>
    assert.isTrue(isRenderableIdentifier(column, rule), `${rule}: ${JSON.stringify(column)}`);
  const refused = (column: string, rule: IdentifierRule) =>
    assert.isFalse(isRenderableIdentifier(column, rule), `${rule}: ${JSON.stringify(column)}`);

  it("Ascii is [A-Za-z_][A-Za-z0-9_]*", () => {
    for (const column of ["a", "A", "_", "_x", "tenantId", "col_1", "a9", "NOT", "gte"]) {
      accepted(column, "Ascii");
    }
    for (const column of ["", "1a", "a b", "a.b", "a-b", 'a"b', "a`b", "a'b", "a;b", "a\n", "é", "名前", "😀"]) {
      refused(column, "Ascii");
    }
  });

  it("Ascii anchors both ends: a valid prefix or suffix does not carry a bad middle", () => {
    refused("ok\n", "Ascii");
    refused("\nok", "Ascii");
    refused("ok bad", "Ascii");
    refused("bad ok", "Ascii");
  });

  it("UnicodeBmp accepts letters and digits of any script, and underscore", () => {
    for (const column of ["é", "名前", "_é", "ñandú", "col_é1", "Ωmega", "a٣"]) {
      accepted(column, "UnicodeBmp");
    }
    // Everything Ascii accepts, UnicodeBmp accepts.
    for (const column of ["a", "_", "tenantId", "col_1"]) accepted(column, "UnicodeBmp");
  });

  it("UnicodeBmp refuses a leading digit, delimiters, punctuation and whitespace", () => {
    for (const column of ["", "1a", "٣a", "a b", "a.b", "a-b", 'a"b', "a`b", "a'b", "a;b", "a\n", "é​"]) {
      refused(column, "UnicodeBmp");
    }
  });

  it("UnicodeBmp refuses any code point above U+FFFF, even a letter", () => {
    // U+1F600 is not a letter; U+10400 DESERET CAPITAL LETTER LONG I is, and
    // MySQL still refuses it in an identifier.
    for (const column of ["😀x", "x😀", "\u{10400}", "a\u{10400}", "\u{1D400}b"]) {
      refused(column, "UnicodeBmp");
      refused(column, "Ascii");
    }
  });

  it("PROPERTY: an identifier with a quote or a space is never renderable under either rule", () => {
    const hostile = FastCheck.tuple(
      FastCheck.string(),
      FastCheck.constantFrom('"', "`", " ", ";", "'", "\\"),
      FastCheck.string(),
    ).map(([a, bad, b]) => `${a}${bad}${b}`);
    for (const column of FastCheck.sample(hostile, { numRuns: 300, seed: 11 })) {
      refused(column, "Ascii");
      refused(column, "UnicodeBmp");
    }
  });
});
