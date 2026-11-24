/**
 * Properties that the archive reader accepts what the writer writes, and
 * refuses every tampering of it.
 *
 * Written before `ArchiveFacts.ts` existed (ARCH-48, D-06), so the refactor that
 * moved the writer's ({@link archiveAuditTrail}) and the reader's
 * ({@link readAuditArchive}) order, claim rule and sequence-break check into it
 * had to leave every behavior here unchanged; the file imports only the public
 * modules for that reason. The property over the whole `number` domain reads the
 * safe-integer rule at the codec, where it is stated once, and holds the writer to
 * the reader on every row the codec makes (ADR-QD-110, ADR-QD-190). The last two
 * properties close the writer's domain (any entries, any finite `now`, any
 * `keyMaterial`) and the codec's (any record, hostile values included) the same way.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Result from "effect/Result";
import * as FastCheck from "fast-check";
import { MAX_DECODE_DEPTH } from "@qadi/core";
import { ArchiveRefusal, archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord, numbered } from "./helpers.ts";

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
  const rows = pool
    .slice(0, k + u)
    .map((entry, i) => (i < k ? numbered(entry, start + i) : entry));
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
          return [sequenceNumber === undefined ? entry : numbered(entry, sequenceNumber)];
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
          if (writer.failure._tag !== "SequenceIntegrityError") return assert.fail("expected SequenceIntegrityError");
          assert.strictEqual(writer.failure.expectedSequence, refusal.expectedSequence);
          assert.strictEqual(writer.failure.actualSequence, refusal.actualSequence);
        }
      }),
      { numRuns: 300 },
    );
  });
});

describe("PROPERTY: over any number, the codec sets the domain and the writer", () => {
  // Small integers to make contiguous runs likely, and every kind of number the
  // TypeScript type admits but the AuditEntry codec does not.
  const anyNumber = FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 4 }),
    FastCheck.double(),
    FastCheck.constantFrom(
      Number.MAX_SAFE_INTEGER,
      -Number.MAX_SAFE_INTEGER,
      2 ** 53,
      2 ** 53 + 2,
      -(2 ** 53),
      Number.MAX_VALUE,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      Number.NaN,
      0.5,
      1.5,
    ),
  );
  const safeNumber = FastCheck.oneof(
    FastCheck.integer({ min: 0, max: 4 }),
    FastCheck.constantFrom(
      Number.MAX_SAFE_INTEGER,
      Number.MAX_SAFE_INTEGER - 1,
      -Number.MAX_SAFE_INTEGER,
    ),
  );
  const optional = FastCheck.option(safeNumber, { nil: undefined });
  const maybeNumbered = FastCheck.array(optional, { maxLength: 8 });

  it("decodeAuditEntry reads a safe integer, and refuses any other as Malformed", () => {
    const record = pool[0]?.record ?? assert.fail("the pool is empty");
    FastCheck.assert(
      FastCheck.property(anyNumber, (sequenceNumber) => {
        const decoded = decodeAuditEntry({ record, sequenceNumber });
        if (Number.isSafeInteger(sequenceNumber)) {
          assert.isTrue(Result.isSuccess(decoded));
          return;
        }
        if (!Result.isFailure(decoded)) return assert.fail("an unsafe number was read");
        assert.strictEqual(decoded.failure.refusal._tag, "Malformed");
      }),
      { numRuns: 500 },
    );
  });

  it("fails as the reader reads, and otherwise writes a readable bundle", () => {
    FastCheck.assert(
      FastCheck.property(maybeNumbered, (numbers) => {
        const entries = numbers.flatMap((sequenceNumber, i) => {
          const entry = pool[i];
          if (entry === undefined) return [];
          return [sequenceNumber === undefined ? entry : numbered(entry, sequenceNumber)];
        });
        const writer = Effect.runSync(Effect.result(archiveAuditTrail(entries, 0)));

        if (Result.isFailure(writer)) {
          if (writer.failure._tag !== "SequenceIntegrityError") {
            return assert.fail("expected SequenceIntegrityError");
          }
          const read = readAuditArchive({
            archiveVersion: "1",
            metadata: {
              createdAt: 0,
              entryCount: entries.length,
              sequenceIntegrityVerified: false,
            },
            entries: stored(entries),
          });
          if (!Result.isFailure(read)) return assert.fail("a refused bundle was read");
          const refusal = read.failure.refusal;
          if (refusal._tag !== "SequenceBroken") return assert.fail(refusal._tag);
          assert.strictEqual(writer.failure.expectedSequence, refusal.expectedSequence);
          assert.strictEqual(writer.failure.actualSequence, refusal.actualSequence);
          return;
        }
        assert.isTrue(Result.isSuccess(readAuditArchive(stored(writer.success))));
      }),
      { numRuns: 500 },
    );
  });
});

describe("PROPERTY: every archive the writer returns is read back", () => {
  const maybeNumbered = FastCheck.array(
    FastCheck.option(FastCheck.integer({ min: 0, max: 4 }), { nil: undefined }),
    { maxLength: 8 },
  );
  // Every finite number, negative zero included, which a JSON text writes as 0.
  const finiteNow = FastCheck.oneof(
    FastCheck.double({ noNaN: true, noDefaultInfinity: true }),
    FastCheck.constant(-0),
  );
  const text = FastCheck.string({ unit: "binary" });
  // An item with an optional extra key: the type admits it, the writer must not carry it.
  const keyItem = FastCheck.record(
    { keyId: text, algorithm: text, publicKey: text, extra: text },
    { requiredKeys: ["keyId", "algorithm", "publicKey"] },
  );
  const keyMaterial = FastCheck.option(FastCheck.array(keyItem, { maxLength: 3 }), {
    nil: undefined,
  });

  it("fails as the reader reads, or writes a bundle that reads back", () => {
    FastCheck.assert(
      FastCheck.property(maybeNumbered, finiteNow, keyMaterial, (numbers, now, items) => {
        const entries = numbers.flatMap((sequenceNumber, i) => {
          const entry = pool[i];
          if (entry === undefined) return [];
          return [sequenceNumber === undefined ? entry : numbered(entry, sequenceNumber)];
        });
        const options = items === undefined ? undefined : { keyMaterial: items };
        const written = Effect.runSync(
          Effect.result(archiveAuditTrail(entries, now, options)),
        );
        if (Result.isFailure(written)) {
          return assert.strictEqual(written.failure._tag, "SequenceIntegrityError");
        }

        const read = readAuditArchive(stored(written.success));
        if (!Result.isSuccess(read)) return assert.fail("the reader refused the writer");
        assert.strictEqual(read.success.createdAt, now);
        assert.strictEqual(read.success.entryCount, entries.length);
        const declared = items?.map(({ keyId, algorithm, publicKey }) => ({
          keyId,
          algorithm,
          publicKey,
        }));
        assert.deepStrictEqual(read.success.keyMaterial, declared);
      }),
      { numRuns: 500 },
    );
  });

  it("refuses a now of NaN, +Infinity or -Infinity as ArchiveInputInvalid", () => {
    for (const now of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const written = Effect.runSync(
        Effect.result(archiveAuditTrail(pool.slice(0, 3), now)),
      );
      if (!Result.isFailure(written)) return assert.fail("a non-finite now was archived");
      const failure = written.failure;
      if (failure._tag !== "ArchiveInputInvalid") return assert.fail(failure._tag);
      assert.strictEqual(failure.field, "now");
      assert.isTrue(Object.is(failure.value, now));
    }
  });
});

describe("PROPERTY: over any record, the codec refuses it or reads it back", () => {
  /** A value a record can hold, and whether a JSON round trip keeps it as that value. */
  interface Hostile {
    readonly value: unknown;
    readonly stable: boolean;
  }

  const nested = (levels: number): unknown => {
    let value: unknown = { leaf: true };
    for (let i = 0; i < levels; i++) value = { inner: value };
    return value;
  };
  const holed: Array<number> = [];
  holed[2] = 1;

  const hostile: ReadonlyArray<Hostile> = [
    { value: "plain", stable: true },
    { value: 7, stable: true },
    { value: "\uD800", stable: true },
    { value: -0, stable: true },
    { value: Number.NaN, stable: true },
    { value: 1n, stable: true },
    { value: holed, stable: true },
    { value: nested(MAX_DECODE_DEPTH + 10), stable: true },
    { value: new Date(0), stable: false },
    { value: undefined, stable: false },
  ];

  const protoResource = JSON.parse('{"__proto__": {"id": 1}}');

  // A record's resource, and whether every value in it survives a JSON round trip.
  const resource = FastCheck.oneof(
    FastCheck.dictionary(FastCheck.string(), FastCheck.constantFrom(...hostile)).map(
      (fields) => ({
        resource: Object.fromEntries(
          Object.entries(fields).map(([key, { value }]) => [key, value]),
        ),
        stable: Object.values(fields).every(({ stable }) => stable),
      }),
    ),
    FastCheck.constant({ resource: protoResource, stable: true }),
    FastCheck.constant({ resource: undefined, stable: true }),
  );
  const at = FastCheck.oneof(
    FastCheck.double(),
    FastCheck.constantFrom(Number.NaN, Infinity, -Infinity, -0),
  );

  it("is refused as SinkRecordNotEncodable, or read back with its own bytes", () => {
    FastCheck.assert(
      FastCheck.property(at, resource, (at, { resource, stable }) => {
        const withResource = resource === undefined ? {} : { resource };
        const record = decisionRecord({ at, ...withResource });
        const encoded = Effect.runSync(Effect.result(encodeAuditEntry(record)));
        if (Result.isFailure(encoded)) {
          return assert.strictEqual(encoded.failure._tag, "SinkRecordNotEncodable");
        }

        const entry = encoded.success;
        const bytes = JSON.stringify(entry);
        const read = decodeAuditEntry(JSON.parse(bytes));
        if (!Result.isSuccess(read)) return assert.fail("the codec refused its row");
        assert.strictEqual(JSON.stringify(read.success.entry), bytes);

        const again = decodeAuditEntry(JSON.parse(JSON.stringify(read.success.entry)));
        if (!Result.isSuccess(again)) return assert.fail("the codec refused a read-back");
        assert.isTrue(Equal.equals(again.success.entry, read.success.entry));
        if (stable) assert.isTrue(Equal.equals(read.success.entry, entry));
      }),
      { numRuns: 500 },
    );
  });
});
