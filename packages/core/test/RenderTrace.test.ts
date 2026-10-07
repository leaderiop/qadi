/**
 * `renderTrace`, the counterpart to `renderExplanation`.
 *
 * Most cases build a `Trace` by hand, because the point under test is the
 * rendering rather than the evaluator. The last two drive a real `evaluate`, so
 * the shape being rendered is the shape the evaluator actually produces.
 */
import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "fast-check";
import * as Effect from "effect/Effect";
import type { Trace } from "../src/Decision.ts";
import { isAllowed, renderTrace } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { chain, subjectWith, testLayer } from "./helpers.ts";
import { oracleRenderTrace, traceArbitrary } from "./TraceOracle.ts";

const leaf = (over: Partial<Trace> & { readonly allowed: boolean }): Trace => ({
  policyTag: "HasRole",
  children: [],
  obligations: [],
  ...over,
});

describe("renderTrace", () => {
  it("marks each node with its verdict", () => {
    const trace = leaf({ allowed: true, policyTag: "HasPermission" });
    assert.strictEqual(renderTrace(trace), "✓ HasPermission");
  });

  it("carries the reason that explains a refusal", () => {
    const trace = leaf({ allowed: false, reason: "subject lacks role 'admin'" });
    assert.strictEqual(renderTrace(trace), "✗ HasRole — subject lacks role 'admin'");
  });

  it("indents children under the node that combined them", () => {
    const trace: Trace = {
      policyTag: "AllOf",
      allowed: false,
      reason: "subject lacks role 'admin'",
      obligations: [],
      children: [
        leaf({ allowed: true, policyTag: "HasPermission" }),
        leaf({ allowed: false, reason: "subject lacks role 'admin'" }),
      ],
    };

    assert.strictEqual(
      renderTrace(trace),
      [
        "✗ AllOf — subject lacks role 'admin'",
        "  ✓ HasPermission",
        "  ✗ HasRole — subject lacks role 'admin'",
      ].join("\n"),
    );
  });

  it("keeps the label an author gave a branch", () => {
    const trace = leaf({ allowed: true, policyTag: "Labeled", label: "owner-or-admin" });
    assert.strictEqual(renderTrace(trace), "✓ Labeled (`owner-or-admin`)");
  });

  it("names the fields an allow exposes", () => {
    const trace = leaf({ allowed: true, visibleFields: ["id", "title"] });
    assert.strictEqual(renderTrace(trace), "✓ HasRole, exposing only `id`, `title`");
  });

  it("says an allow that discloses nothing exposes no fields", () => {
    // An empty `visibleFields` is the bottom of the lattice, distinct from
    // `undefined` (the top). Joining zero terms into ", exposing only "
    // would leave a dangling, garbled sentence instead.
    const trace = leaf({ allowed: true, visibleFields: [] });
    assert.strictEqual(renderTrace(trace), "✓ HasRole, exposing no fields");
  });

  it("RENDERS NOTHING FOR undefined FIELDS, because undefined is every field", () => {
    // INV-QD-004: `undefined` is the top of the visibility lattice. Rendering it
    // as an empty list would say the opposite of what it means.
    const trace = leaf({ allowed: true, visibleFields: undefined });
    assert.strictEqual(renderTrace(trace), "✓ HasRole");
    assert.notInclude(renderTrace(trace), "exposing");
  });

  it("names what an allow owes, and says when a duty is advisory", () => {
    const trace = leaf({
      allowed: true,
      policyTag: "Obliged",
      obligations: [obligation("audit.log"), obligation("notify", {}, { advisory: true })],
    });
    assert.strictEqual(
      renderTrace(trace),
      "✓ Obliged, owing `audit.log`, `notify` (advisory)",
    );
  });

  it("lets a caller supply their own term wrapper and indent", () => {
    const trace: Trace = {
      policyTag: "AllOf",
      allowed: true,
      obligations: [],
      children: [leaf({ allowed: true, policyTag: "Labeled", label: "owner" })],
    };

    assert.strictEqual(
      renderTrace(trace, { term: (t) => `<${t}>`, indent: "    " }),
      ["✓ AllOf", "    ✓ Labeled (<owner>)"].join("\n"),
    );
  });

  it.effect("renders a real denial produced by the evaluator", () =>
    Effect.gen(function* () {
      const alice = makeSubject({ id: "u1", permissions: ["doc:read"] });
      const policy = P.allOf([
        P.hasPermission(permission("doc", "read")),
        P.hasRole("admin"),
      ]);

      const decision = yield* evaluate(policy).pipe(Effect.provide(testLayer(alice)));
      assert.isFalse(isAllowed(decision));

      const rendered = renderTrace(decision.trace);
      assert.include(rendered, "✗ AllOf");
      assert.include(rendered, "✓ HasPermission");
      assert.include(rendered, "✗ HasRole");
      // Every line of a real trace carries a verdict mark.
      for (const line of rendered.split("\n")) {
        assert.match(line, /^ *[✓✗] /);
      }
    }),
  );

  it.effect("SHOWS WHAT WAS EVALUATED, not what was asked", () =>
    Effect.gen(function* () {
      // The evaluator drops children after the decisive one (INV-QD-020), so a
      // rendered trace is narrower than the policy. This is the one thing a
      // reader of the output must not misread, so it is pinned rather than
      // left to the doc comment.
      const alice = makeSubject({ id: "u1" });
      const policy = P.anyOf([P.hasRole("admin"), P.hasRole("editor")]);

      const decision = yield* evaluate(policy).pipe(Effect.provide(testLayer(alice)));
      const rendered = renderTrace(decision.trace);

      assert.strictEqual(policy._tag === "AnyOf" ? policy.policies.length : 0, 2);
      assert.strictEqual(decision.trace.children.length, 2);
      // Both branches were needed here, so both appear. The general claim the
      // renderer makes is only ever about `children`, never about the policy.
      assert.strictEqual(rendered.split("\n").length, 3);
    }),
  );
});

