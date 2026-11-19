/**
 * The stored record, read only through the wire and the log: its bytes, its
 * stamping and its order.
 *
 * Written on the phase base and green there, and read the same way after
 * ADR-QD-171, so the change cannot edit it: every row reaches a stored record
 * through `makeDecisionLog`, `encodeStoredRecordString`, `decodeStoredRecordString`
 * and `decodeDecisionStream`, whose signatures are the same on both sides, and none
 * reads a field of the in-memory shape. The goldens compose the hand-written `V2_*`
 * fixtures, never the encoder's own output, so the bytes are checked against the
 * ADR rather than against themselves (STOR-02, D-05, D-07).
 *
 * The rows at the end, `(D-01)` and `(D-12)`, are the new shape's: committed RED on
 * the base by assertion and green once the envelope is the stored record.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Equal from "effect/Equal";
import * as Hash from "effect/Hash";
import * as Option from "effect/Option";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import * as Stream from "effect/Stream";
import { DecisionRecord } from "../src/DecisionRecord.ts";
import {
  ObligationRecord,
  decodeDecisionStream,
  decodeSinkRecordString,
  decodeStoredRecordString,
  encodeSinkRecordString,
  encodeStoredRecordString,
  makeDecisionLog,
} from "../src/index.ts";
import type { ReceivedFrame, SinkRecord, StoredRecord } from "../src/index.ts";
import { collectingLogger } from "./helpers.ts";
import * as V2 from "./fixtures/sinkWireV2.ts";

/** The label every log here carries itself, so an ingest's own label is told from it. */
const LOG_OWN = "log-own";

const ENVIRONMENTS = ["Server", "édge ✓", "a\"b"] as const;

/** Every version-2 fixture, with the id a row's title names. */
const FIXTURES = [
  ["V2_DECIDED_ALLOW", V2.V2_DECIDED_ALLOW],
  ["V2_DECIDED_ALLOW_ALL_FIELDS", V2.V2_DECIDED_ALLOW_ALL_FIELDS],
  ["V2_DECIDED_DENY", V2.V2_DECIDED_DENY],
  ["V2_FAILED_MISSING_RESOURCE", V2.V2_FAILED_MISSING_RESOURCE],
  ["V2_FAILED_ATTRIBUTE_ERROR_CAUSE", V2.V2_FAILED_ATTRIBUTE_ERROR_CAUSE],
  ["V2_OBLIGATIONS", V2.V2_OBLIGATIONS],
  ["V2_OBLIGATIONS_FULL_ENVELOPE", V2.V2_OBLIGATIONS_FULL_ENVELOPE],
  ["V2_DECISION_FULL_ENVELOPE", V2.V2_DECISION_FULL_ENVELOPE],
] as const;

/** The stored bytes a record decoded from `fixture` must encode to under `environment`. */
const composed = (environment: string, fixture: string): string =>
  `{"environment":${JSON.stringify(environment)},"record":${fixture}}`;

const recordOf = (fixture: string): SinkRecord =>
  Result.getOrElse(decodeSinkRecordString(fixture), () => assert.fail("a fixture did not decode"));

const obligations = (evaluationId: string, at: number) =>
  new ObligationRecord({ evaluationId, at, outcome: "Discharged", obligationIds: ["o"] });

/** One record through a fresh log's `ingest`, read back as the log stores it. */
const storedOf = (record: SinkRecord, environment?: string) =>
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: LOG_OWN });
    yield* log.ingest(record, environment);
    const snapshot = yield* log.snapshot;
    const first = snapshot[0];
    if (snapshot.length !== 1 || first === undefined) return assert.fail("expected exactly one stored record");
    return first;
  });

/** Many records through one log, in the order given, read back as its snapshot. */
const snapshotOf = (records: ReadonlyArray<SinkRecord>) =>
  Effect.gen(function* () {
    const log = yield* makeDecisionLog({ environment: LOG_OWN });
    for (const record of records) yield* log.ingest(record);
    return yield* log.snapshot;
  });

const textOf = (stored: StoredRecord): string =>
  Result.getOrElse(encodeStoredRecordString(stored), () => assert.fail("a stored record did not encode"));

const Envelope = Schema.fromJsonString(
  Schema.Struct({ environment: Schema.String, record: Schema.Struct({ evaluationId: Schema.String }) }),
);
const readEnvelope = Schema.decodeUnknownSync(Envelope);

/**
 * A stored record's evaluation id, read through the encoder only.
 *
 * A record at `NaN` is refused by the encoder, and the refusal names the id, so an
 * order test can read it either way without touching the in-memory shape.
 */
