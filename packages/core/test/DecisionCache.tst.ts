/**
 * Pins that the decision cache is asked the question and how the walk runs,
 * and nothing a caller computed (ADR-QD-174, INV-QD-367).
 *
 * No caller can hand `getOrCompute` a computation: an `Effect`, a thunk
 * returning one, or a third argument is refused at compile time. The refusal
 * rests on TypeScript's weak-type rule (TS2559), so a later option named like
 * one of `Effect`'s properties would weaken it; these pins are what catch that.
 *
 * The pins read `Params<F>`, not the method: `getOrCompute` returns an
 * `Effect`, the Effect language service reports a call to one as a floating
 * effect, and tstyche reads that as "not callable" whatever the arguments, so a
 * bare `not.toBeCallableWith` could never fail (`PortAccess.tst.ts`).
 */
import type * as Effect from "effect/Effect";
import { expect, test } from "tstyche";
import type { Trace } from "../src/Decision.ts";
import type { CacheLookup, DecisionCacheShape } from "../src/DecisionCache.ts";
import type { EvaluationError } from "../src/Errors.ts";
import type { PortServices } from "../src/Ports.ts";
import type { EvaluateOptions, Question, QuestionOptions } from "../src/Question.ts";

// The walk is core's own: no export walks a host's question (ADR-QD-174).
// @ts-expect-error has no exported member 'walk'
export { walk } from "../src/index.ts";

/** A function's parameters with its result dropped. */
type Params<F> = F extends (...args: infer A) => unknown ? (...args: A) => void : never;
type GetOrCompute = Params<DecisionCacheShape["getOrCompute"]>;

declare const question: Question;
declare const compute: Effect.Effect<Trace, EvaluationError, PortServices>;
/** The options `decideQuestion` holds, passed through unchanged (D-11, D-14). */
declare const asked: Omit<EvaluateOptions, keyof QuestionOptions> | undefined;

test("the cache is asked the question, and how the walk runs", () => {
  expect<GetOrCompute>().type.toBeCallableWith(question);
  expect<GetOrCompute>().type.toBeCallableWith(question, undefined);
  expect<GetOrCompute>().type.toBeCallableWith(question, { concurrency: "unbounded" });
  expect<GetOrCompute>().type.toBeCallableWith(question, asked);
});

test("no caller can hand the cache a computation", () => {
  expect<GetOrCompute>().type.not.toBeCallableWith(question, compute);
  expect<GetOrCompute>().type.not.toBeCallableWith(question, () => compute);
  expect<GetOrCompute>().type.not.toBeCallableWith(question, { concurrency: "unbounded" }, compute);
});

test("the second parameter is evaluate's concurrency option, derived", () => {
  expect<Parameters<DecisionCacheShape["getOrCompute"]>[1]>().type.toBe<
    Pick<EvaluateOptions, "concurrency"> | undefined
  >();
});

test("the result is unchanged: a trace and how the cache came by it", () => {
  expect<ReturnType<DecisionCacheShape["getOrCompute"]>>().type.toBe<
    Effect.Effect<CacheLookup, EvaluationError, PortServices>
  >();
});
