/**
 * The one table of `valueText`'s rules, and the one of `valueLabel`'s.
 *
 * The consumers (`explain`, `@qadi/devtools`' remedy labels) pin only that they
 * read through `valueLabel`, so a rule change fails one table and a mapping change
 * fails the consumer that owns it.
 */
import { assert, describe, it } from "@effect/vitest";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { valueLabel, valueText } from "../src/ValueText.ts";

interface Loop {
  self?: Loop;
}

const loop: Loop = {};
loop.self = loop;

const revoked = Proxy.revocable({}, {});
revoked.revoke();

const revokedList = Proxy.revocable([], {});
revokedList.revoke();

const throwingList = new Proxy([], {
  get: (): never => {
    throw new Error("SENTINEL-41 from a get trap");
  },
});

const NO_JSON_FORM = "a value with no JSON form";

const rows: ReadonlyArray<readonly [title: string, value: unknown, text: string | undefined]> = [
  ["a string is its JSON text, quoted", "low", '"low"'],
  ["an empty string is two quotes", "", '""'],
  ["a lone surrogate is escaped, not replaced", "\ud800", '"\\ud800"'],
  ["a non-ASCII letter passes through unescaped", "é", '"é"'],
  ["a number is its JSON text", 5, "5"],
  ["a float keeps its shortest round-trip digits", 0.1 + 0.2, "0.30000000000000004"],
  ["NaN is null", Number.NaN, "null"],
  ["negative zero is 0", -0, "0"],
  ["null is null", null, "null"],
  ["an empty array is []", [], "[]"],
  ["an empty object is {}", {}, "{}"],
  ["an object with no prototype is its JSON", Object.setPrototypeOf({ a: 1 }, null), '{"a":1}'],
  ["a bigint has no text", 10n, undefined],
  ["a bigint inside an array has no text", [1n], undefined],
  ["a cycle has no text", loop, undefined],
  ["a symbol has no text", Symbol("token"), undefined],
  ["a function has no text", (): number => 1, undefined],
  ["undefined has no text", undefined, undefined],
  ["an object whose toJSON gives nothing has no text", { toJSON: () => undefined }, undefined],
  [
    "a toJSON that throws gives no text",
    {
      toJSON: (): never => {
        throw new Error("SENTINEL-41 from toJSON");
      },
    },
    undefined,
  ],
  [
    "a getter that throws gives no text",
    {
      get boom(): never {
        throw new Error("SENTINEL-41 from a getter");
      },
    },
    undefined,
  ],
  ["a revoked proxy gives no text", revoked.proxy, undefined],
];

describe("valueText, one row per rule", () => {
  for (const [title, value, text] of rows) {
    it(title, () => {
      assert.strictEqual(valueText(value), text);
    });
  }
});

const labelRows: ReadonlyArray<readonly [title: string, value: unknown, label: string]> = [
  ["a string is its quoted JSON text", "low", '"low"'],
  ["a number is its JSON text", 5, "5"],
  ["null is null", null, "null"],
  ["a bigint is its digits and n", 10n, "10n"],
  ["a negative bigint keeps its sign", -3n, "-3n"],
  ["an array is its JSON text", [1, "a"], '[1,"a"]'],
  ["a cycle is the fixed words", loop, NO_JSON_FORM],
  ["an array holding a bigint is the fixed words", [1n], NO_JSON_FORM],
  ["an object whose toJSON gives nothing is the fixed words", { toJSON: () => undefined }, NO_JSON_FORM],
  [
    "a toJSON that throws is the fixed words",
    {
      toJSON: (): never => {
        throw new Error("SENTINEL-41 from toJSON");
      },
    },
    NO_JSON_FORM,
  ],
  ["a revoked proxy is the fixed words", revoked.proxy, NO_JSON_FORM],
  ["undefined is the word undefined", undefined, "undefined"],
  ["a function is the word undefined", (): number => 1, "undefined"],
  ["a symbol is the word undefined", Symbol("token"), "undefined"],
];

describe("valueLabel, one row per rule", () => {
  for (const [title, value, label] of labelRows) {
    it(title, () => {
      assert.strictEqual(valueLabel(value), label);
    });
  }
});

describe("what explain reads through valueLabel", () => {
  const said = (policy: P.Policy): string => renderExplanation(explain(policy));

  it("a literal and a list are written by the label rule, a list element by element", () => {
    assert.strictEqual(
      said(P.hasAttribute("x", M.contains(Symbol("token")))),
      "requires attribute `the subject's x contains undefined`",
    );
    assert.strictEqual(
      said(P.hasAttribute("x", M.inArray([1n, loop]))),
      `requires attribute \`the subject's x is one of [1n,${NO_JSON_FORM}]\``,
    );
  });

  it("a list that cannot be walked is the fixed words, not a failure", () => {
    for (const list of [revokedList.proxy, throwingList]) {
      assert.strictEqual(
        said(P.hasAttribute("x", M.inArray(list))),
        `requires attribute \`the subject's x is one of ${NO_JSON_FORM}\``,
      );
    }
  });
});
