/**
 * ARCH-02 T2: pins every core Policy walker's output before it moves onto
 * `foldPolicy`. The differential tests compare against frozen copies under
 * `legacy/`; the pinned examples outlive them (T18 moves them into each walker's
 * own test file).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Metric from "effect/Metric";
import * as Schema from "effect/Schema";
import * as FastCheck from "fast-check";
import { TraceSchema } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { toPredicate } from "../src/Predicate.ts";
import { simplify } from "../src/Simplify.ts";
import { chain, isolatedMetrics, policyArbitrary, sharedPolicyArbitrary, subjectWith, testLayer } from "./helpers.ts";
import {
  legacyExplain,
  legacyPolicyDepth,
  legacyRenderExplanation,
  legacyRestrictsFields,
  legacySimplify,
} from "./legacy/PolicyWalkers.legacy.ts";

const arbitraries = [
  ["policyArbitrary", policyArbitrary(), 2026100402],
  ["sharedPolicyArbitrary", sharedPolicyArbitrary, 2026100403],
] as const;

describe("differential: every walker against its frozen predecessor", () => {
  for (const [name, arbitrary, seed] of arbitraries) {
    it(`policyDepth over ${name}`, () => {
      FastCheck.assert(
        FastCheck.property(arbitrary, (p) => P.policyDepth(p) === legacyPolicyDepth(p)),
        { seed, numRuns: 1000 },
      );
    });

    it(`simplify over ${name}`, () => {
      FastCheck.assert(
        FastCheck.property(arbitrary, (p) => {
          assert.deepStrictEqual(simplify(p), legacySimplify(p));
          return true;
        }),
        { seed, numRuns: 1000 },
      );
    });

    it(`explain and renderExplanation over ${name}`, () => {
      FastCheck.assert(
        FastCheck.property(arbitrary, (p) => {
          assert.deepStrictEqual(explain(p), legacyExplain(p));
          assert.strictEqual(
            renderExplanation(explain(p)),
            legacyRenderExplanation(legacyExplain(p)),
          );
          const term = (name: string) => `«${name}»`;
          assert.strictEqual(
            renderExplanation(explain(p), { term }),
            legacyRenderExplanation(legacyExplain(p), { term }),
          );
          return true;
        }),
        { seed, numRuns: 1000 },
      );
    });
  }

  it("toPredicate's fields gate agrees with legacy restrictsFields", () => {
    const layer = testLayer(subjectWith({ roles: ["editor"] }));
    const failureOf = (policy: P.Policy, maxDepth: number) =>
      Effect.runSync(
        Effect.result(toPredicate(policy, { maxDepth, action: "read" })).pipe(
          Effect.provide(layer),
        ),
      );
    FastCheck.assert(
      FastCheck.property(
        policyArbitrary(),
        FastCheck.constantFrom(0, 1, 2, 3, 64),
        (p, maxDepth) => {
          const expected = legacyRestrictsFields(p, 0, maxDepth);
          const result = failureOf(p, maxDepth);
          const error = result._tag === "Failure" ? result.failure : undefined;
          const gate = error?._tag === "PolicyNotTranslatable"
            && error.reason.includes("restricts visible fields");
          if (expected === "TooDeep") assert.strictEqual(error?._tag, "PolicyTooDeep");
          else if (expected) assert.isTrue(gate);
          else {
            assert.isFalse(gate);
            assert.notStrictEqual(error?._tag, "PolicyTooDeep");
          }
          return true;
        },
      ),
      { seed: 2026100404, numRuns: 500 },
    );
  });
});

describe("pinned examples", () => {
  const x = P.labeled("shared", P.not(P.hasRole("editor")));

  it("(a) identity sharing: a shared child is folded once and reused", () => {
    const e = explain(P.allOf([x, x]));
    assert.strictEqual(e._tag, "All");
    if (e._tag !== "All") return;
    assert.strictEqual(e.parts[0], e.parts[1]);

    const s = simplify(P.allOf([x, x]));
    if (s._tag === "AllOf") assert.strictEqual(s.policies[0], s.policies[1]);

    assert.strictEqual(P.policyDepth(P.allOf([x, x])), 3);
  });

  it("(b) empty composites have nesting depth 0", () => {
    assert.strictEqual(P.policyDepth(P.allOf([])), 0);
    assert.strictEqual(P.policyDepth(P.anyOf([])), 0);
    assert.strictEqual(P.policyDepth(P.rules([])), 0);
  });

  it("(c) Rules children stay aligned after simplify", () => {
    const original = P.rules([
      P.permitWhen(P.hasRole("a")),
      P.denyWhen(P.not(P.not(P.hasRole("b")))),
      P.permitWhen(P.hasRole("c")),
    ]);
    const out = simplify(original);
    assert.strictEqual(out._tag, "Rules");
    if (out._tag !== "Rules") return;
    assert.deepStrictEqual(
      out.rules.map((r) => r.effect),
      ["Permit", "Deny", "Permit"],
    );
    assert.deepStrictEqual(
      out.rules.map((r) => (r.condition._tag === "HasRole" ? r.condition.role : r.condition._tag)),
      ["a", "Not", "c"],
    );
  });

  describe("(d) N4 precedence of PolicyTooDeep against the fields refusal", () => {
    const layer = testLayer(subjectWith({ roles: ["editor"] }));
    const restricting = P.hasRole("editor", { fields: ["a"] });
    const deep = chain(P.not, 3, P.hasRole("x"));
    const tagOf = (policy: P.Policy) =>
      Effect.gen(function* () {
        const r = yield* Effect.result(toPredicate(policy, { maxDepth: 1 }));
        return r._tag === "Failure" ? r.failure._tag : "Success";
      }).pipe(Effect.provide(layer));

    // PINNED — flips under D-02-e(b), see T9
    it.effect("a restricting leaf first: PolicyNotTranslatable", () =>
      Effect.gen(function* () {
        assert.strictEqual(
          yield* tagOf(P.allOf([restricting, deep])),
          "PolicyNotTranslatable",
        );
      }),
    );

    // PINNED — flips under D-02-e(b), see T9
    it.effect("the deep branch first: PolicyTooDeep", () =>
      Effect.gen(function* () {
        assert.strictEqual(yield* tagOf(P.allOf([deep, restricting])), "PolicyTooDeep");
      }),
    );
  });

  describe("(e) N3 over-deep policies are rejected whoever asks (flipped by D-02-e(b), T13)", () => {
    const deep = chain(P.not, 3, P.hasRole("x"));
    const decide = (policy: P.Policy, roles: ReadonlyArray<string>) =>
      evaluate(policy, { maxDepth: 1 }).pipe(
        Effect.result,
        Effect.provide(testLayer(subjectWith({ roles }))),
      );

    // FLIPPED by D-02-e(b), T13: was "succeeds" (subject-dependent)
    it.effect("an allow that would short-circuit past the over-deep branch is still PolicyTooDeep", () =>
      Effect.gen(function* () {
        const r = yield* decide(P.anyOf([P.hasRole("editor"), deep]), ["editor"]);
        assert.strictEqual(r._tag === "Failure" ? r.failure._tag : r._tag, "PolicyTooDeep");
      }),
    );

    // FLIPPED by D-02-e(b), T13: was "succeeds" (subject-dependent)
    it.effect("a deny that would short-circuit past the over-deep branch is still PolicyTooDeep", () =>
      Effect.gen(function* () {
        const r = yield* decide(P.allOf([P.hasRole("nope"), deep]), []);
        assert.strictEqual(r._tag === "Failure" ? r.failure._tag : r._tag, "PolicyTooDeep");
      }),
    );
  });

  // FLIPPED by D-02-f(a), T12: was 0 (matcher nesting was invisible)
  it("(f) matcher nesting counts toward policyDepth", () => {
    const p = P.hasAttribute("x", M.size(M.size(M.eq(M.literal(1)))));
    assert.strictEqual(P.policyDepth(p), 2);
    assert.strictEqual(P.policyDepth(P.not(p)), 3);
    assert.strictEqual(P.policyDepth(P.hasAttribute("x", M.eq(M.literal(1)))), 0);
  });
});

describe("the tag lists", () => {
  const tags: ReadonlyArray<P.Policy["_tag"]> = [
    "HasPermission",
    "HasRole",
    "HasAttribute",
    "HasResourceAttribute",
    "HasRelationship",
    "HasAction",
    "HasActed",
    "HasNotActed",
    "HasCustom",
    "HasSignature",
    "AllOf",
    "AnyOf",
    "Rules",
    "Not",
    "Obliged",
    "Labeled",
  ];

  it("TraceSchema decodes every Policy tag and rejects an unknown one", () => {
    const decode = Schema.decodeUnknownSync(TraceSchema);
    for (const policyTag of tags) {
      const node = { policyTag, allowed: true, children: [], obligations: [] };
      assert.strictEqual(decode(node).policyTag, policyTag);
    }
    assert.throws(() =>
      decode({ policyTag: "Probe", allowed: true, children: [], obligations: [] }),
    );
  });

  it.effect("qadi_denials_by_policy_tag_total preregisters the 16 tags in order", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* evaluate(P.hasRole("editor")).pipe(
            Effect.provide(testLayer(subjectWith({}))),
          );
          return yield* Metric.snapshot;
        }),
      );
      const frequency = snapshots.find(
        (s): s is Extract<Metric.Metric.Snapshot, { type: "Frequency" }> =>
          s.type === "Frequency" && s.id === "qadi_denials_by_policy_tag_total",
      );
      assert.isDefined(frequency);
      assert.deepStrictEqual([...(frequency?.state.occurrences.keys() ?? [])], [...tags]);
    }),
  );
});
