/**
 * A relationship resolver that always fails.
 *
 * For asserting that a broken relationship check surfaces as an error rather
 * than being silently reported as a denial — mirrors `failingAttributeResolver`.
 */
import { RelationshipResolveError, RelationshipResolver } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const failingRelationshipResolver = (
  cause: unknown = "test failure",
): Layer.Layer<RelationshipResolver> =>
  Layer.succeed(RelationshipResolver, {
    name: "failingRelationshipResolver",
    check: (request) =>
      Effect.fail(
        new RelationshipResolveError({
          relation: request.relation,
          resourceId: request.resourceId,
          cause,
        }),
      ),
  });
