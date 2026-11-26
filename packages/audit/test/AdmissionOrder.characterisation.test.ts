/**
 * Pins, for each function that takes a host batch, which refusal wins for every pair of faults, the spans each outcome
 * opens and what a refusal leaves unread.
 *
 * The winners and the span lists are written out literally, one row each, so no abstraction under test can make a row
 * pass by construction: a table that computed its winner from an order list would agree with whatever order the code
 * under test has. Only the three property rows derive a first fault, and each states the order it derives from. The file
 * is held byte for byte from the commit that adds it, except six declared regions, each rewritten by the type change of
 * `verifiedArchiveFacts` or by review: this header, the direct block's import, the impossible pairs beside `outcomeOf`,
 * the list helper the direct rows dropped, the refused-rows span block and the direct `verifiedArchiveFacts` block.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Layer from "effect/Layer";
import * as Result from "effect/Result";
import * as Tracer from "effect/Tracer";
import * as FastCheck from "fast-check";
import { ArchiveInputRefusal, archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import type { ArchivalOptions } from "../src/AuditArchive.ts";
import { encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { RetentionInputRefusal, planPurge, planRetention } from "../src/Retention.ts";
import type { RetentionPolicy } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { verifiedArchiveFacts } from "../src/ArchiveFacts.ts";
import { admitRows } from "../src/HostBatch.ts";
import { decisionRecord, numbered } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/** What a store client returns: the rows' parsed bytes, typed `any` by `JSON.parse`. */
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));

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
 * A list that counts each property read of it, by key, and answers what the list it copies answers. The map is read
 * after the call, so a row can say which properties of the list were touched and how often.
 */
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

/** Runs `effect` under a tracer that records the name of each span opened, and answers its result and those names. */
const spansOf = <A, E>(effect: Effect.Effect<A, E>) => {
  const names: Array<string> = [];
  const tracer = Layer.succeed(
    Tracer.Tracer,
    Tracer.make({
      span: (options) => {
        names.push(options.name);
        return new Tracer.NativeSpan(options);
      },
    }),
  );
  const result = Effect.runSync(Effect.result(effect.pipe(Effect.provide(tracer))));
  return { result, names };
};

const outcomeOf = (result: Result.Result<unknown, { readonly _tag: string }>) =>
  Result.isFailure(result) ? result.failure._tag : "success";

/*
 * The pairs of faults no input can make, each with the reason; every other pair of faults of a function has a row.
 * Two forms of one input exclude each other, and a value that is not a list holds no rows to hold a second fault:
 * - key material not a list x key-material item: two forms of one input;
 * - maxAgeMs NaN x maxAgeMs -1: two forms of one input;
 * - rows not a list x row item: a value that is not a list holds no rows;
 * - rows not a list x break: a value that is not a list holds no rows.
 */

const good = codecRow("good");
const a = codecRow("a");
const b = codecRow("b");
const p = codecRow("p");

/** Rows the codec made, numbered 1 and 5: the first break is an expected 2 and an actual 5. */
const breakRows: ReadonlyArray<AuditEntry> = [numbered(a, 1), numbered(b, 5)];
/** A parsed copy of a codec row at index 0: a row the codec did not make. */
const rowItem = fromStore([good]);
/** A row the codec did not make at index 0, then the break rows. */
const rowItemBreak: ReadonlyArray<AuditEntry> = [...fromStore([p]), ...breakRows];
const rowsNotList = host(null);

const kmNotList = handedOver<ArchivalOptions["keyMaterial"]>(7);
const kmItem = handedOver<ArchivalOptions["keyMaterial"]>([null]);

const nowRefused = ArchiveInputRefusal.NowNotFinite({ value: Number.NaN });
const kmNotListRefused = ArchiveInputRefusal.KeyMaterialNotAList({ value: 7 });
const kmItemRefused = ArchiveInputRefusal.KeyMaterialItemRefused({ index: 0 });
const rowsNotListRefused = ArchiveInputRefusal.EntriesNotAList({ value: null });
const rowItemRefused = ArchiveInputRefusal.EntryNotMadeByCodec({ index: 0 });
const breakFailure = { _tag: "SequenceIntegrityError", expectedSequence: 2, actualSequence: 5 };

