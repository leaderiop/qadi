import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
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
