import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "fast-check";
import { isAllowed } from "../src/Decision.ts";
import { evaluate } from "../src/Evaluate.ts";
import { explain, foldExplanation, renderExplanation } from "../src/Explanation.ts";
import type { Requirement } from "../src/Explanation.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import { chain, subjectWith, testLayer } from "./helpers.ts";

/**
 * Narrows an `Explanation` to a `Requirement`, asserting the tag along the way.
 * A leaf policy always explains to a `Requirement`, so a mismatch here is
 * itself a failing assertion rather than a silently-`undefined` `.kind` read.
 */
const asRequirement = (explanation: ReturnType<typeof explain>): Requirement => {
  assert.strictEqual(explanation._tag, "Requirement");
  if (explanation._tag !== "Requirement") {
    throw new Error(`expected a Requirement, got ${explanation._tag}`);
  }
  return explanation;
};

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

  it("renders a path-shaped field spec as a literal term, not a path", () => {
    // Explanation rendering is opaque to what a field string means — a
    // dot-path or wildcard spec is just a string it backticks and joins,
    // identical to a flat name. No path/depth reasoning happens here.
    const policy = P.hasPermission(permission("doc", "read"), {
      fields: ["id", "contact.*"],
    });
    assert.strictEqual(
      renderExplanation(explain(policy)),
      "requires permission `doc:read`, exposing only `id`, `contact.*`",
    );
  });

  it("says a permission that discloses nothing exposes no fields", () => {
    // An empty `fields` array is the bottom of the lattice, distinct from
    // omitting it (the top, meaning "all fields"). Joining zero terms into
    // ", exposing only " would leave a dangling, garbled sentence instead.
    const policy = P.hasPermission(permission("doc", "read"), { fields: [] });
    assert.strictEqual(
      renderExplanation(explain(policy)),
      "requires permission `doc:read`, exposing no fields",
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

  it("gives HasAttribute the exact kind and detail sentence", () => {
    // The property test only checks non-emptiness; a mutant blanking `kind` or
    // the detail sentence would survive that. Assert both exactly.
    const requirement = asRequirement(explain(P.hasAttribute("age", M.gte(3))));
    assert.strictEqual(requirement.kind, "attribute");
    assert.strictEqual(requirement.detail, "the subject's age is at least 3");
  });

  it("gives HasResourceAttribute the exact kind and detail sentence", () => {
    const requirement = asRequirement(
      explain(P.hasResourceAttribute("status", M.eq(M.literal("open")))),
    );
    assert.strictEqual(requirement.kind, "attribute");
    assert.strictEqual(requirement.detail, 'the resource\'s status equals "open"');
  });

  it("gives HasRelationship the exact kind and detail sentence", () => {
    const requirement = asRequirement(explain(P.hasRelationship("owner")));
    assert.strictEqual(requirement.kind, "relationship");
    assert.strictEqual(requirement.detail, "the subject is owner of the resource");
  });

  it("states HasRelationship's depth when the policy carries one (INV-QD-031)", () => {
    // The defect this pins: `hasRelationship("owner")` (unbounded, the
    // resolver decides) and `hasRelationship("owner", { depth: 1 })` (direct
    // edges only) are different policies, and the explanation used to render
    // them to the same sentence because `depth` never reached it.
    const unbounded = asRequirement(explain(P.hasRelationship("owner")));
    const bounded = asRequirement(explain(P.hasRelationship("owner", { depth: 1 })));
    assert.strictEqual(unbounded.detail, "the subject is owner of the resource");
    assert.strictEqual(
      bounded.detail,
      "the subject is owner of the resource within a traversal depth of 1",
    );
    assert.notStrictEqual(unbounded.detail, bounded.detail);
  });

  it("distinguishes two HasRelationship policies differing only in depth (INV-QD-031)", () => {
    const shallow = renderExplanation(explain(P.hasRelationship("owner", { depth: 1 })));
    const deep = renderExplanation(explain(P.hasRelationship("owner", { depth: 5 })));
    assert.notStrictEqual(shallow, deep);
  });

  it("gives HasAction the exact kind and detail sentence", () => {
    const requirement = asRequirement(explain(P.hasAction("read")));
    assert.strictEqual(requirement.kind, "action");
    assert.strictEqual(requirement.detail, "read");
  });

  it("gives HasActed the exact kind and detail sentence", () => {
    const requirement = asRequirement(explain(P.hasActed("raised")));
    assert.strictEqual(requirement.kind, "history");
    assert.strictEqual(requirement.detail, "the subject has raised this resource");
  });

  it("gives HasNotActed the exact kind and detail sentence", () => {
    const requirement = asRequirement(explain(P.hasNotActed("approved")));
    assert.strictEqual(requirement.kind, "history");
    assert.strictEqual(requirement.detail, "the subject has not approved this resource");
  });

  it("gives HasCustom the exact kind and detail sentence, naming the check and nothing more", () => {
    // Opaque by design (ADR-QD-055): the detail names the registered check and
    // stops there — it never tries to render `params` as if it explained the
    // decision, since `explain` cannot see inside the registered function.
    const requirement = asRequirement(explain(P.hasCustom("isOwner", { threshold: 5 })));
    assert.strictEqual(requirement.kind, "custom");
    assert.strictEqual(requirement.detail, "custom predicate 'isOwner'");
  });

  it("gives HasSignature the exact kind and detail sentence, decomposed unlike HasCustom", () => {
    const requirement = asRequirement(explain(P.hasSignature("approved")));
    assert.strictEqual(requirement.kind, "signature");
    assert.strictEqual(
      requirement.detail,
      "the subject has a signature meaning 'approved' for this resource",
    );
  });

  it("HasSignature's detail names the signer role and the 'Any' scope when given", () => {
    const requirement = asRequirement(
      explain(P.hasSignature("approved", { signerRole: "manager", scope: "Any" })),
    );
    assert.strictEqual(
      requirement.detail,
      "the subject has a signature meaning 'approved' from a 'manager' for anything",
    );
  });

  it("joins a non-empty anyOf's parts with \" or \", unlike a single-part one", () => {
    // A mutant that treats every `anyOf` as zero-part would render "never
    // allows" here instead; a mutant that blanks the " or " join text would
    // glue the two parts together with nothing between them.
    const multiPart = renderExplanation(explain(P.anyOf([P.hasRole("a"), P.hasRole("b")])));
    assert.strictEqual(multiPart, "either requires role `a` or requires role `b`");
    assert.include(multiPart, " or ");

    const singlePart = renderExplanation(explain(P.anyOf([P.hasRole("a")])));
    assert.strictEqual(singlePart, "either requires role `a`");
    assert.notInclude(singlePart, " or ");
  });

  it("mentions a non-default fieldStrategy, since it is load-bearing (INV-QD-031)", () => {
    // The defect this pins: `allOf`/`anyOf` carry a `fieldStrategy` that
    // changes which fields a multi-part composite discloses, and the old
    // rendering never mentioned it at all — two policies differing only in
    // this field rendered to the same sentence. The default (`Intersection`
    // for `allOf`, `First` for `anyOf`) needs no mention, since that is what
    // a bare "and"/"either…or" has always meant; only a departure from it is
    // a real difference to report.
    const parts = [P.hasRole("a"), P.hasRole("b")];

    assert.strictEqual(
      renderExplanation(explain(P.allOf(parts))),
      "requires role `a` and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf(parts, { fieldStrategy: "Intersection" }))),
      "requires role `a` and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf(parts, { fieldStrategy: "Union" }))),
      "requires role `a` and requires role `b`, combining every part's granted fields",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf(parts, { fieldStrategy: "First" }))),
      "requires role `a` and requires role `b`, keeping the first allowing part's fields",
    );

    assert.strictEqual(
      renderExplanation(explain(P.anyOf(parts))),
      "either requires role `a` or requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.anyOf(parts, { fieldStrategy: "First" }))),
      "either requires role `a` or requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.anyOf(parts, { fieldStrategy: "Union" }))),
      "either requires role `a` or requires role `b`, combining every part's granted fields",
    );
    assert.strictEqual(
      renderExplanation(explain(P.anyOf(parts, { fieldStrategy: "Intersection" }))),
      "either requires role `a` or requires role `b`, keeping only fields every part grants",
    );

    // Two policies differing only in fieldStrategy — the exact ambiguity
    // INV-QD-031 forbids — must no longer render identically.
    assert.notStrictEqual(
      renderExplanation(explain(P.allOf(parts, { fieldStrategy: "Union" }))),
      renderExplanation(explain(P.allOf(parts, { fieldStrategy: "Intersection" }))),
    );
  });

  it("never mentions fieldStrategy for a single-part composite, since no strategy can differ there", () => {
    // `FieldLattice.ts`'s `mergeFields` proves any strategy over zero or one field
    // set is the same result — `Intersection`/`Union`/`First` all reduce to
    // that lone set — so a single-part composite's strategy is not a real
    // difference for the rendering to report, whatever value it carries.
    const one = [P.hasRole("a")];
    for (const fieldStrategy of ["Intersection", "Union", "First"] as const) {
      assert.strictEqual(
        renderExplanation(explain(P.allOf(one, { fieldStrategy }))),
        "requires role `a`",
      );
      assert.strictEqual(
        renderExplanation(explain(P.anyOf(one, { fieldStrategy }))),
        "either requires role `a`",
      );
    }
  });

  it("A RENDERING DENOTES EXACTLY ONE POLICY", () => {
    // The defect this replaced. `a or (b and c)` and `(a or b) and c` are not
    // the same policy — the first admits a lone `a` — and they rendered to a
    // byte-identical sentence, because nothing parenthesised a composite child.
    // Prose a reviewer cannot map back to a policy is worse than no prose.
    const admin = P.hasRole("admin");
    const both = P.allOf([P.hasRole("editor"), P.hasRole("onCall")]);
    const a = renderExplanation(explain(P.anyOf([admin, both])));
    const b = renderExplanation(
      explain(P.allOf([P.anyOf([admin, P.hasRole("editor")]), P.hasRole("onCall")])),
    );

    assert.strictEqual(
      a,
      "either requires role `admin` or (requires role `editor` and requires role `onCall`)",
    );
    assert.strictEqual(
      b,
      "(either requires role `admin` or requires role `editor`) and requires role `onCall`",
    );
    assert.notStrictEqual(a, b);
  });

  it("parenthesises a composite in every position that embeds one", () => {
    // One case per call site of `embed`. A site that reverted to `go` would
    // reintroduce the ambiguity only for its own shape, which no single
    // end-to-end assertion would catch.
    const both = P.allOf([P.hasRole("a"), P.hasRole("b")]);

    assert.strictEqual(
      renderExplanation(explain(P.not(both))),
      "does not hold that (requires role `a` and requires role `b`)",
    );
    assert.strictEqual(
      renderExplanation(explain(P.labeled("pair", both))),
      "(requires role `a` and requires role `b`) (`pair`)",
    );
    assert.strictEqual(
      renderExplanation(explain(P.obliged(obligation("audit.log"), both))),
      "(requires role `a` and requires role `b`), and owes `audit.log`",
    );
    assert.include(
      renderExplanation(explain(P.rules([P.permitWhen(both)]))),
      "[0] permit when (requires role `a` and requires role `b`)",
    );
    assert.strictEqual(
      renderExplanation(explain(P.anyOf([both, P.hasRole("c")]))),
      "either (requires role `a` and requires role `b`) or requires role `c`",
    );
  });

  it("treats every non-atomic node as non-atomic WHEN IT IS THE CHILD", () => {
    // The mirror of the test above, and the one it does not imply. That one
    // embeds a composite inside `Negated`/`Named`/`Owing`/`Table` and so
    // exercises those nodes' *use* of `embed`; this one embeds each of them as
    // a child, which is the only thing that consults `isAtomic` about them.
    // Mutation caught the gap: `Negated: () => true` survived the whole suite.
    const b = P.hasRole("b");

    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.not(P.hasRole("a")), b]))),
      "(does not hold that requires role `a`) and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.labeled("l", P.hasRole("a")), b]))),
      "(requires role `a` (`l`)) and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.obliged(obligation("o"), P.hasRole("a")), b]))),
      "(requires role `a`, and owes `o`) and requires role `b`",
    );
    // A NON-EMPTY table, unlike the empty one below: an empty table renders a
    // fixed sentence and is atomic, a populated one spans clauses and is not.
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.rules([P.permitWhen(P.hasRole("a"))]), b]))),
      "(a rule table where the first row that applies decides: " +
        "[0] permit when requires role `a`) and requires role `b`",
    );
  });

  it("LEAVES ATOMS BARE, so ordinary policies read as they always did", () => {
    // The other direction, and the one that keeps this from being a
    // readability regression. A requirement needs no parentheses, and neither
    // does an empty composite — those render fixed sentences that no following
    // word can attach to. A mutant calling `isAtomic` always-false would wrap
    // every one of these.
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.hasRole("a"), P.hasRole("b")]))),
      "requires role `a` and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.allOf([]), P.hasRole("b")]))),
      "always allows (an empty conjunction) and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.anyOf([]), P.hasRole("b")]))),
      "never allows (an empty disjunction) and requires role `b`",
    );
    assert.strictEqual(
      renderExplanation(explain(P.allOf([P.rules([]), P.hasRole("b")]))),
      "never allows (an empty rule table) and requires role `b`",
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
      [P.hasAttribute("a", M.everyMatch(M.exists())), "has every entry that is present"],
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
      FastCheck.constant(P.hasCustom("isOwner")),
      FastCheck.constant(P.hasSignature("approved")),
    );

    const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
      node: FastCheck.oneof(
        { maxDepth: 4, withCrossShrink: true },
        leaf,
        FastCheck.array(tie("node"), { maxLength: 3 }).map((ps) => P.allOf(ps)),
        FastCheck.array(tie("node"), { maxLength: 3 }).map((ps) => P.anyOf(ps)),
        tie("node").map(P.not),
        tie("node").map((p) => P.labeled("l", p)),
        tie("node").map((p) => P.obliged(obligation("audit.log"), p)),
        FastCheck.array(
          FastCheck.tuple(tie("node"), FastCheck.boolean()).map(([c, permits]) =>
            permits ? P.permitWhen(c) : P.denyWhen(c),
          ),
          { maxLength: 3 },
        ).map((rs) => P.rules(rs)),
      ),
    })).node;

    for (const policy of FastCheck.sample(tree, { numRuns: 200, seed: 1027 })) {
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

  it(
    "a deep, programmatically-built tree (100k nested Not) does not overflow the call " +
      "stack (RP-01)",
    () => {
      // The same hazard `policyDepth`/`simplify` were fixed for
      // (RolesAndDepth.test.ts, Simplify.test.ts's matching regression
      // tests): nothing bounds recursion depth for a policy assembled
      // directly rather than decoded from JSON, and `explain` is reachable
      // directly on a caller-held `Policy` with no prior decode step at all.
      // `explain` now walks an explicit array-backed stack (via `Policy.ts`'s
      // `childrenOf`) instead of native recursion, so this must both return
      // without throwing and produce the correctly-nested `Negated` chain.
      const n = 100_000;
      let policy: P.Policy = P.hasRole("a");
      for (let i = 0; i < n; i += 1) policy = P.not(policy);

      let result: ReturnType<typeof explain> | undefined;
      assert.doesNotThrow(() => {
        result = explain(policy);
      });
      assert.isDefined(result);
      if (result === undefined) return;

      let depth = 0;
      let node = result;
      while (node._tag === "Negated") {
        depth += 1;
        node = node.part;
      }
      assert.strictEqual(depth, n);
      assert.strictEqual(node._tag, "Requirement");
    },
    60_000,
  );

  it("renderExplanation survives a 100k-deep Negated chain (ARCH-02 N1)", () => {
    // `explain` was stack-safe and its renderer was not: this overflowed at
    // about 734 levels, well below what `explain` itself handles.
    const n = 100_000;
    const leaf = renderExplanation(explain(P.hasRole("a")));
    const text = renderExplanation(explain(chain(P.not, n, P.hasRole("a"))));
    const prefix = "does not hold that ";
    assert.isTrue(text.startsWith(`${prefix}(`));
    // n prefixes, the leaf, and a parenthesis pair around each of the n - 1
    // inner Negated nodes (the leaf is atomic and so unwrapped).
    assert.strictEqual(text.length, prefix.length * n + leaf.length + 2 * (n - 1));
    assert.isTrue(text.endsWith(`${leaf}${")".repeat(n - 1)}`));
  }, 60_000);

  it("renderExplanation renders a 250k-wide anyOf with every separator", () => {
    const children: ReadonlyArray<P.Policy> = Array.from({ length: 250_000 }, () =>
      P.hasRole("a"),
    );
    const text = renderExplanation(explain(P.anyOf(children)));
    assert.strictEqual(text.split(" or ").length, 250_000);
  }, 60_000);

  it("foldExplanation folds children in order, once per shared node", () => {
    const shared = explain(P.hasRole("s"));
    const tree = explain(P.allOf([P.hasRole("a"), P.hasRole("b")]));
    const seen = foldExplanation<string>(tree, (node, children) =>
      node._tag === "Requirement" ? node.detail : `[${children.join(",")}]`,
    );
    assert.strictEqual(seen, "[a,b]");
    let combines = 0;
    foldExplanation<number>({ _tag: "All", parts: [shared, shared], fieldStrategy: "Intersection" }, () => {
      combines += 1;
      return 0;
    });
    assert.strictEqual(combines, 2);
  });

  it("a child shared by identity is explained once, and both parts are the same object", () => {
    const shared = P.labeled("shared", P.not(P.hasRole("editor")));
    const e = explain(P.allOf([shared, shared]));
    assert.strictEqual(e._tag, "All");
    if (e._tag !== "All") return;
    assert.strictEqual(e.parts[0], e.parts[1]);
  });

  it("explain over a 100k-deep matcher completes (ARCH-02 N2)", () => {
    const e = explain(P.hasAttribute("x", chain(M.size, 100_000, M.eq(M.literal(1)))));
    assert.strictEqual(e._tag, "Requirement");
    if (e._tag !== "Requirement") return;
    assert.isTrue(e.detail.startsWith("the subject's x has a size that has a size that"));
    assert.isTrue(e.detail.endsWith("equals 1"));
  }, 60_000);

  it("a wide, programmatically-built node (250k direct children) explains without spreading", () => {
    // The width twin of the 100k-deep test above (`Simplify.test.ts` and
    // `RolesAndDepth.test.ts` already carry theirs): a fold that spread a
    // node's children into an argument list would throw a raw `RangeError`
    // well before this.
    const children: ReadonlyArray<P.Policy> = Array.from({ length: 250_000 }, () =>
      P.hasRole("a"),
    );
    const result = explain(P.anyOf(children));
    assert.strictEqual(result._tag, "Any");
    if (result._tag !== "Any") return;
    assert.strictEqual(result.parts.length, 250_000);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// A `fieldStrategy` or `combining` outside its closed union (ADR-QD-092
// amendment, CCR-QD-183)
// ---------------------------------------------------------------------------

describe("a fieldStrategy or combining value outside its closed union (ADR-QD-092, CCR-QD-183)", () => {
  /**
   * Built in process via `JSON.parse` (no `as`, AGENTS.md §6) — decode rejects
   * every one, so only a policy assembled in code can carry them. Four
   * classes: an unknown string, the keys `Object.prototype` supplies (which a
   * bare table lookup reads as an inherited member), the empty string, and a
   * value that is not a string at all (an untyped JavaScript caller).
   */
  const RAW: ReadonlyArray<string> = [
    "Xor",
    "toString",
    "constructor",
    "__proto__",
    "hasOwnProperty",
    "",
  ];
  const strategyOf = (raw: string): P.FieldStrategy => JSON.parse(JSON.stringify(raw));
  const combiningOf = (raw: string): P.Combining => JSON.parse(JSON.stringify(raw));
  /**
   * JSON in, what the sentence shows out. (`null` cannot be carried: the smart
   * constructors read it as absent.)
   */
  const NON_STRING: ReadonlyArray<readonly [string, string]> = [
    ["42", "42"],
    ["true", "true"],
    ["{}", "an object"],
  ];

  const a = P.hasRole("editor", { fields: ["a"] });
  const b = P.hasRole("admin", { fields: ["b"] });
  const A = "requires role `editor`, exposing only `a`";
  const B = "requires role `admin`, exposing only `b`";
  /** What the evaluator does with such a strategy (`FieldLattice.ts`'s fail-closed row), in words. */
  const noFields = (shown: string) =>
    `, but exposing no fields: its field strategy ${shown} is outside the closed union ` +
    `and is evaluated fail-closed`;

  const render = (policy: P.Policy) => renderExplanation(explain(policy));

  it("an allOf or anyOf of two parts renders the value verbatim instead of throwing", () => {
    for (const raw of RAW) {
      const s = strategyOf(raw);
      const shown = JSON.stringify(raw);
      assert.strictEqual(
        render(P.allOf([a, b], { fieldStrategy: s })),
        `${A} and ${B}${noFields(shown)}`,
        raw,
      );
      assert.strictEqual(
        render(P.anyOf([a, b], { fieldStrategy: s })),
        `either ${A} or ${B}${noFields(shown)}`,
        raw,
      );
    }
  });

  it("a value that is not a string at all renders as itself, unquoted", () => {
    for (const [json, shown] of NON_STRING) {
      const s: P.FieldStrategy = JSON.parse(json);
      const c: P.Combining = JSON.parse(json);
      assert.strictEqual(
        render(P.allOf([a, b], { fieldStrategy: s })),
        `${A} and ${B}${noFields(shown)}`,
      );
      assert.include(
        render(P.rules([P.permitWhen(a)], { combining: c })),
        `the combining algorithm ${shown} is outside the closed union`,
      );
    }
  });

  it("a null carried by a hand-built explanation is shown as null, not as an object", () => {
    // The smart constructors read `null` as absent, but `renderExplanation`
    // takes any `Explanation`, and a caller may build one by hand.
    const strategy: P.FieldStrategy = JSON.parse("null");
    assert.strictEqual(
      renderExplanation({ _tag: "All", parts: [], fieldStrategy: strategy }),
      `always allows (an empty conjunction)${noFields("null")}`,
    );
  });

  it("a one-part composite still says so: under such a value one part is not itself", () => {
    // A known strategy's single-part composite needs no clause: merging one
    // field set discloses exactly it (`singletonIsIdentity`). An unknown one
    // merges to `[]`, so leaving it out would render `exposing only \`a\`` for
    // a policy that exposes nothing — overstating the grant (BEH-QD-139).
    for (const raw of RAW) {
      const s = strategyOf(raw);
      const shown = JSON.stringify(raw);
      assert.strictEqual(render(P.allOf([a], { fieldStrategy: s })), `${A}${noFields(shown)}`, raw);
      assert.strictEqual(
        render(P.anyOf([a], { fieldStrategy: s })),
        `either ${A}${noFields(shown)}`,
        raw,
      );
    }
  });

  it("an empty allOf says it allows and exposes nothing, and is parenthesised as a child", () => {
    for (const raw of RAW) {
      const empty = P.allOf([], { fieldStrategy: strategyOf(raw) });
      const own = `always allows (an empty conjunction)${noFields(JSON.stringify(raw))}`;
      assert.strictEqual(render(empty), own, raw);
      // No longer a fixed sentence with no loose end, so not atomic (INV-QD-031).
      assert.strictEqual(render(P.anyOf([empty, b])), `either (${own}) or ${B}`, raw);
    }
  });

  it("an empty anyOf denies whatever its strategy, so its sentence is unchanged", () => {
    for (const raw of RAW) {
      assert.strictEqual(
        render(P.anyOf([], { fieldStrategy: strategyOf(raw) })),
        "never allows (an empty disjunction)",
        raw,
      );
    }
  });

  it("a rule table names the value verbatim and the algorithm it is walked under", () => {
    for (const raw of RAW) {
      const c = combiningOf(raw);
      assert.strictEqual(
        render(P.rules([P.permitWhen(a), P.denyWhen(b)], { combining: c })),
        `a rule table where the combining algorithm ${JSON.stringify(raw)} is outside the closed ` +
          `union and is evaluated under DenyOverrides, so any applying deny row wins: ` +
          `[0] permit when ${A}; [1] deny when ${B}`,
        raw,
      );
      assert.strictEqual(
        render(P.rules([], { combining: c })),
        "never allows (an empty rule table)",
        raw,
      );
    }
  });

  it("the sentence says what the evaluator decides: no fields, and DenyOverrides", () =>
    Effect.runPromise(
      Effect.gen(function* () {
        // The rendering is only honest if it agrees with `evaluate` — so the
        // claim each sentence above makes is checked against a real decision.
        const layer = testLayer(subjectWith({ id: "u1", roles: ["editor", "admin"] }));
        const run = (policy: P.Policy) => evaluate(policy).pipe(Effect.provide(layer));
        const rows = [P.permitWhen(a), P.denyWhen(b)];
        const reference = yield* run(P.rules(rows, { combining: "DenyOverrides" }));
        for (const raw of RAW) {
          const s = strategyOf(raw);
          for (const policy of [
            P.allOf([], { fieldStrategy: s }),
            P.allOf([a], { fieldStrategy: s }),
            P.allOf([a, b], { fieldStrategy: s }),
            P.anyOf([a], { fieldStrategy: s }),
            P.anyOf([a, b], { fieldStrategy: s }),
          ]) {
            const d = yield* run(policy);
            assert.isTrue(isAllowed(d), raw);
            if (isAllowed(d)) assert.deepStrictEqual(d.visibleFields, [], raw);
          }
          assert.isFalse(isAllowed(yield* run(P.anyOf([], { fieldStrategy: s }))), raw);
          const table = yield* run(P.rules(rows, { combining: combiningOf(raw) }));
          assert.strictEqual(isAllowed(table), isAllowed(reference), raw);
        }
      }),
    ));
});
