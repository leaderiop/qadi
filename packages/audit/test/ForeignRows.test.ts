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
import * as Result from "effect/Result";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import type { ArchivalOptions, KeyMaterial } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/** What a store client returns: the rows' parsed bytes, typed `any` by `JSON.parse`. */
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));

const good = codecRow("good");

/** What a JavaScript caller can hand over where the type says something else: `any`. */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

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

const archiveInvalid = (
  error: { readonly _tag: string },
  field: string,
  value: unknown,
) => {
  assert.deepStrictEqual({ ...error }, { _tag: "ArchiveInputInvalid", field, value });
};

describe("archiveAuditTrail refuses a row the codec did not make", () => {
  it("a parsed row with a null at and an extra key is ArchiveInputInvalid naming entries and its index", () => {
    archiveInvalid(writerFailure(fromStore([notDecodable])), "entries", 0);
  });

  it("two plain rows numbered 1.5 and 2.5 are ArchiveInputInvalid, not a verified sequence", () => {
    archiveInvalid(writerFailure(fromStore(fractional)), "entries", 0);
  });

  it("the index is the first row refused, after rows the codec made", () => {
    archiveInvalid(writerFailure([good, ...fromStore([notDecodable, fractional[0]])]), "entries", 1);
  });

  it("a row with the codec's own bytes, parsed back, is still not one the codec made", () => {
    archiveInvalid(writerFailure(fromStore([good])), "entries", 0);
  });

  it("an object with a real row's prototype and fields is not a row the codec made", () => {
    const imitation: AuditEntry = Object.create(
      Object.getPrototypeOf(good),
      Object.getOwnPropertyDescriptors(good),
    );
    archiveInvalid(writerFailure([imitation]), "entries", 0);
  });

  it("null and a string in the list are refused by index", () => {
    archiveInvalid(writerFailure(fromStore([null])), "entries", 0);
    archiveInvalid(writerFailure([good, ...fromStore(["a row"])]), "entries", 1);
  });

  it("a non-finite now is refused before the rows are read", () => {
    archiveInvalid(writerFailure(fromStore([notDecodable]), Number.NaN), "now", Number.NaN);
  });

  it("the rows are refused before a sequence break among them is looked for", () => {
    const broken = fromStore([
      { record: good.record, sequenceNumber: 1 },
      { record: good.record, sequenceNumber: 5 },
    ]);
    archiveInvalid(writerFailure(broken), "entries", 0);
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
    archiveInvalid(verifyFailure(fromStore(fractional)), "entries", 0);
  });

  it("rows the codec made pass, and a sequence break is still SequenceIntegrityError", () => {
    const sequenced = (n: number) =>
      Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: n })).entry;
    assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(verifySequenceIntegrity([sequenced(1), sequenced(2)])))));
    assert.strictEqual(verifyFailure([sequenced(1), sequenced(3)])._tag, "SequenceIntegrityError");
  });
});

describe("planRetention and planPurge refuse a row the codec did not make", () => {
  const retentionInvalid = (error: { readonly _tag: string }, value: number) => {
    assert.deepStrictEqual({ ...error }, { _tag: "RetentionInputInvalid", field: "entries", value });
  };

  it("planRetention names entries and the index of the first row refused", () => {
    retentionInvalid(planFailure(fromStore([notDecodable])), 0);
    retentionInvalid(planFailure([good, ...fromStore([fractional[0]])]), 1);
  });

  it("planRetention reads now and maxAgeMs before the rows", () => {
    const rows = fromStore([notDecodable]);
    const refusal = (now: number, maxAgeMs: number) => {
      const result = planRetention(rows, { maxAgeMs }, now);
      if (!Result.isFailure(result)) return assert.fail("the plan took the rows");
      const { _tag, field, value } = result.failure;
      return { _tag, field, value };
    };
    const tag = "RetentionInputInvalid";
    assert.deepStrictEqual(refusal(Number.NaN, 10), { _tag: tag, field: "now", value: Number.NaN });
    assert.deepStrictEqual(refusal(100, -1), { _tag: tag, field: "maxAgeMs", value: -1 });
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
    retentionInvalid(result.failure, 0);
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
    archiveInvalid(refused([{ ...key, keyId: 5 }]), "keyMaterial", 0);
  });

  it("the index is the first item refused, after items the reader reads", () => {
    const missing = { keyId: "k2", algorithm: "a" };
    archiveInvalid(refused([key, missing, null]), "keyMaterial", 1);
  });

  it("a null item and a string item are refused by index", () => {
    archiveInvalid(refused([null]), "keyMaterial", 0);
    archiveInvalid(refused([key, "k"]), "keyMaterial", 1);
  });

  it("an item with a missing field or a non-string field is refused by index", () => {
    archiveInvalid(refused([{ keyId: "k", algorithm: "a" }]), "keyMaterial", 0);
    archiveInvalid(refused([{ ...key, publicKey: null }]), "keyMaterial", 0);
  });

  it("a hole in the list is an item that is not key material", () => {
    const sparse: Array<KeyMaterial> = Array.from({ length: 3 });
    delete sparse[1];
    sparse[0] = key;
    sparse[2] = key;
    const result = run({ keyMaterial: sparse });
    if (!Result.isFailure(result)) return assert.fail("the writer archived the keys");
    archiveInvalid(result.failure, "keyMaterial", 1);
  });

  it("a value that is not a list is refused with the value given", () => {
    for (const value of ["x", 7, null, true, { keyId: "k" }]) {
      archiveInvalid(refused(value), "keyMaterial", value);
    }
  });

  it("now is read before the keys, and the keys before the rows", () => {
    const rows = fromStore([notDecodable]);
    archiveInvalid(refused([null], rows, Number.NaN), "now", Number.NaN);
    archiveInvalid(refused([null], rows), "keyMaterial", 0);
  });

  it("the rows are read after the keys the reader reads", () => {
    archiveInvalid(refused([key], fromStore([notDecodable])), "entries", 0);
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
