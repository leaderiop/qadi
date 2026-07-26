import { assert, describe, it } from "@effect/vitest";
import {
  intersectFields,
  project,
  unionFields,
  Allow,
  Deny,
} from "../src/Decision.ts";
import * as M from "../src/Matcher.ts";

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

describe("referencesAction", () => {
  // The evaluator asks this before running a matcher, because the matcher
  // itself cannot fail: an absent action would resolve to undefined, match
  // nothing, and be reported as a denial rather than as the caller's mistake.
  it("sees a bare action reference under eq and neq", () => {
    assert.isTrue(M.referencesAction(M.eq(M.action())));
    assert.isTrue(M.referencesAction(M.neq(M.action())));
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
      trace: { policyTag: "HasRole", allowed: true, children: [] },
      visibleFields: fields,
    });

  it("a denial exposes nothing", () => {
    const deny = new Deny({
      evaluationId: "e",
      subjectId: "u",
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: false, children: [] },
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
