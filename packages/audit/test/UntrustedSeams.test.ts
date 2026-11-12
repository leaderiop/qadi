/**
 * Phase 30's refusal-precedence tables for the audit archive and its rows, written
 * green on the phase base (D-13). A row marked `flips in 30-04` changes kind in
 * that plan's commit, which names it; every other row must stay green through the
 * phase. Characterisation, not intent: a row says what the base reports.
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

  it("an excess envelope key holding a value nested past the bound -> TooDeep (flipped in 30-04 (D-07))", () => {
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), sneaky: nested(OVER) }),
      ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it("a metadata field holding a value nested past the bound -> TooDeep (flipped in 30-04 (D-07))", () => {
    const metadata = { ...written().metadata, note: nested(OVER) };
    assert.deepStrictEqual(
      archiveRefusalOf({ ...archive(), metadata }),
      ArchiveRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
    );
  });

  it('nested past the bound and archiveVersion "2" -> TooDeep, the depth guard first (flipped in 30-04 (D-07))', () => {
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

  it("an excess row key holding a value nested past the bound -> Malformed (flips in 30-04: TooDeep)", () => {
    assert.strictEqual(rowRefusalOf({ ...row(0), sneaky: nested(OVER) })?._tag, "Malformed");
  });

  it("a record with a shallow unknown envelope key -> success", () => {
    assert.isTrue(Result.isSuccess(decodeAuditEntry(rowWithRecord(recordWith({ addedLater: "x" })))));
  });

  it('sequenceNumber "x" -> Malformed', () => {
    assert.strictEqual(rowRefusalOf({ ...row(0), sequenceNumber: "x" })?._tag, "Malformed");
  });
});