describe("renderTrace — stack safety, a trace of any nesting depth (ARCH-22 C2, INV-QD-090)", () => {
  it.effect(
    "renders a 3,000-deep evaluated chain, one line per node",
    () =>
      Effect.gen(function* () {
        const policy = chain(P.not, 3_000, P.hasRole("reader"));
        const decision = yield* evaluate(policy, { maxDepth: Infinity }).pipe(
          Effect.provide(testLayer(subjectWith({ roles: ["reader"] }))),
        );
        const lines = renderTrace(decision.trace, { indentLimit: Infinity }).split("\n");
        assert.strictEqual(lines.length, 3_001);
        assert.strictEqual(lines[3_000], `${"  ".repeat(3_000)}✓ HasRole`);
      }),
    60_000,
  );

  it.effect(
    "renders a 250k-wide allOf",
    () =>
      Effect.gen(function* () {
        const policy = P.allOf(Array.from({ length: 250_000 }, () => P.hasRole("reader")));
        const decision = yield* evaluate(policy).pipe(
          Effect.provide(testLayer(subjectWith({ roles: ["reader"] }))),
        );
        assert.strictEqual(renderTrace(decision.trace).split("\n").length, 250_001);
      }),
    60_000,
  );
});

describe("renderTrace — agrees with the recursive implementation it replaced (ARCH-22 T1)", () => {
  it("renders byte for byte what the recursion did, for any shallow trace", () => {
    FastCheck.assert(
      FastCheck.property(traceArbitrary(8), (trace) => {
        assert.strictEqual(renderTrace(trace), oracleRenderTrace(trace));
        const options = { term: (t: string) => `<${t}>`, indent: "..", };
        assert.strictEqual(renderTrace(trace, options), oracleRenderTrace(trace, options));
      }),
      { seed: 2026100702, numRuns: 300 },
    );
  });
});

describe("renderTrace — indentLimit (ARCH-22 D-22-b, N3)", () => {
  /** A chain of `n` `Not`s over a `HasRole`; the node at depth d allows exactly when d is even. */
  const deepTrace = (n: number): Trace => {
    let t: Trace = { policyTag: "HasRole", allowed: n % 2 === 0, children: [], obligations: [] };
    for (let i = n - 1; i >= 0; i--)
      t = { policyTag: "Not", allowed: i % 2 === 0, children: [t], obligations: [] };
    return t;
  };

  it("renders a 100k-deep trace in output linear in its node count", () => {
    const lines = renderTrace(deepTrace(100_000)).split("\n");
    assert.strictEqual(lines.length, 100_001);
    assert.strictEqual(lines[100_000], `${"  ".repeat(64)}(depth 100000) ✓ HasRole`);
    assert.strictEqual(lines[64], `${"  ".repeat(64)}✓ Not`);
    assert.strictEqual(lines[65], `${"  ".repeat(64)}(depth 65) ✗ Not`);
  }, 60_000);

  it("is byte-identical to the unbounded format within the default bound", () => {
    const trace = deepTrace(64);
    assert.strictEqual(renderTrace(trace), oracleRenderTrace(trace));
    assert.notStrictEqual(renderTrace(deepTrace(65)), oracleRenderTrace(deepTrace(65)));
  });

  it("restores full indentation at Infinity, at a depth the recursion could not render", () => {
    const lines = renderTrace(deepTrace(3_000), { indentLimit: Infinity }).split("\n");
    assert.strictEqual(lines.length, 3_001);
    assert.strictEqual(lines[2_999], `${"  ".repeat(2_999)}✗ Not`);
    assert.strictEqual(lines[3_000], `${"  ".repeat(3_000)}✓ HasRole`);
  }, 60_000);

  it("treats NaN and a negative limit as no indentation, never as unbounded", () => {
    for (const indentLimit of [Number.NaN, -1]) {
      assert.deepStrictEqual(renderTrace(deepTrace(3), { indentLimit }).split("\n"), [
        "✓ Not",
        "(depth 1) ✗ Not",
        "(depth 2) ✓ Not",
        "(depth 3) ✗ HasRole",
      ]);
    }
  });
});
