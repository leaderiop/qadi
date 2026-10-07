/**
 * INV-QD-NEXT: a trace lines up with its policy's explanation, position by position.
 *
 * The alignment is produced in core (`evaluateNode` and the three composites emit
 * one trace child per evaluated part, in declaration order; `explain` mirrors the
 * policy), and `foldAligned` is how it is read. These properties state it for
 * every `Policy` tag, with and without concurrency, and on policies that share a
 * subtree by identity, which is what a fold memoised per node would get wrong.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as FastCheck from "fast-check";
import type { AuthSubject } from "../src/AuthSubject.ts";
import type { Trace } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { explain, foldAligned } from "../src/Explanation.ts";
import type { AlignedNode, Explanation } from "../src/Explanation.ts";
import * as P from "../src/Policy.ts";
import { tracePathKey } from "../src/TraceDiff.ts";
import { chain, policyArbitrary, sharedPolicyArbitrary, subjectWith, testLayer } from "./helpers.ts";

/** The explanation tag `explain` gives each policy tag. */
const counterpart: Record<P.Policy["_tag"], Explanation["_tag"]> = {
  HasPermission: "Requirement",
  HasRole: "Requirement",
  HasAttribute: "Requirement",
  HasResourceAttribute: "Requirement",
  HasRelationship: "Requirement",
  HasAction: "Requirement",
  HasActed: "Requirement",
  HasNotActed: "Requirement",
  HasCustom: "Requirement",
  HasSignature: "Requirement",
  AllOf: "All",
  AnyOf: "Any",
  Rules: "Table",
  Not: "Negated",
  Obliged: "Owing",
  Labeled: "Named",
};

const subjects: ReadonlyArray<AuthSubject> = [
  subjectWith({}),
  subjectWith({ roles: ["editor"], permissions: ["doc:read"], attributes: { seniority: 5 } }),
  subjectWith({ roles: ["editor"] }),
  subjectWith({ permissions: ["doc:read"], attributes: { seniority: 1 } }),
];

interface Seen {
  readonly node: AlignedNode;
  readonly childCount: number;
}

/** Every position, parents after children, with how many children it has. */
const positions = (explanation: Explanation, trace: Trace | undefined): ReadonlyArray<Seen> => {
  const seen: Array<Seen> = [];
  foldAligned<null>(explanation, trace, (node, children) => {
    seen.push({ node, childCount: children.length });
    return null;
  });
  return seen;
};

/** The number of paths in an explanation tree: shared subtrees counted per occurrence. */
const countPaths = (e: Explanation): number => {
  const parts: ReadonlyArray<Explanation> =
    e._tag === "Requirement"
      ? []
      : e._tag === "All" || e._tag === "Any"
        ? e.parts
        : e._tag === "Table"
          ? e.rows.map((row) => row.condition)
          : [e.part];
  return 1 + parts.reduce((total, part) => total + countPaths(part), 0);
};

