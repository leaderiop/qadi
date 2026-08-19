/**
 * An attribute resolver that always fails.
 *
 * For asserting that a broken lookup surfaces as an error rather than being
 * silently reported as a denial.
 */
import { AttributeResolveError, AttributeResolver } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const failingAttributeResolver = (
  cause: unknown = "test failure",
): Layer.Layer<AttributeResolver> =>
  Layer.succeed(AttributeResolver, {
    resolve: (_subjectId, attribute) =>
      Effect.fail(new AttributeResolveError({ attribute, cause })),
  });
