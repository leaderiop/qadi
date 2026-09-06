/**
 * A relationship resolver over a static edge list, recording its queries.
 *
 * `RelationshipEdgeInput` and the closed-world matching rule both live in
 * `@qadi/core`'s `relationshipResolverFromEdges` — this only adds call
 * recording on top, the same relationship `recordingSignatureHistory` and
 * `eventDecisionHistory` have with their own core-level plain builders.
 */
import { RelationshipResolver, relationshipResolverFromEdges } from "@qadi/core";
import type { RelationshipEdgeInput } from "@qadi/core";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export const edgeRelationshipResolver = (
  edges: ReadonlyArray<RelationshipEdgeInput>,
): {
  readonly layer: Layer.Layer<RelationshipResolver>;
  readonly calls: ReadonlyArray<string>;
} => {
  const recorder = makeCallRecorder();
  const layer = Layer.effect(
    RelationshipResolver,
    Effect.gen(function* () {
      const context = yield* Layer.build(relationshipResolverFromEdges(edges));
      const inner = Context.get(context, RelationshipResolver);
      return {
        name: "edgeRelationshipResolver",
        check: (request) => {
          recorder.record(`${request.subjectId} ${request.relation} ${request.resourceId}`);
          return inner.check(request);
        },
      };
    }),
  );

  return {
    get calls() {
      return recorder.calls;
    },
    layer,
  };
};
