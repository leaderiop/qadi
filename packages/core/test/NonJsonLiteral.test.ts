import { assert, describe, it } from "@effect/vitest";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";

/**
 * The regression for a literal with no JSON form in an explanation.
 *
 * `explain` wrote a literal with an unguarded `JSON.stringify`, so a bigint or a
 * cycle threw out of `explain` and out of everything built on it (the policy
 * rail, the inspector, a replay). Each case is an expected failure on the base;
 * the change that guards the write flips them.
 */

interface Loop {
  readonly secret: string;
  self?: Loop;
}

const loop: Loop = { secret: "SENTINEL-41" };
loop.self = loop;

const throwsInToJSON = {
  toJSON: (): never => {
    throw new Error("SENTINEL-41 from toJSON");
  },
};

const throwsInGetter = {
  get boom(): never {
    throw new Error("SENTINEL-41 from a getter");
  },
};

const NO_JSON_FORM = "a value with no JSON form";

const said = (policy: P.Policy): string => renderExplanation(explain(policy));

const rows: ReadonlyArray<readonly [string, P.Policy, string]> = [
  ["eq(literal(1n)) is explained as 1n", P.hasAttribute("x", M.eq(M.literal(1n))), "equals 1n"],
  ["eq(literal(-1n)): the sign is kept", P.hasAttribute("x", M.eq(M.literal(-1n))), "equals -1n"],
  [
    "eq(literal(18446744073709551616n)): every digit is kept",
    P.hasAttribute("x", M.eq(M.literal(18446744073709551616n))),
    "equals 18446744073709551616n",
  ],
  ["neq(literal(1n)) is explained as 1n", P.hasAttribute("x", M.neq(M.literal(1n))), "differs from 1n"],
  [
    "eq of a cycle is explained under the fixed words",
    P.hasAttribute("x", M.eq(M.literal(loop))),
    `equals ${NO_JSON_FORM}`,
  ],
  ["contains(10n) is explained as 10n", P.hasAttribute("x", M.contains(10n)), "contains 10n"],
  [
    "contains of a cycle is explained under the fixed words",
    P.hasAttribute("x", M.contains(loop)),
    `contains ${NO_JSON_FORM}`,
  ],
  ["inArray([1n]) is explained as [1n]", P.hasAttribute("x", M.inArray([1n])), "is one of [1n]"],
  [
    "inArray of a cycle is explained element by element",
    P.hasAttribute("x", M.inArray([loop])),
    `is one of [${NO_JSON_FORM}]`,
  ],
  [
    "inArray of a bigint and a string keeps the string quoted",
    P.hasAttribute("x", M.inArray([1n, "a"])),
    'is one of [1n,"a"]',
  ],
  [
    "a resource attribute eq(literal(1n)) is explained as 1n",
    P.hasResourceAttribute("x", M.eq(M.literal(1n))),
    "equals 1n",
  ],
  [
    "size(eq(literal(10n))) is explained as 10n",
    P.hasAttribute("x", M.size(M.eq(M.literal(10n)))),
    "has a size that equals 10n",
  ],
  [
    "a toJSON that throws is explained under the fixed words, without its message",
    P.hasAttribute("x", M.eq(M.literal(throwsInToJSON))),
    `equals ${NO_JSON_FORM}`,
  ],
  [
    "a getter that throws is explained under the fixed words, without its message",
    P.hasAttribute("x", M.eq(M.literal(throwsInGetter))),
    `equals ${NO_JSON_FORM}`,
  ],
];

describe("an explanation of a literal with no JSON form", () => {
  for (const [title, policy, expected] of rows) {
    it.fails(title, () => {
      const text = said(policy);
      assert.include(text, expected);
      assert.notInclude(text, "SENTINEL-41");
    });
  }
});
