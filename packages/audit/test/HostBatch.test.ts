/**
 * The admission step checks a batch in one order and reads each input once.
 *
 * This file is the one place the order is asserted: the `now`, then the caller's terms, then the rows, and a refusal of
 * an earlier input hides every later one. Each function that takes a batch is checked against the step, never against
 * a second copy of the order. A list, a `now` or a terms read that a store client or a JavaScript caller hands over can
 * answer differently on a second read, so the rows also count the reads and flip the answers: what the step checked is
 * what it admits.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { admitBatch, admitRows } from "../src/HostBatch.ts";
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

/** A list that counts each property read of it, by key, and answers what the list it copies answers. */
const counting = (rows: ReadonlyArray<unknown>) => {
  const reads = new Map<string, number>();
  const proxy = new Proxy([...rows], {
    get(target, prop, receiver) {
      const key = typeof prop === "symbol" ? prop.toString() : prop;
      reads.set(key, (reads.get(key) ?? 0) + 1);
      return Reflect.get(target, prop, receiver);
    },
  });
  return { rows: host(proxy), reads };
};

/** A list whose index `0` answers its own first value on the first read and `second` on every later read. */
const flipping = (rows: ReadonlyArray<unknown>, second: unknown) => {
  let reads = 0;
  const proxy = new Proxy([...rows], {
    get(target, prop, receiver) {
      if (prop === "0") {
        reads += 1;
        return reads === 1 ? Reflect.get(target, prop, receiver) : second;
      }
      return Reflect.get(target, prop, receiver);
    },
  });
  return host(proxy);
};

/** The reads of a counted list, ordered by key. */
const readsOf = (reads: Map<string, number>) => [...reads].sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0));

const successOf = <A>(result: Result.Result<A, unknown>): A =>
  Result.isSuccess(result) ? result.success : assert.fail("the step refused the batch");

/** What a refused batch failed with, as a plain object. */
const refusalOf = (result: Result.Result<unknown, unknown>): object =>
  Result.isFailure(result) ? { ...Object(result.failure) } : assert.fail("the step admitted the batch");

type Terms = () => Result.Result<string, { readonly _tag: "TermsRefused" }>;

const admitted: Terms = () => Result.succeed("terms");
const refused: Terms = () => Result.fail({ _tag: "TermsRefused" });

/** Terms that count their calls and answer what `terms` answers. */
const counted = (terms: Terms) => {
  const state = { calls: 0 };
  return {
    state,
    terms: (): ReturnType<Terms> => {
      state.calls += 1;
      return terms();
    },
  };
};

/** A batch as a host can hand it over: a `now` and a list the types do not bind. */
const run = (now: unknown, terms: Terms, entries: unknown) =>
  admitBatch({ now: handedOver<number>(now), terms, entries: host(entries) });

const good = codecRow("good");
const NOW = 1_000;
const BAD_NOW = Number.NaN;
const notMadeRows = [JSON.parse(JSON.stringify(good))];

const nowRefused = { _tag: "NowNotFinite", value: BAD_NOW };
const termsRefused = { _tag: "TermsRefused" };
const rowsNotAList = { _tag: "EntriesNotAList", value: null };
const rowNotMade = { _tag: "EntryNotMadeByCodec", index: 0 };

/** What a list read as its length once and each of three indexes once looks like. */
const LENGTH_AND_EACH_INDEX_ONCE = [
  ["0", 1],
  ["1", 1],
  ["2", 1],
  ["length", 1],
];

describe("an admitted batch carries the now, the terms and the rows it was given", () => {
  it("H1 an admitted batch passes the now, the terms and the rows through", () => {
    const batch = successOf(run(NOW, admitted, [good]));
    assert.strictEqual(batch.now, NOW);
    assert.strictEqual(batch.terms, "terms");
    assert.strictEqual(batch.rows.entries.length, 1);
    assert.strictEqual(batch.rows.entries[0], good);
  });
});

