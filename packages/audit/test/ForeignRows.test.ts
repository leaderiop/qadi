/**
 * A row the codec did not make, and a `keyMaterial` the reader would refuse, are refused
 * where the audit functions take them.
 *
 * The compiler refuses a literal or a spread of a row, but a store client hands rows back
 * as `any` (`JSON.parse`, a raw SQL row, an untyped ORM result) and a JavaScript caller
 * has no compiler at all, so the type alone does not keep one out. Each test builds the
 * rows a store would return, as parsed JSON, and pins the exact refusal, the index of the
 * first row refused, and that nothing was archived or planned from them. A row only the
 * codec made is the positive twin of each. The writer's third host-supplied input,
 * `keyMaterial`, is read the same way: a store or a JavaScript caller hands it over as
 * `any`, and the writer refuses what its own reader would. A row the codec made is also
 * one nothing can change afterwards.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Match from "effect/Match";
import * as Result from "effect/Result";
import { ArchiveInputRefusal, archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import type { ArchivalOptions, KeyMaterial } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { admitBatch, admitRows } from "../src/HostBatch.ts";
import { RetentionInputRefusal, planPurge, planRetention } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord } from "./helpers.ts";
import { planBatches, rowsLists, writerBatches } from "./hostBatchFaults.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/** What a store client returns: the rows' parsed bytes, typed `any` by `JSON.parse`. */
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));

const good = codecRow("good");

/** A row whose `at` is not a number and which carries a key the codec refuses. */
const notDecodable = { record: { ...good.record, at: null }, sequenceNumber: undefined, extra: 1 };
/** Two rows whose numbers are consecutive but not integers. */
const fractional = [
  { record: good.record, sequenceNumber: 1.5 },
  { record: good.record, sequenceNumber: 2.5 },
];

const writerFailure = (entries: ReadonlyArray<AuditEntry>, now = 1_000) => {
  const result = Effect.runSync(Effect.result(archiveAuditTrail(entries, now)));
  return Result.isFailure(result) ? result.failure : assert.fail("the writer archived the rows");
};

const verifyFailure = (entries: ReadonlyArray<AuditEntry>) => {
  const result = Effect.runSync(Effect.result(verifySequenceIntegrity(entries)));
  return Result.isFailure(result) ? result.failure : assert.fail("the check passed the rows");
};

const planFailure = (entries: ReadonlyArray<AuditEntry>) => {
  const result = planRetention(entries, { maxAgeMs: 10 }, 100);
  return Result.isFailure(result) ? result.failure : assert.fail("the plan took the rows");
};

/**
 * What a JavaScript caller can hand over where the type says something else: `Reflect.get`
 * on an `object` answers `any`, which is what an untyped store client's result is.
 */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

const host = (value: unknown): ReadonlyArray<AuditEntry> => handedOver(value);

const archiveInvalid = (error: { readonly _tag: string }, refusal: ArchiveInputRefusal) => {
  assert.deepStrictEqual({ ...error }, { _tag: "ArchiveInputInvalid", refusal });
};

const notMade = (index: number) => ArchiveInputRefusal.EntryNotMadeByCodec({ index });
const notFinite = (value: unknown) => ArchiveInputRefusal.NowNotFinite({ value });
const itemRefused = (index: number) => ArchiveInputRefusal.KeyMaterialItemRefused({ index });
const notAList = (value: unknown) => ArchiveInputRefusal.KeyMaterialNotAList({ value });

