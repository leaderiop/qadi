/** A relationship resolver over a static edge list, recording its queries. */
import { RelationshipEdge, RelationshipResolver } from "@qadi/core";
import type { RelationshipEdgeInput } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as HashSet from "effect/HashSet";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export const edgeRelationshipResolver = (
  edges: ReadonlyArray<RelationshipEdgeInput>,
): {
  readonly layer: Layer.Layer<RelationshipResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const index = HashSet.fromIterable(edges.map((edge) => new RelationshipEdge(edge)));
  const recorder = makeCallRecorder();
  return {
    get calls() {
      return recorder.calls;
    },
    layer: Layer.succeed(RelationshipResolver, {
      check: (request) =>
        Effect.sync(() => {
          const edge = new RelationshipEdge({
            subjectId: request.subjectId,
            relation: request.relation,
            resourceId: request.resourceId,
          });
          recorder.record(`${request.subjectId} ${request.relation} ${request.resourceId}`);
          return HashSet.has(index, edge);
        }),
    }),
  };
};
