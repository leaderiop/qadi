/**
 * `SignatureHistory`'s own depth, matching `DecisionHistory.test.ts` — the
 * `hasSignature` leaf that will call this port doesn't exist yet (ticket
 * wayfinder#14), so there is no `Evaluate.test.ts` coverage to lean on.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { SignatureHistoryUnavailable } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { SignatureHistory, SignatureHistoryNone } from "../src/SignatureHistory.ts";

const query = (
  layer: Layer.Layer<SignatureHistory>,
  subjectId: string,
  resourceId: string | undefined,
) =>
  SignatureHistory.signaturesFor({
    subjectId: makeSubjectId(subjectId),
    resourceId: resourceId === undefined ? undefined : makeResourceId(resourceId),
  }).pipe(Effect.provide(layer));

describe("SignatureHistory", () => {
  describe("SignatureHistoryNone", () => {
    it.effect("returns no signatures regardless of what's asked — fail-closed default", () =>
      Effect.gen(function* () {
        assert.deepStrictEqual(yield* query(SignatureHistoryNone, "alice", "doc-1"), []);
        assert.deepStrictEqual(yield* query(SignatureHistoryNone, "alice", undefined), []);
      }));
  });

  describe("a wired implementation", () => {
    const signature = {
      signerId: makeSubjectId("alice"),
      meaning: "approved",
      signerRole: undefined,
      signedAt: 1_700_000_000_000,
      algorithm: undefined,
      keyId: undefined,
    };

    it.effect("resource-scoped and subject-global queries are one method, not two", () =>
      Effect.gen(function* () {
        const layer = Layer.succeed(SignatureHistory, {
          name: "test",
          signaturesFor: (q) => Effect.succeed(q.resourceId === undefined ? [] : [signature]),
        });

        assert.deepStrictEqual(yield* query(layer, "alice", "doc-1"), [signature]);
        assert.deepStrictEqual(yield* query(layer, "alice", undefined), []);
      }));

    it.effect("a lookup failure is a typed SignatureHistoryUnavailable, distinct from an empty answer", () =>
      Effect.gen(function* () {
        const failure = new SignatureHistoryUnavailable({
          subjectId: makeSubjectId("alice"),
          resourceId: undefined,
          cause: "store offline",
        });
        const layer = Layer.succeed(SignatureHistory, {
          name: "test",
          signaturesFor: () => Effect.fail(failure),
        });

        const result = yield* Effect.result(query(layer, "alice", undefined));
        assert.strictEqual(result._tag, "Failure");
        if (result._tag === "Failure") {
          assert.strictEqual(result.failure, failure);
          assert.strictEqual(result.failure._tag, "SignatureHistoryUnavailable");
          assert.strictEqual(result.failure.cause, "store offline");
        }
      }));
  });
});
