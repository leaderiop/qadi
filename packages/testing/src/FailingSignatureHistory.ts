/**
 * A signature history port that always fails.
 *
 * For asserting that a broken signature lookup surfaces as an error rather
 * than being silently reported as a denial — mirrors `failingAttributeResolver`.
 */
import { SignatureHistory, SignatureHistoryUnavailable } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";

export const failingSignatureHistory = (
  cause: unknown = "test failure",
): Layer.Layer<SignatureHistory> =>
  Layer.succeed(SignatureHistory, {
    name: "failingSignatureHistory",
    signaturesFor: (query) =>
      Effect.fail(
        new SignatureHistoryUnavailable({
          subjectId: query.subjectId,
          resourceId: query.resourceId,
          cause,
        }),
      ),
  });
