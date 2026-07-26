import { assert, describe, it } from "@effect/vitest";
import {
  intersectFields,
  project,
  unionFields,
  Allow,
  Deny,
} from "../src/Decision.ts";
import * as M from "../src/Matcher.ts";
import {
  compareLabels,
  isSecurityLabel,
  labelDominates,
  type SecurityLabel,
} from "../src/SecurityLabel.ts";

const ctx: M.MatcherContext = {
  subject: { dept: "eng", nested: { deep: 7 } },
  subjectId: "u1",
  resource: { owner: "eng", tags: ["a", "b"] },
  action: "write",
};

const run = (matcher: M.Matcher, value: unknown) => M.evaluateMatcher(matcher, value, ctx);

describe("matchers", () => {
  it("eq compares against a literal", () => {
    assert.isTrue(run(M.eq(M.literal(1)), 1));
    assert.isFalse(run(M.eq(M.literal(1)), 2));
  });

  it("eq resolves a subject reference", () => {
    assert.isTrue(run(M.eq(M.subject("dept")), "eng"));
  });

  it("eq resolves a resource reference", () => {
    assert.isTrue(run(M.eq(M.resource("owner")), "eng"));
  });

  it("eq resolves the action reference", () => {
    assert.isTrue(run(M.eq(M.action()), "write"));
    assert.isFalse(run(M.eq(M.action()), "read"));
  });

  it("neq inverts eq", () => {
    assert.isTrue(run(M.neq(M.literal(1)), 2));
    assert.isFalse(run(M.neq(M.literal(1)), 1));
  });

  it("in tests membership", () => {
    assert.isTrue(run(M.inArray([1, 2]), 2));
    assert.isFalse(run(M.inArray([1, 2]), 3));
  });

  it("exists rejects null and undefined but accepts falsy values", () => {
    assert.isTrue(run(M.exists(), 0));
    assert.isTrue(run(M.exists(), ""));
    assert.isFalse(run(M.exists(), null));
    assert.isFalse(run(M.exists(), undefined));
  });

  it("gte and lt require numbers", () => {
    assert.isTrue(run(M.gte(3), 3));
    assert.isFalse(run(M.gte(3), 2));
    assert.isFalse(run(M.gte(3), "5"));
    assert.isTrue(run(M.lt(3), 2));
    assert.isFalse(run(M.lt(3), 3));
  });

  it("contains works on arrays and strings only", () => {
    assert.isTrue(run(M.contains("a"), ["a", "b"]));
    assert.isTrue(run(M.contains("ell"), "hello"));
    assert.isFalse(run(M.contains("a"), 42));
    assert.isFalse(run(M.contains(1), "1"));
  });

  it("fieldMatch descends into an object", () => {
    assert.isTrue(run(M.fieldMatch("deep", M.gte(7)), { deep: 7 }));
    assert.isFalse(run(M.fieldMatch("deep", M.gte(7)), "not an object"));
  });

  it("someMatch and everyMatch quantify over arrays", () => {
    assert.isTrue(run(M.someMatch(M.gte(3)), [1, 5]));
    assert.isFalse(run(M.someMatch(M.gte(3)), [1, 2]));
    assert.isTrue(run(M.everyMatch(M.gte(1)), [1, 5]));
    assert.isFalse(run(M.everyMatch(M.gte(3)), [1, 5]));
    assert.isFalse(run(M.everyMatch(M.gte(1)), "not an array"));
  });

  it("size applies a matcher to a length", () => {
    assert.isTrue(run(M.size(M.gte(2)), ["a", "b"]));
    assert.isTrue(run(M.size(M.gte(2)), "ab"));
    assert.isFalse(run(M.size(M.gte(2)), 42));
  });
});

