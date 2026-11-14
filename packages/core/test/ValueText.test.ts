/**
 * The one table of `valueText`'s rules.
 *
 * No other test asserts them: each consumer's own reading of no text is pinned
 * through the consumer, so a rule change fails one table and a mapping change
 * fails the consumer that owns it.
 */
import { assert, describe, it } from "@effect/vitest";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { valueText } from "../src/ValueText.ts";

interface Loop {
  self?: Loop;
}

const loop: Loop = {};
loop.self = loop;

const revoked = Proxy.revocable({}, {});
revoked.revoke();

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

describe("the mapping explain keeps over valueText", () => {
  it("explain: a symbol literal, which has no JSON text, is the word undefined", () => {
    assert.strictEqual(
      renderExplanation(explain(P.hasAttribute("x", M.contains(Symbol("token"))))),
      "requires attribute `the subject's x contains undefined`",
    );
  });

  it("explain: a bigint literal is its digits and n, a cycle the fixed words, and a list element by element", () => {
    const said = (policy: P.Policy): string => renderExplanation(explain(policy));

    assert.strictEqual(
      said(P.hasAttribute("x", M.eq(M.literal(1n)))),
      "requires attribute `the subject's x equals 1n`",
    );
    assert.strictEqual(
      said(P.hasAttribute("x", M.contains(loop))),
      "requires attribute `the subject's x contains a value with no JSON form`",
    );
    assert.strictEqual(
      said(P.hasAttribute("x", M.inArray([1n, loop]))),
      "requires attribute `the subject's x is one of [1n,a value with no JSON form]`",
    );
  });
});
