/**
 * Pins what `decodeAuditEntry` answers for each kind of stored row, and that an encoded
 * row and its read-back twin are one row.
 *
 * The matrix is a table of input and exact refusal, so a change of message or precedence
 * edits exactly its row and no other. The twins block pins the bytes, the key set and the
 * equality of a row made by `encodeAuditEntry` and the same row made by
 * `decodeAuditEntry`, with and without a store's sequence number.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as MutableHashMap from "effect/MutableHashMap";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import { DecodeRefusal, MAX_DECODE_DEPTH, WIRE_VERSIONS } from "@qadi/core";
import type { SinkRecord } from "@qadi/core";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord, numbered, obligationRecord } from "./helpers.ts";

const OVER = MAX_DECODE_DEPTH + 10;

/** An object `levels` deep, built iteratively so the test itself cannot overflow. */
const nested = (levels: number): unknown => {
  let value: unknown = { leaf: true };
  for (let i = 0; i < levels; i++) value = { inner: value };
  return value;
};

/** A stored row as a store gives it back: text, then parsed. */
interface StoredRow {
  readonly record: {
    readonly version?: number;
    readonly evaluationId: string;
    readonly resource?: unknown;
  };
  readonly sequenceNumber?: number;
}

const entryOf = (record: SinkRecord): AuditEntry =>
  Effect.runSync(encodeAuditEntry(record));

const stored = (entry: AuditEntry): StoredRow => JSON.parse(JSON.stringify(entry));

const valid = stored(entryOf(decisionRecord()));
const { version: _version, ...unversioned } = valid.record;

const refusalOf = (input: unknown) =>
  Result.match(decodeAuditEntry(input), {
    onSuccess: () => undefined,
    onFailure: (error) => error.refusal,
  });

const malformed = (message: string) => DecodeRefusal.Malformed({ message });
const noRecord = malformed("an audit row has no record");
const notAnInteger = malformed('Expected an integer\n  at ["sequenceNumber"]');

interface MatrixRow {
  readonly name: string;
  readonly input: unknown;
  readonly refusal: DecodeRefusal;
}

const matrix: ReadonlyArray<MatrixRow> = [
  { name: "null", input: null, refusal: noRecord },
  { name: "a string", input: "a row", refusal: noRecord },
  { name: "a number", input: 5, refusal: noRecord },
  { name: "an array", input: [], refusal: noRecord },
  { name: "an empty object", input: {}, refusal: noRecord },
  {
    name: "a record that is undefined",
    input: { record: undefined },
    refusal: malformed(
      'Expected { readonly "_tag": "Decision", readonly "version": 2, ... } | ' +
        '{ readonly "_tag": "Obligations", readonly "version": 2, ... }',
    ),
  },
  {
    name: "a sequence number and no record",
    input: { sequenceNumber: 1 },
    refusal: noRecord,
  },
  {
    name: "a valid record with sequenceNumber 1.5",
    input: { ...valid, sequenceNumber: 1.5 },
    refusal: notAnInteger,
  },
  {
    name: "a valid record with sequenceNumber null",
    input: { ...valid, sequenceNumber: null },
    refusal: malformed('Expected number | undefined\n  at ["sequenceNumber"]'),
  },
  {
    name: "a valid record with sequenceNumber 2 ** 53",
    input: { ...valid, sequenceNumber: 2 ** 53 },
    refusal: notAnInteger,
  },
  {
    name: "a valid record with an extra top-level key",
    input: { ...valid, extra: 1 },
    refusal: malformed('Expected no excess property\n  at ["extra"]'),
  },
  {
    name: "an extra key nested past the decode bound",
    input: { ...valid, extra: nested(OVER) },
    refusal: DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
  },
  {
    name: "a record nested past the decode bound",
    input: { ...valid, record: { ...valid.record, resource: nested(OVER) } },
    refusal: DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }),
  },
  {
    name: "a version-1 record",
    input: { ...valid, record: unversioned },
    refusal: DecodeRefusal.UnsupportedVersion({
      version: undefined,
      supported: WIRE_VERSIONS,
    }),
  },
  {
    name: "an inconsistent record",
    input: { ...valid, record: { ...valid.record, evaluationId: "elsewhere" } },
    refusal: DecodeRefusal.Inconsistent({ disagreement: "EvaluationId" }),
  },
  {
    name: "a bad record, a bad sequence number and an extra key",
    input: { record: { version: 2 }, sequenceNumber: 1.5, extra: 1 },
    refusal: malformed('Missing key\n  at ["_tag"]\nMissing key\n  at ["_tag"]'),
  },
];

describe("decodeAuditEntry refuses each kind of stored row", () => {
  for (const { name, input, refusal } of matrix) {
    it(name + " is refused as its exact refusal", () => {
      assert.deepStrictEqual(refusalOf(input), refusal);
    });
  }
});

/** The row the reader gives back for the text a store holds. */
const readBack = (entry: AuditEntry, sequenceNumber?: number): AuditEntry => {
  const row = sequenceNumber === undefined ? entry : { ...entry, sequenceNumber };
  const text = JSON.stringify(row);
  const decoded = decodeAuditEntry(JSON.parse(text));
  if (Result.isFailure(decoded)) return assert.fail(decoded.failure.refusal._tag);
  return decoded.success.entry;
};

/** The five ways a row is compared agree that `left` and `right` are one row. */
const assertOneRow = (left: AuditEntry, right: AuditEntry) => {
  assert.strictEqual(JSON.stringify(left), JSON.stringify(right));
  assert.deepStrictEqual(Object.keys(left), ["record", "sequenceNumber"]);
  assert.deepStrictEqual(Object.keys(right), ["record", "sequenceNumber"]);
  assert.isTrue(Equal.equals(left, right));
  assert.strictEqual(Hash.hash(left), Hash.hash(right));
  const held = MutableHashMap.empty<AuditEntry, string>();
  MutableHashMap.set(held, left, "held");
  assert.deepStrictEqual(MutableHashMap.get(held, right), Option.some("held"));
  assert.deepStrictEqual(left, right);
};

describe("an encoded row and its read-back twin are one row", () => {
  for (const [name, record] of [
    ["a decision record", decisionRecord()],
    ["an obligation record", obligationRecord()],
  ] as const) {
    it(name + " reads back as the row it was encoded to, bytes and all", () => {
      const encoded = entryOf(record);
      const decoded = readBack(encoded);
      assertOneRow(encoded, decoded);
      assert.notInclude(JSON.stringify(encoded), "sequenceNumber");
    });

    it(name + " numbered by a store is the row its read-back twin is", () => {
      const encoded = entryOf(record);
      const assigned = numbered(encoded, 3);
      const decoded = readBack(encoded, 3);
      assertOneRow(assigned, decoded);
      assert.include(JSON.stringify(assigned), '"sequenceNumber":3');
    });
  }

  it("rows numbered differently are not one row", () => {
    const encoded = entryOf(decisionRecord());
    const three = numbered(encoded, 3);
    const four = numbered(encoded, 4);
    assert.isFalse(Equal.equals(three, four));
    assert.notDeepEqual(three, four);
    assert.isFalse(Equal.equals(encoded, three));
  });
});