describe("foldAligned — INV-QD-NEXT", () => {
  const sampleArbitrary = FastCheck.oneof(policyArbitrary(), sharedPolicyArbitrary);

  it.effect("a trace node sits at the position its policy tag explains (A1, A2)", () =>
    Effect.gen(function* () {
      const policies = FastCheck.sample(sampleArbitrary, { numRuns: 300, seed: 2026100701 });
      let aligned = 0;
      for (const [i, policy] of policies.entries()) {
        const subject = subjects[i % subjects.length] ?? subjects[0];
        if (subject === undefined) continue;
        const explanation = explain(policy);
        for (const concurrency of [undefined, 4] as const) {
          const exit = yield* Effect.exit(
            evaluate(policy, concurrency === undefined ? {} : { concurrency }).pipe(Effect.provide(testLayer(subject))),
          );
          if (Exit.isFailure(exit)) continue;
          const trace = exit.value.trace;
          const seen = positions(explanation, trace);
          aligned += 1;

          // A2: one position per path, none merged, every key its own.
          assert.strictEqual(seen.length, countPaths(explanation));
          assert.strictEqual(new Set(seen.map((s) => s.node.key)).size, seen.length);

          const reached = new Set<string>();
          for (const { node, childCount } of seen) {
            if (node.trace === undefined) continue;
            reached.add(node.key);
            // A1: the trace's tag is the one this explanation node is the image of.
            assert.strictEqual(counterpart[node.trace.policyTag], node.explanation._tag);
            // Prefix: a combinator's trace children are a prefix of its parts.
            assert.isAtMost(node.trace.children.length, childCount);
            const tag = node.explanation._tag;
            if (tag === "Negated" || tag === "Named" || tag === "Owing") {
              assert.strictEqual(node.trace.children.length, 1);
            }
            if (tag === "Requirement") assert.strictEqual(node.trace.children.length, 0);
          }
          // Nothing below an unreached position was reached: a reached position's
          // parent is reached too.
          for (const key of reached) {
            if (key !== "$") assert.isTrue(reached.has(key.slice(0, key.lastIndexOf("."))));
          }
        }
      }
      assert.isAbove(aligned, 100);
    }),
  );

  it("keys are `tracePathKey` of the path that reaches the position", () => {
    const policy = P.anyOf([P.not(P.hasRole("a")), P.allOf([P.hasRole("b"), P.hasRole("c")])]);
    const keys = positions(explain(policy), undefined).map((s) => s.node.key);
    assert.deepStrictEqual(
      keys,
      [[0, 0], [0], [1, 0], [1, 1], [1], []].map((path) => tracePathKey(path)),
    );
  });

  it.effect("a subtree shared by identity gets a result per position (A3)", () =>
    Effect.gen(function* () {
      const p = P.hasRole("x");
      const policy = P.anyOf([P.not(p), p]);
      const decision = yield* evaluate(policy).pipe(
        Effect.provide(testLayer(subjectWith({ roles: ["x"] }))),
      );
      const explanation = explain(policy);
      // The two occurrences really are one object.
      assert.strictEqual(
        explanation._tag === "Any" && explanation.parts[0]?._tag === "Negated"
          ? explanation.parts[0].part
          : undefined,
        explanation._tag === "Any" ? explanation.parts[1] : null,
      );
      const verdicts = new Map<string, boolean | undefined>();
      foldAligned<null>(explanation, decision.trace, (node) => {
        verdicts.set(node.key, node.trace?.allowed);
        return null;
      });
      // `not(x)` denies, so the `x` beneath it allows and the second `x` allows:
      // and the first `x` is at `$.0.0`, the second at `$.1`, each with its own trace.
      assert.deepStrictEqual([...verdicts], [
        ["$.0.0", true],
        ["$.0", false],
        ["$.1", true],
        ["$", true],
      ]);
      assert.notStrictEqual(
        positions(explanation, decision.trace)[0]?.node.trace,
        positions(explanation, decision.trace)[2]?.node.trace,
      );
    }),
  );

  it.effect("folds the trace of a 100,000-deep chain, Allowed and Denied alternating (A4)", () =>
    Effect.gen(function* () {
      const n = 100_000;
      const policy = chain(P.not, n, P.hasRole("reader"));
      const decision = yield* evaluate(policy, { maxDepth: Infinity }).pipe(
        Effect.provide(testLayer(subjectWith({ roles: ["reader"] }))),
      );
      const depthBelow = foldAligned<number>(explain(policy), decision.trace, (node, children) => {
        // `reader` is held, so the leaf allows and each `not` flips it.
        const height = children[0] ?? 0;
        assert.strictEqual(node.trace?.allowed, height % 2 === 0);
        return height + 1;
      });
      assert.strictEqual(depthBelow, n + 1);
    }),
    60_000,
  );

  it.effect("a rule table that stops early leaves later rows unreached, with each row's effect (A5)", () =>
    Effect.gen(function* () {
      const policy = P.rules(
        [P.denyWhen(P.hasRole("banned")), P.permitWhen(P.hasRole("editor")), P.permitWhen(P.hasRole("late"))],
        { combining: "FirstApplicable" },
      );
      const decision = yield* evaluate(policy).pipe(
        Effect.provide(testLayer(subjectWith({ roles: ["editor"] }))),
      );
      const seen = positions(explain(policy), decision.trace);
      const rows = seen.filter((s) => s.node.effect !== undefined);
      assert.deepStrictEqual(
        rows.map((s) => [s.node.key, s.node.effect, s.node.trace === undefined]),
        [
          ["$.0", "Deny", false],
          ["$.1", "Permit", false],
          ["$.2", "Permit", true],
        ],
      );
      assert.strictEqual(decision.trace.children.length, 2);
    }),
  );

  it("folds an explanation with no trace: every position is unreached", () => {
    const seen = positions(explain(P.allOf([P.hasRole("a"), P.not(P.hasRole("b"))])), undefined);
    assert.isTrue(seen.every((s) => s.node.trace === undefined));
  });

  it("ignores trace children beyond the explanation's parts", () => {
    const explanation = explain(P.hasRole("a"));
    const trace: Trace = {
      policyTag: "HasRole",
      allowed: true,
      obligations: [],
      children: [{ policyTag: "HasRole", allowed: true, obligations: [], children: [] }],
    };
    assert.strictEqual(positions(explanation, trace).length, 1);
  });
});
