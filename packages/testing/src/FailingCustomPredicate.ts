/**
 * A `CustomPredicate` registry that always fails.
 *
 * For asserting that a broken or misconfigured custom predicate surfaces as
 * an error rather than being silently reported as a denial — mirrors
 * `failingAttributeResolver`.
 */
import { CustomPredicate, CustomPredicateError } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const failingCustomPredicate = (
  reason: string = "test failure",
): Layer.Layer<CustomPredicate> =>
  Layer.succeed(CustomPredicate, {
    evaluate: (name) => Effect.fail(new CustomPredicateError({ name, reason })),
  });
