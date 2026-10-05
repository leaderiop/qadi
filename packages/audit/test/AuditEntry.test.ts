import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Schema from "effect/Schema";
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import {
  DecisionSink,
  decisionSinkForwarding,
  DecodeRefusal,
  EncodeRefusal,
  encodeSinkRecordString,
  hasCustom,
  MAX_DECODE_DEPTH,
} from "@qadi/core";
import { AuditEntry, decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import {
  decisionRecord,
  failedRecord,
  failedWithCause,
  obligationRecord,
} from "./helpers.ts";

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
        assert.strictEqual(result.failure.refusal._tag, "Unrepresentable");
        assert.strictEqual(result.failure.reason, "resource.handler: a function has no JSON form");
      }
    }));

  it.effect("a resource carrying a nested function refuses too, not just a top-level one", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ resource: { nested: { handler: () => "nope" } } });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.deepStrictEqual(
          result.failure.refusal,
          EncodeRefusal.Unrepresentable({ path: ["resource", "nested", "handler"], kind: "function" }),
        );
      }
    }));

  it.effect("a symbol value refuses", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ resource: { tag: Symbol("x") } });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") assert.strictEqual(result.failure.refusal._tag, "Unrepresentable");
    }));

  it.effect("a circular resource refuses cleanly, rather than crashing the encode", () =>
    Effect.gen(function* () {
      const cyclic: Record<string, unknown> = { name: "doc-1" };
      cyclic.self = cyclic;
      const record = decisionRecord({ resource: cyclic });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
        assert.strictEqual(result.failure.refusal._tag, "Circular");
        assert.include(result.failure.reason, "a circular reference has no JSON form");
      }
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

  // `HasCustom.params` (`Policy.ts`) is a second caller-supplied `unknown`
  // inside a `SinkRecord`, buried in `policy` rather than sitting beside it
  // as `resource` does. A guard that only checked `resource` let a circular
  // or `BigInt`-valued `params` sail through to `toWire`/`JSON.stringify`
  // uncaught, instead of failing cleanly with `AuditEntryNotEncodable`.
  it.effect("a policy carrying an unsafe HasCustom.params refuses, not just an unsafe resource", () =>
    Effect.gen(function* () {
      const cyclic: Record<string, unknown> = { name: "rule" };
      cyclic.self = cyclic;
      const record = decisionRecord({ policy: hasCustom("legalHold", cyclic) });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
        assert.strictEqual(result.failure.recordTag, "Decision");
        assert.strictEqual(result.failure.refusal._tag, "Circular");
      }
    }));

  it.effect("a policy carrying a BigInt-valued HasCustom.params refuses too", () =>
    Effect.gen(function* () {
      const record = decisionRecord({ policy: hasCustom("legalHold", { limit: 10n }) });
      const result = yield* Effect.result(encodeAuditEntry(record));
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
        assert.deepStrictEqual(
          result.failure.refusal,
          EncodeRefusal.Unrepresentable({ path: ["policy", "params", "limit"], kind: "bigint" }),
        );
        assert.strictEqual(result.failure.reason, "policy.params.limit: a bigint has no JSON form");
      }
    }));
});

describe("an audit row is the same wire the decision stream emits (ARCH-09)", () => {
  it.effect("a resource carrying a Set refuses instead of persisting {}", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        encodeAuditEntry(decisionRecord({ resource: { tags: new Set(["finance"]) } })),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure._tag, "AuditEntryNotEncodable");
        assert.deepStrictEqual(
          result.failure.refusal,
          EncodeRefusal.Opaque({ path: ["resource", "tags"], kind: "Set", brand: "Set" }),
        );
      }
    }));

  it.effect("a Failed record's Error cause survives the store's JSON.stringify as {name, message}", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(failedWithCause(new Error("db down")));
      const row: unknown = JSON.parse(JSON.stringify(entry));
      assert.deepStrictEqual(
        Predicate.hasProperty(row, "record") &&
          Predicate.hasProperty(row.record, "failed") &&
          Predicate.hasProperty(row.record.failed, "cause")
          ? row.record.failed.cause
          : undefined,
        { name: "Error", message: "db down" },
      );
    }));

  it("decodeAuditEntry refuses a 60,000-deep stored row with a typed TooDeep, never a RangeError defect", () => {
    let policy: unknown = { _tag: "HasPermission", permission: { resource: "doc", action: "read" } };
    for (let i = 0; i < 60_000; i++) policy = { _tag: "Not", policy };
    const row = {
      record: { _tag: "Decision", evaluationId: "deep", at: 0, subjectId: "alice", policy },
    };
    const result = decodeAuditEntry(row);
    assert.isTrue(Result.isFailure(result));
    if (Result.isFailure(result)) {
      assert.deepStrictEqual(result.failure.refusal, DecodeRefusal.TooDeep({ maxDepth: MAX_DECODE_DEPTH }));
    }
  });

  it.effect("an audit row, an SSE frame's data, and forwarding's send value are the same bytes for one record", () =>
    Effect.gen(function* () {
      const record = failedWithCause(new Error("db down"), "same-bytes");
      const entry = yield* encodeAuditEntry(record);

      const sent: Array<unknown> = [];
      yield* Effect.gen(function* () {
        const sink = yield* DecisionSink;
        yield* sink.record(record);
      }).pipe(
        Effect.provide(decisionSinkForwarding({ send: (encoded) => Effect.sync(() => void sent.push(encoded)) })),
      );

      const frameData = Result.match(encodeSinkRecordString(record), {
        onSuccess: (data) => data,
        onFailure: () => assert.fail("refused"),
      });
      assert.strictEqual(JSON.stringify(entry.record), frameData);
      assert.strictEqual(JSON.stringify(sent[0]), frameData);
    }));
});

