import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as FastCheck from "fast-check";
import { archiveFacts } from "../src/ArchiveFacts.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { decisionRecord } from "./helpers.ts";

/** Twelve structurally distinct rows, each encoded once: the evaluationIds differ. */
const pool: ReadonlyArray<AuditEntry> = Array.from({ length: 12 }, (_, i) =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId: "f-" + i }))),
);

/** Pool entry `i` carrying `sequenceNumber`, a fresh object each call. */
const entryAt = (i: number, sequenceNumber: number | undefined): AuditEntry => ({
  ...(pool[i] ?? assert.fail("pool index out of range")),
  sequenceNumber,
});

/** A list of entries, one per given sequence number (`undefined` = unsequenced), ids `f-0`, `f-1`, ... */
const entriesWith = (numbers: ReadonlyArray<number | undefined>): ReadonlyArray<AuditEntry> =>
  numbers.map((sequenceNumber, i) => entryAt(i, sequenceNumber));

const ids = (entries: ReadonlyArray<AuditEntry>): ReadonlyArray<string> =>
  entries.map((entry) => entry.record.evaluationId);

describe("archiveFacts: empty and trivial lists", () => {
  it("no entries has no order, no claim, no break and no departure", () => {
    const facts = archiveFacts([]);
    assert.deepStrictEqual(facts.ordered, []);
    assert.strictEqual(facts.sequencedCount, 0);
    assert.strictEqual(facts.sequenceIntegrityVerified, false);
    assert.isUndefined(facts.sequenceBreak);
    assert.isUndefined(facts.outOfOrderAt);
  });
});

describe("archiveFacts: archive order", () => {
  it("sequenced entries by number, then unsequenced entries in the order given", () => {
    const [uLate, s2, uEarly, s1] = [entryAt(0, undefined), entryAt(1, 2), entryAt(2, undefined), entryAt(3, 1)];
    const facts = archiveFacts([uLate, s2, uEarly, s1]);
    assert.deepStrictEqual(ids(facts.ordered), ["f-3", "f-1", "f-0", "f-2"]);
    assert.strictEqual(facts.sequencedCount, 2);
    assert.isTrue(facts.sequenceIntegrityVerified);
  });

  it("does not mutate the entries it is given", () => {
    const input = entriesWith([2, 1]);
    archiveFacts(input);
    assert.deepStrictEqual(ids(input), ["f-0", "f-1"]);
  });
});

describe("archiveFacts: the claim", () => {
  it("one sequenced entry among unsequenced ones is not a verified sequence", () => {
    const facts = archiveFacts(entriesWith([undefined, undefined, 7]));
    assert.deepStrictEqual(ids(facts.ordered), ["f-2", "f-0", "f-1"]);
    assert.strictEqual(facts.sequencedCount, 1);
    assert.isFalse(facts.sequenceIntegrityVerified);
  });

  it("one sequenced entry before an unsequenced one is not a verified sequence", () => {
    const facts = archiveFacts(entriesWith([1, undefined]));
    assert.strictEqual(facts.sequencedCount, 1);
    assert.isFalse(facts.sequenceIntegrityVerified);
  });

  it("two sequenced entries among unsequenced ones back the claim", () => {
    const facts = archiveFacts(entriesWith([1, undefined, 2]));
    assert.strictEqual(facts.sequencedCount, 2);
    assert.isTrue(facts.sequenceIntegrityVerified);
  });

  it("only unsequenced entries claim nothing", () => {
    const facts = archiveFacts(entriesWith([undefined, undefined, undefined]));
    assert.strictEqual(facts.sequencedCount, 0);
    assert.isFalse(facts.sequenceIntegrityVerified);
  });
});

describe("archiveFacts: the first sequence break", () => {
  it("a single sequenced entry among unsequenced ones is intact", () => {
    assert.isUndefined(archiveFacts(entriesWith([undefined, 7, undefined])).sequenceBreak);
  });

  it("names the first break in sorted order, not input order", () => {
    assert.deepStrictEqual(archiveFacts(entriesWith([9, 1, 2, 5])).sequenceBreak, {
      expectedSequence: 3,
      actualSequence: 5,
    });
  });

  it("a duplicate reports the repeated number as the actual one", () => {
    assert.deepStrictEqual(archiveFacts(entriesWith([4, 4])).sequenceBreak, {
      expectedSequence: 5,
      actualSequence: 4,
    });
  });

  it("an unsequenced entry between two sequenced ones does not hide the gap", () => {
    assert.deepStrictEqual(archiveFacts(entriesWith([1, undefined, 3])).sequenceBreak, {
      expectedSequence: 2,
      actualSequence: 3,
    });
  });

  it("a contiguous run, out of write order, has no break", () => {
    assert.isUndefined(archiveFacts(entriesWith([3, 1, 2])).sequenceBreak);
  });
});

describe("archiveFacts: where the list as given departs from archive order", () => {
  it("a sequenced entry below its predecessor is the departure", () => {
    assert.strictEqual(archiveFacts(entriesWith([1, 3, 2])).outOfOrderAt, 2);
  });

  it("a sequenced entry after an unsequenced one is the departure", () => {
    assert.strictEqual(archiveFacts(entriesWith([1, 2, undefined, 3])).outOfOrderAt, 3);
  });

  it("a sequenced entry right after an unsequenced one at the front is the departure", () => {
    assert.strictEqual(archiveFacts(entriesWith([undefined, 1])).outOfOrderAt, 1);
  });

  it("unsequenced entries after the sequenced ones are in order", () => {
    assert.isUndefined(archiveFacts(entriesWith([1, 2, undefined, undefined])).outOfOrderAt);
  });

  it("only unsequenced entries are in order, whatever order they arrived in", () => {
    assert.isUndefined(archiveFacts(entriesWith([undefined, undefined])).outOfOrderAt);
  });

  it("equal neighbours are the break's concern, not the order's", () => {
    assert.isUndefined(archiveFacts(entriesWith([4, 4])).outOfOrderAt);
  });
});

describe("PROPERTY: archiveFacts over any list of optional sequence numbers", () => {
  const sequenceNumbers = FastCheck.array(FastCheck.option(FastCheck.integer({ min: 0, max: 8 }), { nil: undefined }), {
    maxLength: pool.length,
  });

  it("ordered is a permutation of the input, in archive order, with the same claim and break", () => {
    FastCheck.assert(
      FastCheck.property(sequenceNumbers, (numbers) => {
        const input = entriesWith(numbers);
        const facts = archiveFacts(input);

        // A permutation: same length, and every input element appears once, by reference.
        assert.strictEqual(facts.ordered.length, input.length);
        for (const entry of input) {
          assert.strictEqual(facts.ordered.filter((held) => held === entry).length, 1);
        }

        // Already in archive order, so nothing departs from it.
        const again = archiveFacts(facts.ordered);
        assert.isUndefined(again.outOfOrderAt);

        // The claim and the break do not depend on the order given.
        assert.strictEqual(again.sequencedCount, facts.sequencedCount);
        assert.strictEqual(again.sequenceIntegrityVerified, facts.sequenceIntegrityVerified);
        assert.deepStrictEqual(again.sequenceBreak, facts.sequenceBreak);
      }),
      { numRuns: 200 },
    );
  });
});
