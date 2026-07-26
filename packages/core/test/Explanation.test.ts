import { assert, describe, it } from "@effect/vitest";
import * as FastCheck from "effect/testing/FastCheck";
import { explain, renderExplanation } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";

describe("explain", () => {
  it("renders the sentence the roadmap asked for", () => {
    const policy = P.allOf([P.hasRole("editor"), P.hasPermission(permission("doc", "write"))]);
    assert.strictEqual(
      renderExplanation(explain(policy)),
      "requires role `editor` and requires permission `doc:write`",
    );
  });

  it("needs no subject, no resource and no services", () => {
    // The signature is the assertion: `explain` is a plain function of the policy.
    // If it ever grew a dependency this test would stop compiling, which is the
    // distinction ADR-QD-027 exists to keep — an explanation that varied by
    // subject would be a trace, and would leak whether the viewer satisfies it.
    const explanation: ReturnType<typeof explain> = explain(P.hasRole("editor"));
    assert.strictEqual(explanation._tag, "Requirement");
  });

  it("STATES RESTRICTIONS, not only requirements", () => {
    // The direction that matters. Omitting the field set would describe this
    // policy as a broader grant than it is.
    const policy = P.hasPermission(permission("doc", "read"), { fields: ["id", "title"] });
    assert.strictEqual(
      renderExplanation(explain(policy)),
      "requires permission `doc:read`, exposing only `id`, `title`",
    );
  });

  it("names an obligation, and says when it is advisory", () => {
    const audited = obligation("audit.log");
    const advisory = obligation("notify.owner", {}, { advisory: true });
    assert.strictEqual(
      renderExplanation(explain(P.obliged(audited, P.hasRole("editor")))),
      "requires role `editor`, and owes `audit.log`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.obliged(advisory, P.hasRole("editor")))),
      "requires role `editor`, and owes `notify.owner` (advisory)",
    );
  });

  it("says outright what an empty composite means", () => {
    // The least guessable thing about the ADT: an empty `allOf` allows and an
    // empty `anyOf` denies. A reader given an empty list would have to guess.
    assert.strictEqual(
      renderExplanation(explain(P.allOf([]))),
      "always allows (an empty conjunction)",
    );
    assert.strictEqual(
      renderExplanation(explain(P.anyOf([]))),
      "never allows (an empty disjunction)",
    );
    assert.strictEqual(
      renderExplanation(explain(P.rules([]))),
      "never allows (an empty rule table)",
    );
  });

  it("distinguishes the two history scopes, in both polarities", () => {
    // Four cases rather than two. `scope` and polarity are independent, and the
    // renderer has a separate arm per polarity — so covering one polarity's two
    // scopes leaves the other's branch unexercised.
    assert.include(
      renderExplanation(explain(P.hasNotActed("approved"))),
      "has not approved this resource",
    );
    assert.include(
      renderExplanation(explain(P.hasNotActed("approved", { scope: "Any" }))),
      "has not approved anything",
    );
    assert.include(
      renderExplanation(explain(P.hasActed("raised"))),
      "has raised this resource",
    );
    assert.include(
      renderExplanation(explain(P.hasActed("raised", { scope: "Any" }))),
      "has raised anything",
    );
  });

  it("renders a rule table with its combining algorithm and row indices", () => {
    const policy = P.rules(
      [P.denyWhen(P.hasRole("suspended")), P.permitWhen(P.hasRole("editor"))],
      { combining: "DenyOverrides" },
    );
    assert.strictEqual(
      renderExplanation(explain(policy)),
      "a rule table where any applying deny row wins: " +
        "[0] deny when requires role `suspended`; [1] permit when requires role `editor`",
    );
  });

  it("renders all three combining algorithms", () => {
    // Each is a different claim about which row decides, so each needs its own
    // words. Coverage caught this: two of the three were unexercised, and an
    // unexercised arm here renders a rule table with the wrong semantics stated.
    const table = (combining: "FirstApplicable" | "DenyOverrides" | "PermitOverrides") =>
      renderExplanation(explain(P.rules([P.permitWhen(P.hasRole("a"))], { combining })));

    assert.include(table("FirstApplicable"), "the first row that applies decides");
    assert.include(table("DenyOverrides"), "any applying deny row wins");
    assert.include(table("PermitOverrides"), "any applying permit row wins");
  });

  it("keeps the label the author gave a branch", () => {
    assert.strictEqual(
      renderExplanation(explain(P.labeled("sod.role", P.hasRole("approver")))),
      "requires role `approver` (`sod.role`)",
    );
  });

  it("renders every matcher and every value reference", () => {
    // A matcher with no arm would render as `undefined` inside a sentence rather
    // than fail, so each is exercised explicitly.
    const cases: ReadonlyArray<readonly [P.Policy, string]> = [
      [P.hasAttribute("a", M.eq(M.subjectId())), "equals the subject's id"],
      [P.hasAttribute("a", M.neq(M.resource("b"))), "differs from the resource's b"],
      [P.hasAttribute("a", M.eq(M.action())), "equals the action"],
      [P.hasAttribute("a", M.eq(M.subject("b"))), "equals the subject's b"],
      [P.hasAttribute("a", M.eq(M.literal(3))), "equals 3"],
      [P.hasAttribute("a", M.inArray([1, 2])), "is one of [1,2]"],
      [P.hasAttribute("a", M.exists()), "is present"],
      [P.hasAttribute("a", M.gte(2)), "is at least 2"],
      [P.hasAttribute("a", M.lt(2)), "is below 2"],
      [P.hasAttribute("a", M.contains("x")), 'contains "x"'],
      [P.hasAttribute("a", M.dominates(M.resource("l"))), "dominates the resource's l"],
      [P.hasAttribute("a", M.size(M.gte(2))), "has a size that is at least 2"],
      [P.hasAttribute("a", M.fieldMatch("f", M.exists())), "has f that is present"],
      [P.hasAttribute("a", M.someMatch(M.exists())), "has an entry that is present"],
      [P.hasAttribute("a", M.everyMatch(M.exists())), "has every entry is present"],
    ];

    for (const [policy, expected] of cases) {
      assert.include(renderExplanation(explain(policy)), expected);
    }
  });

  it("lets a caller supply their own term wrapper instead of backticks", () => {
    // The reason this returns a tree at all: an admin interface renders a role as
    // a link, not as prose Qadi chose.
    assert.strictEqual(
      renderExplanation(explain(P.hasRole("editor")), { term: (t) => `<b>${t}</b>` }),
      "requires role <b>editor</b>",
    );
  });

  it("PROPERTY: every generated policy explains to a non-empty rendering", () => {
    // Totality (INV-QD-021). There is no agreement property available here — an
    // explanation is prose about a policy, not a second way of deciding one — so
    // what is asserted is that no tree produces an empty, `undefined`-bearing or
    // truncated rendering.
    const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
      FastCheck.constantFrom("editor", "legal").map((r) => P.hasRole(r)),
      FastCheck.constant(P.hasPermission(permission("doc", "read"))),
      FastCheck.constant(P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
      FastCheck.constantFrom("owner", "viewer").map((r) => P.hasRelationship(r)),
      FastCheck.constantFrom("read", "write").map((a) => P.hasAction(a)),
      FastCheck.constant(P.hasActed("raised")),
      FastCheck.constant(P.hasNotActed("approved", { scope: "Any" })),
      FastCheck.constant(P.hasAttribute("seniority", M.gte(3))),
      FastCheck.constant(P.hasResourceAttribute("ownerId", M.eq(M.subjectId()))),
    );

    const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec((tie) => ({
      node: FastCheck.oneof(
        { maxDepth: 4, withCrossShrink: true },
        leaf,
        FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, { maxLength: 3 }).map(
          (ps) => P.allOf(ps),
        ),
        FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, { maxLength: 3 }).map(
          (ps) => P.anyOf(ps),
        ),
        (tie("node") as FastCheck.Arbitrary<P.Policy>).map(P.not),
        (tie("node") as FastCheck.Arbitrary<P.Policy>).map((p) => P.labeled("l", p)),
        (tie("node") as FastCheck.Arbitrary<P.Policy>).map((p) =>
          P.obliged(obligation("audit.log"), p),
        ),
        FastCheck.array(
          FastCheck.tuple(
            tie("node") as FastCheck.Arbitrary<P.Policy>,
            FastCheck.boolean(),
          ).map(([c, permits]) => (permits ? P.permitWhen(c) : P.denyWhen(c))),
          { maxLength: 3 },
        ).map((rs) => P.rules(rs)),
      ),
    })).node;

    for (const policy of FastCheck.sample(tree, 200)) {
      const text = renderExplanation(explain(policy));
      assert.isAbove(text.length, 0, `empty rendering for ${JSON.stringify(policy)}`);
      assert.notInclude(text, "undefined", `undefined leaked for ${JSON.stringify(policy)}`);
      assert.notInclude(text, "[object", `object leaked for ${JSON.stringify(policy)}`);
    }
  });

  it("PROPERTY: the explanation tree mirrors the policy tree's node count", () => {
    // A structural check the string cannot give: if a composite silently dropped
    // a child, the rendering might still read well.
    const countPolicy = (p: P.Policy): number =>
      p._tag === "AllOf" || p._tag === "AnyOf"
        ? 1 + p.policies.reduce((n, c) => n + countPolicy(c), 0)
        : p._tag === "Not" || p._tag === "Labeled" || p._tag === "Obliged"
          ? 1 + countPolicy(p.policy)
          : p._tag === "Rules"
            ? 1 + p.rules.reduce((n, r) => n + countPolicy(r.condition), 0)
            : 1;

    const countExplanation = (e: ReturnType<typeof explain>): number =>
      e._tag === "All" || e._tag === "Any"
        ? 1 + e.parts.reduce((n, c) => n + countExplanation(c), 0)
        : e._tag === "Negated" || e._tag === "Named" || e._tag === "Owing"
          ? 1 + countExplanation(e.part)
          : e._tag === "Table"
            ? 1 + e.rows.reduce((n, r) => n + countExplanation(r.condition), 0)
            : 1;

    const policies: ReadonlyArray<P.Policy> = [
      P.allOf([P.hasRole("a"), P.anyOf([P.hasRole("b"), P.not(P.hasRole("c"))])]),
      P.rules([P.permitWhen(P.hasRole("a")), P.denyWhen(P.allOf([P.hasRole("b")]))]),
      P.labeled("l", P.obliged(obligation("o"), P.hasRole("a"))),
    ];

    for (const policy of policies) {
      assert.strictEqual(countExplanation(explain(policy)), countPolicy(policy));
    }
  });
});