const archiveInvalid = (refusal: ArchiveInputRefusal) => ({ _tag: "ArchiveInputInvalid", refusal });
const retentionInvalid = (refusal: RetentionInputRefusal) => ({ _tag: "RetentionInputInvalid", refusal });

const failureOf = (result: Result.Result<unknown, unknown>): unknown =>
  Result.isFailure(result) ? { ...Object(result.failure) } : assert.fail("the call took the input");

const writerFailure = (entries: ReadonlyArray<AuditEntry>, now: number, options?: ArchivalOptions) =>
  failureOf(Effect.runSync(Effect.result(archiveAuditTrail(entries, now, options))));

const verifyFailure = (entries: ReadonlyArray<AuditEntry>) =>
  failureOf(Effect.runSync(Effect.result(verifySequenceIntegrity(entries))));

const storedArchive = () =>
  Result.getOrThrow(
    readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail([good], 0))))),
  );

const retentionFailure = (entries: ReadonlyArray<AuditEntry>, maxAgeMs: number, now: number) =>
  failureOf(planRetention(entries, { maxAgeMs }, now));

const purgeFailure = (entries: ReadonlyArray<AuditEntry>, maxAgeMs: number, now: number) =>
  failureOf(planPurge(entries, { maxAgeMs }, now, storedArchive()));

/** An admitted time for a plan: the row `good` is 99_000 older than it. */
const NOW = 100_000;

describe("which refusal wins: archiveAuditTrail", () => {
  it("W1 a NaN now alone: NowNotFinite", () => {
    assert.deepStrictEqual(writerFailure([good], Number.NaN), archiveInvalid(nowRefused));
  });
  it("W2 key material that is not a list alone: KeyMaterialNotAList", () => {
    assert.deepStrictEqual(writerFailure([good], 1_000, { keyMaterial: kmNotList }), archiveInvalid(kmNotListRefused));
  });
  it("W3 a key-material item that is refused alone: KeyMaterialItemRefused", () => {
    assert.deepStrictEqual(writerFailure([good], 1_000, { keyMaterial: kmItem }), archiveInvalid(kmItemRefused));
  });
  it("W4 rows that are not a list alone: EntriesNotAList", () => {
    assert.deepStrictEqual(writerFailure(rowsNotList, 1_000), archiveInvalid(rowsNotListRefused));
  });
  it("W5 a row the codec did not make alone: EntryNotMadeByCodec", () => {
    assert.deepStrictEqual(writerFailure(rowItem, 1_000), archiveInvalid(rowItemRefused));
  });
  it("W6 a sequence break alone: SequenceIntegrityError", () => {
    assert.deepStrictEqual(writerFailure(breakRows, 1_000), breakFailure);
  });
  it("W7 a NaN now with key material that is not a list: NowNotFinite wins", () => {
    assert.deepStrictEqual(writerFailure([good], Number.NaN, { keyMaterial: kmNotList }), archiveInvalid(nowRefused));
  });
  it("W8 a NaN now with a key-material item that is refused: NowNotFinite wins", () => {
    assert.deepStrictEqual(writerFailure([good], Number.NaN, { keyMaterial: kmItem }), archiveInvalid(nowRefused));
  });
  it("W9 a NaN now with rows that are not a list: NowNotFinite wins", () => {
    assert.deepStrictEqual(writerFailure(rowsNotList, Number.NaN), archiveInvalid(nowRefused));
  });
  it("W10 a NaN now with a row the codec did not make: NowNotFinite wins", () => {
    assert.deepStrictEqual(writerFailure(rowItem, Number.NaN), archiveInvalid(nowRefused));
  });
  it("W11 a NaN now with a sequence break: NowNotFinite wins", () => {
    assert.deepStrictEqual(writerFailure(breakRows, Number.NaN), archiveInvalid(nowRefused));
  });
  it("W12 key material that is not a list with rows that are not a list: KeyMaterialNotAList wins", () => {
    assert.deepStrictEqual(writerFailure(rowsNotList, 1_000, { keyMaterial: kmNotList }), archiveInvalid(kmNotListRefused));
  });
  it("W13 key material that is not a list with a row the codec did not make: KeyMaterialNotAList wins", () => {
    assert.deepStrictEqual(writerFailure(rowItem, 1_000, { keyMaterial: kmNotList }), archiveInvalid(kmNotListRefused));
  });
  it("W14 key material that is not a list with a sequence break: KeyMaterialNotAList wins", () => {
    assert.deepStrictEqual(writerFailure(breakRows, 1_000, { keyMaterial: kmNotList }), archiveInvalid(kmNotListRefused));
  });
  it("W15 a key-material item that is refused with rows that are not a list: KeyMaterialItemRefused wins", () => {
    assert.deepStrictEqual(writerFailure(rowsNotList, 1_000, { keyMaterial: kmItem }), archiveInvalid(kmItemRefused));
  });
  it("W16 a key-material item that is refused with a row the codec did not make: KeyMaterialItemRefused wins", () => {
    assert.deepStrictEqual(writerFailure(rowItem, 1_000, { keyMaterial: kmItem }), archiveInvalid(kmItemRefused));
  });
  it("W17 a key-material item that is refused with a sequence break: KeyMaterialItemRefused wins", () => {
    assert.deepStrictEqual(writerFailure(breakRows, 1_000, { keyMaterial: kmItem }), archiveInvalid(kmItemRefused));
  });
  it("W18 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins", () => {
    assert.deepStrictEqual(writerFailure(rowItemBreak, 1_000), archiveInvalid(rowItemRefused));
  });
});

