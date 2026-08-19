import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import {
  AttributeResolver,
  AttributeResolverNone,
  attributeResolverFromRecord,
} from "../src/AttributeResolver.ts";
import { CurrentSubject, CurrentSubjectAnonymous } from "../src/CurrentSubject.ts";
import { isAllowed } from "../src/Decision.ts";
import { EvaluationId, EvaluationIdLive } from "../src/EvaluationId.ts";
import { evaluate } from "../src/Evaluate.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import {
  RelationshipResolver,
  RelationshipResolverNever,
  relationshipResolverFromEdges,
} from "../src/RelationshipResolver.ts";
import { subjectWith, testLayer } from "./helpers.ts";

describe("default layers", () => {
  it.effect("AttributeResolverNone resolves to undefined", () =>
    Effect.gen(function* () {
      const value = yield* AttributeResolver.resolve("u", "anything");
      assert.isUndefined(value);
    }).pipe(Effect.provide(AttributeResolverNone)));

  it.effect("attributeResolverFromRecord reads a static table", () =>
    Effect.gen(function* () {
      assert.strictEqual(yield* AttributeResolver.resolve("u", "tier"), "gold");
      assert.isUndefined(yield* AttributeResolver.resolve("u", "absent"));
    }).pipe(Effect.provide(attributeResolverFromRecord({ tier: "gold" }))));

  it.effect("RelationshipResolverNever denies everything", () =>
    Effect.gen(function* () {
      const related = yield* RelationshipResolver.check({
        subjectId: "u",
        relation: "owner",
        resourceId: "d",
        depth: undefined,
      });
      assert.isFalse(related);
    }).pipe(Effect.provide(RelationshipResolverNever)));

  it.effect("relationshipResolverFromEdges matches direct edges only", () =>
    Effect.gen(function* () {
      const layer = relationshipResolverFromEdges([
        { subjectId: "u", relation: "owner", resourceId: "d" },
      ]);
      const hit = yield* RelationshipResolver.check({
        subjectId: "u",
        relation: "owner",
        resourceId: "d",
        depth: 5,
      }).pipe(Effect.provide(layer));
      const miss = yield* RelationshipResolver.check({
        subjectId: "u",
        relation: "editor",
        resourceId: "d",
        depth: undefined,
      }).pipe(Effect.provide(layer));
      assert.isTrue(hit);
      assert.isFalse(miss);
    }));

  it.effect("CurrentSubjectAnonymous fails closed", () =>
    Effect.gen(function* () {
      const subject = yield* CurrentSubject;
      assert.strictEqual(subject.id, "anonymous");
      assert.strictEqual(subject.permissions.size, 0);
    }).pipe(Effect.provide(CurrentSubjectAnonymous)));

  it.effect("EvaluationIdLive produces distinct identifiers", () =>
    Effect.gen(function* () {
      const a = yield* EvaluationId.next;
      const b = yield* EvaluationId.next;
      assert.notStrictEqual(a, b);
      assert.isAtLeast(a.length, 8);
    }).pipe(Effect.provide(EvaluationIdLive)));
});

describe("field-strategy edge cases", () => {
  it.effect("Union over an empty allow set is unreachable, but First is total", () =>
    Effect.gen(function* () {
      // An anyOf with no children can never allow, so it denies.
      const d = yield* evaluate(P.anyOf([]));
      assert.isFalse(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("AllOf with no children allows and restricts nothing", () =>
    Effect.gen(function* () {
      const d = yield* evaluate(P.allOf([]));
      assert.isTrue(isAllowed(d));
      if (d._tag !== "Allow") return;
      assert.isUndefined(d.visibleFields);
    }).pipe(Effect.provide(testLayer(subjectWith({})))));

  it.effect("Union absorbs to all-fields when one branch is unrestricted", () =>
    Effect.gen(function* () {
      const policy = P.anyOf(
        [P.hasRole("a"), P.hasRole("b")],
        { fieldStrategy: "Union" },
      );
      const d = yield* evaluate(policy);
      if (d._tag !== "Allow") return;
      // Both branches grant all fields, so the union does too.
      assert.isUndefined(d.visibleFields);
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] })))));

  it.effect("AllOf accepts an explicit First strategy", () =>
    Effect.gen(function* () {
      // Unusual but representable: take the first child's field set rather
      // than intersecting. Reachable only through allOf, since anyOf/First
      // short-circuits before any merge happens.
      const policy = P.allOf(
        [P.hasRole("a"), P.hasRole("b")],
        { fieldStrategy: "First" },
      );
      const d = yield* evaluate(policy);
      assert.isTrue(isAllowed(d));
    }).pipe(Effect.provide(testLayer(subjectWith({ roles: ["a", "b"] })))));

  it.effect("resolver is consulted only when the subject lacks the attribute", () =>
    Effect.gen(function* () {
      let calls = 0;
      const counting = Layer.succeed(AttributeResolver, {
        resolve: () =>
          Effect.sync(() => {
            calls += 1;
            return 99;
          }),
      });

      const d = yield* evaluate(P.hasAttribute("level", M.gte(1))).pipe(
        Effect.provide(
          testLayer(subjectWith({ attributes: { level: 5 } }), { attributes: counting }),
        ),
      );

      assert.isTrue(isAllowed(d));
      assert.strictEqual(calls, 0);
    }));
});
