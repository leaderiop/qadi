import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as FastCheck from "effect/testing/FastCheck";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import { isAllowed } from "../src/Decision.ts";
import { DecisionHistory } from "../src/DecisionHistory.ts";
import { AttributeResolveError } from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import type { Predicate } from "../src/Predicate.ts";
import { evaluatePredicate, toPredicate } from "../src/Predicate.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const tenant = subjectWith({
  id: "u-1",
  roles: ["editor"],
  permissions: ["doc:read"],
  attributes: { tenantId: "t-1", seniority: 4 },
});

/** Resolved rather than held, so translation has to reach the resolver. */
const resolving = Layer.succeed(AttributeResolver, {
  resolve: (_id: string, attribute: string) =>
    Effect.sync(() => (attribute === "riskScore" ? 20 : undefined)),
});

const acted = Layer.succeed(DecisionHistory, {
  hasActed: (query) => Effect.succeed(query.event === "onboarded" ? "Acted" : "NotActed"),
});

const layer = testLayer(tenant, { attributes: resolving, history: acted });

const translate = (policy: P.Policy, options?: { readonly action?: string }) =>
  toPredicate(policy, options).pipe(Effect.provide(layer));

const failure = (policy: P.Policy) =>
  Effect.map(Effect.result(translate(policy)), (r) =>
    r._tag === "Failure" ? r.failure : undefined,
  );