describe("which refusal wins: planRetention and planPurge", () => {
  const nowNaN = RetentionInputRefusal.NowNotFinite({ value: Number.NaN });
  const maxAgeNaN = RetentionInputRefusal.MaxAgeInvalid({ value: Number.NaN });
  const maxAgeNegative = RetentionInputRefusal.MaxAgeInvalid({ value: -1 });
  const listRefused = RetentionInputRefusal.EntriesNotAList({ value: null });
  const itemRefused = RetentionInputRefusal.EntryNotMadeByCodec({ index: 0 });

  it("R1 a NaN now alone: planRetention answers NowNotFinite", () => {
    assert.deepStrictEqual(retentionFailure([good], 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("R2 a NaN maxAgeMs alone: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure([good], Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("R3 a maxAgeMs of -1 alone: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure([good], -1, NOW), retentionInvalid(maxAgeNegative));
  });
  it("R4 rows that are not a list alone: planRetention answers EntriesNotAList", () => {
    assert.deepStrictEqual(retentionFailure(rowsNotList, 10, NOW), retentionInvalid(listRefused));
  });
  it("R5 a row the codec did not make alone: planRetention answers EntryNotMadeByCodec", () => {
    assert.deepStrictEqual(retentionFailure(rowItem, 10, NOW), retentionInvalid(itemRefused));
  });
  it("R6 a NaN now with a NaN maxAgeMs: planRetention answers NowNotFinite", () => {
    assert.deepStrictEqual(retentionFailure([good], Number.NaN, Number.NaN), retentionInvalid(nowNaN));
  });
  it("R7 a NaN now with a maxAgeMs of -1: planRetention answers NowNotFinite", () => {
    assert.deepStrictEqual(retentionFailure([good], -1, Number.NaN), retentionInvalid(nowNaN));
  });
  it("R8 a NaN now with rows that are not a list: planRetention answers NowNotFinite", () => {
    assert.deepStrictEqual(retentionFailure(rowsNotList, 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("R9 a NaN now with a row the codec did not make: planRetention answers NowNotFinite", () => {
    assert.deepStrictEqual(retentionFailure(rowItem, 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("R10 a NaN maxAgeMs with rows that are not a list: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure(rowsNotList, Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("R11 a NaN maxAgeMs with a row the codec did not make: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure(rowItem, Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("R12 a maxAgeMs of -1 with rows that are not a list: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure(rowsNotList, -1, NOW), retentionInvalid(maxAgeNegative));
  });
  it("R13 a maxAgeMs of -1 with a row the codec did not make: planRetention answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(retentionFailure(rowItem, -1, NOW), retentionInvalid(maxAgeNegative));
  });

  it("P1 a NaN now alone: planPurge answers NowNotFinite", () => {
    assert.deepStrictEqual(purgeFailure([good], 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("P2 a NaN maxAgeMs alone: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure([good], Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("P3 a maxAgeMs of -1 alone: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure([good], -1, NOW), retentionInvalid(maxAgeNegative));
  });
  it("P4 rows that are not a list alone: planPurge answers EntriesNotAList", () => {
    assert.deepStrictEqual(purgeFailure(rowsNotList, 10, NOW), retentionInvalid(listRefused));
  });
  it("P5 a row the codec did not make alone: planPurge answers EntryNotMadeByCodec", () => {
    assert.deepStrictEqual(purgeFailure(rowItem, 10, NOW), retentionInvalid(itemRefused));
  });
  it("P6 a NaN now with a NaN maxAgeMs: planPurge answers NowNotFinite", () => {
    assert.deepStrictEqual(purgeFailure([good], Number.NaN, Number.NaN), retentionInvalid(nowNaN));
  });
  it("P7 a NaN now with a maxAgeMs of -1: planPurge answers NowNotFinite", () => {
    assert.deepStrictEqual(purgeFailure([good], -1, Number.NaN), retentionInvalid(nowNaN));
  });
  it("P8 a NaN now with rows that are not a list: planPurge answers NowNotFinite", () => {
    assert.deepStrictEqual(purgeFailure(rowsNotList, 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("P9 a NaN now with a row the codec did not make: planPurge answers NowNotFinite", () => {
    assert.deepStrictEqual(purgeFailure(rowItem, 10, Number.NaN), retentionInvalid(nowNaN));
  });
  it("P10 a NaN maxAgeMs with rows that are not a list: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure(rowsNotList, Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("P11 a NaN maxAgeMs with a row the codec did not make: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure(rowItem, Number.NaN, NOW), retentionInvalid(maxAgeNaN));
  });
  it("P12 a maxAgeMs of -1 with rows that are not a list: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure(rowsNotList, -1, NOW), retentionInvalid(maxAgeNegative));
  });
  it("P13 a maxAgeMs of -1 with a row the codec did not make: planPurge answers MaxAgeInvalid", () => {
    assert.deepStrictEqual(purgeFailure(rowItem, -1, NOW), retentionInvalid(maxAgeNegative));
  });
});

describe("which refusal wins: verifySequenceIntegrity", () => {
  it("V1 rows that are not a list: EntriesNotAList", () => {
    assert.deepStrictEqual(verifyFailure(rowsNotList), archiveInvalid(rowsNotListRefused));
  });
  it("V2 a row the codec did not make: EntryNotMadeByCodec", () => {
    assert.deepStrictEqual(verifyFailure(rowItem), archiveInvalid(rowItemRefused));
  });
  it("V3 a sequence break: SequenceIntegrityError", () => {
    assert.deepStrictEqual(verifyFailure(breakRows), breakFailure);
  });
  it("V4 a row the codec did not make with a sequence break: EntryNotMadeByCodec wins", () => {
    assert.deepStrictEqual(verifyFailure(rowItemBreak), archiveInvalid(rowItemRefused));
  });
});

/** A form of each input a host can hand over; one form, or none, is drawn per input. */
const KM_FORMS = ["none", "list", "item"] as const;
const MAX_AGE_FORMS = ["valid", "nan", "negative"] as const;
const ROWS_FORMS = ["good", "notList", "item", "break", "itemBreak"] as const;
const keyMaterialOf = { none: undefined, list: kmNotList, item: kmItem };
const maxAgeOf = { valid: 10, nan: Number.NaN, negative: -1 };
const rowsOf = { good: [good], notList: rowsNotList, item: rowItem, break: breakRows, itemBreak: rowItemBreak };

describe("which refusal wins for any set of faults", () => {
  it("O1 the writer refuses the first fault of now, then key material, then rows, or archives", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.record({
          badNow: FastCheck.boolean(),
          km: FastCheck.constantFrom(...KM_FORMS),
          rows: FastCheck.constantFrom(...ROWS_FORMS),
        }),
        ({ badNow, km, rows }) => {
          const result = Effect.runSync(
            Effect.result(
              archiveAuditTrail(rowsOf[rows], badNow ? Number.NaN : 1_000, { keyMaterial: keyMaterialOf[km] }),
            ),
          );
          // The writer's order: now, then key material, then the rows' list, then each row, then the break.
          const first = badNow
            ? archiveInvalid(nowRefused)
            : km === "list"
              ? archiveInvalid(kmNotListRefused)
              : km === "item"
                ? archiveInvalid(kmItemRefused)
                : rows === "notList"
                  ? archiveInvalid(rowsNotListRefused)
                  : rows === "item" || rows === "itemBreak"
                    ? archiveInvalid(rowItemRefused)
                    : rows === "break"
                      ? breakFailure
                      : undefined;
          assert.deepStrictEqual(Result.isFailure(result) ? { ...result.failure } : undefined, first);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("O2 both plans refuse the first fault of now, then maxAgeMs, then rows, or plan", () => {
    FastCheck.assert(
      FastCheck.property(
        FastCheck.record({
          badNow: FastCheck.boolean(),
          maxAge: FastCheck.constantFrom(...MAX_AGE_FORMS),
          rows: FastCheck.constantFrom(...ROWS_FORMS),
        }),
        ({ badNow, maxAge, rows }) => {
          const policy: RetentionPolicy = { maxAgeMs: maxAgeOf[maxAge] };
          const now = badNow ? Number.NaN : NOW;
          // The plans' order: now, then maxAgeMs, then the rows' list, then each row. A break is not a fault for a plan.
          const first = badNow
            ? retentionInvalid(RetentionInputRefusal.NowNotFinite({ value: Number.NaN }))
            : maxAge !== "valid"
              ? retentionInvalid(RetentionInputRefusal.MaxAgeInvalid({ value: maxAgeOf[maxAge] }))
              : rows === "notList"
                ? retentionInvalid(RetentionInputRefusal.EntriesNotAList({ value: null }))
                : rows === "item" || rows === "itemBreak"
                  ? retentionInvalid(RetentionInputRefusal.EntryNotMadeByCodec({ index: 0 }))
                  : undefined;
          const retention = planRetention(rowsOf[rows], policy, now);
          const purge = planPurge(rowsOf[rows], policy, now, storedArchive());
          assert.deepStrictEqual(Result.isFailure(retention) ? { ...retention.failure } : undefined, first);
          assert.deepStrictEqual(Result.isFailure(purge) ? { ...purge.failure } : undefined, first);
        },
      ),
      { numRuns: 200 },
    );
  });

  it("O3 the verify refuses the first fault of the list, then a row, then the break, or passes", () => {
    FastCheck.assert(
      FastCheck.property(FastCheck.constantFrom(...ROWS_FORMS), (rows) => {
        const result = Effect.runSync(Effect.result(verifySequenceIntegrity(rowsOf[rows])));
        // The check's order: the list, then each row, then the break.
        const first =
          rows === "notList"
            ? archiveInvalid(rowsNotListRefused)
            : rows === "item" || rows === "itemBreak"
              ? archiveInvalid(rowItemRefused)
              : rows === "break"
                ? breakFailure
                : undefined;
        assert.deepStrictEqual(Result.isFailure(result) ? { ...result.failure } : undefined, first);
      }),
      { numRuns: 100 },
    );
  });
});

describe("the spans each outcome opens", () => {
  const WRITER = "qadi.audit.archiveAuditTrail";
  const SEQUENCE = "qadi.audit.verifySequenceIntegrity";

  it("S1 the writer refused for now opens only its own span", () => {
    const { result, names } = spansOf(archiveAuditTrail([good], Number.NaN));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [WRITER] });
  });
  it("S2 the writer refused for key material that is not a list opens only its own span", () => {
    const { result, names } = spansOf(archiveAuditTrail([good], 1_000, { keyMaterial: kmNotList }));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [WRITER] });
  });
  it("S3 the writer refused for a key-material item opens only its own span", () => {
    const { result, names } = spansOf(archiveAuditTrail([good], 1_000, { keyMaterial: kmItem }));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [WRITER] });
  });
  it("S4 the writer failing on a break opens its span and the sequence span", () => {
    const { result, names } = spansOf(archiveAuditTrail(breakRows, 1_000));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "SequenceIntegrityError", names: [WRITER, SEQUENCE] });
  });
  it("S5 the writer succeeding opens its span and the sequence span", () => {
    const { result, names } = spansOf(archiveAuditTrail([good], 1_000));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "success", names: [WRITER, SEQUENCE] });
  });
  it("S6 the verify failing on a break opens only the sequence span", () => {
    const { result, names } = spansOf(verifySequenceIntegrity(breakRows));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "SequenceIntegrityError", names: [SEQUENCE] });
  });
  it("S7 the verify succeeding opens only the sequence span", () => {
    const { result, names } = spansOf(verifySequenceIntegrity([good]));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "success", names: [SEQUENCE] });
  });
  it("S8 both plans open no span, refused or admitted, called inside Effect.sync", () => {
    const policy: RetentionPolicy = { maxAgeMs: 10 };
    const archive = storedArchive();
    const run = (plan: () => Result.Result<unknown, unknown>) => {
      const { result, names } = spansOf(Effect.sync(plan));
      if (!Result.isSuccess(result)) return assert.fail("the call threw");
      const answered = result.success;
      return { names, answer: Result.isFailure(answered) ? "failure" : Result.isSuccess(answered) ? "success" : "not a result" };
    };
    assert.deepStrictEqual(
      [
        run(() => planRetention([good], policy, Number.NaN)),
        run(() => planRetention([good], policy, NOW)),
        run(() => planPurge([good], policy, Number.NaN, archive)),
        run(() => planPurge([good], policy, NOW, archive)),
      ],
      [
        { names: [], answer: "failure" },
        { names: [], answer: "success" },
        { names: [], answer: "failure" },
        { names: [], answer: "success" },
      ],
    );
  });
});

describe("no sequence span on refused rows", () => {
  const WRITER = "qadi.audit.archiveAuditTrail";

  it("SF1 the writer refused for rows that are not a list opens only its own span, not the sequence span", () => {
    const { result, names } = spansOf(archiveAuditTrail(rowsNotList, 1_000));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [WRITER] });
  });
  it("SF2 the writer refused for a row the codec did not make opens only its own span, not the sequence span", () => {
    const { result, names } = spansOf(archiveAuditTrail(rowItem, 1_000));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [WRITER] });
  });
  it("SF3 the verify refused for rows that are not a list opens no span", () => {
    const { result, names } = spansOf(verifySequenceIntegrity(rowsNotList));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [] });
  });
  it("SF4 the verify refused for a row the codec did not make opens no span", () => {
    const { result, names } = spansOf(verifySequenceIntegrity(rowItem));
    assert.deepStrictEqual({ outcome: outcomeOf(result), names }, { outcome: "ArchiveInputInvalid", names: [] });
  });
});