describe("archiveAuditTrail refuses a row the codec did not make", () => {
  it("a parsed row with a null at and an extra key is ArchiveInputInvalid naming entries and its index", () => {
    archiveInvalid(writerFailure(fromStore([notDecodable])), notMade(0));
  });

  it("two plain rows numbered 1.5 and 2.5 are ArchiveInputInvalid, not a verified sequence", () => {
    archiveInvalid(writerFailure(fromStore(fractional)), notMade(0));
  });

  it("the index is the first row refused, after rows the codec made", () => {
    archiveInvalid(writerFailure([good, ...fromStore([notDecodable, fractional[0]])]), notMade(1));
  });

  it("a row with the codec's own bytes, parsed back, is still not one the codec made", () => {
    archiveInvalid(writerFailure(fromStore([good])), notMade(0));
  });

  it("an object with a real row's prototype and fields is not a row the codec made", () => {
    const imitation: AuditEntry = Object.create(
      Object.getPrototypeOf(good),
      Object.getOwnPropertyDescriptors(good),
    );
    archiveInvalid(writerFailure([imitation]), notMade(0));
  });

  it("null and a string in the list are refused by index", () => {
    archiveInvalid(writerFailure(fromStore([null])), notMade(0));
    archiveInvalid(writerFailure([good, ...fromStore(["a row"])]), notMade(1));
  });

  it("the rows are refused before a sequence break among them is looked for", () => {
    const broken = fromStore([
      { record: good.record, sequenceNumber: 1 },
      { record: good.record, sequenceNumber: 5 },
    ]);
    archiveInvalid(writerFailure(broken), notMade(0));
  });

  it("rows the codec made are archived and read back, with no rows too", () => {
    const decoded = Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: 1 }));
    for (const entries of [[good, codecRow("other")], [decoded.entry], []]) {
      const archive = Effect.runSync(archiveAuditTrail(entries, 1_000));
      assert.isTrue(Result.isSuccess(readAuditArchive(JSON.parse(JSON.stringify(archive)))));
    }
  });
});

describe("verifySequenceIntegrity refuses a row the codec did not make", () => {
  it("two plain rows numbered 1.5 and 2.5 are ArchiveInputInvalid naming entries and its index", () => {
    archiveInvalid(verifyFailure(fromStore(fractional)), notMade(0));
  });

  it("rows the codec made pass, and a sequence break is still SequenceIntegrityError", () => {
    const sequenced = (n: number) =>
      Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: n })).entry;
    assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(verifySequenceIntegrity([sequenced(1), sequenced(2)])))));
    assert.strictEqual(verifyFailure([sequenced(1), sequenced(3)])._tag, "SequenceIntegrityError");
  });
});

describe("planRetention and planPurge refuse a row the codec did not make", () => {
  const retentionInvalid = (error: { readonly _tag: string }, refusal: RetentionInputRefusal) => {
    assert.deepStrictEqual({ ...error }, { _tag: "RetentionInputInvalid", refusal });
  };
  const rowRefused = (index: number) => RetentionInputRefusal.EntryNotMadeByCodec({ index });

  it("planRetention names entries and the index of the first row refused", () => {
    retentionInvalid(planFailure(fromStore([notDecodable])), rowRefused(0));
    retentionInvalid(planFailure([good, ...fromStore([fractional[0]])]), rowRefused(1));
  });

  it("planRetention takes rows the codec made", () => {
    const plan = Result.getOrThrow(planRetention([good], { maxAgeMs: 10 }, 100_000));
    assert.strictEqual(plan.expired.length, 1);
  });

  it("planPurge refuses through the same rule, and its archive holds none of a plain copy", () => {
    const archive = Result.getOrThrow(
      readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail([good], 0))))),
    );
    const [plain] = fromStore([good]);
    if (plain === undefined) return assert.fail("no row");
    assert.strictEqual(archive.holds(plain), 0);
    const result = planPurge([plain], { maxAgeMs: 10 }, 100_000, archive);
    if (!Result.isFailure(result)) return assert.fail("the purge took a row the codec did not make");
    retentionInvalid(result.failure, rowRefused(0));
  });
});

