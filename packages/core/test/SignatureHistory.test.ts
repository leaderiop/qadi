/**
 * `SignatureHistory`'s own depth, matching `DecisionHistory.test.ts` —
 * `Evaluate.test.ts` covers `hasSignature` through full policy evaluation;
 * this is the port's own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import { SignatureHistoryUnavailable } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import {
  SignatureHistory,
  SignatureHistoryNone,
  signatureHistoryFromSignatures,
} from "../src/SignatureHistory.ts";

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

  describe("signatureHistoryFromSignatures", () => {
    const history = signatureHistoryFromSignatures([
      { subjectId: "alice", resourceId: "doc-1", meaning: "approved" },
      { subjectId: "alice", meaning: "witnessed", signerRole: "manager" },
    ]);

    it.effect("a resource-scoped query sees only rows stored with that resourceId", () =>
      Effect.gen(function* () {
        assert.deepStrictEqual(yield* query(history, "alice", "doc-1"), [
          {
            signerId: makeSubjectId("alice"),
            meaning: "approved",
            signedAt: 0,
          },
        ]);
        assert.deepStrictEqual(yield* query(history, "alice", "doc-2"), []);
      }));

    it.effect("a subject-global query sees only rows stored with no resourceId", () =>
      Effect.gen(function* () {
        assert.deepStrictEqual(yield* query(history, "alice", undefined), [
          {
            signerId: makeSubjectId("alice"),
            meaning: "witnessed",
            signerRole: "manager",
            signedAt: 0,
          },
        ]);
      }));

    it.effect("an unlisted subject answers empty, closed-world", () =>
      Effect.gen(function* () {
        assert.deepStrictEqual(yield* query(history, "bob", "doc-1"), []);
      }));

    it.effect("signedAt defaults to 0 when omitted, and is kept when given", () =>
      Effect.gen(function* () {
        const withTimestamp = signatureHistoryFromSignatures([
          { subjectId: "alice", resourceId: "doc-1", meaning: "approved", signedAt: 1_700_000_000_000 },
        ]);
        const [signature] = yield* query(withTimestamp, "alice", "doc-1");
        assert.strictEqual(signature?.signedAt, 1_700_000_000_000);
      }));
  });
});
