import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { decisionRecord, failedWithCause, httpClientError } from "./helpers.ts";

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
      assert.isTrue(archive.metadata.sequenceIntegrityVerified);
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
        assert.strictEqual(result.failure._tag, "SequenceIntegrityError");
        assert.strictEqual(result.failure.expectedSequence, 2);
      }
    }));

  it.effect("entries out of write order are stored in sequence order, matching the verified claim", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));
      // Handed in reverse of their sequence numbers — verifySequenceIntegrity
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

  it.effect("in a mixed input, sequenced entries come first in number order and unsequenced follow in input order", () =>
    Effect.gen(function* () {
      const uLate = yield* encodeAuditEntry(decisionRecord({ evaluationId: "u-late", at: 300 }));
      const s2 = yield* encodeAuditEntry(decisionRecord({ evaluationId: "s2", at: 200 }));
      const uEarly = yield* encodeAuditEntry(decisionRecord({ evaluationId: "u-early", at: 100 }));
      const s1 = yield* encodeAuditEntry(decisionRecord({ evaluationId: "s1", at: 150 }));

      const archive = yield* archiveAuditTrail(
        [uLate, { ...s2, sequenceNumber: 2 }, uEarly, { ...s1, sequenceNumber: 1 }],
        0,
      );

      assert.deepStrictEqual(
        archive.entries.map((e) => e.record.evaluationId),
        ["s1", "s2", "u-late", "u-early"],
      );
      assert.isTrue(archive.metadata.sequenceIntegrityVerified);
    }));

  it.effect("one sequenced entry among unsequenced ones comes first, wherever it was given", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));

      const archive = yield* archiveAuditTrail([a, b, { ...c, sequenceNumber: 7 }], 0);

      assert.deepStrictEqual(
        archive.entries.map((e) => e.record.evaluationId),
        ["c", "a", "b"],
      );
    }));

  it.effect("an empty set archives to zero entries", () =>
    Effect.gen(function* () {
      const archive = yield* archiveAuditTrail([], 0);
      assert.strictEqual(archive.metadata.entryCount, 0);
      assert.isFalse(archive.metadata.sequenceIntegrityVerified);
    }));

  it.effect("no sequenced entries: sequenceIntegrityVerified is false, not a vacuous true", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));

      // Neither entry carries a sequenceNumber — verifySequenceIntegrity's
      // loop never runs, so nothing was actually verified.
      const archive = yield* archiveAuditTrail([a, b], 0);

      assert.isFalse(archive.metadata.sequenceIntegrityVerified);
    }));

  it.effect("exactly one sequenced entry: still nothing to compare, so still false", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));

      const archive = yield* archiveAuditTrail([{ ...a, sequenceNumber: 1 }, b], 0);

      assert.isFalse(archive.metadata.sequenceIntegrityVerified);
    }));

  it.effect("two or more sequenced entries that pass verification: true", () =>
    Effect.gen(function* () {
      const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
      const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
      const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));

      // A mix of sequenced and unsequenced entries — the two sequenced ones
      // are contiguous, which is enough to actually verify something.
      const archive = yield* archiveAuditTrail(
        [{ ...a, sequenceNumber: 1 }, b, { ...c, sequenceNumber: 2 }],
        0,
      );

      assert.isTrue(archive.metadata.sequenceIntegrityVerified);
    }));
});

/** The bundle's JSON shape, entries left opaque so a test can corrupt them. */
interface StoredBundle {
  readonly archiveVersion: string;
  readonly metadata: {
    readonly createdAt: number;
    readonly entryCount: number;
    readonly sequenceIntegrityVerified: boolean;
  };
  readonly entries: ReadonlyArray<unknown>;
}

/** What a long-term store gives back for a bundle: text, then parsed. */
const stored = (archive: unknown): StoredBundle => JSON.parse(JSON.stringify(archive));

const sequencedEntries = Effect.gen(function* () {
  const a = yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }));
  const b = yield* encodeAuditEntry(decisionRecord({ evaluationId: "b" }));
  const c = yield* encodeAuditEntry(decisionRecord({ evaluationId: "c" }));
  return [
    { ...a, sequenceNumber: 1 },
    { ...b, sequenceNumber: 2 },
    { ...c, sequenceNumber: 3 },
  ];
});