describe("evaluatePredicate — the reference semantics", () => {
  const row = { tenantId: "t-1", level: 3, tag: "red" };

  it("decides each node kind", () => {
    const cases: ReadonlyArray<readonly [Predicate, boolean]> = [
      [{ _tag: "True" }, true],
      [{ _tag: "False" }, false],
      [{ _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" }, true],
      [{ _tag: "Compare", column: "tenantId", op: "Neq", value: "t-1" }, false],
      [{ _tag: "Compare", column: "level", op: "Gte", value: 3 }, true],
      [{ _tag: "Compare", column: "level", op: "Lt", value: 3 }, false],
      [{ _tag: "MemberOf", column: "tag", values: ["red", "blue"] }, true],
      [{ _tag: "MemberOf", column: "tag", values: ["blue"] }, false],
      [{ _tag: "Negate", predicate: { _tag: "False" } }, true],
      [{ _tag: "And", predicates: [{ _tag: "True" }, { _tag: "False" }] }, false],
      [{ _tag: "Or", predicates: [{ _tag: "True" }, { _tag: "False" }] }, true],
    ];
    for (const [predicate, expected] of cases) {
      assert.strictEqual(evaluatePredicate(predicate, row), expected, predicate._tag);
    }
  });

  it("an ordered comparison against a non-number is false, as in the matcher", () => {
    // A divergence here is a row the evaluator would have refused, so it must
    // mirror `Gte`/`Lt` exactly rather than coerce.
    const gte: Predicate = { _tag: "Compare", column: "tag", op: "Gte", value: 1 };
    assert.isFalse(evaluatePredicate(gte, row));
    assert.isFalse(evaluatePredicate(gte, {}));
  });

  it("a NUMERIC STRING is not a number, and this is where coercion would hide", () => {
    // The discriminator. `"red" >= 1` is false under coercion too, so the test
    // above cannot tell a faithful comparison from `Number(v) >= Number(w)`.
    // A text column holding "3" can: coercion admits the row, the evaluator
    // refuses it, and a mutation coercing here survived until this existed.
    const gte: Predicate = { _tag: "Compare", column: "level", op: "Gte", value: 3 };
    const lt: Predicate = { _tag: "Compare", column: "level", op: "Lt", value: 9 };
    assert.isFalse(evaluatePredicate(gte, { level: "3" }));
    assert.isFalse(evaluatePredicate(lt, { level: "3" }));
    assert.isFalse(evaluatePredicate(gte, { level: null }));
    assert.isTrue(evaluatePredicate(gte, { level: 3 }));
  });

  it("an absent column is undefined, not an error", () => {
    assert.isFalse(
      evaluatePredicate({ _tag: "Compare", column: "nope", op: "Eq", value: "x" }, row),
    );
    assert.isTrue(
      evaluatePredicate({ _tag: "Compare", column: "nope", op: "Neq", value: "x" }, row),
    );
  });

  it("an ordered comparison is false when the target is not a number, even though the row value is", () => {
    // The test above falsifies the first `typeof` guard by giving a non-number
    // row value; this falsifies the second by giving a non-number target while
    // the row value is a genuine number.
    const gte: Predicate = { _tag: "Compare", column: "level", op: "Gte", value: "not-a-number" };
    const lt: Predicate = { _tag: "Compare", column: "level", op: "Lt", value: "not-a-number" };
    assert.isFalse(evaluatePredicate(gte, { level: 5 }));
    assert.isFalse(evaluatePredicate(lt, { level: 5 }));
  });

  it("the target's typeof guard is load-bearing, not redundant with the operator itself", () => {
    // The test above's "not-a-number" target coerces to NaN either way, so
    // `value >= NaN`/`value < NaN` are false regardless of whether the guard
    // ran — a mutant that deletes the guard survives it. A target that
    // coerces to something the raw operator would accept is the case that
    // actually needs the guard: `5 >= ""` is `true` under native `>=`
    // (`""` coerces to `0`), and `5 < "10"` is `true` under native `<`
    // (`"10"` coerces to `10`) — both must still read as `false` here,
    // since neither target is typeof `"number"`.
    const gte: Predicate = { _tag: "Compare", column: "level", op: "Gte", value: "" };
    const lt: Predicate = { _tag: "Compare", column: "level", op: "Lt", value: "10" };
    assert.isFalse(evaluatePredicate(gte, { level: 5 }));
    assert.isFalse(evaluatePredicate(lt, { level: 5 }));
  });
});

describe("the subject side folds to a constant", () => {
  it.effect("a role the subject holds becomes True", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* translate(P.hasRole("editor")), { _tag: "True" });
      assert.deepStrictEqual(yield* translate(P.hasRole("admin")), { _tag: "False" });
    }));

  it.effect("a permission folds", () =>
    Effect.gen(function* () {
      const held = yield* translate(P.hasPermission(permission("doc", "read")));
      const not = yield* translate(P.hasPermission(permission("doc", "delete")));
      assert.strictEqual(held._tag, "True");
      assert.strictEqual(not._tag, "False");
    }));

  it.effect("an attribute on the subject folds without a lookup", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.hasAttribute("seniority", M.gte(3)));
      assert.strictEqual(p._tag, "True");
    }));

  it.effect("an attribute the resolver answers folds too", () =>
    Effect.gen(function* () {
      // One call per translation, not one per row — which is the whole reason a
      // subject-keyed lookup can fold and a row-keyed one cannot.
      const p = yield* translate(P.hasAttribute("riskScore", M.lt(50)));
      assert.strictEqual(p._tag, "True");
    }));

  it.effect("the action folds, because it is a property of the request", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.hasAction("read"), { action: "read" });
      assert.strictEqual(p._tag, "True");
    }));

  it.effect("a mismatched action folds to False, not to an unconditional True", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.hasAction("write"), { action: "read" });
      assert.strictEqual(p._tag, "False");
    }));

  it.effect("a history question scoped to Any folds", () =>
    Effect.gen(function* () {
      // The scope is what decides this: `Any` asks about the subject.
      const p = yield* translate(P.hasActed("onboarded", { scope: "Any" }));
      assert.strictEqual(p._tag, "True");
      const n = yield* translate(P.hasNotActed("onboarded", { scope: "Any" }));
      assert.strictEqual(n._tag, "False");
    }));

  it.effect("HasNotActed folds to True when the subject truly has not acted", () =>
    Effect.gen(function* () {
      // The test above only ever sees `NotActed` fold to `False`; this is the
      // other side, where the answer actually agrees with what was asked.
      const p = yield* translate(P.hasNotActed("unrelated-event", { scope: "Any" }));
      assert.strictEqual(p._tag, "True");
    }));

  it.effect("HasAttribute's matcher folds against a supplied action rather than failing", () =>
    Effect.gen(function* () {
      const matches = yield* translate(P.hasAttribute("tenantId", M.eq(M.action())), {
        action: "t-1",
      });
      assert.strictEqual(matches._tag, "True");
      const mismatches = yield* translate(P.hasAttribute("tenantId", M.eq(M.action())), {
        action: "t-2",
      });
      assert.strictEqual(mismatches._tag, "False");
    }));
});