describe("a batch is refused for its first fault in the order now, terms, rows", () => {
  it("H2 a bad now alone is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, admitted, [good])), nowRefused);
  });

  it("H3 refused terms alone is the terms refusal", () => {
    assert.deepStrictEqual(refusalOf(run(NOW, refused, [good])), termsRefused);
  });

  it("H4 admitted terms then a rows list that is not a list is EntriesNotAList", () => {
    assert.deepStrictEqual(refusalOf(run(NOW, admitted, null)), rowsNotAList);
  });

  it("H5 admitted terms then a refused row is EntryNotMadeByCodec", () => {
    assert.deepStrictEqual(refusalOf(run(NOW, admitted, notMadeRows)), rowNotMade);
  });

  it("H6 a bad now with refused terms is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, refused, [good])), nowRefused);
  });

  it("H7 a bad now with rows that are not a list is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, admitted, null)), nowRefused);
  });

  it("H8 a bad now with a refused row is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, admitted, notMadeRows)), nowRefused);
  });

  it("H9 refused terms with rows that are not a list is the terms refusal", () => {
    assert.deepStrictEqual(refusalOf(run(NOW, refused, null)), termsRefused);
  });

  it("H10 refused terms with a refused row is the terms refusal", () => {
    assert.deepStrictEqual(refusalOf(run(NOW, refused, notMadeRows)), termsRefused);
  });

  it("H11 a bad now with refused terms and rows that are not a list is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, refused, null)), nowRefused);
  });

  it("H12 a bad now with refused terms and a refused row is NowNotFinite", () => {
    assert.deepStrictEqual(refusalOf(run(BAD_NOW, refused, notMadeRows)), nowRefused);
  });
});

describe("an input is read only when every input before it was admitted", () => {
  it("H13 the terms are called once for an admitted now and never for a refused now", () => {
    const accepted = counted(admitted);
    successOf(run(NOW, accepted.terms, [good]));
    const skipped = counted(admitted);
    refusalOf(run(BAD_NOW, skipped.terms, [good]));
    assert.deepStrictEqual({ accepted: accepted.state.calls, skipped: skipped.state.calls }, { accepted: 1, skipped: 0 });
  });

  it("H14 the rows are not read when the now or the terms are refused", () => {
    const afterNow = counting([good]);
    refusalOf(run(BAD_NOW, admitted, afterNow.rows));
    const afterTerms = counting([good]);
    refusalOf(run(NOW, refused, afterTerms.rows));
    assert.deepStrictEqual([afterNow.reads.size, afterTerms.reads.size], [0, 0]);
  });
});

describe("a now is admitted exactly when it is a finite number", () => {
  it("H15 a now of NaN, both infinities, the string 1, undefined, null or 1n is NowNotFinite with the value given", () => {
    for (const given of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY, "1", undefined, null, 1n]) {
      const refusal = refusalOf(run(given, admitted, [good]));
      assert.strictEqual(Reflect.get(refusal, "_tag"), "NowNotFinite");
      assert.isTrue(Object.is(Reflect.get(refusal, "value"), given));
    }
  });

  it("H16 a now of 0, -0 or 1 is admitted as given", () => {
    for (const given of [0, -0, 1]) {
      assert.isTrue(Object.is(successOf(run(given, admitted, [good])).now, given));
    }
  });
});

describe("the rows are admitted from one read of the list given", () => {
  /** Values a JavaScript caller can hand over where the type says a list. */
  const notLists: ReadonlyArray<unknown> = [undefined, null, 7, "rows", { length: 1, 0: good }, new Set([good]), good];

  it("H17 admitRows refuses each of the seven values that are not a list with the value given", () => {
    for (const given of notLists) {
      const refusal = refusalOf(admitRows(host(given)));
      assert.deepStrictEqual(refusal, { _tag: "EntriesNotAList", value: given });
      assert.isTrue(Object.is(Reflect.get(refusal, "value"), given));
    }
  });

  it("H18 admitRows refuses a hole at its index", () => {
    const sparse: Array<AuditEntry> = Array.from({ length: 3 });
    delete sparse[1];
    sparse[0] = good;
    sparse[2] = good;
    assert.deepStrictEqual(refusalOf(admitRows(sparse)), { _tag: "EntryNotMadeByCodec", index: 1 });
  });

  it("H19 admitRows admits the row that was checked when the list answers differently on a second read", () => {
    const rows = flipping([good], { record: good.record, sequenceNumber: 1.5 });
    const taken = successOf(admitRows(rows));
    assert.strictEqual(taken.entries.length, 1);
    assert.strictEqual(taken.entries[0], good);
  });

  it("H20 admitRows reads the length once and each index once", () => {
    const { rows, reads } = counting([good, codecRow("a"), codecRow("b")]);
    successOf(admitRows(rows));
    assert.deepStrictEqual(readsOf(reads), LENGTH_AND_EACH_INDEX_ONCE);
  });

  it("H21 admitRows admits an empty list as no rows", () => {
    assert.deepStrictEqual(successOf(admitRows([])).entries, []);
  });

  it("H22 the admitted rows are a fresh array the list given cannot change", () => {
    const list = [good];
    const taken = successOf(admitRows(list));
    assert.notStrictEqual(taken.entries, list);
    list.push(codecRow("later"));
    assert.strictEqual(taken.entries.length, 1);
    assert.strictEqual(taken.entries[0], good);
  });
});
