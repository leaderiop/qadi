import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";

describe("Policy combinators", () => {
  it("allOf defaults to Intersection — least privilege for a conjunction", () => {
    const policy = P.allOf([P.hasRole("a"), P.hasRole("b")]);
    assert.strictEqual(policy._tag, "AllOf");
    if (policy._tag !== "AllOf") return;
    assert.strictEqual(policy.fieldStrategy, "Intersection");
  });

  it("anyOf defaults to First — short-circuiting", () => {
    const policy = P.anyOf([P.hasRole("a")]);
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.fieldStrategy, "First");
  });

  it("explicit fieldStrategy overrides the default", () => {
    const policy = P.anyOf([P.hasRole("a")], { fieldStrategy: "Union" });
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.fieldStrategy, "Union");
  });

  it("anyOfRoles builds an AnyOf of HasRole", () => {
    const policy = P.anyOfRoles(["admin", "editor"]);
    if (policy._tag !== "AnyOf") return;
    assert.strictEqual(policy.policies.length, 2);
    assert.deepStrictEqual(
      policy.policies.map((p) => (p._tag === "HasRole" ? p.role : "?")),
      ["admin", "editor"],
    );
  });

  it("labeled wraps a policy with a name", () => {
    const policy = P.labeled("four-eyes", P.hasRole("approver"));
    if (policy._tag !== "Labeled") return;
    assert.strictEqual(policy.label, "four-eyes");
  });

  it("not wraps a policy", () => {
    const policy = P.not(P.hasRole("suspended"));
    assert.strictEqual(policy._tag, "Not");
  });

  it("hasAction carries the verb and fields", () => {
    const policy = P.hasAction("write", { fields: ["body"] });
    if (policy._tag !== "HasAction") return;
    assert.strictEqual(policy.action, "write");
    assert.deepStrictEqual(policy.fields, ["body"]);
  });

  it("obliged wraps a policy with a duty", () => {
    const policy = P.obliged(obligation("log-access", { level: "audit" }), P.hasRole("a"));
    assert.strictEqual(policy._tag, "Obliged");
    if (policy._tag !== "Obliged") return;
    assert.strictEqual(policy.obligation.id, "log-access");
    assert.deepStrictEqual(policy.obligation.attributes, { level: "audit" });
    assert.isFalse(policy.obligation.advisory);
  });

  it("an obligation defaults to binding with no attributes", () => {
    // The safe default: a duty binds unless its author says it may be ignored.
    const o = obligation("notify");
    assert.deepStrictEqual(o, { id: "notify", attributes: {}, advisory: false });
    assert.isTrue(obligation("hint", {}, { advisory: true }).advisory);
  });

  it("history policies default to Resource scope", () => {
    const acted = P.hasActed("raised");
    const notActed = P.hasNotActed("raised", { scope: "Any" });
    if (acted._tag !== "HasActed" || notActed._tag !== "HasNotActed") return;
    assert.strictEqual(acted.scope, "Resource");
    assert.strictEqual(notActed.scope, "Any");
  });

  it("hasNotActed is a distinct variant, not a Not wrapper", () => {
    // If this ever becomes `not(hasActed(...))`, an unwired history port starts
    // granting — ADR-QD-020. The schema is what holds the distinction.
    assert.strictEqual(P.hasNotActed("raised")._tag, "HasNotActed");
    assert.notStrictEqual(P.hasNotActed("raised")._tag, "Not");
  });

  it("hasRelationship carries depth and fields", () => {
    const policy = P.hasRelationship("owner", { depth: 3, fields: ["title"] });
    if (policy._tag !== "HasRelationship") return;
    assert.strictEqual(policy.depth, 3);
    assert.deepStrictEqual(policy.fields, ["title"]);
  });
});