describe("every function that takes rows refuses entries that are not a list", () => {
  /** Values a JavaScript caller can hand over where the type says a list. */
  const notLists: ReadonlyArray<unknown> = [
    undefined,
    null,
    7,
    "rows",
    { length: 1, 0: good },
    new Set([good]),
    good,
  ];
  const rowsNotAList = (value: unknown) => ArchiveInputRefusal.EntriesNotAList({ value });
  const retentionNotAList = (value: unknown) => RetentionInputRefusal.EntriesNotAList({ value });
  const storedArchive = () =>
    Result.getOrThrow(
      readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail([good], 0))))),
    );

  it("archiveAuditTrail fails ArchiveInputInvalid carrying the value given", () => {
    for (const value of notLists) {
      archiveInvalid(writerFailure(host(value)), rowsNotAList(value));
    }
  });

  it("verifySequenceIntegrity fails ArchiveInputInvalid carrying the value given", () => {
    for (const value of notLists) {
      archiveInvalid(verifyFailure(host(value)), rowsNotAList(value));
    }
  });

  it("planRetention fails RetentionInputInvalid carrying the value given", () => {
    for (const value of notLists) {
      const { _tag, refusal } = planFailure(host(value));
      assert.deepStrictEqual({ _tag, refusal }, { _tag: "RetentionInputInvalid", refusal: retentionNotAList(value) });
    }
  });

  it("planPurge fails the same way, before the archive is asked", () => {
    const archive = storedArchive();
    for (const value of notLists) {
      const result = planPurge(host(value), { maxAgeMs: 10 }, 100, archive);
      if (!Result.isFailure(result)) return assert.fail("the purge took entries that are not a list");
      assert.deepStrictEqual({ ...result.failure.refusal }, { ...retentionNotAList(value) });
    }
  });

  it("a list is read as before: rows the codec made, and none", () => {
    for (const entries of [[good], []]) {
      assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(archiveAuditTrail(entries, 0)))));
      assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(verifySequenceIntegrity(entries)))));
      assert.isTrue(Result.isSuccess(planRetention(entries, { maxAgeMs: 10 }, 100)));
      assert.isTrue(Result.isSuccess(planPurge(entries, { maxAgeMs: 10 }, 100, storedArchive())));
    }
  });
});

describe("a refusal is read by its member, and each member carries only what it names", () => {
  const archiveReading: (refusal: ArchiveInputRefusal) => string = Match.type<ArchiveInputRefusal>().pipe(
    Match.tagsExhaustive({
      NowNotFinite: ({ value }) => `now ${String(value)}`,
      KeyMaterialNotAList: ({ value }) => `keyMaterial ${typeof value}`,
      KeyMaterialItemRefused: ({ index }) => `keyMaterial item ${index + 1}`,
      EntriesNotAList: ({ value }) => `entries ${typeof value}`,
      EntryNotMadeByCodec: ({ index }) => `entry ${index + 1}`,
    }),
  );
  const retentionReading: (refusal: RetentionInputRefusal) => string = Match.type<RetentionInputRefusal>().pipe(
    Match.tagsExhaustive({
      NowNotFinite: ({ value }) => `now ${String(value)}`,
      MaxAgeInvalid: ({ value }) => `maxAgeMs ${String(value)}`,
      EntriesNotAList: ({ value }) => `entries ${typeof value}`,
      EntryNotMadeByCodec: ({ index }) => `entry ${index + 1}`,
    }),
  );

  it("each archive refusal is one member with its own field", () => {
    assert.deepStrictEqual(
      [
        notFinite(Number.NaN),
        notAList("x"),
        itemRefused(2),
        ArchiveInputRefusal.EntriesNotAList({ value: null }),
        notMade(3),
      ].map(archiveReading),
      ["now NaN", "keyMaterial string", "keyMaterial item 3", "entries object", "entry 4"],
    );
  });

  it("each retention refusal is one member with its own field", () => {
    assert.deepStrictEqual(
      [
        RetentionInputRefusal.NowNotFinite({ value: Number.POSITIVE_INFINITY }),
        RetentionInputRefusal.MaxAgeInvalid({ value: -1 }),
        RetentionInputRefusal.EntriesNotAList({ value: undefined }),
        RetentionInputRefusal.EntryNotMadeByCodec({ index: 0 }),
      ].map(retentionReading),
      ["now Infinity", "maxAgeMs -1", "entries undefined", "entry 1"],
    );
  });

  it("the refusals the functions give are the ones read: a writer failure and a plan failure", () => {
    const refusalOf = (error: ReturnType<typeof writerFailure>) =>
      error._tag === "ArchiveInputInvalid" ? error.refusal : assert.fail(error._tag);
    assert.strictEqual(archiveReading(refusalOf(writerFailure(fromStore([notDecodable])))), "entry 1");
    assert.strictEqual(archiveReading(refusalOf(writerFailure([good], Number.NaN))), "now NaN");
    assert.strictEqual(retentionReading(planFailure(fromStore([notDecodable])).refusal), "entry 1");
  });
});

