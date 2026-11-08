/**
 * Properties that the archive reader accepts what the writer writes, and
 * refuses every tampering of it.
 *
 * Written before the archive's facts module exists (ARCH-48, D-06): the writer
 * ({@link archiveAuditTrail}) and the reader ({@link readAuditArchive}) each
 * restate the order, the claim rule and the sequence-break check today, and the
 * refactor that states them once has to leave every behavior here unchanged. So
 * this file passes before and after that refactor, and imports only module
 * paths that survive it.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { ArchiveRefusal, archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord } from "./helpers.ts";

/** Twelve structurally distinct rows, each encoded once: the evaluationIds differ. */
const pool: ReadonlyArray<AuditEntry> = Array.from({ length: 12 }, (_, i) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "r-" + i }))),
);

/** The bundle's JSON shape, entries left opaque so a test can corrupt them. */
interface StoredBundle {
  readonly archiveVersion: string;
  readonly metadata: {
    readonly createdAt: number;
    readonly entryCount: number;
    readonly sequenceIntegrityVerified: boolean;
  };
  readonly entries: ReadonlyArray<unknown>;
  readonly keyMaterial?: ReadonlyArray<unknown> | undefined;
}

/** What a long-term store gives back for a bundle: text, then parsed. */
const stored = (archive: unknown): StoredBundle => JSON.parse(JSON.stringify(archive));

/**
 * A writer-acceptable input: `k` sequenced entries numbered `start..start+k-1`
 * (pool entry `i` carries `start + i`) and `u` unsequenced ones (pool entries
 * `k..k+u-1`), in any input order. The numbers are contiguous and unique, so
 * the writer accepts every input this produces.
 */
const intactInput = FastCheck.tuple(
  FastCheck.integer({ min: 0, max: 1_000 }),
  FastCheck.integer({ min: 0, max: 6 }),
  FastCheck.integer({ min: 0, max: 6 }),
).chain(([start, k, u]) => {
  const rows = pool.slice(0, k + u).map((entry, i) => (i < k ? { ...entry, sequenceNumber: start + i } : entry));
  return FastCheck.shuffledSubarray(rows, { minLength: k + u, maxLength: k + u }).map((input) => ({
    start,
    k,
    u,
    input,
  }));
});

describe("PROPERTY: readAuditArchive accepts every bundle archiveAuditTrail writes", () => {
  it("sequenced, unsequenced and mixed entries, in any order, with or without keyMaterial", () => {
    FastCheck.assert(
      FastCheck.property(
        intactInput,
        FastCheck.integer({ min: 0, max: 1_000_000_000 }),
        FastCheck.boolean(),
        ({ k, u, input }, createdAt, withKeyMaterial) => {
          const keyMaterial = [{ keyId: "k1", algorithm: "Ed25519", publicKey: "base64==" }];
          const archive = Effect.runSync(
            archiveAuditTrail(input, createdAt, withKeyMaterial ? { keyMaterial } : undefined),
          );
          const read = readAuditArchive(stored(archive));
          if (!Result.isSuccess(read)) return assert.fail("the reader refused a bundle the writer wrote");

          const verified = read.success;
          assert.strictEqual(verified.entryCount, k + u);
          assert.strictEqual(verified.createdAt, createdAt);
          // The test's own oracle for the claim rule, stated independently of the source.
          assert.strictEqual(verified.sequenceIntegrityVerified, k >= 2);
          assert.deepStrictEqual(verified.keyMaterial, withKeyMaterial ? keyMaterial : undefined);
          for (const entry of input) assert.strictEqual(verified.holds(entry), 1);

          const sequencedIds = Array.from({ length: k }, (_, i) => "r-" + i);
          const unsequencedIds = input
            .filter((entry) => entry.sequenceNumber === undefined)
            .map((entry) => entry.record.evaluationId);
          assert.deepStrictEqual(
            verified.entries.map((entry) => entry.record.evaluationId),
            [...sequencedIds, ...unsequencedIds],
          );
        },
      ),
      { numRuns: 200 },
    );
  });
});

/** The refusal of a failed read; fails the assertion when the read succeeds. */
const refusalOf = (input: unknown): ArchiveRefusal => {
  const result = readAuditArchive(input);
  if (!Result.isFailure(result)) return assert.fail("expected the archive to be refused");
  assert.strictEqual(result.failure._tag, "ArchiveNotVerified");
  return result.failure.refusal;
};

/** The refusal of a failed read, narrowed to `tag`; fails the assertion on any other kind. */
const refusalAs = <Tag extends ArchiveRefusal["_tag"]>(input: unknown, tag: Tag) => {
  const refusal = refusalOf(input);
  if (!ArchiveRefusal.$is(tag)(refusal)) return assert.fail("expected " + tag + ", got " + refusal._tag);
  return refusal;
};

/** `entries` with the rows at `i` and `j` exchanged. */
const swapped = <T>(entries: ReadonlyArray<T>, i: number, j: number): ReadonlyArray<T> => {
  const a = entries[i];
  const b = entries[j];
  if (a === undefined || b === undefined) return assert.fail("swap index out of range");
  return entries.with(i, b).with(j, a);
};