describe("security labels", () => {
  const label = (level: number, ...compartments: ReadonlyArray<string>): SecurityLabel => ({
    level,
    compartments,
  });

  it("a total order behaves like one", () => {
    assert.strictEqual(compareLabels(label(2), label(1)), "Dominates");
    assert.strictEqual(compareLabels(label(1), label(2)), "DominatedBy");
    assert.strictEqual(compareLabels(label(1), label(1)), "Equal");
  });

  it("compartments make the order PARTIAL — the whole reason E4 exists", () => {
    // (Secret, {CRYPTO}) and (Secret, {BIO}) are incomparable: neither may read
    // the other. Read as scalars both are level 2 and each reads the other,
    // which allows exactly where dominance denies.
    const crypto = label(2, "CRYPTO");
    const bio = label(2, "BIO");
    assert.strictEqual(compareLabels(crypto, bio), "Incomparable");
    assert.strictEqual(compareLabels(bio, crypto), "Incomparable");
    assert.isFalse(labelDominates(crypto, bio));
    assert.isFalse(labelDominates(bio, crypto));
  });

  it("breadth is required as well as height", () => {
    // Higher level, narrower compartments: still not dominant.
    assert.strictEqual(compareLabels(label(3), label(1, "CRYPTO")), "Incomparable");
    assert.strictEqual(compareLabels(label(3, "CRYPTO", "BIO"), label(1, "CRYPTO")), "Dominates");
  });

  it("Equal is distinguishable from Dominates, which is why there are four values", () => {
    assert.strictEqual(compareLabels(label(2, "A"), label(2, "A")), "Equal");
    assert.strictEqual(compareLabels(label(2, "A", "B"), label(2, "A")), "Dominates");
    // Both are `labelDominates`; only `compareLabels` tells them apart.
    assert.isTrue(labelDominates(label(2, "A"), label(2, "A")));
  });

  it("compartment order is irrelevant", () => {
    assert.strictEqual(compareLabels(label(1, "A", "B"), label(1, "B", "A")), "Equal");
  });

  it("the empty compartment set is dominated by every label at or below its level", () => {
    assert.strictEqual(compareLabels(label(1, "A"), label(1)), "Dominates");
    assert.strictEqual(compareLabels(label(0), label(0)), "Equal");
  });

  it("recognises labels in untrusted data and rejects everything else", () => {
    assert.isTrue(isSecurityLabel({ level: 1, compartments: [] }));
    assert.isFalse(isSecurityLabel({ level: "1", compartments: [] }));
    assert.isFalse(isSecurityLabel({ level: 1, compartments: [2] }));
    assert.isFalse(isSecurityLabel({ level: 1 }));
    assert.isFalse(isSecurityLabel(null));
    assert.isFalse(isSecurityLabel(2));
    assert.isFalse(isSecurityLabel(undefined));
  });
});

describe("the dominates matcher", () => {
  const ctxWith = (
    subject: Readonly<Record<string, unknown>>,
    resource: Readonly<Record<string, unknown>> | undefined,
  ): M.MatcherContext => ({ subject, subjectId: "u1", resource, action: undefined });

  const secret = { level: 2, compartments: ["CRYPTO"] };
  const internal = { level: 1, compartments: [] };
  const bio = { level: 2, compartments: ["BIO"] };

  it("allows a read down and refuses a read up", () => {
    const context = ctxWith({}, { label: internal });
    assert.isTrue(M.evaluateMatcher(M.dominates(M.resource("label")), secret, context));

    const up = ctxWith({}, { label: secret });
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), internal, up));
  });

  it("refuses across incomparable compartments in both directions", () => {
    assert.isFalse(
      M.evaluateMatcher(M.dominates(M.resource("label")), secret, ctxWith({}, { label: bio })),
    );
    assert.isFalse(
      M.evaluateMatcher(M.dominates(M.resource("label")), bio, ctxWith({}, { label: secret })),
    );
  });

  it("denies rather than throwing when either side is not a label", () => {
    // The quiet failure mode: a policy written against the wrong attribute name
    // looks like a working least-privilege rule. `evaluateMatcher` is total, so
    // it cannot complain — these cases are pinned instead.
    const context = ctxWith({}, { label: internal, notALabel: 7 });
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), 2, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("label")), undefined, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("notALabel")), secret, context));
    assert.isFalse(M.evaluateMatcher(M.dominates(M.resource("missing")), secret, context));
  });

  it("dominance is reflexive, so acting at your own level is permitted", () => {
    assert.isTrue(
      M.evaluateMatcher(M.dominates(M.resource("label")), secret, ctxWith({}, { label: secret })),
    );
  });
});

