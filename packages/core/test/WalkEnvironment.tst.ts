/**
 * The walk environment's type pins (ARCH-106, WENV-03): recursion passes the policy, one
 * environment and one depth, so a depth cannot land where the bound belongs and still compile, and
 * the row source decides what `supplied.resource` is.
 */
import { expect, test } from "tstyche";
import * as Result from "effect/Result";
import { Admitted, admit } from "../src/Admission.ts";
import type { AuthSubject } from "../src/AuthSubject.ts";
import type { PolicyTooDeep } from "../src/Errors.ts";
import type { MatcherContext } from "../src/Matcher.ts";
import type { Policy } from "../src/Policy.ts";
import type { Question } from "../src/Question.ts";
import type { evaluateNode } from "../src/Walk.ts";

declare const question: Question;
type Recursion = Parameters<typeof evaluateNode>;
type Environment = Recursion[1];

test("recursion passes the policy, the environment and one depth, in that order", () => {
  expect<Recursion>().type.toBe<[policy: Policy, request: Environment, depth: number]>();
  expect<Environment["admitted"]>().type.toBe<Admitted<"asked">>();
  expect<Recursion["length"]>().type.toBe<3>();
  expect<number>().type.not.toBeAssignableTo<Environment>();
  expect<Environment>().type.not.toBeAssignableTo<number>();
});

test("the environment holds its row source, the admitted policy, the subject, what was supplied, the matcher context and the bound", () => {
  expect<keyof Admitted>().type.toBe<
    "source" | "policy" | "subject" | "supplied" | "matcherContext" | "maxDepth"
  >();
  expect<Admitted["policy"]>().type.toBe<Policy>();
  expect<Admitted["maxDepth"]>().type.toBe<number>();
});

test("a row is always supplied; an asked resource is supplied when the question has one", () => {
  const row = admit(question, "row");
  if (Result.isSuccess(row)) expect(row.success.supplied.resource).type.toBe<true>();
  const asked = admit(question, "asked");
  if (Result.isSuccess(asked)) expect(asked.success.supplied.resource).type.toBe<boolean>();
  expect(admit).type.not.toBeCallableWith(question);
  expect(admit).type.not.toBeCallableWith(question, "rows");
  expect(admit).type.toBeCallableWith(question, "asked");
  expect(admit).type.toBeCallableWith(question, "row");
});

test("the row source is in the environment's type, so a row never reaches the walk", () => {
  expect<Admitted<"row">>().type.not.toBeAssignableTo<Environment["admitted"]>();
  expect<Admitted<"asked">>().type.not.toBeAssignableTo<Admitted<"row">>();
  expect<Admitted<"row">["supplied"]["resource"]>().type.toBe<true>();
  expect<Admitted<"asked">["supplied"]["resource"]>().type.toBe<boolean>();
  expect(admit(question, "row")).type.toBe<Result.Result<Admitted<"row">, PolicyTooDeep>>();
  expect(admit(question, "asked")).type.toBe<Result.Result<Admitted<"asked">, PolicyTooDeep>>();
});

declare const policy: Policy;
declare const subject: AuthSubject;
declare const matcherContext: MatcherContext;

test("only admit builds an Admitted: a constructor call outside the class is refused", () => {
  // @ts-expect-error Constructor of class 'Admitted<Source>' is private and only accessible within the class declaration
  new Admitted("asked", policy, subject, { action: true, resource: true }, matcherContext, 7);
  expect(admit(question, "asked")).type.toBe<Result.Result<Admitted<"asked">, PolicyTooDeep>>();
});

test("only admit builds an Admitted: an object literal of the same shape is not one", () => {
  // @ts-expect-error Property 'nominal' is missing in type ... but required in type 'Admitted<"asked">'
  const forged: Admitted<"asked"> = {
    source: "asked",
    policy,
    subject,
    supplied: { action: true, resource: true },
    matcherContext,
    maxDepth: 7,
  };
  expect(forged).type.toBe<Admitted<"asked">>();
  const built = admit(question, "asked");
  if (Result.isSuccess(built)) {
    const held: Admitted<"asked"> = built.success;
    expect(held).type.toBe<Admitted<"asked">>();
  }
});