const idOf = (stored: StoredRecord): string => {
  const encoded = encodeStoredRecordString(stored);
  return Result.isSuccess(encoded) ? readEnvelope(encoded.success).record.evaluationId : encoded.failure.evaluationId;
};

const golden = (fixture: string) =>
  Effect.gen(function* () {
    for (const environment of ENVIRONMENTS) {
      const stored = yield* storedOf(recordOf(fixture), environment);
      assert.strictEqual(textOf(stored), composed(environment, fixture), environment);
    }
  });

describe("the stored envelope through the wire (STOR-02, D-07)", () => {
  it.effect("G1 V2_DECIDED_ALLOW encodes to its composed stored text under three labels", () =>
    golden(V2.V2_DECIDED_ALLOW));
  it.effect("G2 V2_DECIDED_ALLOW_ALL_FIELDS encodes to its composed stored text under three labels", () =>
    golden(V2.V2_DECIDED_ALLOW_ALL_FIELDS));
  it.effect("G3 V2_DECIDED_DENY encodes to its composed stored text under three labels", () =>
    golden(V2.V2_DECIDED_DENY));
  it.effect("G4 V2_FAILED_MISSING_RESOURCE encodes to its composed stored text under three labels", () =>
    golden(V2.V2_FAILED_MISSING_RESOURCE));
  it.effect("G5 V2_FAILED_ATTRIBUTE_ERROR_CAUSE encodes to its composed stored text under three labels", () =>
    golden(V2.V2_FAILED_ATTRIBUTE_ERROR_CAUSE));
  it.effect("G6 V2_OBLIGATIONS encodes to its composed stored text under three labels", () =>
    golden(V2.V2_OBLIGATIONS));
  it.effect("G7 V2_OBLIGATIONS_FULL_ENVELOPE encodes to its composed stored text under three labels", () =>
    golden(V2.V2_OBLIGATIONS_FULL_ENVELOPE));
  it.effect("G8 V2_DECISION_FULL_ENVELOPE encodes to its composed stored text under three labels", () =>
    golden(V2.V2_DECISION_FULL_ENVELOPE));

  it("G9 each composed stored text is a fixed point of decode then encode", () => {
    for (const [name, fixture] of FIXTURES) {
      for (const environment of ENVIRONMENTS) {
        const text = composed(environment, fixture);
        const back = Result.getOrElse(decodeStoredRecordString(text), () => assert.fail(`${name} did not decode`));
        assert.strictEqual(textOf(back), text, `${name} under ${environment}`);
      }
    }
  });
});

describe("a log stamps what it ingests (STOR-03, D-07)", () => {
  it.effect("L1 each ingest's label is the envelope's environment", () =>
    Effect.gen(function* () {
      const a = yield* storedOf(obligations("a", 1), "edge-a");
      const b = yield* storedOf(obligations("b", 1), "edge-b");
      assert.strictEqual(readEnvelope(textOf(a)).environment, "edge-a");
      assert.strictEqual(readEnvelope(textOf(b)).environment, "edge-b");
    }));

  it.effect("L2 an ingest without a label carries the log's own", () =>
    Effect.gen(function* () {
      const stored = yield* storedOf(obligations("a", 1));
      assert.strictEqual(readEnvelope(textOf(stored)).environment, LOG_OWN);
    }));

  it.effect("L3 the stored record's wire form is the record encoded alone", () =>
    Effect.gen(function* () {
      for (const [name, fixture] of FIXTURES) {
        const record = recordOf(fixture);
        const alone = Result.getOrElse(encodeSinkRecordString(record), () => assert.fail(`${name} did not encode`));
        const stored = yield* storedOf(record, "Server");
        assert.deepStrictEqual(JSON.parse(textOf(stored)).record, JSON.parse(alone), name);
      }
    }));

  it.effect("L4 pipe with the identity returns the stored record itself", () =>
    Effect.gen(function* () {
      const stored = yield* storedOf(obligations("a", 1), "Server");
      assert.strictEqual(
        stored.pipe((s) => s),
        stored,
      );
    }));

  it.effect("L5 equal records under equal labels are equal with equal hashes; another label is not equal", () =>
    Effect.gen(function* () {
      const one = yield* storedOf(obligations("a", 1), "Server");
      const same = yield* storedOf(obligations("a", 1), "Server");
      const other = yield* storedOf(obligations("a", 1), "Client");
      assert.isTrue(Equal.equals(one, same));
      assert.strictEqual(Hash.hash(one), Hash.hash(same));
      assert.isFalse(Equal.equals(one, other));
    }));
});

