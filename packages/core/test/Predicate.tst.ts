/**
 * Pins that `toPredicate`'s options are `QuestionOptions` without `resource`
 * (ARCH-41): a field added to `QuestionOptions` reaches translation by type,
 * and a resource is refused rather than silently ignored.
 */
import { expect, test } from "tstyche";
import type { PredicateOptions } from "../src/Predicate.ts";
import type { QuestionOptions } from "../src/Question.ts";

test("PredicateOptions is QuestionOptions without resource", () => {
  expect<PredicateOptions>().type.toBe<Omit<QuestionOptions, "resource">>();
  expect<{ readonly action: string; readonly maxDepth: number }>().type.toBeAssignableTo<PredicateOptions>();
});

test("a resource is not an option of toPredicate", () => {
  // `resource` is absent by design: a predicate filters rows not yet loaded.
  expect<keyof PredicateOptions>().type.toBe<"action" | "maxDepth">();
  expect<{ readonly resource: { readonly id: string } }>().type.not.toBeAssignableTo<PredicateOptions>();
});