describe("archiveAuditTrail refuses a keyMaterial its reader would refuse", () => {
  const key = { keyId: "k1", algorithm: "ed25519", publicKey: "AAAA" };
  type Rows = ReadonlyArray<AuditEntry>;
  const run = (options: ArchivalOptions, entries: Rows = [good], now = 1_000) =>
    Effect.runSync(Effect.result(archiveAuditTrail(entries, now, options)));
  /** What a store client or a JavaScript caller hands over: parsed JSON, typed `any`. */
  const given = (keyMaterial: unknown): ArchivalOptions =>
    JSON.parse(JSON.stringify({ keyMaterial }));
  const refused = (keyMaterial: unknown, entries?: Rows, now?: number) => {
    const result = run(given(keyMaterial), entries, now);
    if (Result.isFailure(result)) return result.failure;
    return assert.fail("the writer archived the keys");
  };

  it("a number keyId is refused by index, not archived for the reader to refuse", () => {
    archiveInvalid(refused([{ ...key, keyId: 5 }]), itemRefused(0));
  });

  it("the index is the first item refused, after items the reader reads", () => {
    const missing = { keyId: "k2", algorithm: "a" };
    archiveInvalid(refused([key, missing, null]), itemRefused(1));
  });

  it("a null item and a string item are refused by index", () => {
    archiveInvalid(refused([null]), itemRefused(0));
    archiveInvalid(refused([key, "k"]), itemRefused(1));
  });

  it("an item with a missing field or a non-string field is refused by index", () => {
    archiveInvalid(refused([{ keyId: "k", algorithm: "a" }]), itemRefused(0));
    archiveInvalid(refused([{ ...key, publicKey: null }]), itemRefused(0));
  });

  it("a hole in the list is an item that is not key material", () => {
    const sparse: Array<KeyMaterial> = Array.from({ length: 3 });
    delete sparse[1];
    sparse[0] = key;
    sparse[2] = key;
    const result = run({ keyMaterial: sparse });
    if (!Result.isFailure(result)) return assert.fail("the writer archived the keys");
    archiveInvalid(result.failure, itemRefused(1));
  });

  it("a value that is not a list is refused with the value given", () => {
    for (const value of ["x", 7, null, true, { keyId: "k" }]) {
      archiveInvalid(refused(value), notAList(value));
    }
  });

  it("a keyMaterial list is read once, so what is checked is what is written", () => {
    let reads = 0;
    const options: ArchivalOptions = {
      get keyMaterial() {
        reads += 1;
        return reads === 1 ? [key] : [{ ...key, keyId: "second read" }];
      },
    };
    const archive = Effect.runSync(archiveAuditTrail([good], 1_000, options));
    assert.strictEqual(reads, 1);
    assert.deepStrictEqual(archive.keyMaterial, [key]);
  });

  it("an item field is read once, so a value that changes after the check is never archived", () => {
    const five = handedOver<string>(5);
    let reads = 0;
    const shifting: KeyMaterial = {
      get keyId() {
        reads += 1;
        return reads === 1 ? "a" : five;
      },
      algorithm: "b",
      publicKey: "c",
    };
    const archive = Effect.runSync(archiveAuditTrail([good], 1_000, { keyMaterial: [shifting] }));
    assert.strictEqual(reads, 1);
    const read = Result.getOrThrow(readAuditArchive(JSON.parse(JSON.stringify(archive))));
    assert.deepStrictEqual(read.keyMaterial, [{ keyId: "a", algorithm: "b", publicKey: "c" }]);
  });

  it("an item whose fields are accessors on its class is archived as its three fields", () => {
    class Held {
      get keyId() {
        return key.keyId;
      }
      get algorithm() {
        return key.algorithm;
      }
      get publicKey() {
        return key.publicKey;
      }
    }
    const archive = Effect.runSync(archiveAuditTrail([good], 1_000, { keyMaterial: [new Held()] }));
    assert.deepStrictEqual(archive.keyMaterial, [key]);
  });

  it("key material the reader reads is archived, with an extra key dropped", () => {
    for (const keyMaterial of [[key], [{ ...key, privateKey: "secret" }, key], []]) {
      const archive = Effect.runSync(archiveAuditTrail([good], 1_000, { keyMaterial }));
      const stored = JSON.parse(JSON.stringify(archive));
      const read = Result.getOrThrow(readAuditArchive(stored));
      assert.deepStrictEqual(read.keyMaterial, keyMaterial.map(() => key));
    }
  });
});

