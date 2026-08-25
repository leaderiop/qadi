import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { archiveAuditTrail } from "../src/AuditArchive.ts";
import { decisionRecord } from "./helpers.ts";

describe("archiveAuditTrail", () => {
  it.effect("bundles a chain-intact set of entries with metadata", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const entries = [
        { ...a, sequenceNumber: 1 },
        { ...b, sequenceNumber: 2 },
      ];

      const archive = yield* archiveAuditTrail(entries, 5_000);

      assert.strictEqual(archive.archiveVersion, "1");
      assert.strictEqual(archive.metadata.entryCount, 2);
      assert.strictEqual(archive.metadata.createdAt, 5_000);
      assert.isTrue(archive.metadata.chainIntegrityVerified);
      assert.deepStrictEqual(archive.entries, entries);
      assert.isUndefined(archive.keyMaterial);
    }));

  it.effect("carries keyMaterial through, opaque and unvalidated, when supplied", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord());
      const keyMaterial = [{ keyId: "k1", algorithm: "Ed25519", publicKey: "base64==" }];

      const archive = yield* archiveAuditTrail([entry], 0, { keyMaterial });

      assert.deepStrictEqual(archive.keyMaterial, keyMaterial);
    }));

  it.effect("refuses to archive a broken chain rather than archiving it anyway", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const entries = [
        { ...a, sequenceNumber: 1 },
        { ...b, sequenceNumber: 3 },
      ];

      const result = yield* Effect.result(archiveAuditTrail(entries, 0));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "ChainIntegrityError");
        assert.strictEqual(result.failure.expectedSequence, 2);
      }
    }));

  it.effect("entries out of write order are stored in sequence order, matching the verified claim", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));
      // Handed in reverse of their sequence numbers — verifyChainIntegrity
      // tolerates this; the stored archive must not just claim to be
      // verified, it must actually be ordered.
      const outOfOrder = [
        { ...c, sequenceNumber: 3 },
        { ...a, sequenceNumber: 1 },
        { ...b, sequenceNumber: 2 },
      ];

      const archive = yield* archiveAuditTrail(outOfOrder, 0);

      assert.deepStrictEqual(
        archive.entries.map((e) => e.record.evaluationId),
        ["a", "b", "c"],
      );
    }));

  it.effect("unsequenced entries keep their relative order, stably, rather than being shuffled", () =>
    Effect.gen(function* () {
      const first = yield* encodeAuditEntry(decisionRecord({ evaluationId: "first" }));
      const second = yield* encodeAuditEntry(decisionRecord({ evaluationId: "second" }));

      const archive = yield* archiveAuditTrail([first, second], 0);

      assert.deepStrictEqual(
        archive.entries.map((e) => e.record.evaluationId),
        ["first", "second"],
      );
    }));

  it.effect("an empty set archives to zero entries", () =>
    Effect.gen(function* () {
      const archive = yield* archiveAuditTrail([], 0);
      assert.strictEqual(archive.metadata.entryCount, 0);
    }));
});
