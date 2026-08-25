/**
 * JOB 4 ledger — the strengthening half.
 *
 * Two properties, and the second is the one worth the module. First, the
 * candidates are exactly the requirements the policy names, once each, minus
 * the ones already met. Second — and this is where a wrong answer is worse than
 * no answer — **a synthesised value must actually satisfy the matcher it came
 * from**. So every witness here is checked against `evaluateMatcher`, the same
 * function the evaluator runs, rather than against this file's idea of what the
 * matcher means.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  allOf,
  anyOf,
  contains,
  denyWhen,
  dominates,
  eq,
  everyMatch,
  exists,
  evaluateMatcher,
  fieldMatch,
  gte,
  hasActed,
  hasAction,
  hasAttribute,
  hasCustom,
  hasNotActed,
  hasPermission,
  hasRelationship,
  hasResourceAttribute,
  hasRole,
  inArray,
  labeled,
  literal,
  lt,
  makeSubjectId,
  neq,
  not,
  obligation,
  obliged,
  permission,
  permitWhen,
  resource,
  rules,
  size,
  someMatch,
  subject,
  subjectId,
} from "@qadi/core";
import type { Matcher, MatcherContext } from "@qadi/core";
import { remedyEdits, satisfyingValue } from "../../src/index.ts";
import type { SimulationInput } from "../../src/index.ts";

const alice: SimulationInput = {
  subject: { id: "alice", attributes: { dept: "legal", tier: 3 } },
  action: "read",
  resource: { id: "doc-1", owner: "alice" },
};

const labels = (policy: Parameters<typeof remedyEdits>[0], input = alice) =>
  remedyEdits(policy, input).edits.map((e) => e.label);

/**
 * The evaluator's own view of `alice`, so a witness can be checked against
 * `evaluateMatcher` rather than against an assertion that restates the matcher.
 */
const context: MatcherContext = {
  subject: alice.subject.attributes ?? {},
  subjectId: makeSubjectId(alice.subject.id),
  resource: alice.resource,
  action: alice.action,
};

/** Asserts the synthesised value is one the evaluator would accept. */
const witnesses = (matcher: Matcher) => {
  const found = satisfyingValue(matcher, alice);
  if (found._tag !== "Value") throw new Error(`unsynthesisable: ${found.reason}`);
  assert.isTrue(
    evaluateMatcher(matcher, found.value, context),
    `synthesised ${JSON.stringify(found.value)} does not satisfy the matcher`,
  );
  return found.value;
};

const declines = (matcher: Matcher): string => {
  const found = satisfyingValue(matcher, alice);
  if (found._tag !== "Unsynthesisable") {
    throw new Error(`expected no witness, got ${JSON.stringify(found.value)}`);
  }
  return found.reason;
};