describe("each function that takes a batch refuses what the admission step refuses", () => {
  /** A refusal as its members, so two refusals are equal when they say the same thing. */
  const members = (refusal: object) => ({ ...refusal });
  const archive = Result.getOrThrow(
    readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail([good], 0))))),
  );

  it("archiveAuditTrail refuses each batch as the admission step refuses it", () => {
    for (const { name, now, keyMaterial, terms, entries } of writerBatches) {
      const stepped = admitBatch({ now, terms: () => terms, entries });
      const written = Effect.runSync(
        Effect.result(archiveAuditTrail(entries, now, keyMaterial === undefined ? undefined : { keyMaterial })),
      );
      const refusal =
        Result.isFailure(written) && written.failure._tag === "ArchiveInputInvalid"
          ? members(written.failure.refusal)
          : undefined;
      assert.deepStrictEqual(refusal, Result.isFailure(stepped) ? members(stepped.failure) : undefined, name);
    }
  });

  it("verifySequenceIntegrity refuses each rows list as the admission step refuses it", () => {
    for (const { name, entries } of rowsLists) {
      const stepped = admitRows(entries);
      const verified = Effect.runSync(Effect.result(verifySequenceIntegrity(entries)));
      const refusal =
        Result.isFailure(verified) && verified.failure._tag === "ArchiveInputInvalid"
          ? members(verified.failure.refusal)
          : undefined;
      assert.deepStrictEqual(refusal, Result.isFailure(stepped) ? members(stepped.failure) : undefined, name);
    }
  });

  it("planRetention refuses each batch as the admission step refuses it", () => {
    for (const { name, now, policy, terms, entries } of planBatches) {
      const stepped = admitBatch({ now, terms: () => terms, entries });
      const planned = planRetention(entries, policy, now);
      const refusal = Result.isFailure(planned) ? members(planned.failure.refusal) : undefined;
      assert.deepStrictEqual(refusal, Result.isFailure(stepped) ? members(stepped.failure) : undefined, name);
    }
  });

  it("planPurge refuses each batch as the admission step refuses it", () => {
    for (const { name, now, policy, terms, entries } of planBatches) {
      const stepped = admitBatch({ now, terms: () => terms, entries });
      const planned = planPurge(entries, policy, now, archive);
      const refusal = Result.isFailure(planned) ? members(planned.failure.refusal) : undefined;
      assert.deepStrictEqual(refusal, Result.isFailure(stepped) ? members(stepped.failure) : undefined, name);
    }
  });
});

describe("a row the codec made cannot be changed afterwards", () => {
  const decoded = (record: unknown, sequenceNumber?: number) =>
    Result.getOrThrow(decodeAuditEntry({ record, sequenceNumber })).entry;
  /** Made inside the test, so the test is what covers the codec's freeze. */
  const madeHere = () => [codecRow("fresh"), decoded(good.record, 1)];

  it("a write to sequenceNumber or to record throws and leaves the row as it was", () => {
    for (const row of madeHere()) {
      const before = JSON.stringify(row);
      assert.throws(() => Object.assign(row, { sequenceNumber: 1.5 }), TypeError);
      assert.throws(() => Object.assign(row, { record: null }), TypeError);
      assert.strictEqual(JSON.stringify(row), before);
    }
  });

  it("a write to the row's record throws and leaves its at as it was", () => {
    for (const row of madeHere()) {
      assert.throws(() => Object.assign(row.record, { at: null }), TypeError);
      assert.strictEqual(row.record.at, 1_000);
    }
  });

  it("the codec freezes the record it built, not the object a host handed it", () => {
    const host = JSON.parse(JSON.stringify(good.record));
    const entry = decoded(host, 1);
    assert.isFalse(Object.isFrozen(host));
    assert.isTrue(Object.isFrozen(entry.record));
    assert.isFalse(Object.is(entry.record, host));
    assert.isTrue(Object.isFrozen(entry));
    assert.isTrue(Object.isFrozen(codecRow("again")));
  });

  it("a frozen row equals its twin, hashes alike and is held by an archive", () => {
    const [, sequenced] = madeHere();
    const again = decoded(good.record, 1);
    if (sequenced === undefined) return assert.fail("no row");
    assert.isTrue(Equal.equals(sequenced, again));
    assert.strictEqual(Hash.hash(sequenced), Hash.hash(again));
    const written = Effect.runSync(archiveAuditTrail([sequenced], 0));
    const stored = JSON.parse(JSON.stringify(written));
    const archive = Result.getOrThrow(readAuditArchive(stored));
    assert.strictEqual(archive.holds(again), 1);
  });
});