describe("what a refusal leaves unread", () => {
  /** A plan's policy whose `maxAgeMs` counts the reads of it. */
  const watched = (maxAgeMs: number) => {
    const state = { reads: 0 };
    const policy: RetentionPolicy = {
      get maxAgeMs() {
        state.reads += 1;
        return maxAgeMs;
      },
    };
    return { policy, state };
  };

  it("L1 a refused now reads options.keyMaterial zero times and an admitted now reads it once", () => {
    const state = { reads: 0 };
    const options: ArchivalOptions = {
      get keyMaterial() {
        state.reads += 1;
        return undefined;
      },
    };
    Effect.runSync(Effect.result(archiveAuditTrail([good], Number.NaN, options)));
    assert.strictEqual(state.reads, 0);
    Effect.runSync(Effect.result(archiveAuditTrail([good], 1_000, options)));
    assert.strictEqual(state.reads, 1);
  });

  it("L2 refused key material reads no property of the rows", () => {
    const { rows, reads } = counting([good]);
    Effect.runSync(Effect.result(archiveAuditTrail(rows, 1_000, { keyMaterial: kmNotList })));
    Effect.runSync(Effect.result(archiveAuditTrail(rows, 1_000, { keyMaterial: kmItem })));
    assert.deepStrictEqual([...reads], []);
  });

  it("L3 a refused now reads no property of the rows", () => {
    const { rows, reads } = counting([good]);
    Effect.runSync(Effect.result(archiveAuditTrail(rows, Number.NaN)));
    assert.deepStrictEqual([...reads], []);
  });

  it("L4 each plan refused for now reads maxAgeMs zero times and no row", () => {
    const { rows, reads } = counting([good]);
    const retention = watched(10);
    const purge = watched(10);
    assert.isTrue(Result.isFailure(planRetention(rows, retention.policy, Number.NaN)));
    assert.isTrue(Result.isFailure(planPurge(rows, purge.policy, Number.NaN, storedArchive())));
    assert.deepStrictEqual({ retention: retention.state.reads, purge: purge.state.reads, rows: [...reads] }, { retention: 0, purge: 0, rows: [] });
  });

  it("L5 each plan refused for maxAgeMs reads no row", () => {
    const { rows, reads } = counting([good]);
    assert.isTrue(Result.isFailure(planRetention(rows, watched(-1).policy, NOW)));
    assert.isTrue(Result.isFailure(planPurge(rows, watched(Number.NaN).policy, NOW, storedArchive())));
    assert.deepStrictEqual([...reads], []);
  });
});

