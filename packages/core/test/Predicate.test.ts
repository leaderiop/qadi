import { assert, describe, it } from "@effect/vitest";
import * as Cause from "effect/Cause";
import * as Effect from "effect/Effect";
import * as Exit from "effect/Exit";
import * as Layer from "effect/Layer";
import * as Metric from "effect/Metric";
import * as Option from "effect/Option";
import * as Ref from "effect/Ref";
import * as Schedule from "effect/Schedule";
import type * as Tracer from "effect/Tracer";
import * as FastCheck from "fast-check";
import { AttributeResolver } from "../src/AttributeResolver.ts";
import type { Decision } from "../src/Decision.ts";
import { isAllowed } from "../src/Decision.ts";
import type { ActedResult } from "../src/DecisionHistory.ts";
import { DecisionHistory } from "../src/DecisionHistory.ts";
import {
  AttributeResolveError,
  DecisionHistoryUnavailable,
  MissingAction,
  PolicyNotTranslatable,
} from "../src/Errors.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import { obligation } from "../src/Obligation.ts";
import { permission } from "../src/Permission.ts";
import * as P from "../src/Policy.ts";
import type { Predicate } from "../src/Predicate.ts";
import { evaluatePredicate, toPredicate } from "../src/Predicate.ts";
import { collectingTracer, isolatedMetrics, subjectWith, testLayer } from "./helpers.ts";

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
    // Denies rather than matching (CCR-QD-112): an absent column is unknown,
    // not "not equal to x". Before the fix this was `isTrue` — the same
    // fail-open H2 found in `evaluateMatcher`'s `Neq`, mirrored here because
    // `evaluatePredicate` is a second interpreter over the same semantics.
    assert.isFalse(
      evaluatePredicate({ _tag: "Compare", column: "nope", op: "Neq", value: "x" }, row),
    );
  });

  it("a Compare against an undefined constant always denies, on either op (CCR-QD-112)", () => {
    assert.isFalse(
      evaluatePredicate({ _tag: "Compare", column: "level", op: "Eq", value: undefined }, row),
    );
    assert.isFalse(
      evaluatePredicate({ _tag: "Compare", column: "level", op: "Neq", value: undefined }, row),
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

  it.effect("a custom predicate cannot fold — it is opaque, registered logic", () =>
    Effect.gen(function* () {
      const f = yield* reasonFor(P.hasCustom("isOwner"));
      assert.strictEqual(f?.policyTag, "HasCustom");
    }));

  it.effect("a signature lookup cannot fold — it is looked up through an external port", () =>
    Effect.gen(function* () {
      const f = yield* reasonFor(P.hasSignature("approved"));
      assert.strictEqual(f?.policyTag, "HasSignature");
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

  it.effect("an extremely deep, hand-built tree fails with PolicyTooDeep, not a stack overflow", () =>
    Effect.gen(function* () {
      // `restrictsFields` runs before `compile`
      // and, unlike it, is plain synchronous recursion rather than
      // Effect-trampolined — so it has to bound its own recursion before
      // reaching a depth this deep, or the call stack overflows first with a
      // raw RangeError instead of this typed failure (ticket 135).
      let policy: P.Policy = P.hasRole("editor");
      for (let i = 0; i < 100_000; i += 1) policy = P.not(policy);
      const r = yield* Effect.result(translate(policy));
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure._tag, "PolicyTooDeep");
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
    // Not just finite integers (CCR-QD-115). `Matcher.ts`'s `gte`/`lt` guard
    // their bound with `Number.isFinite` because a bound arrives from
    // untrusted JSON, where `1e400` decodes to `Infinity`; `compare` in
    // `Predicate.ts` did not, so `M.gte(-Infinity)` admitted every numeric row
    // through `toPredicate` while `evaluate` denied every one — this property
    // stated exactly that disagreement and never sampled the value that shows
    // it. `-Infinity`/`NaN` are the two that mattered: `-Infinity` is the
    // dominating bound for `Gte` (and `Infinity` for `Lt`), `NaN` is false
    // under the raw operator either way and so pins the guard is not
    // redundant with `>=`/`<` themselves.
    FastCheck.constantFrom(
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
    ).map((n) => P.hasResourceAttribute("level", M.gte(n))),
    FastCheck.constantFrom(
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
    ).map((n) => P.hasResourceAttribute("level", M.lt(n))),
    // Eq/Neq against NaN: `===`/`!==` on both sides, so the two interpreters
    // already agree — sampled so a future change to either one that special-
    // cases NaN (SameValueZero, say, which `inArray` genuinely does use — see
    // Matcher.test.ts's "eq vs inArray" block) breaks this property instead
    // of shipping.
    FastCheck.constant(P.hasResourceAttribute("level", M.eq(M.literal(Number.NaN)))),
    FastCheck.constant(P.hasResourceAttribute("level", M.neq(M.literal(Number.NaN)))),
    // The subject side folds to a constant before a Compare is ever built, so
    // a non-finite bound there exercises `translateMatcher`'s other branch.
    FastCheck.constantFrom(Number.POSITIVE_INFINITY, Number.NaN).map((n) =>
      P.hasAttribute("riskScore", M.gte(n)),
    ),
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

  const tree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      leaf,
      FastCheck.array(tie("node"), {
        maxLength: 3,
      }).map((ps) => P.allOf(ps)),
      FastCheck.array(tie("node"), {
        maxLength: 3,
      }).map((ps) => P.anyOf(ps)),
      tie("node").map(P.not),
      tie("node").map((p) => P.labeled("l", p)),
      FastCheck.tuple(
        FastCheck.array(
          FastCheck.tuple(tie("node"), FastCheck.boolean()).map(([c, permits]) =>
            permits ? P.permitWhen(c) : P.denyWhen(c),
          ),
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

  // The named case the property above now samples, kept as its own test
  // because a seeded sample is not evidence a reader can check by eye
  // (CCR-QD-115, issue #65). Before the `Number.isFinite` guard in `compare`,
  // `toPredicate` on this policy admitted every row with a numeric `level`
  // while `evaluate` on the identical policy denied every one — the exact
  // failure mode ADR-QD-024 warns would make `toPredicate` worse than not
  // having it, since a filter that admits everything is a silent bypass.
  it.effect("a non-finite Gte/Lt bound denies on both sides, never admits on one", () =>
    Effect.gen(function* () {
      const row = { level: 3 };
      const cases = [
        P.hasResourceAttribute("level", M.gte(Number.NEGATIVE_INFINITY)),
        P.hasResourceAttribute("level", M.gte(Number.POSITIVE_INFINITY)),
        P.hasResourceAttribute("level", M.gte(Number.NaN)),
        P.hasResourceAttribute("level", M.lt(Number.POSITIVE_INFINITY)),
        P.hasResourceAttribute("level", M.lt(Number.NEGATIVE_INFINITY)),
        P.hasResourceAttribute("level", M.lt(Number.NaN)),
      ];
      for (const policy of cases) {
        const predicate = yield* translate(policy);
        const decision = yield* evaluate(policy, { resource: row }).pipe(Effect.provide(layer));
        assert.isFalse(isAllowed(decision));
        assert.isFalse(evaluatePredicate(predicate, row));
      }
    }));

  // -------------------------------------------------------------------------
  // INV-QD-NEXT — translation fails only as evaluation would. The properties
  // above sample well-behaved ports; these sample *faulty* ones, because a
  // property is only as strong as the untidiness of its data (see this
  // invariant's own lesson, INV-QD-018). Each port answers, fails typed, dies,
  // or throws synchronously, and every call is logged, so the two interpreters
  // are compared on *what they asked* as well as on what they concluded.
  // -------------------------------------------------------------------------

  type Behavior<A> =
    | { readonly _tag: "Answer"; readonly value: A }
    | { readonly _tag: "Fail" }
    | { readonly _tag: "Die" }
    | { readonly _tag: "Throw" };

  interface PortWorld {
    readonly riskScore: Behavior<number | undefined>;
    readonly absent: Behavior<number | undefined>;
    readonly onboarded: Behavior<ActedResult>;
    readonly never: Behavior<ActedResult>;
  }

  type PortCallKey = "attr:riskScore" | "attr:absent" | "acted:onboarded" | "acted:never";

  /** ~70% an answer, ~10% each fault, so most trees still translate. */
  const behavior = <A>(answer: FastCheck.Arbitrary<A>): FastCheck.Arbitrary<Behavior<A>> =>
    FastCheck.oneof(
      { arbitrary: answer.map((value): Behavior<A> => ({ _tag: "Answer", value })), weight: 7 },
      { arbitrary: FastCheck.constant<Behavior<A>>({ _tag: "Fail" }), weight: 1 },
      { arbitrary: FastCheck.constant<Behavior<A>>({ _tag: "Die" }), weight: 1 },
      { arbitrary: FastCheck.constant<Behavior<A>>({ _tag: "Throw" }), weight: 1 },
    );

  const acted: FastCheck.Arbitrary<ActedResult> = FastCheck.constantFrom(
    "Acted",
    "NotActed",
    "Unknown",
  );

  const worlds: FastCheck.Arbitrary<PortWorld> = FastCheck.record({
    riskScore: behavior(FastCheck.oneof(FastCheck.integer({ min: 0, max: 5 }), FastCheck.constant(undefined))),
    absent: behavior(FastCheck.constant(undefined)),
    onboarded: behavior(acted),
    never: behavior(acted),
  });

  const noDeaths = <A>(b: Behavior<A>): Behavior<A> =>
    b._tag === "Die" || b._tag === "Throw" ? { _tag: "Fail" } : b;

  const withoutDeaths = (world: PortWorld): PortWorld => ({
    riskScore: noDeaths(world.riskScore),
    absent: noDeaths(world.absent),
    onboarded: noDeaths(world.onboarded),
    never: noDeaths(world.never),
  });

  /** Honours one behaviour. `Throw` throws while *building* the Effect. */
  const behave = <A, E>(b: Behavior<A>, typed: () => E): Effect.Effect<A, E> => {
    if (b._tag === "Answer") return Effect.succeed(b.value);
    if (b._tag === "Fail") return Effect.fail(typed());
    if (b._tag === "Die") return Effect.die(new Error("die"));
    throw new Error("throw");
  };

  /** Ports driven by `world`, appending to `log` before honouring each call. */
  const worldLayer = (world: PortWorld, log: Array<PortCallKey>) =>
    testLayer(tenant, {
      attributes: Layer.succeed(AttributeResolver, {
        resolve: (_id: string, attribute: string) => {
          const key = attribute === "riskScore" ? "riskScore" : "absent";
          log.push(key === "riskScore" ? "attr:riskScore" : "attr:absent");
          return behave(world[key], () => new AttributeResolveError({ attribute, cause: "down" }));
        },
      }),
      history: Layer.succeed(DecisionHistory, {
        hasActed: (query) => {
          const key = query.event === "onboarded" ? "onboarded" : "never";
          log.push(key === "onboarded" ? "acted:onboarded" : "acted:never");
          return behave(
            world[key],
            () => new DecisionHistoryUnavailable({ event: query.event, cause: "down" }),
          );
        },
      }),
    });

  /** A failure as the label two interpreters must agree on — tag plus what it names. */
  const labelOfError = (error: unknown): string => {
    if (error instanceof AttributeResolveError) return `AttributeResolveError:${error.attribute}`;
    if (error instanceof DecisionHistoryUnavailable) {
      return `DecisionHistoryUnavailable:${error.event}`;
    }
    if (error instanceof MissingAction) return `MissingAction:${String(error.expected)}`;
    return typeof error === "object" && error !== null && "_tag" in error
      ? `other:${String(error._tag)}`
      : "unknown";
  };

  const labelOfCause = (cause: Cause.Cause<unknown>): string =>
    Cause.hasDies(cause) ? "DEFECT" : labelOfError(Cause.squash(cause));

  const labelOfEvaluation = (exit: Exit.Exit<Decision, unknown>): string =>
    Exit.isSuccess(exit) ? (isAllowed(exit.value) ? "allow" : "deny") : labelOfCause(exit.cause);

  const labelOfTranslation = (exit: Exit.Exit<Predicate, unknown>): string => {
    if (Exit.isFailure(exit)) return labelOfCause(exit.cause);
    if (exit.value._tag === "True") return "allow";
    return exit.value._tag === "False" ? "deny" : `predicate:${exit.value._tag}`;
  };

  /** Resource-free trees: nothing a column could make row-dependent. */
  const freeLeaf: FastCheck.Arbitrary<P.Policy> = FastCheck.oneof(
    FastCheck.constantFrom("editor", "admin").map((r) => P.hasRole(r)),
    FastCheck.constant(P.hasPermission(permission("doc", "read"))),
    FastCheck.constant(P.hasPermission(permission("doc", "delete"))),
    FastCheck.constantFrom("seniority", "riskScore", "absent").map((a) =>
      P.hasAttribute(a, M.gte(3)),
    ),
    FastCheck.constantFrom("onboarded", "never").map((e) => P.hasActed(e, { scope: "Any" })),
    FastCheck.constantFrom("onboarded", "never").map((e) => P.hasNotActed(e, { scope: "Any" })),
    FastCheck.constantFrom("read", "write").map((a) => P.hasAction(a)),
  );

  const strategy = FastCheck.constantFrom(
    "First" as const,
    "Intersection" as const,
    "Union" as const,
  );

  const freeTree: FastCheck.Arbitrary<P.Policy> = FastCheck.letrec<{ node: P.Policy }>((tie) => ({
    node: FastCheck.oneof(
      { maxDepth: 4, withCrossShrink: true },
      freeLeaf,
      FastCheck.array(tie("node"), { maxLength: 3 }).map((ps) => P.allOf(ps)),
      FastCheck.tuple(FastCheck.array(tie("node"), { maxLength: 3 }), strategy).map(
        ([ps, fieldStrategy]) => P.anyOf(ps, { fieldStrategy }),
      ),
      tie("node").map(P.not),
      tie("node").map((p) => P.labeled("l", p)),
      FastCheck.tuple(
        FastCheck.array(
          FastCheck.tuple(tie("node"), FastCheck.boolean()).map(([c, permits]) =>
            permits ? P.permitWhen(c) : P.denyWhen(c),
          ),
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

  const actions = FastCheck.constantFrom<string | undefined>(undefined, "read", "write");

  it.effect("PROPERTY: on resource-free trees the two interpreters make the same port calls and end the same way", () =>
    Effect.gen(function* () {
      // INV-QD-NEXT (2). The strongest statement available: not merely "the
      // same answer" but "asked the same stores, in the same order" — so a
      // translation that asks a port the evaluator would have skipped, or
      // fails where the evaluator decided, is a counterexample.
      const cases = FastCheck.sample(FastCheck.tuple(freeTree, worlds, actions), {
        numRuns: 200,
        seed: 2048,
      });

      for (const [policy, world, action] of cases) {
        const evalLog: Array<PortCallKey> = [];
        const predLog: Array<PortCallKey> = [];
        const evaluated = yield* Effect.exit(
          evaluate(policy, {
            resource: { id: "r" },
            ...(action === undefined ? {} : { action }),
          }).pipe(Effect.provide(worldLayer(world, evalLog))),
        );
        const translated = yield* Effect.exit(
          toPredicate(policy, action === undefined ? undefined : { action }).pipe(
            Effect.provide(worldLayer(world, predLog)),
          ),
        );

        const where = JSON.stringify({ policy, world, action });
        assert.deepStrictEqual(predLog, evalLog, `different port calls on ${where}`);
        assert.strictEqual(
          labelOfTranslation(translated),
          labelOfEvaluation(evaluated),
          `different outcome on ${where}`,
        );
      }
    }));

  it.effect("PROPERTY: a translation that succeeds agrees with the evaluator on every row, and a failure is typed", () =>
    Effect.gen(function* () {
      // INV-QD-NEXT (1) and (3), over full trees with columns.
      const cases = FastCheck.sample(FastCheck.tuple(tree, worlds), { numRuns: 120, seed: 4096 });
      const sample = FastCheck.sample(rows, { numRuns: 12, seed: 4096 });

      for (const [policy, world] of cases) {
        const predLog: Array<PortCallKey> = [];
        const translated = yield* Effect.exit(
          toPredicate(policy).pipe(Effect.provide(worldLayer(world, predLog))),
        );
        const where = JSON.stringify({ policy, world });

        if (Exit.isFailure(translated)) {
          assert.isFalse(Cause.hasDies(translated.cause), `a defect on ${where}`);
          assert.match(
            labelOfCause(translated.cause),
            /^(AttributeResolveError|DecisionHistoryUnavailable|MissingAction):/,
            `an unexpected failure on ${where}`,
          );
          continue;
        }

        for (const row of sample) {
          const rowLog: Array<PortCallKey> = [];
          const verdict = yield* Effect.exit(
            evaluate(policy, { resource: row }).pipe(Effect.provide(worldLayer(world, rowLog))),
          );
          assert.isTrue(Exit.isSuccess(verdict), `the evaluator failed on a row where translation succeeded: ${where}`);
          if (!Exit.isSuccess(verdict)) continue;
          assert.strictEqual(
            evaluatePredicate(translated.value, row),
            isAllowed(verdict.value),
            `disagreement on ${JSON.stringify({ policy, world, row })}`,
          );
          for (const key of rowLog) {
            assert.include(predLog, key, `the evaluator asked ${key}, which translation never did: ${where}`);
          }
        }
      }
    }));

  it.effect("PROPERTY: a port that dies reads as a port that fails, through both interpreters", () =>
    Effect.gen(function* () {
      // INV-QD-NEXT (1), stated as an equivalence: replacing every death with
      // the port's own typed failure changes nothing either interpreter says.
      const cases = FastCheck.sample(FastCheck.tuple(tree, worlds), { numRuns: 120, seed: 8192 });
      const row = { tenantId: "t-1", ownerId: "u-1", level: 3, tag: "red", sealed: false };

      for (const [policy, world] of cases) {
        const tame = withoutDeaths(world);
        const where = JSON.stringify({ policy, world });

        const translatedBy = (w: PortWorld) =>
          Effect.exit(toPredicate(policy).pipe(Effect.provide(worldLayer(w, []))));
        const evaluatedBy = (w: PortWorld) =>
          Effect.exit(
            evaluate(policy, { resource: row }).pipe(Effect.provide(worldLayer(w, []))),
          );

        const [dyingT, tameT] = [yield* translatedBy(world), yield* translatedBy(tame)];
        assert.strictEqual(labelOfTranslation(dyingT), labelOfTranslation(tameT), `translation on ${where}`);
        if (Exit.isSuccess(dyingT) && Exit.isSuccess(tameT)) {
          assert.deepStrictEqual(dyingT.value, tameT.value, `predicate on ${where}`);
        }

        const [dyingE, tameE] = [yield* evaluatedBy(world), yield* evaluatedBy(tame)];
        assert.strictEqual(labelOfEvaluation(dyingE), labelOfEvaluation(tameE), `evaluation on ${where}`);
      }
    }));
});

describe("qadi_predicates_translated_total", () => {
  it.effect("counts a successful translation", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        translate(P.hasRole("editor")).pipe(Effect.flatMap(() => Metric.snapshot)),
      );

      const counter = snapshots.find(
        (s): s is Extract<Metric.Metric.Snapshot, { type: "Counter" }> =>
          s.type === "Counter" && s.id === "qadi_predicates_translated_total",
      );
      assert.isDefined(counter);
      assert.strictEqual(counter?.state.count, 1);
    }));

  it.effect("does not count a translation that fails", () =>
    Effect.gen(function* () {
      const snapshots = yield* isolatedMetrics(
        Effect.gen(function* () {
          yield* Effect.result(translate(P.hasPermission(permission("doc", "read"), { fields: ["id"] })));
          return yield* Metric.snapshot;
        }),
      );

      const counter = snapshots.find(
        (s): s is Extract<Metric.Metric.Snapshot, { type: "Counter" }> =>
          s.type === "Counter" && s.id === "qadi_predicates_translated_total",
      );
      assert.isUndefined(counter);
    }));
});

/**
 * A port that *dies* — throws out of its own Effect construction, or
 * `Effect.die`s — must reach a caller of `toPredicate` as the port's own typed
 * error, exactly as it does through `evaluate` (issue #100, BEH-QD-261). A
 * defect would sail past `Effect.retry` and `Effect.catchTag`, which only ever
 * see the typed channel.
 */
describe("BEH-QD-NEXT-a: a defecting port fails translation typed, not dead", () => {
  const riskPolicy = P.hasAttribute("riskScore", M.lt(50));
  const actedPolicy = P.hasActed("onboarded", { scope: "Any" });

  const run = (policy: P.Policy, overrides: Parameters<typeof testLayer>[1]) =>
    Effect.result(
      toPredicate(policy).pipe(Effect.provide(testLayer(subjectWith({}), overrides))),
    );

  it.effect("a dying AttributeResolver surfaces as AttributeResolveError", () =>
    Effect.gen(function* () {
      const dying = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.die(new Error("boom")),
      });
      const r = yield* run(riskPolicy, { attributes: dying });
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      if (!(r.failure instanceof AttributeResolveError)) return;
      assert.strictEqual(r.failure.attribute, "riskScore");
    }));

  it.effect("a synchronously throwing AttributeResolver surfaces as AttributeResolveError", () =>
    Effect.gen(function* () {
      const throwing = Layer.succeed(AttributeResolver, {
        resolve: () => {
          throw new Error("boom");
        },
      });
      const r = yield* run(riskPolicy, { attributes: throwing });
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
    }));

  it.effect("a dying DecisionHistory surfaces as DecisionHistoryUnavailable", () =>
    Effect.gen(function* () {
      const dying = Layer.succeed(DecisionHistory, {
        hasActed: () => Effect.die(new Error("boom")),
      });
      const r = yield* run(actedPolicy, { history: dying });
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, DecisionHistoryUnavailable);
      if (!(r.failure instanceof DecisionHistoryUnavailable)) return;
      assert.strictEqual(r.failure.event, "onboarded");
    }));

  it.effect("a port's own typed failure is the same instance after translation", () =>
    Effect.gen(function* () {
      const original = new AttributeResolveError({ attribute: "riskScore", cause: "down" });
      const failing = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.fail(original),
      });
      const r = yield* run(riskPolicy, { attributes: failing });
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.strictEqual(r.failure, original);
    }));

  it.effect("an interrupting port is never converted into a retryable error", () =>
    Effect.gen(function* () {
      const interrupting = Layer.succeed(AttributeResolver, {
        resolve: () => Effect.interrupt,
      });
      const exit = yield* Effect.exit(
        toPredicate(riskPolicy).pipe(
          Effect.provide(testLayer(subjectWith({}), { attributes: interrupting })),
        ),
      );
      assert.isTrue(Exit.isFailure(exit));
      if (!Exit.isFailure(exit)) return;
      assert.isTrue(Cause.hasInterruptsOnly(exit.cause));
    }));

  it.effect("Effect.retry sees a defecting port, and a later answer translates", () =>
    Effect.gen(function* () {
      const attempts = yield* Ref.make(0);
      const flaky = Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.flatMap(
            Ref.updateAndGet(attempts, (n) => n + 1),
            (n) => (n <= 2 ? Effect.die(new Error("boom")) : Effect.succeed(9)),
          ),
      });
      const predicate = yield* toPredicate(P.hasAttribute("riskScore", M.gte(5))).pipe(
        Effect.provide(testLayer(subjectWith({}), { attributes: flaky })),
        Effect.retry(Schedule.recurs(2)),
      );
      assert.deepStrictEqual(predicate, { _tag: "True" });
      assert.strictEqual(yield* Ref.get(attempts), 3);
    }));
});

/**
 * `toPredicate`'s port reads are spans too (ADR-QD-051, BEH-QD-NEXT-d): the same
 * `qadi.attribute`/`qadi.acted` the evaluator emits, under `qadi.toPredicate`,
 * annotated `qadi.interpreter: "toPredicate"` so a trace reader can tell a
 * translation's read from an evaluation's.
 */
describe("BEH-QD-NEXT-d: translation's port reads are spans", () => {
  const named = (spans: ReadonlyArray<Tracer.Span>, name: string) =>
    spans.find((s) => s.name === name);
  const attributesOf = (span: Tracer.Span | undefined): Record<string, unknown> =>
    span === undefined ? {} : Object.fromEntries(span.attributes);

  const resolver = Layer.succeed(AttributeResolver, {
    name: "record",
    resolve: (_id: string, attribute: string) => Effect.succeed(attribute === "riskScore" ? 20 : undefined),
  });

  it.effect("a resolved attribute spans under qadi.toPredicate and records no value", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* toPredicate(P.hasAttribute("riskScore", M.lt(50))).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(subjectWith({ id: "u9" }), { attributes: resolver }),
            collectingTracer(spans),
          ),
        ),
      );

      const span = named(spans, "qadi.attribute");
      const root = named(spans, "qadi.toPredicate");
      assert.isDefined(span);
      assert.isDefined(root);
      assert.deepStrictEqual(attributesOf(span), {
        "qadi.attribute": "riskScore",
        "qadi.subject_id": "u9",
        "qadi.interpreter": "toPredicate",
        "qadi.resolved": true,
      });
      // The parent is the translation, not some ambient span.
      assert.deepStrictEqual(
        Option.map(span?.parent ?? Option.none(), (p) => p.spanId),
        Option.some(root?.spanId),
      );
    }));

  it.effect("an attribute the subject carries emits no span", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* toPredicate(P.hasAttribute("riskScore", M.lt(50))).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(subjectWith({ attributes: { riskScore: 20 } }), { attributes: resolver }),
            collectingTracer(spans),
          ),
        ),
      );

      assert.isUndefined(named(spans, "qadi.attribute"));
    }));

  it.effect("a failing port's span still carries the question", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      const failing = Layer.succeed(AttributeResolver, {
        resolve: (_id: string, attribute: string) =>
          Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
      });
      yield* Effect.result(
        toPredicate(P.hasAttribute("riskScore", M.lt(50))).pipe(
          Effect.provide(
            Layer.mergeAll(
              testLayer(subjectWith({ id: "u9" }), { attributes: failing }),
              collectingTracer(spans),
            ),
          ),
        ),
      );

      assert.deepStrictEqual(attributesOf(named(spans, "qadi.attribute")), {
        "qadi.attribute": "riskScore",
        "qadi.subject_id": "u9",
        "qadi.interpreter": "toPredicate",
      });
    }));

  it.effect("a history question spans as qadi.acted, scoped to Any", () =>
    Effect.gen(function* () {
      const spans: Array<Tracer.Span> = [];
      yield* toPredicate(P.hasActed("onboarded", { scope: "Any" })).pipe(
        Effect.provide(
          Layer.mergeAll(
            testLayer(subjectWith({ id: "u9" }), { history: acted }),
            collectingTracer(spans),
          ),
        ),
      );

      assert.deepStrictEqual(attributesOf(named(spans, "qadi.acted")), {
        "qadi.subject_id": "u9",
        "qadi.event": "onboarded",
        "qadi.scope": "Any",
        "qadi.interpreter": "toPredicate",
        "qadi.answer": "Acted",
      });
    }));
});

