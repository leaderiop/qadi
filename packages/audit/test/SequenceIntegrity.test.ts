import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "fast-check";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord } from "./helpers.ts";

const entryWithSequence = (sequenceNumber: number | undefined): AuditEntry => ({
  ...Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${String(sequenceNumber)}` }))),
  sequenceNumber,
});

describe("verifySequenceIntegrity", () => {
  it.effect("no entries at all is trivially intact", () =>
    Effect.gen(function* () {
      yield* verifySequenceIntegrity([]);
    }));

  it.effect("entries carrying no sequenceNumber at all are trivially intact", () =>
    Effect.gen(function* () {
      yield* verifySequenceIntegrity([entryWithSequence(undefined), entryWithSequence(undefined)]);
    }));

  it.effect("a contiguous sequence, out of write order, is intact", () =>
    Effect.gen(function* () {
      yield* verifySequenceIntegrity([entryWithSequence(3), entryWithSequence(1), entryWithSequence(2)]);
    }));

  it.effect("a gap fails with the expected and actual sequence numbers", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        verifySequenceIntegrity([entryWithSequence(1), entryWithSequence(3)]),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        if (result.failure._tag !== "SequenceIntegrityError") return assert.fail("expected SequenceIntegrityError");
        assert.strictEqual(result.failure.expectedSequence, 2);
        assert.strictEqual(result.failure.actualSequence, 3);
      }
    }));

  it.effect("a duplicate sequence number fails too", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        verifySequenceIntegrity([entryWithSequence(1), entryWithSequence(1), entryWithSequence(2)]),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        if (result.failure._tag !== "SequenceIntegrityError") return assert.fail("expected SequenceIntegrityError");
        assert.strictEqual(result.failure.expectedSequence, 2);
        assert.strictEqual(result.failure.actualSequence, 1);
      }
    }));

  it.effect("a mix of sequenced and unsequenced entries only checks the sequenced ones", () =>
    Effect.gen(function* () {
      yield* verifySequenceIntegrity([
        entryWithSequence(undefined),
        entryWithSequence(1),
        entryWithSequence(undefined),
        entryWithSequence(2),
      ]);
    }));

  it.effect("an unsequenced entry sitting between two sequenced ones does not hide the gap between them", () =>
    Effect.gen(function* () {
      // `archiveFacts` collects sequence numbers with a `flatMap` that drops an
      // entry carrying none, so the unsequenced entry never sits between 1 and 3
      // in the sorted run the gap check walks.
      const result = yield* Effect.result(
        verifySequenceIntegrity([
          entryWithSequence(1),
          entryWithSequence(undefined),
          entryWithSequence(3),
        ]),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        if (result.failure._tag !== "SequenceIntegrityError") return assert.fail("expected SequenceIntegrityError");
        assert.strictEqual(result.failure.expectedSequence, 2);
        assert.strictEqual(result.failure.actualSequence, 3);
      }
    }));
});

describe("PROPERTY: gap and duplicate detection over generated sequences", () => {
  it("a contiguous run of unique integers is always intact", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 0, max: 50 }),
        FastCheck.integer({ min: 1, max: 30 }),
        (start, length) => {
          const entries = Array.from({ length }, (_, i) => entryWithSequence(start + i));
          const result = Effect.runSync(Effect.result(verifySequenceIntegrity(entries)));
          return result._tag === "Success";
        },
      ),
      { numRuns: 100 },
    );
  });

  it("a run with one deliberately removed number is always caught", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.integer({ min: 0, max: 20 }),
        FastCheck.integer({ min: 3, max: 15 }),
        (start, length) => {
          const full = Array.from({ length }, (_, i) => start + i);
          const removedIndex = 1 + Math.floor((length - 2) / 2); // never the first or last
          const withGap = full.filter((_, i) => i !== removedIndex);
          const entries = withGap.map((n) => entryWithSequence(n));
          const result = Effect.runSync(Effect.result(verifySequenceIntegrity(entries)));
          return result._tag === "Failure";
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe("verifySequenceIntegrity: a sequence number outside the safe integers", () => {
  const invalidAt = (numbers: ReadonlyArray<number | undefined>) =>
    Effect.gen(function* () {
      const result = yield* Effect.result(verifySequenceIntegrity(numbers.map(entryWithSequence)));
      if (result._tag !== "Failure") return assert.fail("expected a failure");
      if (result.failure._tag !== "SequenceNumberInvalid") return assert.fail("expected SequenceNumberInvalid");
      return result.failure;
    });

  it.effect("a fractional number fails SequenceNumberInvalid, even in an otherwise contiguous run", () =>
    Effect.gen(function* () {
      const failure = yield* invalidAt([1.5, 2.5]);
      assert.strictEqual(failure.index, 0);
      assert.strictEqual(failure.sequenceNumber, 1.5);
    }));

  it.effect("a duplicate past 2 ** 53, which the gap check alone cannot see, fails SequenceNumberInvalid", () =>
    Effect.gen(function* () {
      const failure = yield* invalidAt([undefined, 2 ** 53, 2 ** 53]);
      assert.strictEqual(failure.index, 1);
      assert.strictEqual(failure.sequenceNumber, 2 ** 53);
    }));

  it.effect("Infinity and NaN fail SequenceNumberInvalid, reported at the first one in the order given", () =>
    Effect.gen(function* () {
      assert.strictEqual((yield* invalidAt([Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY])).index, 0);
      const nan = yield* invalidAt([3, 1, Number.NaN]);
      assert.strictEqual(nan.index, 2);
      assert.isTrue(Number.isNaN(nan.sequenceNumber));
    }));

  it.effect("the largest safe integers are accepted", () =>
    Effect.gen(function* () {
      yield* verifySequenceIntegrity([
        entryWithSequence(Number.MAX_SAFE_INTEGER),
        entryWithSequence(Number.MAX_SAFE_INTEGER - 1),
      ]);
    }));
});
