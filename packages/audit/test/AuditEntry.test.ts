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
  WIRE_VERSIONS,
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
      const record = entry.record;
      assert.strictEqual(record._tag, "Decision");
      const error = record._tag === "Decision" && record.outcome._tag === "Failed" ? record.outcome.error : undefined;
      assert.strictEqual(error?._tag, "MissingResource");
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
  // or `BigInt`-valued `params` sail through to the store's `JSON.stringify`
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
          Predicate.hasProperty(row.record, "outcome") &&
          Predicate.hasProperty(row.record.outcome, "error") &&
          Predicate.hasProperty(row.record.outcome.error, "cause")
          ? row.record.outcome.error.cause
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
  }, 60_000);

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

  it.effect("a non-integer or NaN sequenceNumber is Malformed, even when it is the only one", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1" }));
      for (const sequenceNumber of [1.5, Number.NaN]) {
        const result = decodeAuditEntry({ ...entry, sequenceNumber });
        assert.isTrue(Result.isFailure(result));
        assert.strictEqual(
          Result.isFailure(result) ? result.failure.refusal._tag : undefined,
          "Malformed",
        );
      }
    }));

  it.effect("a stored at of 1e400 is Malformed, not an Infinity that retention would have to survive", () =>
    Effect.gen(function* () {
      const entry = yield* encodeAuditEntry(decisionRecord({ evaluationId: "e1", at: 1_000 }));
      const text = JSON.stringify(entry).replace('"at":1000', '"at":1e400');
      assert.isTrue(text.includes("1e400"));
      const result = decodeAuditEntry(JSON.parse(text));
      assert.strictEqual(Result.isFailure(result) ? result.failure.refusal._tag : undefined, "Malformed");
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
    const result = decodeAuditEntry({ record: { _tag: "Nope", version: 2 } });
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

/**
 * What the row schema alone, under `Schema`'s default options, accepts and
 * `decodeAuditEntry` refuses: the reason a stored row is read back through
 * the guarded reader and never through `Schema.decodeUnknown(AuditEntry)`
 * (ARCH-15 C10).
 */
describe("decodeAuditEntry refuses what the row schema alone would accept", () => {
  const policy = { _tag: "HasPermission", permission: { resource: "doc", action: "read" } };
  const envelope = { _tag: "Decision", version: 2, evaluationId: "g", at: 1, subjectId: "u1", policy };
  const outcome = {
    _tag: "Decided",
    decision: {
      _tag: "Allow",
      evaluationId: "g",
      subjectId: "u1",
      durationMillis: 2,
      trace: { policyTag: "HasPermission", allowed: true, children: [], obligations: [] },
      obligations: [],
    },
  };

  it("a row whose record names no outcome is refused by decodeAuditEntry (ticket 96)", () => {
    const result = decodeAuditEntry({ record: envelope });
    assert.include(Result.isFailure(result) && result.failure.refusal._tag === "Malformed" ? result.failure.refusal.message : "", 'Missing key\n  at ["outcome"]');
  });

  it("a row whose outcome carries a stray second one is refused by decodeAuditEntry (ticket 155)", () => {
    const error = { _tag: "MissingResource", attribute: "owner" };
    const result = decodeAuditEntry({ record: { ...envelope, outcome: { ...outcome, error } } });
    assert.include(Result.isFailure(result) && result.failure.refusal._tag === "Malformed" ? result.failure.refusal.message : "", '["outcome"]["error"]');
  });

  it("a typo inside the embedded policy is refused, not silently dropped (P6e)", () => {
    const result = decodeAuditEntry({ record: { ...envelope, policy: { ...policy, permision: "x" }, outcome } });
    assert.include(Result.isFailure(result) && result.failure.refusal._tag === "Malformed" ? result.failure.refusal.message : "", "permision");
  });

  it.effect("the row schema alone, by contrast, drops the same typo silently — so it is not a reader", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        Schema.decodeUnknownEffect(AuditEntry)({ record: { ...envelope, policy: { ...policy, permision: "x" }, outcome } }),
      );
      assert.isTrue(Result.isSuccess(result));
      if (Result.isSuccess(result) && result.success.record._tag === "Decision") {
        assert.isFalse(Predicate.hasProperty(result.success.record.policy, "permision"));
      }
    }));
});

