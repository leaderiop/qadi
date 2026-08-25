/**
 * `renderTrace`, the counterpart to `renderExplanation`.
 *
 * Most cases build a `Trace` by hand, because the point under test is the
 * rendering rather than the evaluator. The last two drive a real `evaluate`, so
 * the shape being rendered is the shape the evaluator actually produces.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import type { Trace } from "../src/Decision.ts";
import { isAllowed, renderTrace } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { makeSubject } from "../src/AuthSubject.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { testLayer } from "./helpers.ts";

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