const refusalOf = (input: unknown) => {
  const result = readAuditArchive(input);
  if (!Result.isFailure(result)) return assert.fail("expected the archive to be refused");
  assert.strictEqual(result.failure._tag, "ArchiveNotVerified");
  return result.failure.refusal;
};

describe("readAuditArchive", () => {
  it.effect("reads a round-tripped bundle back, and holds every original entry once", () =>
    Effect.gen(function* () {
      const entries = yield* sequencedEntries;
      const archive = yield* archiveAuditTrail(entries, 5_000);
      const read = Result.getOrThrow(readAuditArchive(stored(archive)));

      assert.strictEqual(read.entryCount, 3);
      assert.strictEqual(read.createdAt, 5_000);
      assert.isTrue(read.sequenceIntegrityVerified);
      assert.isUndefined(read.keyMaterial);
      for (const entry of entries) assert.strictEqual(read.holds(entry), 1);
      const renumbered = { ...(yield* encodeAuditEntry(decisionRecord({ evaluationId: "a" }))), sequenceNumber: 9 };
      assert.strictEqual(read.holds(renumbered), 0);
    }));

  it.effect("reads unsequenced, mixed and empty bundles back", () =>
    Effect.gen(function* () {
      const u = yield* encodeAuditEntry(decisionRecord({ evaluationId: "u" }));
      const s = yield* sequencedEntries;
      const unsequenced = yield* archiveAuditTrail([u], 0);
      const readUnsequenced = Result.getOrThrow(readAuditArchive(stored(unsequenced)));
      assert.isFalse(readUnsequenced.sequenceIntegrityVerified);
      assert.strictEqual(readUnsequenced.holds(u), 1);

      const mixed = yield* archiveAuditTrail([u, ...s], 0);
      const readMixed = Result.getOrThrow(readAuditArchive(stored(mixed)));
      assert.deepStrictEqual(
        readMixed.entries.map((e) => e.record.evaluationId),
        ["a", "b", "c", "u"],
      );
      assert.isTrue(readMixed.sequenceIntegrityVerified);

      const empty = yield* archiveAuditTrail([], 0);
      const readEmpty = Result.getOrThrow(readAuditArchive(stored(empty)));
      assert.strictEqual(readEmpty.entryCount, 0);
      assert.isFalse(readEmpty.sequenceIntegrityVerified);
    }));

  it.effect("carries keyMaterial through unchanged", () =>
    Effect.gen(function* () {
      const keyMaterial = [{ keyId: "k1", algorithm: "Ed25519", publicKey: "base64==" }];
      const archive = yield* archiveAuditTrail(yield* sequencedEntries, 0, { keyMaterial });
      assert.deepStrictEqual(Result.getOrThrow(readAuditArchive(stored(archive))).keyMaterial, keyMaterial);
    }));

  it.effect("a Failed entry with an Error cause survives the round trip", () =>
    Effect.gen(function* () {
      const poisoned = yield* encodeAuditEntry(failedWithCause(httpClientError(), "poisoned"));
      const archive = yield* archiveAuditTrail([poisoned], 0);
      const read = Result.getOrThrow(readAuditArchive(stored(archive)));
      assert.strictEqual(read.holds(poisoned), 1);
    }));

  it("refuses a bundle that is not an object, naming Malformed", () => {
    for (const input of [null, undefined, 3, "archive", [], {}, { archiveVersion: "1" }]) {
      assert.strictEqual(refusalOf(input)._tag, "Malformed");
    }
  });

  it.effect("refuses a bundle with an excess property or a mistyped field as Malformed", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      assert.strictEqual(refusalOf({ ...bundle, extra: true })._tag, "Malformed");
      assert.strictEqual(
        refusalOf({ ...bundle, metadata: { ...bundle.metadata, entryCount: "3" } })._tag,
        "Malformed",
      );
      assert.strictEqual(refusalOf({ ...bundle, keyMaterial: [{ keyId: "k" }] })._tag, "Malformed");
    }));

  it.effect("refuses another archiveVersion as UnsupportedArchiveVersion", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const refusal = refusalOf({ ...bundle, archiveVersion: "2" });
      assert.strictEqual(refusal._tag, "UnsupportedArchiveVersion");
      if (refusal._tag === "UnsupportedArchiveVersion") assert.strictEqual(refusal.version, "2");
    }));

  it.effect("refuses an entry that does not decode, naming its index and the core refusal", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const entries = [bundle.entries[0], { record: { not: "a record" }, sequenceNumber: 2 }, bundle.entries[2]];
      const refusal = refusalOf({ ...bundle, entries });
      assert.strictEqual(refusal._tag, "EntryNotDecodable");
      if (refusal._tag === "EntryNotDecodable") {
        assert.strictEqual(refusal.index, 1);
        assert.strictEqual(refusal.refusal._tag, "UnsupportedVersion");
      }
    }));

  it.effect("refuses a count that disagrees with the entries as CountMismatch", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const dropped = { ...bundle, entries: bundle.entries.slice(0, 2) };
      const refusal = refusalOf(dropped);
      assert.strictEqual(refusal._tag, "CountMismatch");
      if (refusal._tag === "CountMismatch") {
        assert.strictEqual(refusal.declared, 3);
        assert.strictEqual(refusal.actual, 2);
      }
    }));

  it.effect("refuses a gap as SequenceBroken, naming the expected and actual numbers", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const entries = [bundle.entries[0], bundle.entries[2]];
      const refusal = refusalOf({ ...bundle, entries, metadata: { ...bundle.metadata, entryCount: 2 } });
      assert.strictEqual(refusal._tag, "SequenceBroken");
      if (refusal._tag === "SequenceBroken") {
        assert.strictEqual(refusal.expectedSequence, 2);
        assert.strictEqual(refusal.actualSequence, 3);
      }
    }));

  it.effect("refuses a duplicated sequence number as SequenceBroken", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const entries = [bundle.entries[0], bundle.entries[0], bundle.entries[1]];
      assert.strictEqual(refusalOf({ ...bundle, entries })._tag, "SequenceBroken");
    }));

  it.effect("refuses sequenced entries out of number order as NotInSequenceOrder, naming the index", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const entries = [bundle.entries[0], bundle.entries[2], bundle.entries[1]];
      const refusal = refusalOf({ ...bundle, entries });
      assert.strictEqual(refusal._tag, "NotInSequenceOrder");
      if (refusal._tag === "NotInSequenceOrder") assert.strictEqual(refusal.index, 2);
    }));

  it.effect("refuses an unsequenced entry ahead of a sequenced one as NotInSequenceOrder", () =>
    Effect.gen(function* () {
      const u = yield* encodeAuditEntry(decisionRecord({ evaluationId: "u" }));
      const bundle = stored(yield* archiveAuditTrail([...(yield* sequencedEntries), u], 0));
      const entries = [bundle.entries[0], bundle.entries[1], bundle.entries[3], bundle.entries[2]];
      const refusal = refusalOf({ ...bundle, entries });
      assert.strictEqual(refusal._tag, "NotInSequenceOrder");
      if (refusal._tag === "NotInSequenceOrder") assert.strictEqual(refusal.index, 3);
    }));

  it.effect("refuses a verified claim with fewer than two sequenced entries as UnbackedClaim", () =>
    Effect.gen(function* () {
      const u = yield* encodeAuditEntry(decisionRecord({ evaluationId: "u" }));
      const bundle = stored(yield* archiveAuditTrail([u], 0));
      const refusal = refusalOf({ ...bundle, metadata: { ...bundle.metadata, sequenceIntegrityVerified: true } });
      assert.strictEqual(refusal._tag, "UnbackedClaim");
      if (refusal._tag === "UnbackedClaim") assert.strictEqual(refusal.sequencedCount, 0);
    }));

  it.effect("refuses a bundle that denies a verification it has as UnbackedClaim", () =>
    Effect.gen(function* () {
      const bundle = stored(yield* archiveAuditTrail(yield* sequencedEntries, 0));
      const refusal = refusalOf({ ...bundle, metadata: { ...bundle.metadata, sequenceIntegrityVerified: false } });
      assert.strictEqual(refusal._tag, "UnbackedClaim");
      if (refusal._tag === "UnbackedClaim") assert.strictEqual(refusal.sequencedCount, 3);
    }));
});
