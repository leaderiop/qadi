import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "effect/testing/FastCheck";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { verifyChainIntegrity } from "../src/ChainIntegrity.ts";
import { decisionRecord } from "./helpers.ts";

const entryWithSequence = (sequenceNumber: number | undefined): AuditEntry => ({
  ...Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: `e-${String(sequenceNumber)}` }))),
  sequenceNumber,
});

describe("verifyChainIntegrity", () => {
  it.effect("no entries at all is trivially intact", () =>
    Effect.gen(function* () {
      yield* verifyChainIntegrity([]);
    }));

  it.effect("entries carrying no sequenceNumber at all are trivially intact", () =>
    Effect.gen(function* () {
      yield* verifyChainIntegrity([entryWithSequence(undefined), entryWithSequence(undefined)]);
    }));

  it.effect("a contiguous sequence, out of write order, is intact", () =>
    Effect.gen(function* () {
      yield* verifyChainIntegrity([entryWithSequence(3), entryWithSequence(1), entryWithSequence(2)]);
    }));

  it.effect("a gap fails with the expected and actual sequence numbers", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        verifyChainIntegrity([entryWithSequence(1), entryWithSequence(3)]),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure.expectedSequence, 2);
        assert.strictEqual(result.failure.actualSequence, 3);
      }
    }));

  it.effect("a duplicate sequence number fails too", () =>
    Effect.gen(function* () {
      const result = yield* Effect.result(
        verifyChainIntegrity([entryWithSequence(1), entryWithSequence(1), entryWithSequence(2)]),
      );
      assert.strictEqual(result._tag, "Failure");
      if (result._tag === "Failure") {
        assert.strictEqual(result.failure.expectedSequence, 2);
        assert.strictEqual(result.failure.actualSequence, 1);
      }
    }));

  it.effect("a mix of sequenced and unsequenced entries only checks the sequenced ones", () =>
    Effect.gen(function* () {
      yield* verifyChainIntegrity([
        entryWithSequence(undefined),
        entryWithSequence(1),
        entryWithSequence(undefined),
        entryWithSequence(2),
      ]);
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
          const result = Effect.runSync(Effect.result(verifyChainIntegrity(entries)));
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
          const result = Effect.runSync(Effect.result(verifyChainIntegrity(entries)));
          return result._tag === "Failure";
        },
      ),
      { numRuns: 100 },
    );
  });
});
