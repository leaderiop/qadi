import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import { AuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord, failedRecord, obligationRecord } from "./helpers.ts";

describe("encodeAuditEntry", () => {
  it.effect("encodes a Decided record, wire-shaped, sequenceNumber unset", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      assert.strictEqual(entry.record._tag, "Decision");
      assert.strictEqual(entry.record.evaluationId, "e1");
      assert.isUndefined(entry.sequenceNumber);
    }));

  it.effect("encodes a Failed record", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(failedRecord({ evaluationId: "e2" }));
      assert.strictEqual(entry.record._tag, "Decision");
      if (entry.record._tag === "Decision") {
        assert.strictEqual(entry.record.failed?._tag, "MissingResource");
      }
    }));

  it.effect("encodes an ObligationRecord", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(obligationRecord({ evaluationId: "e3" }));
      assert.strictEqual(entry.record._tag, "Obligations");
    }));

  it.effect("a resource made of safe scalars, arrays, nested records, and Date encodes fine", () =>
    Effect.gen(function* () {
      const record = decisionRecord({
        resource: {
          id: "doc-1",
          tags: ["a", "b"],
          owner: { name: "alice", since: new Date("2026-01-01T00:00:00.000Z") },
          deletedAt: null,
        },
      });
      const entry = yield* encodeAuditEntry(record);
      assert.strictEqual(entry.record._tag, "Decision");
    }));

  it.effect("a resource carrying a function refuses rather than dropping or stringifying it", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ resource: { handler: () => "nope" } });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
        assert.strictEqual(result.failure.recordTag, "Decision");
        assert.strictEqual(
          result.failure.reason,
          "resource carries a value with no safe durable representation",
        );
      }
    }));

  it.effect("a resource carrying a nested function refuses too, not just a top-level one", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ resource: { nested: { handler: () => "nope" } } });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("a symbol value refuses", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ resource: { tag: Symbol("x") } });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
    }));

  it.effect("a circular resource refuses cleanly, rather than crashing the encode", () =>
    Effect.gen(function* () {
      const cyclic: Record<string, unknown> = { name: "doc-1" };
      cyclic.self = cyclic;
      const record = decisionRecord({ resource: cyclic });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
    }));

  it.effect("the same nested object reachable via two paths, not a cycle, still encodes", () =>
    Effect.gen(function* () {
      const shared = { street: "Main St" };
      const record = decisionRecord({ resource: { billing: shared, shipping: shared } });
      const entry = yield* encodeAuditEntry(record);
      assert.strictEqual(entry.record._tag, "Decision");
    }));

  it.effect("an ObligationRecord has no resource to check, so it never refuses on that basis", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(obligationRecord());
      assert.strictEqual(entry.record._tag, "Obligations");
    }));
});

describe("AuditEntry — the schema is real, not decorative", () => {
  it.effect("a real entry round-trips through Schema encode/decode unchanged", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const encoded = yield* Schema.encodeEffect(AuditEntry)(entry);
      const decoded = yield* Schema.decodeUnknownEffect(AuditEntry)(
        JSON.parse(JSON.stringify(encoded)),
      );
      assert.deepStrictEqual(decoded.record, entry.record);
      // Absent, not present-and-undefined — `Schema.optional` drops an
      // explicitly-undefined key on decode, the same normalization
      // `@qadi/core`'s own wire codec applies.
      assert.isUndefined(decoded.sequenceNumber);
    }));

  it.effect("sequenceNumber survives the same round-trip when present", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const withSequence = { ...entry, sequenceNumber: 7 };
      const encoded = yield* Schema.encodeEffect(AuditEntry)(withSequence);
      const decoded = yield* Schema.decodeUnknownEffect(AuditEntry)(
        JSON.parse(JSON.stringify(encoded)),
      );
      assert.strictEqual(decoded.sequenceNumber, 7);
    }));
});