describe("one order, read through the log and the stream (STOR-03, INV-QD-039, D-07)", () => {
  const mixed = [
    obligations("t3", 3),
    obligations("u1", Number.NaN),
    obligations("t1", 1),
    obligations("u2", Number.NaN),
    obligations("t2", 2),
  ];

  it.effect("O1 a log's snapshot reads known times ascending, then unknown ones in arrival order", () =>
    Effect.gen(function* () {
      assert.deepStrictEqual((yield* snapshotOf(mixed)).map(idOf), ["t1", "t2", "t3", "u1", "u2"]);
    }));

  it.effect("O2 all-unknown times keep arrival order", () =>
    Effect.gen(function* () {
      const records = ["c", "a", "b"].map((id) => obligations(id, Number.NaN));
      assert.deepStrictEqual((yield* snapshotOf(records)).map(idOf), ["c", "a", "b"]);
    }));

  it.effect("O3 all-equal times keep arrival order", () =>
    Effect.gen(function* () {
      const records = ["c", "a", "b"].map((id) => obligations(id, 5));
      assert.deepStrictEqual((yield* snapshotOf(records)).map(idOf), ["c", "a", "b"]);
    }));

  it.effect("O4 the stream's backlog reads the same order as the log's snapshot", () =>
    Effect.scoped(
      Effect.gen(function* () {
        const byId = new Map((yield* snapshotOf(mixed)).map((stored) => [idOf(stored), stored] as const));
        const frames: ReadonlyArray<ReceivedFrame> = [
          ...mixed.map((record): ReceivedFrame => ({ event: "backlog", data: record.evaluationId })),
          { event: "synced", data: '{"backlog":5}' },
        ];
        const read = yield* decodeDecisionStream(Stream.fromIterable(frames), {
          decodeRecord: (data) => Effect.succeed(Option.fromNullishOr(byId.get(data))),
        });
        yield* Stream.runCollect(read.live);
        assert.deepStrictEqual((read.backlog ?? []).map(idOf), ["t1", "t2", "t3", "u1", "u2"]);
      }),
    ));
});

describe("the stored record is the envelope (STOR-01, RED on the base)", () => {
  it.effect("N1 the stored record holds the very record ingested (D-01)", () =>
    Effect.gen(function* () {
      const original = obligations("a", 1);
      const stored = yield* storedOf(original, "Server");
      assert.isTrue("record" in stored, "the stored record has a `record` field");
      assert.isTrue("record" in stored && stored.record === original, "`record` is the record ingested");
    }));

  it.effect("N2 a decoded envelope holds a DecisionRecord equal to the record decoded alone (D-01)", () =>
    Effect.gen(function* () {
      const back = Result.getOrElse(decodeStoredRecordString(composed("Server", V2.V2_DECIDED_ALLOW)), () =>
        assert.fail("the Server golden did not decode"));
      assert.isTrue("record" in back, "the decoded envelope has a `record` field");
      assert.isTrue("record" in back && back.record instanceof DecisionRecord, "`record` is a DecisionRecord");
      assert.isTrue(
        "record" in back && Equal.equals(back.record, recordOf(V2.V2_DECIDED_ALLOW)),
        "`record` equals the record decoded alone",
      );
    }));

  it.effect("N3 a stored record owns exactly the keys environment and record (D-01)", () =>
    Effect.gen(function* () {
      const stored = yield* storedOf(obligations("a", 1), "Server");
      assert.deepStrictEqual(Object.keys(stored), ["environment", "record"]);
    }));

  it.effect("N4 a record with an enumerable throwing getter is retained and nothing is logged (D-12)", () =>
    Effect.gen(function* () {
      const record = recordOf(V2.V2_DECIDED_ALLOW);
      // Enumerable, so anything that copies the record's own properties reads it and throws.
      Object.defineProperty(record, "trap", {
        enumerable: true,
        get: (): unknown => {
          throw new Error("append trap");
        },
      });
      const logs = collectingLogger();
      const log = yield* makeDecisionLog({ environment: LOG_OWN });
      yield* log.ingest(record).pipe(Effect.provide(logs.layer));
      const snapshot = yield* log.snapshot;
      assert.strictEqual(snapshot.length, 1, "the record is retained");
      const first = snapshot[0];
      assert.isTrue(first !== undefined && "record" in first && first.record === record, "the retained record is the one ingested");
      assert.strictEqual(logs.lines.length, 0, "nothing is logged");
    }));
});