describe("satisfyingValue — every witness satisfies its own matcher", () => {
  it("reads a literal comparison straight back", () => {
    assert.strictEqual(witnesses(eq(literal("legal"))), "legal");
  });

  it("passes an object literal through by reference, because Eq compares with ===", () => {
    const value = { nested: true };

    assert.strictEqual(witnesses(eq(literal(value))), value);
  });

  it("resolves the three references the input can answer", () => {
    assert.strictEqual(witnesses(eq(subjectId())), "alice");
    assert.strictEqual(witnesses(eq(subject("dept"))), "legal");
    assert.strictEqual(witnesses(eq(resource("owner"))), "alice");
  });

  it("resolves the action when the check names one", () => {
    assert.strictEqual(witnesses(eq({ _tag: "ActionRef" })), "read");
  });

  it("declines when the check names no action", () => {
    const found = satisfyingValue(eq({ _tag: "ActionRef" }), { subject: { id: "alice" } });

    assert.deepStrictEqual(found, {
      _tag: "Unsynthesisable",
      reason: "the check names no action",
    });
  });

  it("declines a reference to a path nothing holds", () => {
    assert.strictEqual(declines(eq(subject("absent"))), "nothing at subject path absent");
    assert.strictEqual(declines(eq(resource("absent"))), "nothing at resource path absent");
  });

  it("walks a dot-path", () => {
    const nested: SimulationInput = {
      subject: { id: "alice", attributes: { profile: { region: "eu" } } },
    };
    const found = satisfyingValue(eq(subject("profile.region")), nested);

    assert.deepStrictEqual(found, { _tag: "Value", value: "eu" });
  });

  it("produces a distinct value for Neq", () => {
    assert.strictEqual(witnesses(neq(literal("legal"))), null);
    // `null` would not be distinct from `null`, so the fallback has to differ.
    assert.strictEqual(witnesses(neq(literal(null))), false);
  });

  it("declines Neq when the reference itself cannot be resolved", () => {
    assert.strictEqual(declines(neq(subject("absent"))), "nothing at subject path absent");
  });

  it("answers Dominates with the label itself, which dominates itself", () => {
    const label = { level: 3, compartments: ["fin"] };

    assert.strictEqual(witnesses(dominates(literal(label))), label);
  });

  it("declines Dominates against something that is not a label", () => {
    assert.strictEqual(
      declines(dominates(literal("secret"))),
      "`dominates` compares security labels and this reference is not one",
    );
  });

  it("takes the first member of an In", () => {
    assert.strictEqual(witnesses(inArray(["legal", "ops"])), "legal");
  });

  it("declines an empty In, which accepts nothing at all", () => {
    assert.strictEqual(declines(inArray([])), "an empty `in` accepts nothing");
  });

  it("answers Exists with a value that is neither undefined nor null", () => {
    assert.strictEqual(witnesses(exists()), true);
  });

  it("answers Gte with the bound and Lt with one below it", () => {
    assert.strictEqual(witnesses(gte(5)), 5);
    assert.strictEqual(witnesses(lt(5)), 4);
  });

  it("wraps a Contains needle in an array", () => {
    assert.deepStrictEqual(witnesses(contains("fin")), ["fin"]);
  });

  it("puts a FieldMatch witness under its field", () => {
    assert.deepStrictEqual(witnesses(fieldMatch("region", eq(literal("eu")))), { region: "eu" });
  });

  it("wraps SomeMatch and EveryMatch in a one-element array", () => {
    assert.deepStrictEqual(witnesses(someMatch(gte(5))), [5]);
    assert.deepStrictEqual(witnesses(everyMatch(gte(5))), [5]);
  });

  it("builds an array of the length a Size demands", () => {
    assert.deepStrictEqual(witnesses(size(gte(2))), [null, null]);
    assert.deepStrictEqual(witnesses(size(eq(literal(0)))), []);
  });

  it("declines a size that is not a number at all, and says which problem it is", () => {
    // A different sentence from the one below, because it is a different fault:
    // this policy can never match anything, that one merely asks for more than
    // a panel should allocate.
    assert.strictEqual(declines(size(eq(literal("two")))), "a size is a number, and two is not");
  });

  it("declines a length no array can have", () => {
    assert.strictEqual(declines(size(lt(0))), "no array of length -1 can be built");
    assert.strictEqual(declines(size(gte(2.5))), "no array of length 2.5 can be built");
  });

  it("builds up to the cap and declines one past it", () => {
    const built = witnesses(size(gte(64)));
    assert.isTrue(Array.isArray(built));
    assert.strictEqual(Array.isArray(built) ? built.length : -1, 64);
    assert.strictEqual(declines(size(gte(65))), "no array of length 65 can be built");
  });

  it("propagates an inner refusal outward rather than inventing a shell", () => {
    assert.strictEqual(declines(someMatch(inArray([]))), "an empty `in` accepts nothing");
    assert.strictEqual(declines(fieldMatch("x", inArray([]))), "an empty `in` accepts nothing");
    assert.strictEqual(declines(everyMatch(inArray([]))), "an empty `in` accepts nothing");
  });

  it("nests to arbitrary depth", () => {
    assert.deepStrictEqual(witnesses(someMatch(fieldMatch("tag", eq(literal("x"))))), [
      { tag: "x" },
    ]);
  });
});