describe("the resource side becomes a column", () => {
  it.effect("a literal comparison", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* translate(P.hasResourceAttribute("tenantId", M.eq(M.literal("t-1")))),
        { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
      );
    }));

  it.effect("a subject attribute on the other side is a constant", () =>
    Effect.gen(function* () {
      // The multi-tenant sentence, and the shape every request for row-level
      // security actually asks for.
      assert.deepStrictEqual(
        yield* translate(P.hasResourceAttribute("tenantId", M.eq(M.subject("tenantId")))),
        { _tag: "Compare", column: "tenantId", op: "Eq", value: "t-1" },
      );
    }));

  it.effect("the subject's own id is a constant", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(
        yield* translate(P.hasResourceAttribute("ownerId", M.eq(M.subjectId()))),
        { _tag: "Compare", column: "ownerId", op: "Eq", value: "u-1" },
      );
    }));

  it.effect("the action is a constant on the column's other side", () =>
    Effect.gen(function* () {
      // "rows whose stage equals what I am doing" — the action is a property of
      // the request, so it folds to a value even in column position.
      assert.deepStrictEqual(
        yield* translate(P.hasResourceAttribute("stage", M.eq(M.action())), {
          action: "review",
        }),
        { _tag: "Compare", column: "stage", op: "Eq", value: "review" },
      );
    }));

  it.effect("ordered and membership comparisons", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* translate(P.hasResourceAttribute("level", M.gte(3))), {
        _tag: "Compare",
        column: "level",
        op: "Gte",
        value: 3,
      });
      assert.deepStrictEqual(
        yield* translate(P.hasResourceAttribute("tag", M.inArray(["red", "blue"]))),
        { _tag: "MemberOf", column: "tag", values: ["red", "blue"] },
      );
    }));
});

