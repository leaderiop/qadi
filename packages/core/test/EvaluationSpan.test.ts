/**
 * Pins the rules of the evaluate family's declaration as plain values, reading
 * every key from a declaration so no span key is written by hand here; the keys a
 * tracer receives are pinned by `EvaluationSpan.contract.test.ts`.
 */
import { assert, describe, it } from "@effect/vitest";
import {
  decideSubjectsSpan,
  decideSubjectsStreamSpan,
  denialEvent,
  evaluateSpan,
  guardHealthCheckSpan,
  toPredicateSpan,
} from "../src/EvaluationSpan.ts";
import { POLICY_TAGS } from "../src/Policy.ts";
import type { SpanFields, SpanStruct, SpanType } from "../src/PortSpan.ts";
import { decodeSpan, encodeSpan, sharedQuestionKeys } from "../src/PortSpanEncode.ts";

const spans = [
  evaluateSpan,
  toPredicateSpan,
  guardHealthCheckSpan,
  decideSubjectsSpan,
  decideSubjectsStreamSpan,
];

const questions = [
  evaluateSpan.question,
  toPredicateSpan.question,
  guardHealthCheckSpan.question,
  decideSubjectsSpan.question,
  decideSubjectsStreamSpan.question,
];

/** What a struct wrote, read back through the struct. */
const back = <F extends SpanFields>(
  struct: SpanStruct<F>,
  value: SpanType<SpanStruct<F>>,
) => decodeSpan(struct, new Map(Object.entries(encodeSpan(struct, value))));

describe("the declaration of the evaluate family", () => {
  it("the question and the answer of each span share no key", () => {
    for (const span of spans) {
      const asked = new Set<string>(Object.values(span.question.keys));
      for (const key of Object.values<string>(span.answer.keys)) {
        assert.isFalse(asked.has(key), `${span.name} writes ${key} twice`);
      }
    }
  });

  it("every span that asks shares one subject, policy tag and action field", () => {
    const asked = evaluateSpan.question;
    const subjectAsked = [
      toPredicateSpan.question,
      guardHealthCheckSpan.question,
      denialEvent,
    ];
    for (const struct of subjectAsked) {
      assert.strictEqual(struct.fields.subjectId, asked.fields.subjectId);
      assert.strictEqual(struct.keys.subjectId, sharedQuestionKeys.subjectId);
    }
    assert.strictEqual(asked.keys.subjectId, sharedQuestionKeys.subjectId);
    for (const q of questions) {
      assert.strictEqual(q.fields.policyTag, asked.fields.policyTag);
      assert.strictEqual(q.fields.action, asked.fields.action);
      assert.strictEqual(q.keys.policyTag, asked.keys.policyTag);
      assert.strictEqual(q.keys.action, asked.keys.action);
    }
    assert.strictEqual(denialEvent.fields.policyTag, asked.fields.policyTag);
    assert.strictEqual(denialEvent.keys.policyTag, asked.keys.policyTag);
  });

  it("the three answers that can fail share one error tag field and key", () => {
    const failing = [
      evaluateSpan.answer,
      toPredicateSpan.answer,
      guardHealthCheckSpan.answer,
    ];
    for (const answer of failing) {
      assert.strictEqual(answer.fields.errorTag, evaluateSpan.answer.fields.errorTag);
      assert.strictEqual(answer.keys.errorTag, evaluateSpan.answer.keys.errorTag);
    }
  });

  it("only the evaluate span carries the outcome key", () => {
    const others = [
      ...questions,
      toPredicateSpan.answer,
      guardHealthCheckSpan.answer,
      decideSubjectsSpan.answer,
      denialEvent,
    ].flatMap((struct) => Object.values<string>(struct.keys));
    assert.isFalse(others.includes(evaluateSpan.answer.keys.outcome));
  });

  it("an absent action or absent obligations writes no key", () => {
    const { subjectId, evaluationId, policyTag } = evaluateSpan.question.keys;
    const written = encodeSpan(evaluateSpan.question, {
      subjectId: "u1",
      evaluationId: "e1",
      policyTag: "HasRole",
      action: undefined,
    });
    assert.deepStrictEqual(
      new Set(Object.keys(written)),
      new Set([subjectId, evaluationId, policyTag]),
    );
    assert.deepStrictEqual(
      encodeSpan(evaluateSpan.answer, { outcome: "Allow", obligations: undefined }),
      { [evaluateSpan.answer.keys.outcome]: "Allow" },
    );
  });

  it("each of the three outcomes decodes and any other value reads as absent", () => {
    const { outcome } = evaluateSpan.answer.keys;
    for (const value of ["Allow", "Deny", "Failed"]) {
      assert.strictEqual(
        decodeSpan(evaluateSpan.answer, new Map([[outcome, value]])).outcome,
        value,
      );
    }
    assert.isUndefined(
      decodeSpan(evaluateSpan.answer, new Map([[outcome, "Abstain"]])).outcome,
    );
  });

  it("every policy tag decodes and an unknown tag reads as absent", () => {
    const { policyTag } = evaluateSpan.question.keys;
    for (const tag of POLICY_TAGS) {
      assert.strictEqual(
        decodeSpan(evaluateSpan.question, new Map([[policyTag, tag]])).policyTag,
        tag,
      );
    }
    assert.isUndefined(
      decodeSpan(evaluateSpan.question, new Map([[policyTag, "Nope"]])).policyTag,
    );
  });

  it("every field of every struct reads back what it wrote", () => {
    const asked = { subjectId: "u1", policyTag: "HasRole", action: "read" } as const;
    const evaluateAsked = { ...asked, evaluationId: "e1" };
    const evaluateAnswer = {
      outcome: "Failed",
      errorTag: "AttributeResolveError",
      obligations: "a,b",
    } as const;
    const translated = { predicateTag: "True", errorTag: "PolicyTooDeep" };
    const probed = { healthy: false, errorTag: "AttributeResolveError" };
    const batch = { subjectCount: 2, policyTag: "HasRole", action: "read" } as const;
    const streamed = { policyTag: "HasRole", action: "read" } as const;
    const denial = {
      policyTag: "HasRole",
      subjectId: "u1",
      reason: "subject lacks role",
    } as const;
    assert.deepStrictEqual(back(evaluateSpan.question, evaluateAsked), evaluateAsked);
    assert.deepStrictEqual(back(evaluateSpan.answer, evaluateAnswer), evaluateAnswer);
    assert.deepStrictEqual(back(toPredicateSpan.question, asked), asked);
    assert.deepStrictEqual(back(toPredicateSpan.answer, translated), translated);
    assert.deepStrictEqual(back(guardHealthCheckSpan.question, asked), asked);
    assert.deepStrictEqual(back(guardHealthCheckSpan.answer, probed), probed);
    assert.deepStrictEqual(back(decideSubjectsSpan.question, batch), batch);
    assert.deepStrictEqual(back(decideSubjectsStreamSpan.question, streamed), streamed);
    assert.deepStrictEqual(back(denialEvent, denial), denial);
  });

  it("the two batch spans answer nothing, through one shared struct", () => {
    assert.strictEqual(decideSubjectsSpan.answer, decideSubjectsStreamSpan.answer);
    assert.lengthOf(Object.keys(decideSubjectsSpan.answer.keys), 0);
  });
});