describe("remedyEdits — what the policy asks for", () => {
  it("offers a role the subject lacks and stays silent about one they hold", () => {
    assert.deepStrictEqual(labels(hasRole("editor")), ["with role editor"]);
    assert.deepStrictEqual(
      labels(hasRole("editor"), { subject: { id: "alice", roles: ["auditor", "editor"] } }),
      [],
    );
    // Holding *a* role is not holding *this* role.
    assert.deepStrictEqual(
      labels(hasRole("editor"), { subject: { id: "alice", roles: ["auditor"] } }),
      ["with role editor"],
    );
  });

  /**
   * The kind and direction are public API: the panel groups the strengthenings
   * apart from the weakenings, and that grouping is the whole reason a reviewer
   * holding a denial can find the rows that answer them.
   */
  it("tags every remedy as a strengthening, by kind", () => {
    const sweep = remedyEdits(
      allOf([
        hasRole("editor"),
        hasPermission(permission("doc", "write")),
        hasAction("write"),
        hasAttribute("clearance", gte(5)),
        hasResourceAttribute("sensitivity", exists()),
        hasRelationship("owner"),
        hasActed("raised"),
      ]),
      alice,
    );

    assert.deepStrictEqual(sweep.edits.map((e) => e.kind), [
      "GrantRole",
      "GrantPermission",
      "SetAction",
      "SetSubjectAttribute",
      "SetResourceAttribute",
      "AddRelationship",
      "AddEvent",
    ]);
    assert.isTrue(sweep.edits.every((e) => e.direction === "Strengthen"));
  });

  it("offers a permission by the key the evaluator looks up", () => {
    assert.deepStrictEqual(labels(hasPermission(permission("doc", "read"))), [
      "with permission doc:read",
    ]);
    // Two held keys, one of them the one asked for: `some` and `every` differ
    // only on a list where the match is not universal, so a one-element fixture
    // cannot tell the two apart.
    assert.deepStrictEqual(
      labels(hasPermission(permission("doc", "read")), {
        subject: { id: "alice", permissions: ["doc:write", "doc:read"] },
      }),
      [],
    );
    // Holding a neighbouring key is not holding this one.
    assert.deepStrictEqual(
      labels(hasPermission(permission("doc", "read")), {
        subject: { id: "alice", permissions: ["doc:write"] },
      }),
      ["with permission doc:read"],
    );
  });

  it("offers the action the check is missing", () => {
    assert.deepStrictEqual(labels(hasAction("write")), ["with action write"]);
    assert.deepStrictEqual(labels(hasAction("read")), []);
  });

  it("offers an attribute value read out of the matcher", () => {
    assert.deepStrictEqual(labels(hasAttribute("clearance", gte(5))), [
      "with subject attribute clearance = 5",
    ]);
  });

  /**
   * An attribute already present but wrong is exactly the case worth a row, so
   * there is no set-membership shortcut here as there is for roles. The row may
   * turn out to change nothing, and that is a finding: the attribute was never
   * the problem.
   */
  it("offers an attribute row even when the key is already set", () => {
    assert.deepStrictEqual(labels(hasAttribute("tier", gte(5))), [
      "with subject attribute tier = 5",
    ]);
  });

  it("offers a resource attribute, and applies it to the resource", () => {
    const sweep = remedyEdits(hasResourceAttribute("sensitivity", eq(literal("low"))), alice);
    const [edit] = sweep.edits;
    if (edit === undefined) throw new Error("expected a remedy");

    assert.strictEqual(edit.label, "with resource attribute sensitivity = low");
    assert.deepStrictEqual(edit.apply(alice).resource, {
      id: "doc-1",
      owner: "alice",
      sensitivity: "low",
    });
  });

  it("offers an edge and an event, keyed to the resource in the check", () => {
    assert.deepStrictEqual(labels(hasRelationship("owner")), [
      "with relationship owner on doc-1",
    ]);
    assert.deepStrictEqual(labels(hasActed("raised")), ["with event raised on doc-1"]);
  });

  it("stays silent about an edge or event the fixtures already list", () => {
    // Two of each again, and only the second matches — see the permission case.
    const held: SimulationInput = {
      ...alice,
      relationships: [
        { subjectId: "alice", relation: "viewer", resourceId: "doc-9" },
        { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
      ],
      history: [
        { subjectId: "alice", event: "closed", resourceId: "doc-9" },
        { subjectId: "alice", event: "raised", resourceId: "doc-1" },
      ],
    };

    assert.deepStrictEqual(labels(hasRelationship("owner"), held), []);
    assert.deepStrictEqual(labels(hasActed("raised"), held), []);
  });

  it("offers an edge or event when the fixtures list a different one", () => {
    const other: SimulationInput = {
      ...alice,
      relationships: [{ subjectId: "alice", relation: "viewer", resourceId: "doc-1" }],
      history: [{ subjectId: "alice", event: "closed", resourceId: "doc-1" }],
    };

    assert.deepStrictEqual(labels(hasRelationship("owner"), other), [
      "with relationship owner on doc-1",
    ]);
    assert.deepStrictEqual(labels(hasActed("raised"), other), ["with event raised on doc-1"]);
  });

  /**
   * Every remedy's `apply`, not merely its label. A row that reads right and
   * edits the wrong field is worse than a missing row: the reviewer acts on a
   * verdict that came from a different question than the one they were shown.
   */
  it("applies each kind of remedy to the field it names", () => {
    const one = (policy: Parameters<typeof remedyEdits>[0]) => {
      const [edit] = remedyEdits(policy, alice).edits;
      if (edit === undefined) throw new Error("expected a remedy");
      return edit.apply(alice);
    };

    assert.deepStrictEqual(one(hasRole("editor")).subject.roles, ["editor"]);
    assert.deepStrictEqual(one(hasPermission(permission("doc", "read"))).subject.permissions, [
      "doc:read",
    ]);
    assert.strictEqual(one(hasAction("write")).action, "write");
    assert.deepStrictEqual(one(hasAttribute("clearance", gte(5))).subject.attributes, {
      dept: "legal",
      tier: 3,
      clearance: 5,
    });
    assert.deepStrictEqual(one(hasRelationship("owner")).relationships, [
      { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
    ]);
    assert.deepStrictEqual(one(hasActed("raised")).history, [
      { subjectId: "alice", event: "raised", resourceId: "doc-1" },
    ]);
  });

  it("applies a grant on top of what is already there", () => {
    const sweep = remedyEdits(allOf([hasRole("editor"), hasRelationship("owner")]), {
      ...alice,
      subject: { ...alice.subject, roles: ["auditor"] },
      relationships: [{ subjectId: "alice", relation: "viewer", resourceId: "doc-2" }],
    });
    const applied = sweep.edits.reduce((input, edit) => edit.apply(input), alice);

    assert.deepStrictEqual(applied.subject.roles, ["editor"]);
    assert.deepStrictEqual(applied.relationships, [
      { subjectId: "alice", relation: "owner", resourceId: "doc-1" },
    ]);
  });

  it("appends an event to a history that already has one", () => {
    const other = { subjectId: "alice", event: "closed", resourceId: "doc-9" };
    const [edit] = remedyEdits(hasActed("raised"), { ...alice, history: [other] }).edits;
    if (edit === undefined) throw new Error("expected a remedy");

    assert.deepStrictEqual(edit.apply({ ...alice, history: [other] }).history, [
      other,
      { subjectId: "alice", event: "raised", resourceId: "doc-1" },
    ]);
  });
});

describe("remedyEdits — walking the tree", () => {
  it("descends into every combinator", () => {
    assert.deepStrictEqual(
      labels(
        allOf([
          hasRole("a"),
          anyOf([hasRole("b"), labeled("named", hasRole("c"))]),
          obliged(obligation("audit"), hasRole("d")),
          rules([permitWhen(hasRole("e")), denyWhen(hasRole("f"))], { combining: "DenyOverrides" }),
        ]),
      ),
      ["with role a", "with role b", "with role c", "with role d", "with role e", "with role f"],
    );
  });

  /**
   * Satisfying a requirement under a negation makes the enclosing node *deny*,
   * so a remedy there would be an anti-remedy — and the table is read for
   * exactly the opposite. The removals that do help are already offered by
   * `singleEdits`, so declining to descend loses nothing.
   */
  it("does not descend into Not", () => {
    assert.deepStrictEqual(labels(not(hasRole("banned"))), []);
    assert.deepStrictEqual(labels(allOf([hasRole("editor"), not(hasRole("banned"))])), [
      "with role editor",
    ]);
  });

  it("proposes nothing for hasNotActed, whose remedy is a removal", () => {
    assert.deepStrictEqual(labels(hasNotActed("closed")), []);
  });

  it("proposes nothing for hasCustom — there is no matcher to read a witness from", () => {
    assert.deepStrictEqual(labels(hasCustom("isOwner")), []);
    assert.deepStrictEqual(labels(allOf([hasRole("editor"), hasCustom("isOwner")])), [
      "with role editor",
    ]);
  });

  it("collapses two nodes asking for the same thing into one row", () => {
    assert.deepStrictEqual(labels(allOf([hasRole("editor"), hasRole("editor")])), [
      "with role editor",
    ]);
  });

  it("keeps two attribute rows apart when they differ in value", () => {
    assert.deepStrictEqual(
      labels(allOf([hasAttribute("tier", gte(5)), hasAttribute("tier", gte(9))])),
      ["with subject attribute tier = 5", "with subject attribute tier = 9"],
    );
  });
});

describe("remedyEdits — what it could not build, and why", () => {
  it("names a requirement it declined, rather than dropping it", () => {
    assert.deepStrictEqual(remedyEdits(hasAttribute("dept", neq(subject("absent"))), alice), {
      edits: [],
      skipped: [{ requirement: "subject attribute dept", reason: "nothing at subject path absent" }],
    });
  });

  it("declines a resource attribute whose matcher yields no witness", () => {
    assert.deepStrictEqual(
      remedyEdits(hasResourceAttribute("sensitivity", inArray([])), alice).skipped,
      [{ requirement: "resource attribute sensitivity", reason: "an empty `in` accepts nothing" }],
    );
  });

  it("declines a resource attribute when the check names no resource", () => {
    assert.deepStrictEqual(
      remedyEdits(hasResourceAttribute("sensitivity", exists()), { subject: { id: "alice" } })
        .skipped,
      [{ requirement: "resource attribute sensitivity", reason: "the check names no resource" }],
    );
  });

  it("declines an edge or an event when the check names no resource id", () => {
    const noResource: SimulationInput = { subject: { id: "alice" } };

    assert.deepStrictEqual(remedyEdits(hasRelationship("owner"), noResource).skipped, [
      { requirement: "relationship owner", reason: "the check names no resource id" },
    ]);
    assert.deepStrictEqual(remedyEdits(hasActed("raised"), noResource).skipped, [
      { requirement: "event raised", reason: "the check names no resource id" },
    ]);
  });

  it("treats a non-string resource id as absent", () => {
    assert.deepStrictEqual(
      remedyEdits(hasRelationship("owner"), { subject: { id: "alice" }, resource: { id: 7 } })
        .skipped,
      [{ requirement: "relationship owner", reason: "the check names no resource id" }],
    );
  });

  /**
   * The two sides of the sweep are partitioned from one list, so this pins both
   * boundaries at once: an edit must not leak into `skipped`, and two skips for
   * different requirements must not collapse into one. A policy with exactly
   * one of each and two distinct refusals is the smallest case that can tell.
   */
  it("keeps distinct skips apart, and does not mistake an edit for one", () => {
    const sweep = remedyEdits(
      allOf([hasRole("editor"), hasRelationship("owner"), hasActed("raised")]),
      { subject: { id: "alice" } },
    );

    assert.deepStrictEqual(sweep.edits.map((e) => e.label), ["with role editor"]);
    assert.deepStrictEqual(sweep.skipped, [
      { requirement: "relationship owner", reason: "the check names no resource id" },
      { requirement: "event raised", reason: "the check names no resource id" },
    ]);
  });

  it("reports one skip per requirement, not one per node", () => {
    assert.strictEqual(
      remedyEdits(
        allOf([hasRelationship("owner"), hasRelationship("owner")]),
        { subject: { id: "alice" } },
      ).skipped.length,
      1,
    );
  });

  it("renders a non-string witness as JSON in the label", () => {
    assert.deepStrictEqual(labels(hasAttribute("tags", contains("fin"))), [
      'with subject attribute tags = ["fin"]',
    ]);
  });

  /**
   * `eq(literal(undefined))` is a policy that only an absent attribute
   * satisfies, and `JSON.stringify` renders it as nothing at all. A label
   * reading `with subject attribute x = ` would look like a formatting bug in
   * the panel rather than like the odd policy it is.
   */
  it("renders a witness JSON cannot represent", () => {
    assert.deepStrictEqual(labels(hasAttribute("x", eq(literal(undefined)))), [
      "with subject attribute x = undefined",
    ]);
  });
});