describe("Policy serialization", () => {
  const roundTrip = (policy: P.Policy) =>
    Effect.flatMap(P.toJson(policy), (json) => P.fromJson(json));

  it.effect("REGRESSION: anyOf Union fieldStrategy survives a round trip", () =>
    Effect.gen(function* () {
      // The predecessor dropped fieldStrategy when serializing, so a policy
      // stored and reloaded silently narrowed visibility from ["title",
      // "author"] to ["title"]. This is the defect the schema-derived codec
      // exists to prevent.
      const policy = P.anyOf(
        [
          P.hasPermission(permission("doc", "read"), { fields: ["title"] }),
          P.hasPermission(permission("doc", "meta"), { fields: ["author"] }),
        ],
        { fieldStrategy: "Union" },
      );

      const restored = yield* roundTrip(policy);
      assert.deepStrictEqual(restored, policy);
      if (restored._tag !== "AnyOf") return;
      assert.strictEqual(restored.fieldStrategy, "Union");
    }));

  it.effect("round-trips a deeply nested tree", () =>
    Effect.gen(function* () {
      const policy = P.allOf(
        [
          P.labeled(
            "outer",
            P.not(
              P.anyOf([
                P.hasRole("admin"),
                P.hasAttribute("level", M.gte(3), { fields: ["a", "b"] }),
                P.hasResourceAttribute("state", M.eq(M.literal("open"))),
                P.hasRelationship("owner", { depth: 2 }),
                P.hasAction("write", { fields: ["body"] }),
                P.obliged(obligation("log", { who: "x" }), P.hasRole("auditor")),
                P.hasActed("raised", { scope: "Any" }),
                P.hasNotActed("approved", { fields: ["id"] }),
              ]),
            ),
          ),
          P.hasPermission(permission("doc", "write")),
        ],
        { fieldStrategy: "Union" },
      );

      assert.deepStrictEqual(yield* roundTrip(policy), policy);
    }));

  it.effect("round-trips every matcher variant", () =>
    Effect.gen(function* () {
      const matchers: ReadonlyArray<M.Matcher> = [
        M.eq(M.literal(1)),
        M.eq(M.subject("dept")),
        M.eq(M.subjectId()),
        M.eq(M.resource("owner")),
        M.eq(M.action()),
        M.dominates(M.subject("clearance")),
        M.neq(M.literal("x")),
        M.inArray([1, 2, 3]),
        M.exists(),
        M.gte(5),
        M.lt(10),
        M.contains("needle"),
        M.fieldMatch("nested", M.exists()),
        M.someMatch(M.gte(1)),
        M.everyMatch(M.lt(9)),
        M.size(M.gte(2)),
      ];

      for (const matcher of matchers) {
        const policy = P.hasAttribute("x", matcher);
        assert.deepStrictEqual(yield* roundTrip(policy), policy);
      }
    }));

  it.effect("rejects an unknown policy tag", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(P.fromJson(`{"_tag":"DropTables"}`));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("rejects a permission segment containing the key separator", () =>
    Effect.gen(function* () {
      // "a:b" as a resource would collide with resource "a", action "b:c".
      const result = yield* Effect.result(
        P.fromJson(`{"_tag":"HasPermission","permission":{"resource":"a:b","action":"c"}}`),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("rejects an empty permission segment", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        P.fromJson(`{"_tag":"HasPermission","permission":{"resource":"","action":"c"}}`),
      );
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("rejects malformed JSON", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(P.fromJson("{not json"));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("round-trips through a plain JSON value", () =>
    Effect.gen(function* () {
      const policy = P.hasRole("admin");
      const value = yield* P.toJsonValue(policy);
      assert.deepStrictEqual(yield* P.fromJsonValue(value), policy);
    }));

  it.effect("PROPERTY: any generated policy survives a round trip", () =>
    Effect.gen(function* () {
      // Generates arbitrary trees rather than the shapes we happened to think
      // of. This is the standing guard against codec drift.
      const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
        FastCheck.record({ r: FastCheck.string(), a: FastCheck.string() }).map(({ r, a }) =>
          P.hasPermission(permission(r.replace(/:/g, "") || "r", a.replace(/:/g, "") || "a")),
        ),
        FastCheck.string().map((s) => P.hasRole(s)),
        FastCheck.integer().map((n) => P.hasAttribute("lvl", M.gte(n))),
        FastCheck.string().map((s) => P.hasAction(s)),
        // A matcher carrying an ActionRef: the variant lives in ValueRef rather
        // than in Policy, so a leaf that never nests one would leave it out of
        // the round-trip property entirely.
        FastCheck.constant(P.hasAttribute("op", M.eq(M.action()))),
        FastCheck.string().map((path) =>
          P.hasAttribute("clearance", M.dominates(M.resource(path))),
        ),
        // `Obligation` is a struct with a `Record(String, Unknown)` inside it,
        // so the generator has to reach nested arbitrary JSON for the property
        // to say anything about the obligation codec.
        FastCheck.tuple(FastCheck.string(), FastCheck.boolean()).map(([id, advisory]) =>
          P.obliged(obligation(id, { n: 1, deep: { s: "x" } }, { advisory }), P.hasRole(id)),
        ),
        FastCheck.tuple(
          FastCheck.string(),
          FastCheck.constantFrom("Resource" as const, "Any" as const),
          FastCheck.boolean(),
        ).map(([event, scope, negated]) =>
          negated ? P.hasNotActed(event, { scope }) : P.hasActed(event, { scope }),
        ),
      );

      const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec((tie) => ({
        node: FastCheck.oneof(
          { maxDepth: 4, withCrossShrink: true },
          leaf,
          FastCheck.tuple(
            FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, {
              minLength: 1,
              maxLength: 3,
            }),
            FastCheck.constantFrom("Intersection" as const, "Union" as const, "First" as const),
          ).map(([ps, strategy]) => P.allOf(ps, { fieldStrategy: strategy })),
          FastCheck.tuple(
            FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, {
              minLength: 1,
              maxLength: 3,
            }),
            FastCheck.constantFrom("Intersection" as const, "Union" as const, "First" as const),
          ).map(([ps, strategy]) => P.anyOf(ps, { fieldStrategy: strategy })),
          (tie("node") as FastCheck.Arbitrary<P.Policy>).map(P.not),
        ),
      })).node;

      const samples = FastCheck.sample(tree, 60);
      for (const policy of samples) {
        const restored = yield* Effect.flatMap(P.toJson(policy), P.fromJson);
        assert.deepStrictEqual(restored, policy);
      }
    }));
});
