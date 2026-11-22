/**
 * One order across merged sources and the timeline, pinned on the phase base.
 *
 * Written before ADR-QD-171 and green there, and read the same way after it, so the
 * change cannot edit it: merged order is read through the encoder (a stored record's
 * evaluation id, never a field of the in-memory shape) and the timeline through its
 * display rows, which the change leaves as they are (D-04, D-07).
 *
 * An orphan obligation record beside decisions of differing `at` is what compares
 * both arms of the timeline's row-to-record step, which a decision-only table would
 * not (D-13).
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import * as Schema from "effect/Schema";
import { encodeStoredRecordString } from "@qadi/core";
import type { StoredRecord } from "@qadi/core";
import { mergeSources, sourceFromRecords } from "../../src/model/Source.ts";
import { emptyTimeline, entryKey, ingestAll } from "../../src/model/Timeline.ts";
import { decisionRecord, obligationRecord } from "../helpers.ts";

const Envelope = Schema.fromJsonString(
  Schema.Struct({ environment: Schema.String, record: Schema.Struct({ evaluationId: Schema.String }) }),
);
const readEnvelope = Schema.decodeUnknownSync(Envelope);

/**
 * A stored record's evaluation id, read through the encoder only.
 *
 * A record at `NaN` is refused by the encoder, and the refusal names the id, so an
 * order test reads it either way without touching the in-memory shape.
 */
const idOf = (stored: StoredRecord): string => {
  const encoded = encodeStoredRecordString(stored);
  return Result.isSuccess(encoded) ? readEnvelope(encoded.success).record.evaluationId : encoded.failure.evaluationId;
};

const mergedIds = (...sources: ReadonlyArray<ReadonlyArray<StoredRecord>>) =>
  Effect.scoped(
    Effect.map(mergeSources(sources.map(sourceFromRecords)).read, (read) => (read.backlog ?? []).map(idOf)),
  );

const rows = (records: ReadonlyArray<StoredRecord>) => ingestAll(emptyTimeline(), records).entries;

describe("one order across merged sources and the timeline (STOR-03, INV-QD-039, D-13)", () => {
  it.effect("M1 an unknown time sorts after every known one, unknowns in flattened arrival order", () =>
    Effect.gen(function* () {
      const ids = yield* mergedIds(
        [decisionRecord({ evaluationId: "a3", at: 3 }), decisionRecord({ evaluationId: "aN", at: Number.NaN })],
        [
          decisionRecord({ evaluationId: "b1", at: 1 }),
          decisionRecord({ evaluationId: "bN", at: Number.NaN }),
          decisionRecord({ evaluationId: "b2", at: 2 }),
        ],
      );
      assert.deepStrictEqual(ids, ["b1", "b2", "a3", "aN", "bN"]);
    }));

  it.effect("M2 equal times across sources keep flattened arrival order", () =>
    Effect.gen(function* () {
      const ids = yield* mergedIds(
        [decisionRecord({ evaluationId: "p", at: 5 }), decisionRecord({ evaluationId: "r", at: 5 })],
        [decisionRecord({ evaluationId: "q", at: 5 })],
      );
      assert.deepStrictEqual(ids, ["p", "r", "q"]);
    }));

  const t1 = () =>
    rows([
      decisionRecord({ evaluationId: "d2", at: 2000 }),
      obligationRecord({ evaluationId: "o1", at: 1500 }),
      decisionRecord({ evaluationId: "d1", at: 1000 }),
    ]);

  it("T1 an orphan sorts among decisions by its time, and both row kinds are compared", () => {
    const entries = t1();
    assert.deepStrictEqual(
      entries.map((e) => e.evaluationId),
      ["d1", "o1", "d2"],
    );
    assert.deepStrictEqual(
      entries.map((e) => e._tag),
      ["TimelineDecision", "TimelineOrphan", "TimelineDecision"],
    );
  });

  it("T2 an unknown time sorts last for an orphan and for a decision", () => {
    assert.deepStrictEqual(
      rows([
        obligationRecord({ evaluationId: "oN", at: Number.NaN }),
        decisionRecord({ evaluationId: "d1", at: 1000 }),
      ]).map((e) => e.evaluationId),
      ["d1", "oN"],
    );
    assert.deepStrictEqual(
      rows([
        decisionRecord({ evaluationId: "dN", at: Number.NaN }),
        obligationRecord({ evaluationId: "o2", at: 10 }),
      ]).map((e) => e.evaluationId),
      ["o2", "dN"],
    );
  });

  it("T3 the entry key is its tag, environment, id and time, unchanged by the stored shape (D-04)", () => {
    assert.deepStrictEqual(t1().map(entryKey), [
      "TimelineDecision|Server|d1|1000",
      "TimelineOrphan|Server|o1|1500",
      "TimelineDecision|Server|d2|2000",
    ]);
  });
});
