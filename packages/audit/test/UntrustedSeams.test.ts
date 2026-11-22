/**
 * Refusal-precedence tables for the audit archive and its rows (ADR-QD-143,
 * BEH-QD-489): each row is one input and the kind it is refused as. The depth
 * guard runs before anything else reads the input, so a value nested past the
 * bound is `TooDeep` whatever else is wrong with it.
 */
import { assert, describe, it } from "@effect/vitest";
import { DecodeRefusal, MAX_DECODE_DEPTH } from "@qadi/core";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { archiveAuditTrail, ArchiveRefusal, readAuditArchive } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord } from "./helpers.ts";

const OVER = MAX_DECODE_DEPTH + 10;

/** An object `levels` deep, built iteratively so 60,000 levels cannot overflow the test itself. */
const nested = (levels: number): unknown => {
  let value: unknown = { leaf: true };
  for (let i = 0; i < levels; i++) value = { inner: value };
  return value;
};

/** A `Not` chain `levels` deep around a leaf policy. */
const deepPolicy = (levels: number): unknown => {
  let value: unknown = { _tag: "HasPermission", permission: { resource: "doc", action: "read" } };
  for (let i = 0; i < levels; i++) value = { _tag: "Not", policy: value };
  return value;
};

/** What a long-term store gives back: text, then parsed. */
const stored = (value: unknown): Record<string, unknown> => JSON.parse(JSON.stringify(value));

const entryOf = (evaluationId: string) => Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));
const rows = [entryOf("r-0"), entryOf("r-1"), entryOf("r-2")] as const;

/** The archive the writer builds from the three rows. */
const written = () => Effect.runSync(archiveAuditTrail(rows, 1_000));

/** A stored archive of the three rows, as the reader is handed it. */
const archive = (): Record<string, unknown> => stored(written());

/** The stored form of row `i`. */
const row = (i: 0 | 1 | 2): Record<string, unknown> => stored(rows[i]);

/** A stored row whose record is `record`. */
const rowWithRecord = (record: unknown): unknown => ({ ...row(0), record });

/** The first row's record with `extra` merged in. */
const recordWith = (extra: Record<string, unknown>): Record<string, unknown> => ({
  ...stored(rows[0].record),
  ...extra,
});

/** The refusal `readAuditArchive` gives, or `undefined` when it accepts. */
const archiveRefusalOf = (input: unknown) =>
  Result.match(readAuditArchive(input), { onSuccess: () => undefined, onFailure: (error) => error.refusal });

/** The refusal `decodeAuditEntry` gives, or `undefined` when it accepts. */
const rowRefusalOf = (input: unknown) =>
  Result.match(decodeAuditEntry(input), { onSuccess: () => undefined, onFailure: (error) => error.refusal });

describe("readAuditArchive", () => {
  it("a valid stored archive -> success", () => {
    assert.isTrue(Result.isSuccess(readAuditArchive(archive())));
  });

  it("5 -> Malformed", () => {
    assert.strictEqual(archiveRefusalOf(5)?._tag, "Malformed");
  });

  it("{} -> Malformed", () => {
    assert.strictEqual(archiveRefusalOf({})?._tag, "Malformed");
  });

  it('archiveVersion "2" -> UnsupportedArchiveVersion', () => {
    assert.strictEqual(archiveRefusalOf({ ...archive(), archiveVersion: "2" })?._tag, "UnsupportedArchiveVersion");
  });

  it("a shallow excess envelope key -> Malformed", () => {
    assert.strictEqual(archiveRefusalOf({ ...archive(), sneaky: true })?._tag, "Malformed");
  });

  it("an excess envelope key holding a value nested past the bound -> TooDeep", () => {
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), sneaky: nested(OVER) }),
      ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("a metadata field holding a value nested past the bound -> TooDeep", () => {
    const metadata = { ...written().metadata, note: nested(OVER) };
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), metadata }),
      ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it('nested past the bound and archiveVersion "2" -> TooDeep, the depth guard first', () => {
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), archiveVersion: "2", sneaky: nested(OVER) }),
      ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("entry 1 with an excess key in its record's policy -> EntryNotDecodable index 1, refusal Malformed", () => {
    const entries = [row(0), rowWithRecord(recordWith({ policy: { _tag: "HasRole", role: "a", sneaky: 1 } })), row(2)];
    const refusal = archiveRefusalOf({ ...archive(), entries });
    assert.strictEqual(refusal?._tag, "EntryNotDecodable");
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.index : -1, 1);
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.refusal._tag : "?", "Malformed");
  });

  it("entry 0 nested 60,000 deep -> EntryNotDecodable index 0, refusal TooDeep, no throw (the entries slot is not walked by the envelope decode)", () => {
    const bundle = { ...archive(), entries: [rowWithRecord(recordWith({ policy: deepPolicy(60_000) }))] };
    let refusal: ReturnType<typeof archiveRefusalOf>;
    assert.doesNotThrow(() => {
      refusal = archiveRefusalOf(bundle);
    });
    assert.strictEqual(refusal?._tag, "EntryNotDecodable");
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.index : -1, 0);
    assert.deepStrictEqual(
      refusal?._tag === "EntryNotDecodable" ? refusal.refusal : undefined,
      DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("entries 1 and 2 both bad -> the first, index 1", () => {
    const bad = rowWithRecord(recordWith({ policy: { _tag: "HasRole", role: "a", sneaky: 1 } }));
    const refusal = archiveRefusalOf({ ...archive(), entries: [row(0), bad, bad] });
    assert.strictEqual(refusal?._tag, "EntryNotDecodable");
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.index : -1, 1);
  });
});

