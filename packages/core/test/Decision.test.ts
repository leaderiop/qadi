/**
 * `intersectFields`/`unionFields`/`project`/`Allow`/`Deny` live in
 * `Decision.ts`, but their tests previously lived in `Matcher.test.ts` —
 * moved here so the `X.test.ts` ↔ `X.ts` naming convention this test
 * directory otherwise follows (`FieldPath.test.ts` for `FieldPath.ts`, etc.)
 * holds for `Decision.ts` too. A reader who cannot find `Decision.test.ts`
 * would otherwise wrongly conclude these exports were untested (issue #67).
 */
import { assert, describe, it, vi } from "@effect/vitest";
import { Allow, Deny, intersectFields, project, unionFields } from "../src/Decision.ts";
import * as FieldPath from "../src/FieldPath.ts";
import { makeSubjectId } from "../src/Identity.ts";

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

  it("intersection is path-aware: an unbounded spec doesn't lose to an exact-string miss", () => {
    // A naive exact-string filter would return [] here, wrongly denying
    // address.street even though "address.**" already grants it.
    assert.deepStrictEqual(intersectFields(["address.**"], ["address.street"]), [
      "address.street",
    ]);
  });

  it("intersection stays conservative at the '*' depth boundary", () => {
    assert.deepStrictEqual(intersectFields(["address.*"], ["address.street.zip"]), []);
  });

  it("PERFORMANCE: computes each spec's shape once, not once per pair", () => {
    // The defect this pins: `compareFieldPaths` alone computes `shapeOf` on
    // BOTH operands — `split(".")` plus two array allocations — every single
    // call, and `intersectFields`'s comparison is O(|a|·|b|), so a naive
    // implementation calling `compareFieldPaths` in the nested loop would call
    // `shapeOf` `2·|a|·|b|` times. Hoisted, it is called exactly `|a|+|b|`
    // times — once per spec, however many pairs that spec is compared across.
    const spy = vi.spyOn(FieldPath, "shapeOf");
    try {
      const a = ["a", "b", "c", "d"];
      const b = ["w", "x", "y"];
      intersectFields(a, b);
      assert.strictEqual(spy.mock.calls.length, a.length + b.length);
    } finally {
      spy.mockRestore();
    }
  });
});

describe("project", () => {
  const data = { id: "1", title: "T", secret: "S" };
  const allow = (fields: ReadonlyArray<string> | undefined) =>
    new Allow({
      evaluationId: "e",
      subjectId: makeSubjectId("u"),
      durationMillis: 0,
      trace: { policyTag: "HasRole", allowed: true, children: [], obligations: [] },
      visibleFields: fields,
      obligations: [],
    });

  it("a denial exposes nothing", () => {
    const deny = new Deny({
      evaluationId: "e",
      subjectId: makeSubjectId("u"),
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

  it("a path-aware restricted allow projects nested data through the public API", () => {
    // `contact` is typed as a bag rather than an exact shape: `Partial<A>` is
    // shallow, so a nested field is either the WHOLE original sub-object or
    // absent — never itself partial at the type level — which would make an
    // expected literal missing a sibling key fail to type-check otherwise.
    const nested: { id: string; contact: Record<string, unknown> } = {
      id: "1",
      contact: { email: "a@b.com", phone: "555" },
    };
    assert.deepStrictEqual(project(allow(["id", "contact.email"]), nested), {
      id: "1",
      contact: { email: "a@b.com" },
    });
  });
});