/**
 * Translation asks no port a constant has already decided (BEH-QD-NEXT-b), and a
 * refusal depends on the tree alone (BEH-QD-NEXT-c). Each case is the shape
 * ARCH-01's E8 found diverging from the evaluator, kept as a named test because a
 * seeded property sample is not evidence a reader can check by eye.
 */
describe("BEH-QD-NEXT-b: translation stops where the evaluator stops", () => {
  /** A resolver that always fails typed, and counts how often it was asked. */
  const failingResolver = () => {
    const counter = { calls: 0 };
    const layer = Layer.succeed(AttributeResolver, {
      resolve: (_id: string, attribute: string) =>
        Effect.suspend(() => {
          counter.calls += 1;
          return Effect.fail(new AttributeResolveError({ attribute, cause: "down" }));
        }),
    });
    return { counter, layer };
  };

  const askWith = (
    policy: P.Policy,
    attributes: Layer.Layer<AttributeResolver>,
    options?: { readonly action?: string; readonly subject?: ReturnType<typeof subjectWith> },
  ) =>
    Effect.result(
      toPredicate(policy, options?.action === undefined ? undefined : { action: options.action }).pipe(
        Effect.provide(testLayer(options?.subject ?? tenant, { attributes })),
      ),
    );

  const broken = P.hasAttribute("riskScore", M.gte(1));

  it.effect("an anyOf stops at a role that already allows", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const r = yield* askWith(P.anyOf([P.hasRole("editor"), broken]), resolver);
      assert.deepStrictEqual(r._tag === "Success" ? r.success : undefined, { _tag: "True" });
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("under Union an anyOf must see every child, as the evaluator does", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.anyOf([P.hasRole("editor"), broken], { fieldStrategy: "Union" });
      const r = yield* askWith(policy, resolver);
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, AttributeResolveError);
      assert.strictEqual(counter.calls, 1);
    }));

  it.effect("an allOf stops at a role that already denies", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const r = yield* askWith(P.allOf([P.hasRole("admin"), broken]), resolver);
      assert.deepStrictEqual(r._tag === "Success" ? r.success : undefined, { _tag: "False" });
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("PermitOverrides stops at a permit that already holds", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.rules([P.permitWhen(P.hasRole("editor")), P.permitWhen(broken)], {
        combining: "PermitOverrides",
      });
      const r = yield* askWith(policy, resolver);
      assert.deepStrictEqual(r._tag === "Success" ? r.success : undefined, { _tag: "True" });
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("DenyOverrides stops at a deny that already holds", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.rules([P.denyWhen(P.hasRole("editor")), P.permitWhen(broken)], {
        combining: "DenyOverrides",
      });
      const r = yield* askWith(policy, resolver);
      assert.deepStrictEqual(r._tag === "Success" ? r.success : undefined, { _tag: "False" });
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("DenyOverrides does not stop at a permit — a later deny could still beat it", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.rules([P.permitWhen(P.hasRole("editor")), P.denyWhen(broken)], {
        combining: "DenyOverrides",
      });
      const r = yield* askWith(policy, resolver);
      assert.strictEqual(r._tag, "Failure");
      assert.strictEqual(counter.calls, 1);
    }));

  it.effect("FirstApplicable stops at the first rule that applies, whatever its effect", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.rules([P.denyWhen(P.hasRole("editor")), P.permitWhen(broken)], {
        combining: "FirstApplicable",
      });
      const r = yield* askWith(policy, resolver);
      assert.deepStrictEqual(r._tag === "Success" ? r.success : undefined, { _tag: "False" });
      assert.strictEqual(counter.calls, 0);
    }));

  it.effect("a rule that does not apply is walked past", () =>
    Effect.gen(function* () {
      const { counter, layer: resolver } = failingResolver();
      const policy = P.rules([P.permitWhen(P.hasRole("admin")), P.permitWhen(broken)], {
        combining: "FirstApplicable",
      });
      const r = yield* askWith(policy, resolver);
      assert.strictEqual(r._tag, "Failure");
      assert.strictEqual(counter.calls, 1);
    }));
});

