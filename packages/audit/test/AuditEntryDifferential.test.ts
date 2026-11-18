/**
 * `decodeAuditEntry`'s output over the existing fixtures, every expected value
 * written by hand from a run on the unchanged reader.
 *
 * The entry's record is persisted and counted by `Retention`, so how it is
 * decoded may change only if these values do not (ADR-QD-110). Key order and
 * explicit-`undefined` keys are the two properties a decode that kept the
 * input's form, rather than the schema's, would change.
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
import { decisionRecord, failedRecord, failedWithCause, obligationRecord } from "./helpers.ts";

/** A stored row's record, as far as these cases reach into it. */
interface DecisionRow {
  readonly record: {
    readonly version?: unknown;
    readonly outcome: { readonly decision: object };
  };
}

const encodedText = (record: SinkRecord) => Effect.map(encodeAuditEntry(record), (entry) => JSON.stringify(entry));

/** The row `encodeAuditEntry` writes for `record`, parsed back as a store would hand it over. */
const rowOf = (record: SinkRecord) =>
  Effect.map(encodedText(record), (text): { readonly record: object } => JSON.parse(text));

const decisionRowOf = (record: SinkRecord) =>
  Effect.map(encodedText(record), (text): DecisionRow => JSON.parse(text));

/** `value` with its own keys in the opposite order. */
const reversed = (value: object): object => Object.fromEntries(Object.entries(value).reverse());

/** A row whose record has its top-level keys reversed, and its `outcome`'s too when it is an object. */
const reversedRow = (row: { readonly record: object }): { readonly record: object } => ({
  record: Object.fromEntries(
    Object.entries(row.record)
      .reverse()
      .map(([key, value]) => [key, key === "outcome" && typeof value === "object" && value !== null ? reversed(value) : value]),
  ),
});

/** The entry a row reads to; a refusal fails the case. */
const entryOf = (row: unknown): AuditEntry => {
  const result = decodeAuditEntry(row);
  if (Result.isFailure(result)) return assert.fail(`refused: ${result.failure.refusal._tag}`);
  return result.success.entry;
};

/** The refusal a row reads to, or `undefined` when it reads. */
const refusalOf = (row: unknown) => {
  const result = decodeAuditEntry(row);
  return Result.isFailure(result) ? result.failure.refusal : undefined;
};