describe("decodeAuditEntry — the guarded reader (ARCH-09)", () => {
  it.effect("a real entry round-trips: JSON.stringify, JSON.parse, decodeAuditEntry", () =>
    Effect.gen(function* () {
      const original = decisionRecord({ evaluationId: "e1", resource: { id: "doc-1" } });
      const entry = yield* encodeAuditEntry(original);
      const result = decodeAuditEntry(JSON.parse(JSON.stringify(entry)));
      assert.isTrue(Result.isSuccess(result));
      if (Result.isSuccess(result)) {
        assert.deepStrictEqual(result.success.record, original);
        assert.strictEqual(result.success.entry.record.evaluationId, "e1");
        // Absent, not present-and-undefined — `Schema.optional` drops an
        // explicitly-undefined key, the same normalisation the record codec applies.
        assert.isUndefined(result.success.entry.sequenceNumber);
      }
    }));

  it.effect("sequenceNumber survives the same round-trip when present", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const result = decodeAuditEntry(JSON.parse(JSON.stringify({ ...entry, sequenceNumber: 7 })));
      assert.strictEqual(Result.isSuccess(result) ? result.success.entry.sequenceNumber : undefined, 7);
    }));

  it.effect("a Failed record's Error cause is read back as an Error", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(failedWithCause(new Error("db down")));
      const result = decodeAuditEntry(JSON.parse(JSON.stringify(entry)));
      const record = Result.isSuccess(result) ? result.success.record : undefined;
      const error =
        record?._tag === "Decision" && record.outcome._tag === "Failed" ? record.outcome.error : undefined;
      const cause = error?._tag === "AttributeResolveError" ? error.cause : undefined;
      assert.instanceOf(cause, Error);
    }));

  it("a row with no record is Malformed", () => {
    const result = decodeAuditEntry({ sequenceNumber: 1 });
    assert.strictEqual(Result.isFailure(result) ? result.failure.refusal._tag : undefined, "Malformed");
  });

  it("a row whose record is not a record is Malformed", () => {
    const result = decodeAuditEntry({ record: { _tag: "Nope" } });
    assert.strictEqual(Result.isFailure(result) ? result.failure.refusal._tag : undefined, "Malformed");
  });

  it.effect("a row with an excess top-level field is Malformed — the row is decoded as untrusted", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const result = decodeAuditEntry({ ...JSON.parse(JSON.stringify(entry)), sequnceNumber: 1 });
      assert.strictEqual(Result.isFailure(result) ? result.failure.refusal._tag : undefined, "Malformed");
    }));

  it.effect("a sequenceNumber that is not a number is Malformed", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const result = decodeAuditEntry({ ...JSON.parse(JSON.stringify(entry)), sequenceNumber: "7" });
      assert.strictEqual(Result.isFailure(result) ? result.failure.refusal._tag : undefined, "Malformed");
    }));

  it.effect("the row schema is the encoded wire: Schema.decodeUnknownEffect(AuditEntry) accepts a stored row", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      const decoded = yield* Schema.decodeUnknownEffect(AuditEntry)(JSON.parse(JSON.stringify(entry)));
      assert.strictEqual(decoded.record.evaluationId, "e1");
    }));
});