describe("untranslatable fails loudly and never widens", () => {
  const reasonFor = (policy: P.Policy) =>
    Effect.map(failure(policy), (f) => {
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      return f?._tag === "PolicyNotTranslatable" ? f : undefined;
    });

  it.effect("a relationship cannot fold", () =>
    Effect.gen(function* () {
      // Keyed by the row's id, so folding it would cost one lookup per row —
      // exactly what a predicate exists to avoid.
      const f = yield* reasonFor(P.hasRelationship("owner"));
      assert.strictEqual(f?.policyTag, "HasRelationship");
    }));

  it.effect("a resource-scoped history question cannot fold", () =>
    Effect.gen(function* () {
      const f = yield* reasonFor(P.hasActed("raised"));
      assert.strictEqual(f?.policyTag, "HasActed");
    }));

  it.effect("a resource-scoped HasNotActed cannot fold either", () =>
    Effect.gen(function* () {
      // `hasNotActed` defaults to `Resource` scope too, and had zero coverage
      // of its own — only `HasActed`'s resource-scoped path was exercised.
      const f = yield* reasonFor(P.hasNotActed("raised"));
      assert.strictEqual(f?.policyTag, "HasNotActed");
    }));

  it.effect("an obligation has no channel in a predicate", () =>
    Effect.gen(function* () {
      // INV-QD-013 reaching a construct it could not otherwise reach: rows
      // selected by this would be handed over with a duty nobody was told about.
      const f = yield* reasonFor(P.obliged(obligation("log"), P.hasRole("editor")));
      assert.strictEqual(f?.policyTag, "Obliged");
    }));

  it.effect("a matcher with no predicate form", () =>
    Effect.gen(function* () {
      for (const matcher of [
        M.exists(),
        M.contains("x"),
        M.someMatch(M.gte(1)),
        M.everyMatch(M.gte(1)),
        M.size(M.gte(1)),
        M.fieldMatch("a", M.gte(1)),
        M.dominates(M.subject("clearance")),
      ]) {
        const f = yield* reasonFor(P.hasResourceAttribute("x", matcher));
        assert.strictEqual(f?.policyTag, "HasResourceAttribute");
      }
    }));

  it.effect("column against column", () =>
    Effect.gen(function* () {
      // The one comparison `Predicate` cannot express.
      const f = yield* reasonFor(
        P.hasResourceAttribute("ownerId", M.eq(M.resource("createdBy"))),
      );
      assert.strictEqual(f?.policyTag, "HasResourceAttribute");
    }));

  it.effect("a subject matcher reaching for a column", () =>
    Effect.gen(function* () {
      // Folding this against the absent resource would build a filter out of
      // `undefined` with no error to announce it.
      const f = yield* reasonFor(P.hasAttribute("clearance", M.eq(M.resource("label"))));
      assert.strictEqual(f?.policyTag, "HasAttribute");
    }));

  it.effect("an untranslatable node buried in a translatable tree still fails", () =>
    Effect.gen(function* () {
      // The failure mode that makes this feature worse than its absence is a
      // node quietly rendered as True, so nesting must not soften it.
      const f = yield* failure(
        P.anyOf([
          P.hasResourceAttribute("tenantId", M.eq(M.literal("t-1"))),
          P.hasRelationship("owner"),
        ]),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
    }));

  it.effect("a fields restriction anywhere in the tree is refused", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.allOf([
          P.hasResourceAttribute("tenantId", M.eq(M.literal("t-1"))),
          P.hasRole("editor"),
          P.hasPermission(permission("doc", "read"), { fields: ["id"] }),
        ]),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("the check is conservative: a discarded field set still refuses", () =>
    Effect.gen(function* () {
      // `Not` drops its child's field set, so this one could not have leaked.
      // A precise check would mean reproducing `mergeFields` in the translator,
      // which is a third implementation of a rule two already share.
      const f = yield* failure(P.not(P.hasRole("editor")));
      assert.isUndefined(f);
      const g = yield* failure(
        P.not(P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
      );
      assert.strictEqual(g?._tag, "PolicyNotTranslatable");
    }));

  it.effect("INV-QD-006: a broken lookup fails rather than folding to False", () =>
    Effect.gen(function* () {
      const broken = Layer.succeed(AttributeResolver, {
        resolve: (_id: string, attribute: string) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
      });
      const r = yield* Effect.result(
        toPredicate(P.hasAttribute("riskScore", M.lt(50))).pipe(
          Effect.provide(testLayer(tenant, { attributes: broken })),
        ),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "AttributeResolveError");
    }));

  it.effect("INV-QD-011: reading an absent action fails", () =>
    Effect.gen(function* () {
      // Three routes to the same rule: the node that names an action, and a
      // matcher that references one on either side of the fold. All three fail
      // rather than resolving `undefined` and quietly matching nothing.
      for (const policy of [
        P.hasAction("read"),
        P.hasAttribute("lastOp", M.eq(M.action())),
        P.hasResourceAttribute("stage", M.eq(M.action())),
      ]) {
        const r = yield* Effect.result(translate(policy));
        assert.strictEqual(r._tag, "Failure", policy._tag);
        if (r._tag !== "Failure") return;
        assert.strictEqual(r.failure._tag, "MissingAction");
      }
    }));

  it.effect("HasAction's MissingAction carries the action it named", () =>
    Effect.gen(function* () {
      const r = yield* Effect.result(translate(P.hasAction("publish")));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "MissingAction");
      if (r.failure._tag !== "MissingAction") return;
      assert.strictEqual(r.failure.expected, "publish");
    }));

  it.effect("a tree deeper than the bound fails", () =>
    Effect.gen(function* () {
      let policy: P.Policy = P.hasRole("editor");
      for (let i = 0; i < 10; i += 1) policy = P.not(policy);
      const r = yield* Effect.result(
        toPredicate(policy, { maxDepth: 3 }).pipe(Effect.provide(layer)),
      );
      assert.strictEqual(r._tag, "Failure");
    }));

  it.effect("a tree exactly as deep as the bound still translates", () =>
    Effect.gen(function* () {
      // Only the "too deep" side was ever tested; this pins the boundary
      // itself, `depth === maxDepth`, as the last depth that still succeeds.
      let policy: P.Policy = P.hasRole("editor");
      for (let i = 0; i < 3; i += 1) policy = P.not(policy);
      const p = yield* toPredicate(policy, { maxDepth: 3 }).pipe(Effect.provide(layer));
      // hasRole("editor") folds to True for this tenant; three negations flip
      // it three times: True -> False -> True -> False.
      assert.deepStrictEqual(p, { _tag: "False" });
    }));

  it.effect("one node past the bound fails, unlike the exact boundary, and carries it", () =>
    Effect.gen(function* () {
      let policy: P.Policy = P.hasRole("editor");
      for (let i = 0; i < 4; i += 1) policy = P.not(policy);
      const r = yield* Effect.result(
        toPredicate(policy, { maxDepth: 3 }).pipe(Effect.provide(layer)),
      );
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "PolicyTooDeep");
      if (r.failure._tag !== "PolicyTooDeep") return;
      assert.strictEqual(r.failure.maxDepth, 3);
    }));
});

describe("restrictsFields protects every tag, not just HasPermission and Not", () => {
  it.effect("HasAttribute", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.hasAttribute("seniority", M.gte(3), { fields: ["seniority"] }),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("HasResourceAttribute", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.hasResourceAttribute("tenantId", M.eq(M.literal("t-1")), { fields: ["tenantId"] }),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("HasRelationship — the boolean is fully invertible", () =>
    Effect.gen(function* () {
      // Without `fields`, HasRelationship is untranslatable for an entirely
      // different reason (it cannot fold at all, regardless of fields). The
      // reason text is what pins the exact boolean rather than merely "it
      // failed" — a mutant flipping the condition either way changes which
      // reason comes back.
      const unrestricted = yield* failure(P.hasRelationship("owner"));
      assert.strictEqual(unrestricted?._tag, "PolicyNotTranslatable");
      if (unrestricted?._tag !== "PolicyNotTranslatable") return;
      assert.include(unrestricted.reason, "keyed by the row's id");

      const restricted = yield* failure(
        P.hasRelationship("owner", { fields: ["owner"] }),
      );
      assert.strictEqual(restricted?._tag, "PolicyNotTranslatable");
      if (restricted?._tag !== "PolicyNotTranslatable") return;
      assert.include(restricted.reason, "restricts visible fields");
    }));

  it.effect("HasAction", () =>
    Effect.gen(function* () {
      const f = yield* failure(P.hasAction("read", { fields: ["id"] }));
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("HasActed", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.hasActed("onboarded", { scope: "Any", fields: ["id"] }),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("HasNotActed", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.hasNotActed("onboarded", { scope: "Any", fields: ["id"] }),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("AnyOf — only AllOf was tested before", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.anyOf([
          P.hasRole("editor"),
          P.hasPermission(permission("doc", "read"), { fields: ["id"] }),
        ]),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("Rules — a restricted rule condition propagates up", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.rules([
          P.permitWhen(P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
        ]),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("Obliged", () =>
    Effect.gen(function* () {
      // Obliged is untranslatable on its own regardless of fields (INV-QD-013),
      // so the reason is what tells the two apart: this one must read as a
      // fields restriction, not "cannot carry an obligation".
      const f = yield* failure(
        P.obliged(
          obligation("log"),
          P.hasPermission(permission("doc", "read"), { fields: ["id"] }),
        ),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));

  it.effect("Labeled", () =>
    Effect.gen(function* () {
      const f = yield* failure(
        P.labeled("x", P.hasPermission(permission("doc", "read"), { fields: ["id"] })),
      );
      assert.strictEqual(f?._tag, "PolicyNotTranslatable");
      if (f?._tag !== "PolicyNotTranslatable") return;
      assert.include(f.reason, "restricts visible fields");
    }));
});

describe("folding simplifies, and False means do not run the query", () => {
  const tenancy = P.hasResourceAttribute("tenantId", M.eq(M.subject("tenantId")));

  it.effect("a satisfied conjunct disappears", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.allOf([P.hasRole("editor"), tenancy]));
      // Not `And([True, Compare])`. An unsimplified predicate compiles to junk.
      assert.deepStrictEqual(p, {
        _tag: "Compare",
        column: "tenantId",
        op: "Eq",
        value: "t-1",
      });
    }));

  it.effect("a failed conjunct collapses the whole filter", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.allOf([P.hasRole("admin"), tenancy]));
      // The result worth naming: the caller can skip the round trip entirely
      // rather than sending a `WHERE false`.
      assert.deepStrictEqual(p, { _tag: "False" });
    }));

  it.effect("a satisfied disjunct absorbs the filter", () =>
    Effect.gen(function* () {
      const p = yield* translate(P.anyOf([P.hasRole("editor"), tenancy]));
      assert.deepStrictEqual(p, { _tag: "True" });
    }));

  it.effect("negation folds the constants", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* translate(P.not(P.hasRole("editor"))), {
        _tag: "False",
      });
      assert.deepStrictEqual(yield* translate(P.not(P.hasRole("admin"))), { _tag: "True" });
    }));

  it.effect("an empty conjunction is True and an empty disjunction is False", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual(yield* translate(P.allOf([])), { _tag: "True" });
      assert.deepStrictEqual(yield* translate(P.anyOf([])), { _tag: "False" });
    }));

  it.effect("a label is transparent", () =>
    Effect.gen(function* () {
      // A predicate has no trace to put it on.
      assert.deepStrictEqual(yield* translate(P.labeled("tenancy", tenancy)), {
        _tag: "Compare",
        column: "tenantId",
        op: "Eq",
        value: "t-1",
      });
    }));
});

describe("a rule table becomes a set-based formula", () => {
  const owned = P.hasResourceAttribute("ownerId", M.eq(M.subjectId()));
  const sealed = P.hasResourceAttribute("sealed", M.eq(M.literal(true)));

  it.effect("PermitOverrides is the disjunction of the permits", () =>
    Effect.gen(function* () {
      const p = yield* translate(
        P.rules([P.denyWhen(sealed), P.permitWhen(owned)], {
          combining: "PermitOverrides",
        }),
      );
      assert.deepStrictEqual(p, {
        _tag: "Compare",
        column: "ownerId",
        op: "Eq",
        value: "u-1",
      });
    }));

  it.effect("DenyOverrides excludes the denies", () =>
    Effect.gen(function* () {
      const p = yield* translate(
        P.rules([P.denyWhen(sealed), P.permitWhen(owned)], { combining: "DenyOverrides" }),
      );
      assert.deepStrictEqual(p, {
        _tag: "And",
        predicates: [
          {
            _tag: "Negate",
            predicate: { _tag: "Compare", column: "sealed", op: "Eq", value: true },
          },
          { _tag: "Compare", column: "ownerId", op: "Eq", value: "u-1" },
        ],
      });
    }));

  it.effect("FirstApplicable makes each permit exclude every row above it", () =>
    Effect.gen(function* () {
      // The O(n^2) shape the ADR names as this algorithm's honest cost: pushing
      // an ordered walk into an engine that has no order.
      const p = yield* translate(
        P.rules([P.permitWhen(owned), P.denyWhen(sealed), P.permitWhen(P.allOf([]))]),
      );
      const isOwner: Predicate = {
        _tag: "Compare",
        column: "ownerId",
        op: "Eq",
        value: "u-1",
      };
      const isSealed: Predicate = {
        _tag: "Compare",
        column: "sealed",
        op: "Eq",
        value: true,
      };
      assert.deepStrictEqual(p, {
        _tag: "Or",
        predicates: [
          isOwner,
          {
            _tag: "And",
            predicates: [
              { _tag: "Negate", predicate: isOwner },
              { _tag: "Negate", predicate: isSealed },
            ],
          },
        ],
      });
    }));

  it.effect("the algorithms disagree, and the formulas do too", () =>
    Effect.gen(function* () {
      const rs = [P.permitWhen(owned), P.denyWhen(sealed)];
      const first = yield* translate(P.rules(rs, { combining: "FirstApplicable" }));
      const denies = yield* translate(P.rules(rs, { combining: "DenyOverrides" }));
      // Under FirstApplicable an owner is admitted even on a sealed row; under
      // DenyOverrides the seal wins wherever it is written.
      const sealedOwn = { ownerId: "u-1", sealed: true };
      assert.isTrue(evaluatePredicate(first, sealedOwn));
      assert.isFalse(evaluatePredicate(denies, sealedOwn));
    }));

  it.effect("an empty table is False under every algorithm", () =>
    Effect.gen(function* () {
      for (const combining of [
        "FirstApplicable" as const,
        "DenyOverrides" as const,
        "PermitOverrides" as const,
      ]) {
        assert.deepStrictEqual(yield* translate(P.rules([], { combining })), {
          _tag: "False",
        });
      }
    }));
});

describe("INV-QD-018: a predicate admits exactly the rows the evaluator allows", () => {
  type Row = Record<string, unknown>;

  const rows: FastCheck.Arbitrary<Row> = FastCheck.record({
    tenantId: FastCheck.constantFrom("t-1", "t-2"),
    ownerId: FastCheck.constantFrom("u-1", "u-2"),
    // Not just integers. A well-typed column never exercises the path where two
    // interpreters diverge, and a real text column holding "3" is exactly where
    // a coercing comparison admits a row the evaluator refuses.
    level: FastCheck.oneof(
      FastCheck.integer({ min: 0, max: 5 }),
      FastCheck.constantFrom("3", "0"),
      FastCheck.constant(null),
    ),
    tag: FastCheck.constantFrom("red", "blue", "green"),
    sealed: FastCheck.boolean(),
  });

  /** Only translatable shapes: an untranslatable one has nothing to compare. */
  const leaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
    FastCheck.constantFrom("editor", "admin").map((r) => P.hasRole(r)),
    FastCheck.constant(P.hasPermission(permission("doc", "read"))),
    FastCheck.constant(P.hasPermission(permission("doc", "delete"))),
    FastCheck.constantFrom("seniority", "riskScore", "absent").map((a) =>
      P.hasAttribute(a, M.gte(3)),
    ),
    FastCheck.constantFrom("t-1", "t-2").map((v) =>
      P.hasResourceAttribute("tenantId", M.eq(M.literal(v))),
    ),
    FastCheck.constant(P.hasResourceAttribute("tenantId", M.eq(M.subject("tenantId")))),
    FastCheck.constant(P.hasResourceAttribute("ownerId", M.eq(M.subjectId()))),
    FastCheck.constant(P.hasResourceAttribute("ownerId", M.neq(M.subjectId()))),
    FastCheck.integer({ min: 0, max: 5 }).map((n) =>
      P.hasResourceAttribute("level", M.gte(n)),
    ),
    FastCheck.integer({ min: 0, max: 5 }).map((n) => P.hasResourceAttribute("level", M.lt(n))),
    FastCheck.subarray(["red", "blue", "green"]).map((vs) =>
      P.hasResourceAttribute("tag", M.inArray(vs)),
    ),
    FastCheck.constant(P.hasResourceAttribute("sealed", M.eq(M.literal(true)))),
    // Absent columns matter: both interpreters must read `undefined` the same way.
    FastCheck.constant(P.hasResourceAttribute("missing", M.eq(M.literal("x")))),
    FastCheck.constantFrom("onboarded", "never").map((e) =>
      P.hasActed(e, { scope: "Any" }),
    ),
  );

  const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      leaf,
      FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, {
        maxLength: 3,
      }).map((ps) => P.allOf(ps)),
      FastCheck.array(tie("node") as FastCheck.Arbitrary<P.Policy>, {
        maxLength: 3,
      }).map((ps) => P.anyOf(ps)),
      (tie("node") as FastCheck.Arbitrary<P.Policy>).map(P.not),
      (tie("node") as FastCheck.Arbitrary<P.Policy>).map((p) => P.labeled("l", p)),
      FastCheck.tuple(
        FastCheck.array(
          FastCheck.tuple(
            tie("node") as FastCheck.Arbitrary<P.Policy>,
            FastCheck.boolean(),
          ).map(([c, permits]) => (permits ? P.permitWhen(c) : P.denyWhen(c))),
          { maxLength: 3 },
        ),
        FastCheck.constantFrom(
          "FirstApplicable" as const,
          "DenyOverrides" as const,
          "PermitOverrides" as const,
        ),
      ).map(([rs, combining]) => P.rules(rs, { combining })),
    ),
  })).node;

  it.effect("PROPERTY: the two interpreters agree, row by row", () =>
    Effect.gen(function* () {
      // The only evidence that makes a second interpreter over the same tree
      // trustworthy rather than merely plausible. It is obtainable at all only
      // because the predicate is executable (ADR-QD-024).
      const policies = FastCheck.sample(tree, { numRuns: 120, seed: 1024 });
      const sample = FastCheck.sample(rows, { numRuns: 12, seed: 1024 });

      for (const policy of policies) {
        const predicate = yield* translate(policy);
        for (const row of sample) {
          const admitted = evaluatePredicate(predicate, row);
          const decision = yield* evaluate(policy, { resource: row }).pipe(
            Effect.provide(layer),
          );
          assert.strictEqual(
            admitted,
            isAllowed(decision),
            `disagreement on ${JSON.stringify({ policy, row, predicate })}`,
          );
        }
      }
    }));
});
