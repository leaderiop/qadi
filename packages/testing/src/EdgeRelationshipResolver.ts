/** A relationship resolver over a static edge list, recording its queries. */
import { RelationshipResolver } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const edgeRelationshipResolver = (
  edges: ReadonlyArray<readonly [string, string, string]>,
): {
  readonly layer: Layer.Layer<RelationshipResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const index = new Set(edges.map(([s, rel, r]) => `${s} ${rel} ${r}`));
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(RelationshipResolver, {
      check: (request) =>
        Effect.sync(() => {
          const key = `${request.subjectId} ${request.relation} ${request.resourceId}`;
          calls.push(key);
          return index.has(key);
        }),
    }),
  };
};
