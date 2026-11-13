/**
 * Pins the public shapes of the evaluation options and services, read through
 * `@qadi/core`'s barrel.
 *
 * Written while the types were still declared in `Evaluate.ts` and kept unchanged
 * since, so a move that changes a key, a modifier, a field type or a service
 * fails here. Each union is spelled out to the five port services rather than
 * read through another alias, so the pin does not move with the code it checks.
 * No deliberate compile error lives here, because `tsconfig.test.json` also
 * compiles every `*.tst.ts`.
 */
import type * as Effect from "effect/Effect";
import type * as Layer from "effect/Layer";
import type { Concurrency } from "effect/Types";
import { expect, test } from "tstyche";
import type {
  AttributeResolver,
  CurrentSubject,
  CustomPredicate,
  Decision,
  DecisionHistory,
  EvaluateOptions,
  EvaluationError,
  EvaluationId,
  EvaluationServices,
  Policy,
  RelationshipResolver,
  Resource,
  SignatureHistory,
  StandingEvaluationServices,
} from "../src/index.ts";
import { EvaluationServicesNone, evaluate } from "../src/index.ts";

test("EvaluateOptions is the three question options and the two that cannot change the answer, each readonly and optional", () => {
  expect<EvaluateOptions>().type.toBe<{
    readonly resource?: Resource;
    readonly action?: string;
    readonly maxDepth?: number;
    readonly concurrency?: Concurrency;
    readonly evaluationId?: string;
  }>();
  expect<keyof EvaluateOptions>().type.toBe<
    "resource" | "action" | "maxDepth" | "concurrency" | "evaluationId"
  >();
});

test("EvaluationServices is who asks, an evaluation id and the five ports", () => {
  expect<EvaluationServices>().type.toBe<
    | CurrentSubject
    | EvaluationId
    | AttributeResolver
    | RelationshipResolver
    | DecisionHistory
    | CustomPredicate
    | SignatureHistory
  >();
});

test("StandingEvaluationServices is every evaluation service except who asks", () => {
  expect<StandingEvaluationServices>().type.toBe<
    | EvaluationId
    | AttributeResolver
    | RelationshipResolver
    | DecisionHistory
    | CustomPredicate
    | SignatureHistory
  >();
});

test("evaluate takes a policy and EvaluateOptions and requires EvaluationServices", () => {
  expect(evaluate).type.toBe<
    (
      policy: Policy,
      options?: EvaluateOptions,
    ) => Effect.Effect<Decision, EvaluationError, EvaluationServices>
  >();
});

test("EvaluationServicesNone provides exactly the standing evaluation services", () => {
  expect(EvaluationServicesNone).type.toBe<
    Layer.Layer<
      | EvaluationId
      | AttributeResolver
      | RelationshipResolver
      | DecisionHistory
      | CustomPredicate
      | SignatureHistory
    >
  >();
});
