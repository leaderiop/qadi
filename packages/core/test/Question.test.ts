import { assert, describe, it } from "@effect/vitest";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Record from "effect/Record";
import type { EvaluateOptions } from "../src/Evaluate.ts";
import { hasRole } from "../src/Policy.ts";
import { questionOf } from "../src/Question.ts";
import { subjectWith } from "./helpers.ts";

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
