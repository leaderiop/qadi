/**
 * `decideQuestion` takes exactly the options a built question leaves out.
 *
 * `EvaluateOptions` is declared once, beside `QuestionOptions`. `decideQuestion`'s
 * parameter is derived from it by `Omit`, so an option added to `EvaluateOptions`
 * reaches it with no second edit, and a question option (`resource`, `action`,
 * `maxDepth`) cannot be handed again to a question that already holds it. `ask`
 * reads `EvaluateOptions` and requires `EvaluationServices` by name, so neither is
 * restated in `Lifecycle.ts` (ADR-QD-037, ADR-QD-105).
 */
import type * as Effect from "effect/Effect";
import { expect, test } from "tstyche";
import type { EvaluationError } from "../src/Errors.ts";
import type { EvaluationServices } from "../src/EvaluationServices.ts";
import type { Asked } from "../src/Lifecycle.ts";
import { ask, decideQuestion } from "../src/Lifecycle.ts";
import type { EvaluateOptions, QuestionOptions } from "../src/Question.ts";

test("EvaluateOptions is QuestionOptions plus exactly concurrency and evaluationId", () => {
  expect<keyof EvaluateOptions>().type.toBe<
    keyof QuestionOptions | "concurrency" | "evaluationId"
  >();
});

test("decideQuestion takes exactly the options a built question leaves out", () => {
  expect<Parameters<typeof decideQuestion>[1]>().type.toBe<
    Omit<EvaluateOptions, keyof QuestionOptions> | undefined
  >();
});

test("ask takes EvaluateOptions and requires EvaluationServices", () => {
  expect<Parameters<typeof ask>[1]>().type.toBe<EvaluateOptions | undefined>();
  expect<ReturnType<typeof ask>>().type.toBe<
    Effect.Effect<Asked, EvaluationError, EvaluationServices>
  >();
});
