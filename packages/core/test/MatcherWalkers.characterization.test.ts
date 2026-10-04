/**
 * ARCH-02 T4: pins the Matcher walkers before `referencesRef` and `matcherText`
 * move onto `foldMatcher`. `evaluateMatcher` is not migrated; its table is pinned
 * because T12 may change what reaches it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import { explain } from "../src/Explanation.ts";
import type { MatcherContext } from "../src/Matcher.ts";
import * as M from "../src/Matcher.ts";
import { makeSubjectId } from "../src/Identity.ts";
import * as P from "../src/Policy.ts";
import { matcherArbitrary } from "./helpers.ts";
import {
  legacyExplain,
  legacyReferencesAction,
  legacyReferencesResource,
} from "./legacy/PolicyWalkers.legacy.ts";

describe("differential: matcher walkers against their frozen predecessors", () => {
  it("referencesAction and referencesResource", () => {
    FastCheck.assert(
      FastCheck.property(matcherArbitrary(8), (m) => {
        assert.strictEqual(M.referencesAction(m), legacyReferencesAction(m));
        assert.strictEqual(M.referencesResource(m), legacyReferencesResource(m));
        return true;
      }),
      { seed: 2026100405, numRuns: 1000 },
    );
  });

  it("explain's matcher text", () => {
    FastCheck.assert(
      FastCheck.property(matcherArbitrary(8), (m) => {
        for (const policy of [P.hasAttribute("a", m), P.hasResourceAttribute("a", m)]) {
          assert.deepStrictEqual(explain(policy), legacyExplain(policy));
        }
        return true;
      }),
      { seed: 2026100406, numRuns: 1000 },
    );
  });
});

describe("evaluateMatcher outputs, one row per arm", () => {
  const context: MatcherContext = {
    subject: { team: "red" },
    subjectId: makeSubjectId("u1"),
    resource: { ownerId: "u1" },
    action: "read",
  };
  const label = (level: number): { level: number; compartments: ReadonlyArray<string> } => ({
    level,
    compartments: [],
  });

  const table: ReadonlyArray<readonly [string, M.Matcher, unknown, boolean]> = [
    ["Eq literal match", M.eq(M.literal(1)), 1, true],
    ["Eq literal miss", M.eq(M.literal(1)), 2, false],
    ["Eq absent value", M.eq(M.literal(1)), undefined, false],
    ["Eq absent operand", M.eq(M.resource("missing")), 1, false],
    ["Eq subject ref", M.eq(M.subject("team")), "red", true],
    ["Eq subject id", M.eq(M.subjectId()), "u1", true],
    ["Eq action", M.eq(M.action()), "read", true],
    ["Neq differs", M.neq(M.literal(1)), 2, true],
    ["Neq same", M.neq(M.literal(1)), 1, false],
    ["Neq absent operand", M.neq(M.resource("missing")), 1, false],
    ["Dominates non-label", M.dominates(M.literal(label(1))), "x", false],
    ["In hit", M.inArray([1, 2]), 2, true],
    ["In miss", M.inArray([1, 2]), 3, false],
    ["Exists value", M.exists(), 0, true],
    ["Exists null", M.exists(), null, false],
    ["Exists undefined", M.exists(), undefined, false],
    ["Gte ok", M.gte(3), 3, true],
    ["Gte low", M.gte(3), 2, false],
    ["Gte infinity", M.gte(3), Infinity, false],
    ["Gte non-number", M.gte(3), "9", false],
    ["Lt ok", M.lt(3), 2, true],
    ["Lt high", M.lt(3), 3, false],
    ["Contains array", M.contains("x"), ["x", "y"], true],
    ["Contains miss", M.contains("z"), ["x", "y"], false],
    ["FieldMatch own", M.fieldMatch("a", M.eq(M.literal(1))), { a: 1 }, true],
    ["FieldMatch absent", M.fieldMatch("a", M.exists()), {}, false],
    ["FieldMatch __proto__", M.fieldMatch("__proto__", M.exists()), {}, false],
    ["FieldMatch constructor", M.fieldMatch("constructor", M.exists()), {}, false],
    ["FieldMatch non-object", M.fieldMatch("a", M.exists()), 3, false],
    ["SomeMatch hit", M.someMatch(M.eq(M.literal(2))), [1, 2], true],
    ["SomeMatch empty", M.someMatch(M.exists()), [], false],
    ["SomeMatch non-array", M.someMatch(M.exists()), "ab", false],
    ["EveryMatch all", M.everyMatch(M.gte(1)), [1, 2], true],
    ["EveryMatch one miss", M.everyMatch(M.gte(2)), [1, 2], false],
    ["EveryMatch empty", M.everyMatch(M.gte(2)), [], true],
    ["Size array", M.size(M.eq(M.literal(2))), [1, 2], true],
    ["Size string", M.size(M.eq(M.literal(2))), "ab", true],
    ["Size no length", M.size(M.exists()), 5, false],
  ];

  for (const [name, matcher, value, expected] of table) {
    it(name, () => {
      assert.strictEqual(M.evaluateMatcher(matcher, value, context), expected);
    });
  }
});