describe("verifiedArchiveFacts called directly", () => {
  const admitted = (entries: ReadonlyArray<AuditEntry>) => Result.getOrThrow(admitRows(entries));
  const factsOf = (entries: ReadonlyArray<AuditEntry>) =>
    failureOf(Effect.runSync(Effect.result(verifiedArchiveFacts(admitted(entries)))));
  /** What the verify and the writer each answer over `rows`, and whether `verifiedArchiveFacts` ran under it: its span opened. */
  const factsReached = (rows: ReadonlyArray<AuditEntry>) =>
    [spansOf(verifySequenceIntegrity(rows)), spansOf(archiveAuditTrail(rows, 1_000))].map(({ result, names }) => ({
      outcome: outcomeOf(result),
      reached: names.includes("qadi.audit.verifySequenceIntegrity"),
    }));
  const neverReached = [
    { outcome: "ArchiveInputInvalid", reached: false },
    { outcome: "ArchiveInputInvalid", reached: false },
  ];

  it("F1 verifiedArchiveFacts over rows admitRows admitted fails SequenceIntegrityError on a break", () => {
    assert.deepStrictEqual(factsOf(breakRows), breakFailure);
  });
  it("F2 verifiedArchiveFacts over admitted rows with no break returns their facts", () => {
    const facts = Effect.runSync(verifiedArchiveFacts(admitted([numbered(a, 1), numbered(b, 2)])));
    assert.deepStrictEqual(
      { ordered: facts.ordered, sequencedCount: facts.sequencedCount, sequenceIntegrityVerified: facts.sequenceIntegrityVerified },
      { ordered: [numbered(a, 1), numbered(b, 2)], sequencedCount: 2, sequenceIntegrityVerified: true },
    );
  });
  it("F3 rows that are not a list are refused by admitRows, and neither the verify nor the writer runs verifiedArchiveFacts on them", () => {
    assert.deepStrictEqual(admitRows(rowsNotList), Result.fail(rowsNotListRefused));
    assert.deepStrictEqual(factsReached(rowsNotList), neverReached);
  });
  it("F4 a row admitRows refuses, with a break among the rest, keeps the verify and the writer from running verifiedArchiveFacts", () => {
    assert.deepStrictEqual(admitRows(rowItemBreak), Result.fail(rowItemRefused));
    assert.deepStrictEqual(factsReached(rowItemBreak), neverReached);
  });
  it("F5 verifiedArchiveFacts opens exactly its own span", () => {
    const opened = [[good], breakRows].map((rows) => spansOf(verifiedArchiveFacts(admitted(rows))).names);
    assert.deepStrictEqual(opened, Array.from({ length: 2 }, () => ["qadi.audit.verifySequenceIntegrity"]));
  });
});
