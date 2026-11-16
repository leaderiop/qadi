/**
 * Every policy tag's trace shape, pinned through `foldTrace`.
 *
 * The table below is written on the phase base, by hand from INV-QD-090 and `childrenOf`,
 * independently of the arity record the change adds (ARCH-98, ADR-QD-164): it reads
 * nothing from that record, so a wrong record cannot pass its own check. Under every tag
 * the node carries the same three children; a leaf's arm must see none of them, a
 * wrapper's only the first, a many's all three in order, and the children are visited
 * before their parent.
 */
import { assert, describe, it } from "@effect/vitest";
import { foldTrace } from "../src/Decision.ts";
import type { Trace, TraceCases } from "../src/Decision.ts";
import { POLICY_TAGS } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";

type Tag = Policy["_tag"];
type Shape = "Leaf" | "Wrapper" | "Many";

const EXPECTED: { readonly [K in Tag]: Shape } = {
  HasPermission: "Leaf",
  HasRole: "Leaf",
  HasAttribute: "Leaf",
  HasResourceAttribute: "Leaf",
  HasRelationship: "Leaf",
  HasAction: "Leaf",
  HasActed: "Leaf",
  HasNotActed: "Leaf",
  HasCustom: "Leaf",
  HasSignature: "Leaf",
  Not: "Wrapper",
  Obliged: "Wrapper",
  Labeled: "Wrapper",
  AllOf: "Many",
  AnyOf: "Many",
  Rules: "Many",
};

const node = (policyTag: Tag, children: ReadonlyArray<Trace> = []): Trace => ({
  policyTag,
  allowed: true,
  children,
  obligations: [],
});

const logging = (visited: Array<string>): TraceCases<string> => {
  const leaf = (n: Trace): string => {
    visited.push(n.policyTag);
    return n.policyTag;
  };
  const many = (n: Trace, kids: ReadonlyArray<string>): string => {
    visited.push(n.policyTag);
    return `${n.policyTag}[${kids.join(",")}]`;
  };
  const wrapper = (n: Trace, kid: string | undefined): string => {
    visited.push(n.policyTag);
    return `${n.policyTag}<${kid ?? "-"}>`;
  };
  return {
    HasPermission: leaf,
    HasRole: leaf,
    HasAttribute: leaf,
    HasResourceAttribute: leaf,
    HasRelationship: leaf,
    HasAction: leaf,
    HasActed: leaf,
    HasNotActed: leaf,
    HasCustom: leaf,
    HasSignature: leaf,
    AllOf: many,
    AnyOf: many,
    Rules: many,
    Not: wrapper,
    Obliged: wrapper,
    Labeled: wrapper,
  };
};

const marks = [node("HasRole"), node("HasAction"), node("HasPermission")];

const wanted = (tag: Tag): readonly [string, ReadonlyArray<string>] =>
  ({
    Leaf: [tag, [tag]],
    Wrapper: [`${tag}<HasRole>`, ["HasRole", tag]],
    Many: [
      `${tag}[HasRole,HasAction,HasPermission]`,
      ["HasRole", "HasAction", "HasPermission", tag],
    ],
  } as const)[EXPECTED[tag]];

describe("every tag's trace shape", () => {
  for (const tag of POLICY_TAGS) {
    it(`${tag} is a ${EXPECTED[tag]}`, () => {
      const visited: Array<string> = [];
      const result = foldTrace(node(tag, marks), logging(visited));
      const [wantResult, wantVisited] = wanted(tag);
      assert.strictEqual(result, wantResult);
      assert.deepStrictEqual(visited, wantVisited);
    });
  }

  it("a wrapper with no child hands its arm undefined", () => {
    for (const tag of POLICY_TAGS.filter((t) => EXPECTED[t] === "Wrapper")) {
      assert.strictEqual(foldTrace(node(tag), logging([])), `${tag}<->`);
    }
  });

  it("a many with no child hands its arm an empty list", () => {
    for (const tag of POLICY_TAGS.filter((t) => EXPECTED[t] === "Many")) {
      assert.strictEqual(foldTrace(node(tag), logging([])), `${tag}[]`);
    }
  });

  it("the table names every tag exactly once", () => {
    assert.deepStrictEqual(Object.keys(EXPECTED).sort(), [...POLICY_TAGS].sort());
  });
});