describe("referencesAction", () => {
  // The evaluator asks this before running a matcher, because the matcher
  // itself cannot fail: an absent action would resolve to undefined, match
  // nothing, and be reported as a denial rather than as the caller's mistake.
  it("sees a bare action reference under eq and neq", () => {
    assert.isTrue(M.referencesAction(M.eq(M.action())));
    assert.isTrue(M.referencesAction(M.neq(M.action())));
    assert.isTrue(M.referencesAction(M.dominates(M.action())));
  });

  it("sees one nested at any depth", () => {
    assert.isTrue(M.referencesAction(M.fieldMatch("op", M.eq(M.action()))));
    assert.isTrue(M.referencesAction(M.someMatch(M.eq(M.action()))));
    assert.isTrue(M.referencesAction(M.everyMatch(M.neq(M.action()))));
    assert.isTrue(M.referencesAction(M.size(M.eq(M.action()))));
  });

  it("is false for every matcher that cannot name it", () => {
    const withoutAction: ReadonlyArray<M.Matcher> = [
      M.eq(M.subjectId()),
      M.neq(M.resource("owner")),
      M.dominates(M.resource("label")),
      M.inArray([1]),
      M.exists(),
      M.gte(1),
      M.lt(1),
      M.contains("a"),
      M.fieldMatch("x", M.exists()),
      M.someMatch(M.gte(1)),
      M.everyMatch(M.lt(1)),
      M.size(M.gte(1)),
    ];
    for (const matcher of withoutAction) {
      assert.isFalse(M.referencesAction(matcher), matcher._tag);
    }
  });
});

describe("getByPath", () => {
  it("returns the input for an empty path", () => {
    assert.deepStrictEqual(M.getByPath({ a: 1 }, ""), { a: 1 });
  });

  it("walks a dot path", () => {
    assert.strictEqual(M.getByPath({ a: { b: { c: 3 } } }, "a.b.c"), 3);
  });

  it("returns undefined at any missing step", () => {
    assert.isUndefined(M.getByPath({ a: 1 }, "a.b.c"));
    assert.isUndefined(M.getByPath(undefined, "a"));
  });
});

describe("field lattice", () => {
  it("undefined is the top: intersecting with it is identity", () => {
    assert.deepStrictEqual(intersectFields(undefined, ["a"]), ["a"]);
    assert.deepStrictEqual(intersectFields(["a"], undefined), ["a"]);
    assert.isUndefined(intersectFields(undefined, undefined));
  });

  it("intersection keeps the overlap", () => {
    assert.deepStrictEqual(intersectFields(["a", "b"], ["b", "c"]), ["b"]);
  });

  it("union absorbs to all-fields when either side is unrestricted", () => {
    assert.isUndefined(unionFields(undefined, ["a"]));
    assert.deepStrictEqual([...(unionFields(["a"], ["b"]) ?? [])].sort(), ["a", "b"]);
  });
});

describe("project", () => {
  const data = { id: "1", title: "T", secret: "S" };
  const allow = (fields: ReadonlyArray<string> | undefined) =>
    new Allow({
      evaluationId: "e",
      subjectId: "u",
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
      visibleFields: fields,
      obligations: [],
    });

  it("a denial exposes nothing", () => {
    const deny = new Deny({
      evaluationId: "e",
      subjectId: "u",
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: false, children: [], obligations: [] },
      reason: "no",
    });
    assert.deepStrictEqual(project(deny, data), {});
  });

  it("an unrestricted allow exposes everything", () => {
    assert.deepStrictEqual(project(allow(undefined), data), data);
  });

  it("a restricted allow exposes only the listed fields", () => {
    assert.deepStrictEqual(project(allow(["id"]), data), { id: "1" });
  });
});
