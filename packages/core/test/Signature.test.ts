import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { Signature, SIGNATURE_MEANINGS } from "../src/Signature.ts";

const raw = {
  signerId: "alice",
  meaning: "approved",
  signerRole: "manager",
  signedAt: 1_700_000_000_000,
  algorithm: "ed25519",
  keyId: "key-1",
};

describe("Signature", () => {
  it.effect("decodes a fully-populated signature", () =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(Signature)(raw);
      assert.strictEqual(decoded.signerId, "alice");
      assert.strictEqual(decoded.meaning, "approved");
      assert.strictEqual(decoded.signerRole, "manager");
      assert.strictEqual(decoded.signedAt, 1_700_000_000_000);
      assert.strictEqual(decoded.algorithm, "ed25519");
      assert.strictEqual(decoded.keyId, "key-1");
    }));

  it.effect("signerRole, algorithm and keyId are all optional", () =>
    Effect.gen(function* () {
      const { signerRole: _signerRole, algorithm: _algorithm, keyId: _keyId, ...minimal } = raw;
      const decoded = yield* Schema.decodeUnknownEffect(Signature)(minimal);
      assert.isUndefined(decoded.signerRole);
      assert.isUndefined(decoded.algorithm);
      assert.isUndefined(decoded.keyId);
    }));

  it.effect("meaning stays an open string — an unlisted value still decodes", () =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(Signature)({
        ...raw,
        meaning: "site-specific-meaning",
      });
      assert.strictEqual(decoded.meaning, "site-specific-meaning");
    }));

  it.effect("a real signature round-trips through Schema encode/decode unchanged", () =>
    Effect.gen(function* () {
      const decoded = yield* Schema.decodeUnknownEffect(Signature)(raw);
      const encoded = yield* Schema.encodeEffect(Signature)(decoded);
      const roundTripped = yield* Schema.decodeUnknownEffect(Signature)(
        JSON.parse(JSON.stringify(encoded)),
      );
      assert.deepStrictEqual(roundTripped, decoded);
    }));

  // Signature.ts's own doc comment claims the same ADR-QD-002 trust-boundary
  // condition as Policy/Obligation — decoded from untrusted, persisted JSON —
  // so a missing required field or a wrong-typed one must fail decode rather
  // than silently produce a malformed value.
  it.effect("rejects a payload missing signerId", () =>
    Effect.gen(function* () {
      const { signerId: _signerId, ...missingSignerId } = raw;
      const result = yield* Effect.result(Schema.decodeUnknownEffect(Signature)(missingSignerId));
      assert.isTrue(Result.isFailure(result));
    }));

  it.effect("rejects a payload missing meaning", () =>
    Effect.gen(function* () {
      const { meaning: _meaning, ...missingMeaning } = raw;
      const result = yield* Effect.result(Schema.decodeUnknownEffect(Signature)(missingMeaning));
      assert.isTrue(Result.isFailure(result));
    }));

  it.effect("rejects a payload missing signedAt", () =>
    Effect.gen(function* () {
      const { signedAt: _signedAt, ...missingSignedAt } = raw;
      const result = yield* Effect.result(Schema.decodeUnknownEffect(Signature)(missingSignedAt));
      assert.isTrue(Result.isFailure(result));
    }));

  it.effect("rejects a payload with a wrong-typed signedAt", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        Schema.decodeUnknownEffect(Signature)({ ...raw, signedAt: "now" }),
      );
      assert.isTrue(Result.isFailure(result));
    }));
});

describe("SIGNATURE_MEANINGS", () => {
  it("is the recommended, non-exhaustive vocabulary carried over from @qadi/audit's ElectronicSignature", () => {
    assert.deepStrictEqual(SIGNATURE_MEANINGS, {
      AUTHORED: "authored",
      REVIEWED: "reviewed",
      APPROVED: "approved",
      REJECTED: "rejected",
      WITNESSED: "witnessed",
      RELEASED: "released",
      WITNESSED_DESTRUCTION: "witnessed-destruction",
    });
  });
});
