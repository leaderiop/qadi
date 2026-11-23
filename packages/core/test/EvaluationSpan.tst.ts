/**
 * Pins what the compiler guarantees about the evaluate family's declaration: the
 * outcome tie, the policy tag, the leaf-only fields, the span names and a question
 * written whole.
 *
 * Each refusal is an expect-error directive checked twice, as in
 * `CompilePredicate.tst.ts`: under `pnpm typecheck` an unused directive is TS2578,
 * and under `pnpm test:tstyche` the text after it is a fragment of the one
 * suppressed error's message. The question annotator returns an `Effect`, so its
 * refusal is a negative pin through its parameter type, with its positive twin.
 */
import { expect, test } from "tstyche";
import type { Decision } from "../src/Decision.ts";
import {
  annotateAsked,
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
import type { SpanKey, SpanType, SpanValue } from "../src/PortSpan.ts";

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
 * The question annotator's parameters at the evaluate span's question, with its
 * `Effect` dropped, so the pin holds whichever way `floatingEffect` is set.
 */
type AskedParams = typeof annotateAsked<typeof evaluateSpan.question.fields> extends (
  ...args: infer A
) => unknown
  ? (...args: A) => void
  : never;

test("a question that leaves a member out is refused", () => {
  expect<AskedParams>().type.not.toBeCallableWith(evaluateSpan.question, {
    subjectId: "u1",
    policyTag: "HasRole",
    action: undefined,
  });
});

test("a question that names every member is accepted", () => {
  expect<AskedParams>().type.toBeCallableWith(evaluateSpan.question, {
    subjectId: "u1",
    evaluationId: "eval-1",
    policyTag: "HasRole",
    action: undefined,
  });
});
