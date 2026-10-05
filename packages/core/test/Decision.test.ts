/**
 * `project`/`Allow`/`Deny` and the trace schema, which live in `Decision.ts`.
 * The field lattice they used to share this file with — `intersectFields`,
 * `unionFields`, `mergeFields` — lives in `FieldLattice.ts` now, and its tests
 * in `FieldLattice.test.ts` (ARCH-12).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import { Allow, Deny, project, TraceSchema } from "../src/Decision.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { POLICY_TAGS } from "../src/Policy.ts";

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

describe("TraceSchema's tag list (ARCH-02 C5)", () => {
  it("decodes a trace node carrying each of the 16 Policy tags and rejects an unknown one", () => {
    const decode = Schema.decodeUnknownSync(TraceSchema);
    assert.strictEqual(POLICY_TAGS.length, 16);
    for (const policyTag of POLICY_TAGS) {
      const node = { policyTag, allowed: true, children: [], obligations: [] };
      assert.strictEqual(decode(node).policyTag, policyTag);
    }
    assert.throws(() =>
      decode({ policyTag: "Probe", allowed: true, children: [], obligations: [] }),
    );
  });
});
