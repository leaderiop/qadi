/**
 * `LifecycleOptions` is `EvaluateOptions` less `QuestionOptions`.
 *
 * `Lifecycle.ts` restates the two options that are not part of the `Question`
 * because importing `EvaluateOptions` would add a type-only edge madge counts
 * (ADR-QD-037). A restatement nothing compares drifts: a third option added to
 * one and not the other would compile and be silently ignored by `decideQuestion`.
 * Pinned in both directions, so either side gaining or losing a field fails here.
 *
 * ARCH-61; ports orphan O3 of lost commit 4b1ed49.
 */
import { expect, test } from "tstyche";
import type { LifecycleOptions } from "../src/Lifecycle.ts";
import type { EvaluateOptions, QuestionOptions } from "../src/Question.ts";

test("EvaluateOptions is QuestionOptions plus LifecycleOptions", () => {
  expect<EvaluateOptions>().type.toBeAssignableTo<QuestionOptions & LifecycleOptions>();
  expect<QuestionOptions & LifecycleOptions>().type.toBeAssignableTo<EvaluateOptions>();
});

test("LifecycleOptions names exactly the fields EvaluateOptions adds", () => {
  expect<keyof EvaluateOptions>().type.toBe<keyof QuestionOptions | keyof LifecycleOptions>();
});
