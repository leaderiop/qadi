/**
 * A signature history port over a static list, recording its queries.
 *
 * `SignatureInput` and the closed-world matching rule both live in
 * `@qadi/core`'s `signatureHistoryFromSignatures` — this only adds call
 * recording on top, the same relationship `eventDecisionHistory` and
 * `edgeRelationshipResolver` have with their own core-level plain builders.
 */
import { SignatureHistory, signatureHistoryFromSignatures } from "@qadi/core";
import type { SignatureInput, SignatureQuery } from "@qadi/core";
import * as Context from "effect/Context";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { makeCallRecorder } from "./CallRecorder.ts";

export type { SignatureInput } from "@qadi/core";

export const recordingSignatureHistory = (
  signatures: ReadonlyArray<SignatureInput>,
): {
  readonly layer: Layer.Layer<SignatureHistory>;
  readonly calls: ReadonlyArray<string>;
} => {
  const recorder = makeCallRecorder();
  const layer = Layer.effect(
    SignatureHistory,
    Effect.gen(function* () {
      const context = yield* Layer.build(signatureHistoryFromSignatures(signatures));
      const inner = Context.get(context, SignatureHistory);
      return {
        name: "recordingSignatureHistory",
        signaturesFor: (query: SignatureQuery) => {
          recorder.record(
            query.resourceId === undefined
              ? query.subjectId
              : `${query.subjectId} ${query.resourceId}`,
          );
          return inner.signaturesFor(query);
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