/**
 * A row is version-2 bytes, the one wire version 0.11.0 reads (ADR-QD-096's
 * 2026-10-06 amendment). A row written before 0.10 — version 1, no `version`
 * key — is refused as `UnsupportedVersion`, never upgraded: the documented
 * migration re-encodes it with 0.10.x before upgrading.
 */
describe("decodeAuditEntry reads version-2 rows, and refuses a pre-0.10 row", () => {
  const ROW_V1 =
    '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"MissingResource","attribute":"owner"}}';
  const ROW_V1_PRE05 =
    '{"_tag":"Decision","evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"failed":{"_tag":"MissingResource","attribute":"owner","code":"ACL004"}}';
  const ROW_V2 =
    '{"_tag":"Decision","version":2,"evaluationId":"g","at":1,"subjectId":"u1","policy":{"_tag":"HasPermission","permission":{"resource":"doc","action":"read"}},"outcome":{"_tag":"Failed","error":{"_tag":"MissingResource","attribute":"owner"}}}';
  const read = (record: string, sequenceNumber?: number) =>
    decodeAuditEntry({ record: JSON.parse(record), ...(sequenceNumber === undefined ? {} : { sequenceNumber }) });
  const unversioned = DecodeRefusal.UnsupportedVersion({ version: undefined, supported: WIRE_VERSIONS });

  it("a version-2 row decodes, keeping its sequence number", () => {
    const row = read(ROW_V2, 2);
    assert.isTrue(Result.isSuccess(row));
    if (Result.isSuccess(row)) {
      assert.strictEqual(row.success.entry.sequenceNumber, 2);
      assert.isTrue(row.success.record._tag === "Decision" && row.success.record.outcome._tag === "Failed");
    }
  });

  it("a pre-0.10 row is UnsupportedVersion, version undefined, never upgraded into a record", () => {
    for (const text of [ROW_V1, ROW_V1_PRE05]) {
      const row = read(text, 1);
      assert.deepStrictEqual(Result.isFailure(row) ? row.failure.refusal : undefined, unversioned, text);
    }
  });

  it("an archive mixing pre-0.10 and v2 rows reads the v2 rows and names every pre-0.10 one", () => {
    const rows = [read(ROW_V1, 1), read(ROW_V2, 2)];
    assert.deepStrictEqual(
      rows.map((row) => (Result.isSuccess(row) ? "read" : row.failure.refusal._tag)),
      ["UnsupportedVersion", "read"],
    );
  });

  it("a row whose record carries an unknown envelope key decodes, and the entry drops the key", () => {
    const row = read(JSON.stringify({ ...JSON.parse(ROW_V2), traceparent: "00-abc" }));
    assert.isTrue(Result.isSuccess(row));
    if (Result.isSuccess(row)) assert.notInclude(JSON.stringify(row.success.entry), "traceparent");
  });

  it("a row of an unknown version is UnsupportedVersion, not Malformed", () => {
    const row = read(JSON.stringify({ ...JSON.parse(ROW_V2), version: 3 }));
    assert.strictEqual(Result.isFailure(row) ? row.failure.refusal._tag : undefined, "UnsupportedVersion");
  });

  it.effect("a row encodeAuditEntry writes is version 2, and reads back to the record", () =>
    Effect.gen(function* () {
      const original = failedRecord({ evaluationId: "e2" });
      const entry = yield* encodeAuditEntry(original);
      assert.isTrue("version" in entry.record);
      const row = decodeAuditEntry(JSON.parse(JSON.stringify(entry)));
      assert.deepStrictEqual(Result.getOrUndefined(row)?.record, original);
    }));
});