describe("BEH-QD-NEXT-c: a refusal depends on the tree alone", () => {
  const throwing = Layer.succeed(AttributeResolver, {
    resolve: (_id: string, attribute: string) =>
      Effect.fail(new AttributeResolveError({ attribute, cause: "down" })),
  });

  const outcomeFor = (
    policy: P.Policy,
    subject: ReturnType<typeof subjectWith>,
    options?: { readonly action?: string },
  ) =>
    Effect.result(
      toPredicate(policy, options).pipe(
        Effect.provide(testLayer(subject, { attributes: throwing })),
      ),
    );

  it.effect("an untranslatable node refuses for the subject a constant would have decided", () =>
    Effect.gen(function* () {
      // For an editor the role alone decides this anyOf, so a walk that pruned
      // before it refused would translate it. It must refuse for everyone.
      const policy = P.anyOf([P.hasRole("editor"), P.hasRelationship("owner")]);
      for (const subject of [tenant, subjectWith({})]) {
        const r = yield* outcomeFor(policy, subject);
        assert.strictEqual(r._tag, "Failure");
        if (r._tag !== "Failure") return;
        assert.instanceOf(r.failure, PolicyNotTranslatable);
        if (!(r.failure instanceof PolicyNotTranslatable)) return;
        assert.strictEqual(r.failure.policyTag, "HasRelationship");
      }
    }));

  it.effect("a refusal anywhere wins over a port fault earlier in the tree", () =>
    Effect.gen(function* () {
      const policy = P.allOf([P.hasAttribute("riskScore", M.gte(1)), P.hasCustom("x")]);
      const r = yield* outcomeFor(policy, tenant);
      assert.strictEqual(r._tag, "Failure");
      if (r._tag !== "Failure") return;
      assert.instanceOf(r.failure, PolicyNotTranslatable);
      if (!(r.failure instanceof PolicyNotTranslatable)) return;
      assert.strictEqual(r.failure.policyTag, "HasCustom");
    }));

  it.effect("a missing action is raised on reach, not statically", () =>
    Effect.gen(function* () {
      // Not reached: a constant already decided, so no action was needed.
      const unreached = yield* outcomeFor(
        P.anyOf([P.hasRole("editor"), P.hasAction("read")]),
        tenant,
      );
      assert.deepStrictEqual(unreached._tag === "Success" ? unreached.success : undefined, {
        _tag: "True",
      });
      const alsoUnreached = yield* outcomeFor(
        P.allOf([P.hasRole("admin"), P.hasAction("read")]),
        tenant,
      );
      assert.deepStrictEqual(alsoUnreached._tag === "Success" ? alsoUnreached.success : undefined, {
        _tag: "False",
      });

      // Reached: nothing decided first, so the evaluator fails here too.
      const reached = yield* outcomeFor(
        P.allOf([P.hasRole("editor"), P.hasAction("read")]),
        tenant,
      );
      assert.strictEqual(reached._tag, "Failure");
      if (reached._tag !== "Failure") return;
      assert.instanceOf(reached.failure, MissingAction);
      if (!(reached.failure instanceof MissingAction)) return;
      assert.strictEqual(reached.failure.expected, "read");
    }));
});
