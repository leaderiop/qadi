import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Record from "effect/Record";
import type { EvaluateOptions } from "../src/Evaluate.ts";
import { eq, subjectId } from "../src/Matcher.ts";
import { hasAction, hasResourceAttribute, hasRole } from "../src/Policy.ts";
import type { Policy } from "../src/Policy.ts";
import { toPredicate } from "../src/Predicate.ts";
import { questionOf } from "../src/Question.ts";
import type { QuestionOptions } from "../src/Question.ts";
import { subjectWith, testLayer } from "./helpers.ts";

const subject = subjectWith({});
const policy = hasRole("admin");

/**
 * Two distinct values per `EvaluateOptions` field. Typed over the key set, so
 * adding an option without classifying it here is a compile error (TS2741).
 */
const samples: { readonly [K in keyof EvaluateOptions]-?: readonly [EvaluateOptions[K], EvaluateOptions[K]] } = {
  resource: [{ id: "a" }, { id: "b" }],
  action: ["read", "write"],
  maxDepth: [3, 10],
  concurrency: [undefined, "unbounded"],
  evaluationId: [undefined, "x"],
};

/** Whether the option can change the answer, and so belongs in the `Question`. */
const inQuestion: { readonly [K in keyof EvaluateOptions]-?: boolean } = {
  resource: true,
  action: true,
  maxDepth: true,
  concurrency: false,
  evaluationId: false,
};

/**
 * How each `QuestionOptions` key reaches `toPredicate`. Typed over the key set,
 * so adding an option without deciding this is a compile error (TS2741) — the
 * one place a new answer-changing option cannot be forgotten by the translator
 * (ARCH-41). `"folds"`: the option changes the translation's output;
 * `"bounds"`: it bounds the walk (INV-QD-037's differential covers it);
 * `"absent-by-design"`: a predicate filters rows not yet loaded, so it has none.
 */
const inTranslation: {
  readonly [K in keyof QuestionOptions]-?: "folds" | "bounds" | "absent-by-design";
} = {
  resource: "absent-by-design",
  action: "folds",
  maxDepth: "bounds",
};

describe("toPredicate takes its options from QuestionOptions", () => {
  const translate = (policy: Policy, options?: object) =>
    toPredicate(policy, options).pipe(Effect.provide(testLayer(subject)));

  it.effect("action folds: varying it changes the translation of a policy that reads it", () =>
    Effect.gen(function* () {
      assert.strictEqual(inTranslation.action, "folds");
      assert.deepStrictEqual(yield* translate(hasAction("publish"), { action: "publish" }), {
        _tag: "True",
      });
      assert.deepStrictEqual(yield* translate(hasAction("publish"), { action: "read" }), {
        _tag: "False",
      });
    }));

  it.effect("resource is absent by design: an untyped options object carrying one translates as without", () =>
    Effect.gen(function* () {
      // A hand-built object defeats the type, which forbids the key. The
      // question is still resource-free, so the resource attribute stays a
      // column and is never folded against the caller's value.
      assert.strictEqual(inTranslation.resource, "absent-by-design");
      const policy = hasResourceAttribute("ownerId", eq(subjectId()));
      const without = yield* translate(policy);
      const untyped: object = { resource: { id: "r", ownerId: "u1" } };
      assert.deepStrictEqual(yield* translate(policy, untyped), without);
      assert.notDeepEqual(without, { _tag: "True" });
      assert.notDeepEqual(without, { _tag: "False" });
    }));
});

describe("questionOf", () => {
  for (const key of Record.keys(samples)) {
    it(`${key} ${inQuestion[key] ? "changes" : "does not change"} the question`, () => {
      const [a, b] = samples[key];
      const q1 = questionOf(subject, policy, { [key]: a });
      const q2 = questionOf(subject, policy, { [key]: b });
      assert.strictEqual(Equal.equals(q1, q2), !inQuestion[key]);
      assert.strictEqual(key in q1, inQuestion[key]);
    });
  }

  it("defaults maxDepth to 64 and honours a supplied one, including 0", () => {
    assert.strictEqual(questionOf(subject, policy).maxDepth, 64);
    assert.strictEqual(questionOf(subject, policy, { maxDepth: 3 }).maxDepth, 3);
    assert.strictEqual(questionOf(subject, policy, { maxDepth: 0 }).maxDepth, 0);
  });

  it("always carries all five keys, absent resource and action as undefined", () => {
    const q = questionOf(subject, policy);
    for (const key of ["subject", "policy", "resource", "action", "maxDepth"]) {
      assert.isTrue(Object.hasOwn(q, key), key);
    }
    assert.isUndefined(q.resource);
    assert.isUndefined(q.action);
  });

  it("two questions about equal-but-distinct subjects are equal and hash alike", () => {
    const q1 = questionOf(subjectWith({ roles: ["admin"] }), policy);
    const q2 = questionOf(subjectWith({ roles: ["admin"] }), policy);
    assert.isTrue(Equal.equals(q1, q2));
    assert.strictEqual(Hash.hash(q1), Hash.hash(q2));
  });
});
