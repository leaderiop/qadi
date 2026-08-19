/** A relationship resolver over a static edge list, recording its queries. */
import { RelationshipResolver } from "@qadi/core";
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";

/**
 * Compared structurally, not by a joined string key — see the identical class
 * in `@qadi/core`'s `RelationshipResolver.ts` for why.
 */
class RelationshipEdge extends Data.Class<{
  readonly subjectId: string;
  readonly relation: string;
  readonly resourceId: string;
}> {}

export const edgeRelationshipResolver = (
  edges: ReadonlyArray<readonly [string, string, string]>,
): {
  readonly layer: Layer.Layer<RelationshipResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const index = HashSet.fromIterable(
    edges.map(([subjectId, relation, resourceId]) =>
      new RelationshipEdge({ subjectId, relation, resourceId })),
  );
  const calls: Array<string> = [];
  return {
    calls,
    layer: Layer.succeed(RelationshipResolver, {
      check: (request) =>
        Effect.sync(() => {
          const edge = new RelationshipEdge({
            subjectId: request.subjectId,
            relation: request.relation,
            resourceId: request.resourceId,
          });
          calls.push(`${request.subjectId} ${request.relation} ${request.resourceId}`);
          return HashSet.has(index, edge);
        }),
    }),
  };
};
