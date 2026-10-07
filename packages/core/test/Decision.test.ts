/**
 * `project`/`Allow`/`Deny` and the trace schema, which live in `Decision.ts`.
 * The field lattice they used to share this file with — `intersectFields`,
 * `unionFields`, `mergeFields` — lives in `FieldLattice.ts` now, and its tests
 * in `FieldLattice.test.ts` (ARCH-12).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Schema from "effect/Schema";
import * as FastCheck from "fast-check";
import { Allow, Deny, foldTrace, project, TraceSchema } from "../src/Decision.ts";
import type { Trace, TraceCases } from "../src/Decision.ts";
import { makeSubjectId } from "../src/Identity.ts";
import { POLICY_TAGS } from "../src/Policy.ts";
import { chain } from "./helpers.ts";

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

describe("foldTrace (ARCH-22 D-22-a)", () => {
  const node = (policyTag: Trace["policyTag"], children: ReadonlyArray<Trace> = []): Trace => ({
    policyTag,
    allowed: true,
    children,
    obligations: [],
  });

  /** One answer for every tag, whatever its arity: the arms ignore their children. */
  const uniform = <R>(f: (node: Trace) => R): TraceCases<R> => ({
    HasPermission: f,
    HasRole: f,
    HasAttribute: f,
    HasResourceAttribute: f,
    HasRelationship: f,
    HasAction: f,
    HasActed: f,
    HasNotActed: f,
    HasCustom: f,
    HasSignature: f,
    AllOf: f,
    AnyOf: f,
    Rules: f,
    Not: f,
    Obliged: f,
    Labeled: f,
  });

  /** Every arm answers a string naming what it was handed. */
  const describing: TraceCases<string> = {
    HasPermission: () => "perm",
    HasRole: () => "role",
    HasAttribute: () => "attr",
    HasResourceAttribute: () => "rattr",
    HasRelationship: () => "rel",
    HasAction: () => "act",
    HasActed: () => "acted",
    HasNotActed: () => "notacted",
    HasCustom: () => "custom",
    HasSignature: () => "sig",
    AllOf: (_n, children) => `all(${children.join(",")})`,
    AnyOf: (_n, children) => `any(${children.join(",")})`,
    Rules: (_n, children) => `rules(${children.join(",")})`,
    Not: (_n, child) => `not(${child ?? "-"})`,
    Obliged: (_n, child) => `obliged(${child ?? "-"})`,
    Labeled: (_n, child) => `labeled(${child ?? "-"})`,
  };

  it("combines post-order, each arm receiving its children in the tag's own shape", () => {
    const tree = node("AllOf", [
      node("Not", [node("HasRole")]),
      node("Rules", [node("HasPermission"), node("HasAction")]),
      node("AnyOf"),
      node("Labeled"),
    ]);
    assert.strictEqual(foldTrace(tree, describing), "all(not(role),rules(perm,act),any(),labeled(-))");
  });

  it("does not walk a leaf's children, and a wrapper's walk is its first child", () => {
    const seen: Array<string> = [];
    const record = (name: string) => (): string => {
      seen.push(name);
      return name;
    };
    const cases: TraceCases<string> = {
      ...describing,
      HasRole: record("role"),
      HasAction: record("action"),
      Not: (_n, child) => child ?? "-",
    };
    foldTrace(node("Not", [node("HasRole", [node("HasAction")]), node("HasAction")]), cases);
    assert.deepStrictEqual(seen, ["role"]);
  });

  it("folds a 100,000-deep chain and a 250,000-wide node", () => {
    const counting: TraceCases<number> = {
      ...uniform(() => 0),
      AllOf: (_n, children) => children.length,
      Not: (_n, child) => (child ?? 0) + 1,
    };
    assert.strictEqual(
      foldTrace(
        chain((inner: Trace) => node("Not", [inner]), 100_000, node("HasRole")),
        counting,
      ),
      100_000,
    );
    const wide = node("AllOf", Array.from({ length: 250_000 }, () => node("HasRole")));
    assert.strictEqual(foldTrace(wide, counting), 250_000);
  }, 60_000);

  it("combines a shared child once and hands every parent the same result", () => {
    const shared = node("HasRole");
    let combined = 0;
    const results: Array<unknown> = [];
    const cases: TraceCases<object> = {
      ...uniform((): object => ({})),
      HasRole: () => {
        combined += 1;
        return {};
      },
      AllOf: (_n, children) => {
        results.push(...children);
        return {};
      },
    };
    foldTrace(node("AllOf", [shared, node("AllOf", [shared]), shared]), cases);
    assert.strictEqual(combined, 1);
    // The inner AllOf's one child, then the root's three.
    assert.strictEqual(results.length, 4);
    assert.strictEqual(results[0], results[1]);
    assert.strictEqual(results[0], results[3]);
  });

  it("throws on a cyclic trace", () => {
    const cycle: { policyTag: "Not"; allowed: boolean; children: Array<Trace>; obligations: [] } = {
      policyTag: "Not",
      allowed: true,
      children: [],
      obligations: [],
    };
    cycle.children.push(cycle);
    assert.throws(() => foldTrace(cycle, describing), "cycle");
  });

  it("every tag of a trace reaches its own arm", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.constantFrom(...POLICY_TAGS), (tag) => {
        return foldTrace(node(tag), uniform((n) => n.policyTag)) === tag;
      }),
    );
  });
});
