/**
 * Pins that a rows list is checked as it is read, so a refused entry stops the read at its index.
 *
 * A host's list is read as its `length` once and each index once, and the read stops at the first index that is not a
 * row the codec made. A list whose `length` answers a number past any array's, a proxy's `2 ** 32` or `Infinity`, is
 * refused at index `0` with no `RangeError`, and a long sparse list or a list with a foreign entry near its start is
 * refused having read only the indexes up to that entry, never copied whole before it is checked.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { ArchiveInputRefusal } from "../src/ArchiveFacts.ts";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { admitRows } from "../src/HostBatch.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionInputRefusal } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/**
 * What a JavaScript caller can hand over where the type says something else: `Reflect.get`
 * on an `object` answers `any`, which is what an untyped store client's result is.
 */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

const host = (value: unknown): ReadonlyArray<AuditEntry> => handedOver(value);

/**
 * A list over `target` that counts each property read of it, by key, and answers `length` with `length` when one is
 * given and with the target's own otherwise.
 */
const counting = (target: Array<unknown>, length?: number) => {
  const reads = new Map<string, number>();
  const proxy = new Proxy(target, {
    get(list, prop, receiver) {
      const key = typeof prop === "symbol" ? prop.toString() : prop;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      return prop === "length" && length !== undefined ? length : Reflect.get(list, prop, receiver);
    },
  });
  return { rows: host(proxy), reads };
};

/** The reads of a counted list, ordered by key. */
const readsOf = (reads: Map<string, number>) => [...reads].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));

const good = codecRow("good");
const NOW = 100_000;
const LONG = 100_000;
const PAST_ANY_ARRAY = [2 ** 32, Infinity];

/** A list of `LONG` entries holding a codec row at index `0` and nothing after it. */
const sparse = () => {
  const list: Array<unknown> = [good];
  list.length = LONG;
  return list;
};

/** A list of `LONG` codec rows with a foreign entry at index `1`. */
const foreignSecond = () => {
  const list: Array<unknown> = Array.from({ length: LONG }, () => good);
  list[1] = { record: good.record, sequenceNumber: undefined };
  return list;
};

const LENGTH_AND_FIRST_INDEX = [
  ["0", 1],
  ["length", 1],
];
const LENGTH_AND_FIRST_TWO_INDEXES = [
  ["0", 1],
  ["1", 1],
  ["length", 1],
];

/** The index `admitRows` refuses, or a failed assertion naming what it did instead. */
const refusedAt = (refusal: ArchiveInputRefusal | RetentionInputRefusal): number =>
  refusal._tag === "EntryNotMadeByCodec" ? refusal.index : assert.fail(`refused ${refusal._tag}`);

/** An archive read back from the bytes a store would return for `rows`. */
const storedArchive = (rows: ReadonlyArray<AuditEntry>) =>
  Result.getOrThrow(readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail(rows, 0))))));

/** The index each of the four entry points refuses at and the reads it made, each over a fresh list `make` builds. */
const eachEntryPointRefuses = (make: () => { rows: ReadonlyArray<AuditEntry>; reads: Map<string, number> }) => {
  const archived = (() => {
    const { rows, reads } = make();
    const result = Effect.runSync(Effect.result(archiveAuditTrail(rows, 1_000)));
    if (Result.isSuccess(result)) return assert.fail("the writer archived the list");
    return result.failure._tag === "ArchiveInputInvalid"
      ? { at: refusedAt(result.failure.refusal), reads: readsOf(reads) }
      : assert.fail(`the writer failed ${result.failure._tag}`);
  })();
  const verified = (() => {
    const { rows, reads } = make();
    const result = Effect.runSync(Effect.result(verifySequenceIntegrity(rows)));
    if (Result.isSuccess(result)) return assert.fail("the sequence check passed the list");
    return result.failure._tag === "ArchiveInputInvalid"
      ? { at: refusedAt(result.failure.refusal), reads: readsOf(reads) }
      : assert.fail(`the sequence check failed ${result.failure._tag}`);
  })();
  const planned = (
    plan: (rows: ReadonlyArray<AuditEntry>) => Result.Result<unknown, { readonly refusal: RetentionInputRefusal }>,
  ) => {
    const { rows, reads } = make();
    const result = plan(rows);
    if (Result.isSuccess(result)) return assert.fail("the plan took the list");
    return { at: refusedAt(result.failure.refusal), reads: readsOf(reads) };
  };
  const archive = storedArchive([good]);
  return {
    archived,
    verified,
    retained: planned((rows) => planRetention(rows, { maxAgeMs: 10 }, NOW)),
    purged: planned((rows) => planPurge(rows, { maxAgeMs: 10 }, NOW, archive)),
  };
};

/** What each of the four entry points answers when every one refuses at `at` having read `reads`. */
const fromEach = (at: number, reads: ReadonlyArray<ReadonlyArray<string | number>>) => {
  const each = { at, reads };
  return { archived: each, verified: each, retained: each, purged: each };
};

describe("a rows list is checked as it is read, and the read stops at the first refused index", () => {
  it("X1 admitRows refuses a list whose length reads past any array's at index 0, having read the length and that index once", () => {
    for (const length of PAST_ANY_ARRAY) {
      const { rows, reads } = counting([], length);
      const refused = admitRows(rows);
      assert.deepStrictEqual(Result.isFailure(refused) ? refusedAt(refused.failure) : "admitted", 0);
      assert.deepStrictEqual(readsOf(reads), LENGTH_AND_FIRST_INDEX);
    }
  });

  it("X2 each entry point refuses a list whose length reads past any array's at index 0, with no RangeError", () => {
    for (const length of PAST_ANY_ARRAY) {
      assert.deepStrictEqual(eachEntryPointRefuses(() => counting([], length)), fromEach(0, LENGTH_AND_FIRST_INDEX));
    }
  });

  it("X3 admitRows stops a long sparse list at its first hole, and a long list at its first foreign entry, having read two indexes", () => {
    for (const list of [sparse(), foreignSecond()]) {
      const { rows, reads } = counting(list);
      const refused = admitRows(rows);
      assert.deepStrictEqual(Result.isFailure(refused) ? refusedAt(refused.failure) : "admitted", 1);
      assert.deepStrictEqual(readsOf(reads), LENGTH_AND_FIRST_TWO_INDEXES);
    }
  });

  it("X4 each entry point stops a long sparse list at its first hole, and a long list at its first foreign entry, having read two indexes", () => {
    for (const make of [sparse, foreignSecond]) {
      assert.deepStrictEqual(eachEntryPointRefuses(() => counting(make())), fromEach(1, LENGTH_AND_FIRST_TWO_INDEXES));
    }
  });

  it("X5 admitRows refuses a list whose length reads as a string or an object as EntriesNotAList with the list given, reading no index", () => {
    const calls = { valueOf: 0 };
    const object = {
      valueOf: () => {
        calls.valueOf += 1;
        return 1;
      },
    };
    for (const length of ["1", object]) {
      const { rows, reads } = counting([good], handedOver<number>(length));
      const refused = admitRows(rows);
      const given = Result.isFailure(refused) && refused.failure._tag === "EntriesNotAList" ? refused.failure.value : "admitted";
      assert.strictEqual(given, rows);
      assert.deepStrictEqual(readsOf(reads), [["length", 1]]);
    }
    assert.strictEqual(calls.valueOf, 0);
  });
});
