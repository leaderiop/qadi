/**
 * `admit` — the one admission both interpreters share (ARCH-41, INV-QD-037).
 * The walks themselves are tested where they live; this pins the two rules
 * admission owns: the depth gate and what a matcher sees.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Result from "effect/Result";
import { admit } from "../src/Admission.ts";
import * as M from "../src/Matcher.ts";
import * as P from "../src/Policy.ts";
import { questionOf } from "../src/Question.ts";
import { subjectWith } from "./helpers.ts";

const subject = subjectWith({ id: "u7", attributes: { tier: "gold" } });

const nested = (levels: number): P.Policy => {
  let policy: P.Policy = P.hasRole("editor");
  for (let i = 0; i < levels; i += 1) policy = P.not(policy);
  return policy;
};

const refusal = (policy: P.Policy, maxDepth: number | undefined) => {
  const admitted = admit(questionOf(subject, policy, maxDepth === undefined ? {} : { maxDepth }));
  return Result.isFailure(admitted) ? admitted.failure : undefined;
};

describe("admit", () => {
  it("admits at exactly maxDepth and refuses one past it", () => {
    assert.isUndefined(refusal(nested(3), 3));
    const past = refusal(nested(4), 3);
    assert.strictEqual(past?._tag, "PolicyTooDeep");
    assert.strictEqual(past?.maxDepth, 3);
  });

  it("a NaN maxDepth admits (matches evaluate's historical behavior)", () => {
    assert.isUndefined(refusal(nested(5), Number.NaN));
  });

  it("a negative maxDepth refuses a leaf", () => {
    assert.strictEqual(refusal(P.hasRole("editor"), -1)?._tag, "PolicyTooDeep");
  });

  it("an unset maxDepth is the default bound", () => {
    assert.isUndefined(refusal(nested(P.DEFAULT_MAX_DEPTH), undefined));
    assert.strictEqual(
      refusal(nested(P.DEFAULT_MAX_DEPTH + 1), undefined)?.maxDepth,
      P.DEFAULT_MAX_DEPTH,
    );
  });

  it("matcher nesting counts toward depth", () => {
    const policy = P.hasAttribute("tags", M.someMatch(M.fieldMatch("a", M.eq(M.literal(1)))));
    const depth = P.policyDepth(policy);
    assert.isAbove(depth, 0);
    assert.isUndefined(refusal(policy, depth));
    assert.strictEqual(refusal(policy, depth - 1)?._tag, "PolicyTooDeep");
  });

  it("the matcher context carries the subject's attributes and id, the resource and the action", () => {
    const resource = { id: "doc-1" };
    const admitted = admit(
      questionOf(subject, P.hasRole("editor"), { resource, action: "publish" }),
    );
    assert.isTrue(Result.isSuccess(admitted));
    if (Result.isFailure(admitted)) return;
    assert.strictEqual(admitted.success.matcherContext.subject, subject.attributes);
    assert.strictEqual(admitted.success.matcherContext.subjectId, "u7");
    assert.strictEqual(admitted.success.matcherContext.resource, resource);
    assert.strictEqual(admitted.success.matcherContext.action, "publish");
  });

  it("a question with no resource gives a context with resource undefined", () => {
    const admitted = admit(questionOf(subject, P.hasRole("editor")));
    assert.isTrue(Result.isSuccess(admitted));
    if (Result.isFailure(admitted)) return;
    assert.isUndefined(admitted.success.matcherContext.resource);
    assert.isUndefined(admitted.success.matcherContext.action);
    assert.strictEqual(admitted.success.question.policy._tag, "HasRole");
  });
});