describe("decodeAuditEntry", () => {
  it("a valid row -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(row(0))));
  });

  it("no record -> Malformed with the message `an audit row has no record`", () => {
    assert.deepStrictEqual(rowRefusalOf({}), DecodeRefusal.Malformed({ message: "an audit row has no record" }));
  });

  it("a record nested past the bound -> TooDeep naming 256", () => {
    assert.deepStrictEqual(
      rowRefusalOf(rowWithRecord(recordWith({ resource: nested(OVER) }))),
      DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("a shallow excess row key -> Malformed", () => {
    assert.strictEqual(rowRefusalOf({ ...row(0), sneaky: true })?._tag, "Malformed");
  });

  it("an excess row key holding a value nested past the bound -> TooDeep", () => {
    assert.deepStrictEqual(
      rowRefusalOf({ ...row(0), sneaky: nested(OVER) }),
      DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("a record with a shallow unknown envelope key -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(rowWithRecord(recordWith({ addedLater: "x" })))));
  });

  it('sequenceNumber "x" -> Malformed', () => {
    assert.strictEqual(rowRefusalOf({ ...row(0), sequenceNumber: "x" })?._tag, "Malformed");
  });
});

/*
 * The per-policy matrix (KEYP-05, D-11): what the audit row and the archive answer for each
 * input class an envelope's unknown-key policy can change. Both stay `refuse` (D-09), so every
 * answer here holds before and after the policy is stated, with one exception a row's or an
 * entry's record carries: it is read by the record wire, whose deep unknown key is ignored (D-20).
 */
const EXCESS = "Expected no excess property\n  at [\"sneaky\"]";

describe("the audit row per policy: refuse (KEYP-05, D-11)", () => {
  it("A1 a valid row and a row without sequenceNumber -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(row(0))));
    const { sequenceNumber: _dropped, ...withoutNumber } = row(0);
    assert.isTrue(Result.isSuccess(decodeAuditEntry(withoutNumber)));
  });

  it("A2 a shallow unknown row key -> Malformed at sneaky", () => {
    assert.deepStrictEqual(rowRefusalOf({ ...row(0), sneaky: true }), DecodeRefusal.Malformed({ message: EXCESS }));
  });

  it("A3 an unknown row key 266 deep -> TooDeep naming 256", () => {
    assert.deepStrictEqual(
      rowRefusalOf({ ...row(0), sneaky: nested(OVER) }),
      DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("A4 an unknown row key 60,000 deep -> TooDeep naming 256, no throw", () => {
    const input = { ...row(0), sneaky: nested(60_000) };
    let refusal: ReturnType<typeof rowRefusalOf>;
    assert.doesNotThrow(() => {
      refusal = rowRefusalOf(input);
    });
    assert.deepStrictEqual(refusal, DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
  });

  it("A5 a shallow unknown key inside the row record -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(rowWithRecord(recordWith({ addedLater: "x" })))));
  });

  it("A9 an excess key in the record policy -> Malformed at policy.sneaky", () => {
    assert.deepStrictEqual(
      rowRefusalOf(rowWithRecord(recordWith({ policy: { _tag: "HasRole", role: "a", sneaky: 1 } }))),
      DecodeRefusal.Malformed({ message: 'Expected no excess property\n  at ["policy"]["sneaky"]' }),
    );
  });

  it("A10 sequenceNumber x -> Malformed at sequenceNumber", () => {
    assert.deepStrictEqual(
      rowRefusalOf({ ...row(0), sequenceNumber: "x" }),
      DecodeRefusal.Malformed({ message: 'Expected number | undefined\n  at ["sequenceNumber"]' }),
    );
  });

  it("A11 5, null, [] and {} -> Malformed, the row has no record", () => {
    for (const input of [5, null, [], {}]) {
      assert.deepStrictEqual(rowRefusalOf(input), DecodeRefusal.Malformed({ message: "an audit row has no record" }));
    }
  });

  it("A12 record 5 and record null -> Malformed", () => {
    const message =
      'Expected { readonly "_tag": "Decision", readonly "version": 2, ... } | { readonly "_tag": "Obligations", readonly "version": 2, ... }';
    for (const record of [5, null]) {
      assert.deepStrictEqual(rowRefusalOf({ ...row(0), record }), DecodeRefusal.Malformed({ message }));
    }
  });

  it("A6 an unknown key 266 deep inside the row record -> success (D-20)", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(rowWithRecord(recordWith({ traceparent: nested(OVER) })))));
  });

  it("A7 an unknown key 60,000 deep inside the row record -> success, no throw (D-20)", () => {
    const input = rowWithRecord(recordWith({ traceparent: nested(60_000) }));
    assert.doesNotThrow(() => {
      assert.isTrue(Result.isSuccess(decodeAuditEntry(input)));
    });
  });

  it("A8 a deep unknown key and version 3 inside the row record -> UnsupportedVersion carrying 3 (D-20)", () => {
    const refusal = rowRefusalOf(rowWithRecord(recordWith({ traceparent: nested(OVER), version: 3 })));
    assert.strictEqual(refusal?._tag, "UnsupportedVersion");
    assert.strictEqual(refusal?._tag === "UnsupportedVersion" ? refusal.version : undefined, 3);
  });
});

describe("the audit archive per policy: refuse (KEYP-05, D-11)", () => {
  it("V1 a valid archive -> success", () => {
    assert.isTrue(Result.isSuccess(readAuditArchive(archive())));
  });

  it("V2 a shallow unknown envelope key -> Malformed at sneaky", () => {
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), sneaky: true }),
      ArchiveRefusal.Malformed({ message: EXCESS }),
    );
  });

  it("V3 an unknown envelope key 266 deep, alone and with archiveVersion 2 -> TooDeep naming 256", () => {
    const tooDeep = ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH });
    assert.deepStrictEqual(archiveRefusalOf({ ...archive(), sneaky: nested(OVER) }), tooDeep);
    assert.deepStrictEqual(archiveRefusalOf({ ...archive(), archiveVersion: 2, sneaky: nested(OVER) }), tooDeep);
  });

  it("V4 an unknown envelope key 60,000 deep -> TooDeep naming 256, no throw", () => {
    const input = { ...archive(), sneaky: nested(60_000) };
    let refusal: ReturnType<typeof archiveRefusalOf>;
    assert.doesNotThrow(() => {
      refusal = archiveRefusalOf(input);
    });
    assert.deepStrictEqual(refusal, ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
  });

  it("V5 an excess key in metadata -> Malformed at metadata.note", () => {
    const metadata = { ...written().metadata, note: 1 };
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), metadata }),
      ArchiveRefusal.Malformed({ message: 'Expected no excess property\n  at ["metadata"]["note"]' }),
    );
  });

  it("V6 entry 1 with an excess key in its record policy -> EntryNotDecodable index 1, inner Malformed", () => {
    const entries = [row(0), rowWithRecord(recordWith({ policy: { _tag: "HasRole", role: "a", sneaky: 1 } })), row(2)];
    const refusal = archiveRefusalOf({ ...archive(), entries });
    assert.strictEqual(refusal?._tag, "EntryNotDecodable");
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.index : -1, 1);
    assert.strictEqual(refusal?._tag === "EntryNotDecodable" ? refusal.refusal._tag : "?", "Malformed");
  });

  it("V7 an entry whose record has a shallow unknown key -> success", () => {
    const entries = [rowWithRecord(recordWith({ addedLater: "x" })), row(1), row(2)];
    assert.isTrue(Result.isSuccess(readAuditArchive({ ...archive(), entries })));
  });

  it("V9 5, null and [] -> Malformed, expected object, and {} -> Malformed, missing archiveVersion", () => {
    for (const input of [5, null, []]) {
      assert.deepStrictEqual(archiveRefusalOf(input), ArchiveRefusal.Malformed({ message: "Expected object" }));
    }
    assert.deepStrictEqual(
      archiveRefusalOf({}),
      ArchiveRefusal.Malformed({ message: "Missing key\n  at [\"archiveVersion\"]" }),
    );
  });

  it("V8 entry 0 whose record holds an unknown key 266 deep -> success (D-20)", () => {
    const entries = [rowWithRecord(recordWith({ traceparent: nested(OVER) })), row(1), row(2)];
    assert.isTrue(Result.isSuccess(readAuditArchive({ ...archive(), entries })));
  });
});
