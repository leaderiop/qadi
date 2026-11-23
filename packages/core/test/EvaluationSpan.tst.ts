/**
 * Pins what the compiler guarantees about the evaluate family's declaration: the
 * outcome tie, the policy tag, the leaf-only fields, the span names, a question
 * written whole and a log event kept off every span.
 *
 * Each refusal is an expect-error directive checked twice, as in
 * `CompilePredicate.tst.ts`: under `pnpm typecheck` an unused directive is TS2578,
 * and under `pnpm test:tstyche` the text after it is a fragment of the one
 * suppressed error's message. The span annotators return an `Effect`, so each of
 * their refusals is a negative pin through `paramsOf`, with its positive twin; the
 * attribute and annotation builders return a plain record and are pinned bare. Every
 * pin's arguments are inferred at the call, as a writer's are.
 */
import { expect, test } from "tstyche";
import type { Decision } from "../src/Decision.ts";
import {
  decideSubjectSpan,
  decideSubjectsSpan,
  decideSubjectsStreamSpan,
  denialEvent,
  evaluateSpan,
  guardHealthCheckSpan,
  toPredicateSpan,
} from "../src/EvaluationSpan.ts";
import type { SpanOutcome } from "../src/EvaluationSpan.ts";
import type { Policy } from "../src/Policy.ts";
import type { SpanKey, SpanStruct, SpanType, SpanValue } from "../src/PortSpan.ts";
import {
  annotateAsked,
  annotateSpan,
  askedAttributes,
  encodeSpan,
  logAnnotations,
} from "../src/PortSpanEncode.ts";

type Answer = SpanType<typeof evaluateSpan.answer>;
type Question = SpanType<typeof evaluateSpan.question>;

test("the outcome is a decision tag or Failed", () => {
  expect<NonNullable<Answer["outcome"]>>().type.toBe<Decision["_tag"] | "Failed">();
  expect<SpanOutcome>().type.toBe<"Allow" | "Deny" | "Failed">();
});

test("the policy tag is a policy tag", () => {
  expect<NonNullable<Question["policyTag"]>>().type.toBe<Policy["_tag"]>();
});

type Held<S> = SpanType<S>[keyof SpanType<S>];
type Leaf = SpanValue | undefined;

test("every field of the family holds only span values", () => {
  expect<Held<typeof evaluateSpan.question>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof evaluateSpan.answer>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof toPredicateSpan.question>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof toPredicateSpan.answer>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof guardHealthCheckSpan.question>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof guardHealthCheckSpan.answer>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof decideSubjectsSpan.question>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof decideSubjectsStreamSpan.question>>().type.toBeAssignableTo<Leaf>();
  expect<Held<typeof denialEvent>>().type.toBeAssignableTo<Leaf>();
});

test("each span name is a span key", () => {
  expect(evaluateSpan.name).type.toBe<SpanKey>();
  expect(toPredicateSpan.name).type.toBe<SpanKey>();
  expect(guardHealthCheckSpan.name).type.toBe<SpanKey>();
  expect(decideSubjectsSpan.name).type.toBe<SpanKey>();
  expect(decideSubjectsStreamSpan.name).type.toBe<SpanKey>();
  expect(decideSubjectSpan.name).type.toBe<SpanKey>();
});

test("an outcome outside the three is refused, and Failed is accepted", () => {
  const accepted: Answer = { outcome: "Failed" };
  expect(accepted).type.toBe<Answer>();
  // @ts-expect-error Type '"Abstain"' is not assignable to type
  const refused: Answer = { outcome: "Abstain" };
  expect(refused).type.toBe<Answer>();
});

test("obligations are one joined string, not a list", () => {
  const joined: Answer = { outcome: "Allow", obligations: "a,b" };
  expect(joined).type.toBe<Answer>();
  // @ts-expect-error Type 'string[]' is not assignable to type 'string'
  const listed: Answer = { outcome: "Allow", obligations: ["a", "b"] };
  expect(listed).type.toBe<Answer>();
});

/**
 * A function's call with its result dropped and its type parameters kept.
 *
 * The span annotators return an `Effect`, so a pin on one goes through this and holds
 * whichever way `floatingEffect` is set. Their type parameters survive it, so each
 * pin's arguments are inferred at the call as a writer's are, with no type argument.
 */
declare const paramsOf: <A extends ReadonlyArray<unknown>>(
  f: (...args: A) => unknown,
) => (...args: A) => void;

test("a question that leaves a member out is refused", () => {
  expect(paramsOf(annotateAsked)).type.not.toBeCallableWith(evaluateSpan.question, {
    subjectId: "u1",
    policyTag: "HasRole",
    action: undefined,
  });
});

test("a question that names every member is accepted", () => {
  expect(paramsOf(annotateAsked)).type.toBeCallableWith(evaluateSpan.question, {
    subjectId: "u1",
    evaluationId: "eval-1",
    policyTag: "HasRole",
    action: undefined,
  });
});

/** A span struct of the denial event's own fields, which a span may carry. */
declare const spanOfDenialFields: SpanStruct<typeof denialEvent.fields>;

test("the denial event's struct cannot annotate a span", () => {
  expect(paramsOf(annotateSpan)).type.not.toBeCallableWith(denialEvent, {
    reason: "r",
  });
});

test("a span struct of the same fields can annotate a span", () => {
  expect(paramsOf(annotateSpan)).type.toBeCallableWith(spanOfDenialFields, {
    reason: "r",
  });
});

test("the denial event's struct cannot annotate a span as its question", () => {
  expect(paramsOf(annotateAsked)).type.not.toBeCallableWith(denialEvent, {
    policyTag: "HasRole",
    subjectId: "u1",
    reason: "r",
  });
});

test("a span struct of the same fields can annotate a span as its question", () => {
  expect(paramsOf(annotateAsked)).type.toBeCallableWith(spanOfDenialFields, {
    policyTag: "HasRole",
    subjectId: "u1",
    reason: "r",
  });
});

test("the denial event's struct cannot build a span's attributes", () => {
  expect(encodeSpan).type.not.toBeCallableWith(denialEvent, { reason: "r" });
});

test("a span struct of the same fields can build a span's attributes", () => {
  expect(encodeSpan).type.toBeCallableWith(spanOfDenialFields, { reason: "r" });
});

test("the denial event's struct cannot open a span with its attributes", () => {
  expect(askedAttributes).type.not.toBeCallableWith(denialEvent, {
    policyTag: "HasRole",
    subjectId: "u1",
    reason: "r",
  });
});

test("a span struct of the same fields can open a span with its attributes", () => {
  expect(askedAttributes).type.toBeCallableWith(spanOfDenialFields, {
    policyTag: "HasRole",
    subjectId: "u1",
    reason: "r",
  });
});

test("a span struct cannot annotate a log line", () => {
  expect(logAnnotations).type.not.toBeCallableWith(spanOfDenialFields, { reason: "r" });
});

test("the denial event's struct can annotate a log line", () => {
  expect(logAnnotations).type.toBeCallableWith(denialEvent, { reason: "r" });
});