describe("decodeAuditEntry's output, written out over existing fixtures", () => {
  it.effect("an unknown envelope key is dropped, and the entry is the record in schema order", () =>
    Effect.gen(function* () {
      const row = yield* rowOf(decisionRecord({ evaluationId: "d1" }));
      const entry = entryOf({ record: { ...row.record, traceparent: "00-abc" } });
      assert.deepStrictEqual(Object.keys(entry.record), ["_tag", "version", "evaluationId", "at", "subjectId", "policy", "outcome"]);
      assert.strictEqual(
        JSON.stringify(entry),
        '{"record":{"_tag":"Decision","version":2,"evaluationId":"d1","at":1000,"subjectId":"alice","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Decided","decision":{"_tag":"Allow","evaluationId":"d1","subjectId":"alice","durationMillis":1,"trace":{"policyTag":"HasPermission","allowed":true,"children":[],"obligations":[]},"obligations":[]}}}}',
      );
    }));

  it.effect("a record whose keys are reversed reads to the same entry, keys in schema order", () =>
    Effect.gen(function* () {
      const cases: ReadonlyArray<readonly [string, SinkRecord, ReadonlyArray<string>]> = [
        ["a decision", decisionRecord({ evaluationId: "d1" }), ["_tag", "version", "evaluationId", "at", "subjectId", "policy", "outcome"]],
        ["a failed decision", failedRecord({ evaluationId: "f1" }), ["_tag", "version", "evaluationId", "at", "subjectId", "policy", "outcome"]],
        ["a failed decision with a cause", failedWithCause(new Error("db down"), "c1"), ["_tag", "version", "evaluationId", "at", "subjectId", "policy", "outcome"]],
        ["an obligation record", obligationRecord({ evaluationId: "o1" }), ["_tag", "version", "evaluationId", "at", "outcome", "obligationIds"]],
      ];
      for (const [name, record, keys] of cases) {
        const row = yield* rowOf(record);
        const entry = entryOf(reversedRow(row));
        assert.deepStrictEqual(Object.keys(entry.record), keys, name);
        assert.strictEqual(JSON.stringify(entry), JSON.stringify(entryOf(row)), name);
      }
    }));

  it.effect("an explicit undefined optional field keeps its key, in schema position", () =>
    Effect.gen(function* () {
      const row = yield* rowOf(decisionRecord({ evaluationId: "d1" }));
      const entry = entryOf({ record: { ...row.record, resource: undefined }, sequenceNumber: undefined });
      assert.deepStrictEqual(Object.keys(entry.record), ["_tag", "version", "evaluationId", "at", "subjectId", "policy", "resource", "outcome"]);
      assert.deepStrictEqual(Object.keys(entry), ["record", "sequenceNumber"]);
      assert.isTrue(Object.hasOwn(entry.record, "resource"));
      assert.isUndefined(Reflect.get(entry.record, "resource"));
    }));

  it.effect("a float survives: at 1.5 and durationMillis 2.5", () =>
    Effect.gen(function* () {
      const row = yield* decisionRowOf(decisionRecord({ evaluationId: "d1", at: 1.5 }));
      const entry = entryOf({
        record: {
          ...row.record,
          outcome: { ...row.record.outcome, decision: { ...row.record.outcome.decision, durationMillis: 2.5 } },
        },
      });
      assert.include(JSON.stringify(entry.record), '"at":1.5');
      assert.include(JSON.stringify(entry.record), '"durationMillis":2.5');
    }));

  it.effect("a record nested 60,000 deep is TooDeep, and a value that deep under an unknown envelope key is ignored (D-20)", () =>
    Effect.gen(function* () {
      let policy: unknown = { _tag: "HasPermission", permission: { resource: "doc", action: "read" } };
      for (let i = 0; i < 60_000; i++) policy = { _tag: "Not", policy };
      const deepPolicy = { record: { _tag: "Decision", evaluationId: "deep", at: 0, subjectId: "alice", policy } };
      assert.deepStrictEqual(refusalOf(deepPolicy), DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));

      let nested: unknown = [];
      for (let i = 0; i < 60_000; i++) nested = [nested];
      const row = yield* rowOf(decisionRecord({ evaluationId: "d1" }));
      const deepExtra = { record: { ...row.record, traceparent: nested } };
      assert.isUndefined(refusalOf(deepExtra));
    }), 60_000);

  it.effect("a pre-0.10 row and a version-3 row are UnsupportedVersion", () =>
    Effect.gen(function* () {
      const row = yield* decisionRowOf(decisionRecord({ evaluationId: "d1" }));
      const { version: _version, ...unversioned } = row.record;
      assert.deepStrictEqual(
        refusalOf({ record: unversioned }),
        DecodeRefusal.UnsupportedVersion({ version: undefined, supported: WIRE_VERSIONS }),
      );
      assert.deepStrictEqual(
        refusalOf({ record: { ...row.record, version: 3 } }),
        DecodeRefusal.UnsupportedVersion({ version: 3, supported: WIRE_VERSIONS }),
      );
    }));

  it.effect("three Malformed messages, written out", () =>
    Effect.gen(function* () {
      const row = yield* decisionRowOf(decisionRecord({ evaluationId: "d1" }));
      const { outcome: _outcome, ...withoutOutcome } = row.record;
      assert.deepStrictEqual(refusalOf({ record: withoutOutcome }), DecodeRefusal.Malformed({ message: "Missing key\n  at [\"outcome\"]" }));
      const error = { _tag: "MissingResource", attribute: "owner" };
      assert.deepStrictEqual(
        refusalOf({ record: { ...row.record, outcome: { ...row.record.outcome, error } } }),
        DecodeRefusal.Malformed({ message: "Expected no excess property\n  at [\"outcome\"][\"error\"]" }),
      );
      assert.deepStrictEqual(
        refusalOf({ record: { ...row.record, policy: { _tag: "HasPermission", permission: { resource: "doc", action: "read" }, permision: "x" } } }),
        DecodeRefusal.Malformed({ message: "Expected no excess property\n  at [\"policy\"][\"permision\"]" }),
      );
    }));

  it.effect("Retention's count: a key-permuted twin is the same entry, an explicit-undefined twin is not", () =>
    Effect.gen(function* () {
      const row = yield* rowOf(decisionRecord({ evaluationId: "d1" }));
      const a = entryOf(row);
      const b = entryOf(reversedRow(row));
      const c = entryOf({ record: { ...row.record, resource: undefined } });
      assert.isTrue(Equal.equals(a, b));
      assert.strictEqual(Hash.hash(a), Hash.hash(b));
      // `planPurge`'s own counting: one key for the twins, a count of two.
      const consumed = MutableHashMap.empty<AuditEntry, number>();
      for (const entry of [a, b]) {
        MutableHashMap.set(consumed, entry, Option.getOrElse(MutableHashMap.get(consumed, entry), () => 0) + 1);
      }
      assert.strictEqual(MutableHashMap.size(consumed), 1);
      assert.deepStrictEqual(MutableHashMap.get(consumed, a), Option.some(2));
      assert.isFalse(Equal.equals(a, c));
    }));
});
