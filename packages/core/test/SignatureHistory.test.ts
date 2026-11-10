/**
 * `SignatureHistory`'s own depth, matching `DecisionHistory.test.ts` —
 * `Evaluate.test.ts` covers `hasSignature` through full policy evaluation;
 * this is the port's own.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import { SignatureHistoryUnavailable } from "../src/Errors.ts";
import { makeResourceId, makeSubjectId } from "../src/Identity.ts";
import { describeKeyRefusal, KeyRefusal } from "../src/PortDescription.ts";
import {
  SignatureHistory,
  SignatureHistoryNone,
  signatureHistoryFromSignatures,
  signatureHistoryPort,
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

    it.effect(
      "collision-immune: a subject/resource split that would collide under a colon-joined key does not",
      () =>
        Effect.gen(function* () {
          // `signatureHistoryFromSignatures` keys on the requirement-free
          // projection of `signatureHistoryPort.key` (a `JSON.stringify` of the
          // pair), not a delimited string — its own doc comment gives `["a:b", "c"]` vs
          // `["a", "b:c"]` as the pair a naive `${a}:${b}` join would
          // conflate. Proven here directly, the same way
          // `DecisionHistory.test.ts` and `RelationshipResolver.test.ts`
          // prove collision-immunity for their own sibling key builders.
          const collidable = signatureHistoryFromSignatures([
            { subjectId: "a:b", resourceId: "c", meaning: "approved" },
          ]);
          assert.deepStrictEqual(yield* query(collidable, "a", "b:c"), []);
        }),
    );

    it.effect("each colliding-looking pair answers only its own row", () =>
      Effect.gen(function* () {
        const grouped = signatureHistoryFromSignatures([
          { subjectId: "a:b", resourceId: "c", meaning: "m1" },
          { subjectId: "a", resourceId: "b:c", meaning: "m2" },
          { subjectId: "a", resourceId: "null", meaning: "m3" },
          { subjectId: "a", meaning: "m4" },
        ]);
        const meanings = (rows: ReadonlyArray<{ readonly meaning: string }>) =>
          rows.map((r) => r.meaning);
        assert.deepStrictEqual(meanings(yield* query(grouped, "a:b", "c")), ["m1"]);
        assert.deepStrictEqual(meanings(yield* query(grouped, "a", "b:c")), ["m2"]);
        assert.deepStrictEqual(meanings(yield* query(grouped, "a", "null")), ["m3"]);
        assert.deepStrictEqual(meanings(yield* query(grouped, "a", undefined)), ["m4"]);
      }));

    it.effect("a query carrying the asker's requirement reads the pair's rows: the grouping is requirement-free", () =>
      Effect.gen(function* () {
        // `signatureHistoryPort.key` also keys `meaning` and `signerRole`
        // (INV-QD-043); grouping by it whole would split one pair by
        // requirement and hide rows from a query that carries one.
        const grouped = signatureHistoryFromSignatures([
          { subjectId: "alice", resourceId: "doc-1", meaning: "approved" },
          { subjectId: "alice", resourceId: "doc-1", meaning: "witnessed", signerRole: "manager" },
        ]);
        const rows = yield* SignatureHistory.signaturesFor({
          subjectId: makeSubjectId("alice"),
          resourceId: makeResourceId("doc-1"),
          meaning: "approved",
          signerRole: "manager",
        }).pipe(Effect.provide(grouped));
        assert.deepStrictEqual(
          rows.map((r) => r.meaning),
          ["approved", "witnessed"],
        );
      }));

    it("a request with no key would fail the read with the port's own error, never answer an empty list", () => {
      // No `SubjectId`/`ResourceId` pair can be refused (both are strings), so
      // no input reaches the fixture's refusal branch. What it answers is
      // pinned here instead: the port's typed error carrying the refusal's
      // sentence. An empty list would deny `hasSignature` and grant `not(...)`.
      const asked = { subjectId: makeSubjectId("alice"), resourceId: makeResourceId("doc-1") };
      const refusal = KeyRefusal.Unkeyable({ path: ["0", "subjectId"], kind: "symbol", brand: "Symbol" });
      assert.deepStrictEqual(
        signatureHistoryPort.failure([asked], describeKeyRefusal(refusal)),
        new SignatureHistoryUnavailable({
          subjectId: asked.subjectId,
          resourceId: asked.resourceId,
          cause: "0.subjectId: an unkeyable symbol (Symbol) has no request key",
        }),
      );
    });

    it.effect("returns a fresh array per query, not the layer's own internal reference", () =>
      Effect.gen(function* () {
        // `signaturesFor` used to hand back the layer's own internal array
        // directly — a caller's push/splice on the returned list would
        // corrupt every future answer for the same (subjectId, resourceId)
        // key. Two calls returning distinct array instances is what rules
        // that out; `ReadonlyArray` in the type only stops this test suite
        // from mutating it, not an external caller with `unknown`-typed code
        // or a `.d.ts`-unaware consumer.
        const first = yield* query(history, "alice", "doc-1");
        const second = yield* query(history, "alice", "doc-1");
        assert.notStrictEqual(first, second);
        assert.deepStrictEqual(first, second);
      }));
  });
});

describe("signatureHistoryPort's wire", () => {
  it("writes a subject-global question with no resourceId key, rather than refusing it", () => {
    const encoded = signatureHistoryPort.wire.encodeQuestion([
      { subjectId: makeSubjectId("alice"), resourceId: undefined },
    ]);
    if (Result.isFailure(encoded)) return assert.fail(encoded.failure);
    assert.deepStrictEqual(encoded.success, { subjectId: "alice" });
  });
});
