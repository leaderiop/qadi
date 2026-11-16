/**
 * Every reader of a policy tag's arity agrees with the one record that states it.
 *
 * `POLICY_ARITY` says, per tag, whether the node has no children, one, or many;
 * `childrenOf`, `foldPolicyCases` and `foldTrace` each read that fact their own way, and
 * `renderTrace` and `diffTraces` deliberately read none (INV-QD-347, ARCH-98,
 * ADR-QD-164). The compile-time half is `PolicyArity.tst.ts`; this file is the runtime
 * half, and `TraceShape.test.ts` is the hand-written table that reads no record.
 */
import { assert, describe, it } from "@effect/vitest";
import { foldTrace, renderTrace } from "../src/Decision.ts";
import type { Trace, TraceCases } from "../src/Decision.ts";
import * as Core from "../src/index.ts";
import { exists } from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import {
  POLICY_TAGS,
  allOf,
  anyOf,
  childrenOf,
  foldPolicyCases,
  hasAction,
  hasActed,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  hasSignature,
  labeled,
  leafCases,
  not,
  obliged,
  permitWhen,
  rules,
} from "../src/Policy.ts";
import type { Policy, PolicyCases } from "../src/Policy.ts";
import { POLICY_ARITY } from "../src/PolicyArity.ts";
import { diffTraces } from "../src/TraceDiff.ts";

type Tag = Policy["_tag"];

const inner = hasRole("r");

/** One policy per tag; the many tags carry two children (or two rows). */
const SAMPLES: { readonly [K in Tag]: Policy } = {
  HasPermission: hasPermission(permission("doc", "read")),
  HasRole: hasRole("r"),
  HasAttribute: hasAttribute("x", exists()),
  HasResourceAttribute: hasResourceAttribute("x", exists()),
  HasRelationship: hasRelationship("owner"),
  HasAction: hasAction("read"),
  HasActed: hasActed("e"),
  HasNotActed: hasNotActed("e"),
  HasCustom: hasCustom("c", undefined),
  HasSignature: hasSignature("s"),
  AllOf: allOf([inner, inner]),
  AnyOf: anyOf([inner, inner]),
  Rules: rules([permitWhen(inner), permitWhen(inner)]),
  Not: not(inner),
  Obliged: obliged(obligation("audit.log"), inner),
  Labeled: labeled("l", inner),
};

const COUNT = { Leaf: 0, Wrapper: 1, Many: 2 } as const;

/** How many children each fold hands an arm, per tag. */
const policyArms: PolicyCases<number> = {
  ...leafCases(() => 0),
  AllOf: (_, children) => children.length,
  AnyOf: (_, children) => children.length,
  Rules: (_, rows) => rows.length,
  Not: () => 1,
  Obliged: () => 1,
  Labeled: () => 1,
};

const traceLeaf = (): number => 0;
const traceMany = (_: Trace, children: ReadonlyArray<number>): number => children.length;
const traceWrapper = (_: Trace, child: number | undefined): number => (child === undefined ? 0 : 1);
const traceArms: TraceCases<number> = {
  HasPermission: traceLeaf,
  HasRole: traceLeaf,
  HasAttribute: traceLeaf,
  HasResourceAttribute: traceLeaf,
  HasRelationship: traceLeaf,
  HasAction: traceLeaf,
  HasActed: traceLeaf,
  HasNotActed: traceLeaf,
  HasCustom: traceLeaf,
  HasSignature: traceLeaf,
  AllOf: traceMany,
  AnyOf: traceMany,
  Rules: traceMany,
  Not: traceWrapper,
  Obliged: traceWrapper,
  Labeled: traceWrapper,
};

const node = (policyTag: Tag, children: ReadonlyArray<Trace> = [], allowed = true): Trace => ({
  policyTag,
  allowed,
  children,
  obligations: [],
});

const three = (): ReadonlyArray<Trace> => [node("HasRole"), node("HasAction"), node("HasPermission")];

describe("the arity record", () => {
  it("names every tag exactly once, with one of the three arities", () => {
    assert.deepStrictEqual(Object.keys(POLICY_ARITY).sort(), [...POLICY_TAGS].sort());
    for (const tag of POLICY_TAGS) {
      assert.include(["Leaf", "Wrapper", "Many"], POLICY_ARITY[tag], tag);
    }
  });
});

describe("every reader agrees with the record", () => {
  for (const tag of POLICY_TAGS) {
    it(`${tag}: childrenOf, foldPolicyCases and foldTrace`, () => {
      const sample = SAMPLES[tag];
      const arity = POLICY_ARITY[tag];
      assert.strictEqual(sample._tag, tag);
      assert.strictEqual(childrenOf(sample).length, COUNT[arity]);
      assert.strictEqual(foldPolicyCases(sample, policyArms), COUNT[arity]);
      // A trace node carries three children under every tag: a leaf's arm sees none,
      // a wrapper's one, a many's all three.
      const seen = foldTrace(node(tag, three()), traceArms);
      assert.strictEqual(seen, { Leaf: 0, Wrapper: 1, Many: 3 }[arity]);
    });
  }
});

describe("a tag outside the union", () => {
  // A caller-held trace may carry any tag. The record has no row for one, so the fold
  // throws when it opens the node, before any child's arm runs, as the base's
  // `Match.exhaustive` did; inherited names do not read as an arity either.
  for (const name of ["Bogus", "constructor", "toString", "__proto__"]) {
    it(`${name}: foldTrace throws before any child's arm runs`, () => {
      const foreign: Tag = JSON.parse(JSON.stringify(name));
      let ran = 0;
      const arms: TraceCases<number> = { ...traceArms, HasRole: () => ++ran };
      assert.throws(() => foldTrace(node(foreign, [node("HasRole")]), arms));
      assert.strictEqual(ran, 0);
    });
  }
});

describe("rendering and diffing read no arity (BEH-QD-595)", () => {
  for (const tag of POLICY_TAGS) {
    it(`${tag}: renderTrace shows all three children`, () => {
      assert.strictEqual(
        renderTrace(node(tag, three())),
        [`✓ ${tag}`, "  ✓ HasRole", "  ✓ HasAction", "  ✓ HasPermission"].join("\n"),
      );
    });

    it(`${tag}: diffTraces reports the child whose verdict differs at [0]`, () => {
      assert.deepStrictEqual(
        diffTraces(
          node(tag, [node("HasAction", [], true)]),
          node(tag, [node("HasAction", [], false)]),
        ),
        [
          {
            _tag: "VerdictChanged",
            path: [0],
            policyTag: "HasAction",
            label: undefined,
            before: true,
            after: false,
            beforeReason: undefined,
            afterReason: undefined,
          },
        ],
      );
    });
  }
});

describe("the barrel", () => {
  it("does not export the record (ADR-QD-099)", () => {
    assert.isFalse(Object.hasOwn(Core, "POLICY_ARITY"), "POLICY_ARITY");
  });
});