describe("PROPERTY: each ArchiveRefusal fires on its own tampering of a written bundle", () => {
  it("names the refusal kind and its payload, for every tampering the bundle admits", () => {
    FastCheck.assert(
      FastCheck.property(intactInput, ({ start, k, u, input }) => {
        const n = k + u;
        const b = stored(Effect.runSync(archiveAuditTrail(input, 0)));
        // The bundle with these entries; `entryCount` follows them unless the tampering sets it.
        const withEntries = (entries: ReadonlyArray<unknown>): StoredBundle => ({
          ...b,
          entries,
          metadata: { ...b.metadata, entryCount: entries.length },
        });

        refusalAs({ ...b, extra: true }, "Malformed");

        assert.strictEqual(refusalAs({ ...b, archiveVersion: "2" }, "UnsupportedArchiveVersion").version, "2");

        if (n >= 1) {
          const index = Math.floor(n / 2);
          const refusal = refusalAs(withEntries(b.entries.with(index, { record: { not: "a record" } })), "EntryNotDecodable");
          assert.strictEqual(refusal.index, index);
        }

        const counted = refusalAs({ ...b, metadata: { ...b.metadata, entryCount: n + 1 } }, "CountMismatch");
        assert.strictEqual(counted.declared, n + 1);
        assert.strictEqual(counted.actual, n);

        if (k >= 3) {
          const gap = refusalAs(withEntries(b.entries.toSpliced(1, 1)), "SequenceBroken");
          assert.strictEqual(gap.expectedSequence, start + 1);
          assert.strictEqual(gap.actualSequence, start + 2);
        }

        const first = b.entries[0];
        if (k >= 1 && first !== undefined) {
          const duplicate = refusalAs(withEntries(b.entries.toSpliced(1, 0, first)), "SequenceBroken");
          assert.strictEqual(duplicate.expectedSequence, start + 1);
          assert.strictEqual(duplicate.actualSequence, start);
        }

        if (k >= 2) {
          assert.strictEqual(refusalAs(withEntries(swapped(b.entries, 0, 1)), "NotInSequenceOrder").index, 1);
        }

        if (k >= 1 && u >= 1) {
          assert.strictEqual(refusalAs(withEntries(swapped(b.entries, k - 1, k)), "NotInSequenceOrder").index, k);
        }

        const claim = refusalAs(
          { ...b, metadata: { ...b.metadata, sequenceIntegrityVerified: !b.metadata.sequenceIntegrityVerified } },
          "UnbackedClaim",
        );
        assert.strictEqual(claim.sequencedCount, k);
      }),
      { numRuns: 100 },
    );
  });
});

/** The first position whose key is strictly less than its predecessor's. */
const firstDescent = (keys: ReadonlyArray<number>): number | undefined => {
  for (let i = 1; i < keys.length; i++) {
    const previous = keys[i - 1];
    const current = keys[i];
    if (previous !== undefined && current !== undefined && current < previous) return i;
  }
  return undefined;
};

describe("PROPERTY: any reordering of a written bundle is refused at the first entry that sorts before its predecessor", () => {
  const reordered = intactInput.chain((built) => {
    const n = built.k + built.u;
    return FastCheck.shuffledSubarray(
      Array.from({ length: n }, (_, i) => i),
      { minLength: n, maxLength: n },
    ).map((permutation) => ({ ...built, permutation }));
  });

  it("refuses at the first descent, and accepts a reordering that leaves archive order", () => {
    FastCheck.assert(
      FastCheck.property(reordered, ({ input, permutation }) => {
        const archive = Effect.runSync(archiveAuditTrail(input, 0));
        const b = stored(archive);
        const keys = permutation.flatMap((i) => {
          const entry = archive.entries[i];
          return entry === undefined ? [] : [entry.sequenceNumber ?? Number.POSITIVE_INFINITY];
        });
        const bundle = { ...b, entries: permutation.map((i) => b.entries[i]) };

        const descent = firstDescent(keys);
        if (descent === undefined) {
          assert.isTrue(Result.isSuccess(readAuditArchive(bundle)));
        } else {
          assert.strictEqual(refusalAs(bundle, "NotInSequenceOrder").index, descent);
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe("PROPERTY: the writer refuses exactly the inputs the reader reports as SequenceBroken, with the same numbers", () => {
  const maybeSequenced = FastCheck.array(
    FastCheck.option(FastCheck.integer({ min: 0, max: 8 }), { nil: undefined }),
    { maxLength: 12 },
  );

  it("agrees on whether the sequence is broken, and on where", () => {
    FastCheck.assert(
      FastCheck.property(maybeSequenced, (numbers) => {
        const entries = numbers.flatMap((sequenceNumber, i) => {
          const entry = pool[i];
          if (entry === undefined) return [];
          return [sequenceNumber === undefined ? entry : { ...entry, sequenceNumber }];
        });
        const writer = Effect.runSync(Effect.result(archiveAuditTrail(entries, 0)));
        const read = readAuditArchive({
          archiveVersion: "1",
          metadata: { createdAt: 0, entryCount: entries.length, sequenceIntegrityVerified: false },
          entries: stored(entries),
        });
        const refusal = Result.isFailure(read) ? read.failure.refusal : undefined;
        const readerBroken = refusal !== undefined && refusal._tag === "SequenceBroken";

        assert.strictEqual(Result.isFailure(writer), readerBroken);
        if (Result.isFailure(writer) && refusal !== undefined && refusal._tag === "SequenceBroken") {
          assert.strictEqual(writer.failure._tag, "SequenceIntegrityError");
          assert.strictEqual(writer.failure.expectedSequence, refusal.expectedSequence);
          assert.strictEqual(writer.failure.actualSequence, refusal.actualSequence);
        }
      }),
      { numRuns: 300 },
    );
  });
});
