/**
 * A row the codec did not make is refused where the audit functions take rows.
 *
 * The compiler refuses a literal or a spread of a row, but a store client hands rows back
 * as `any` (`JSON.parse`, a raw SQL row, an untyped ORM result) and a JavaScript caller
 * has no compiler at all, so the type alone does not keep one out. Each test builds the
 * rows a store would return, as parsed JSON, and pins the exact refusal, the index of the
 * first row refused, and that nothing was archived or planned from them. A row only the
 * codec made is the positive twin of each.
 */
import { assert, describe, it } from "@effect/vitest";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { archiveAuditTrail, readAuditArchive } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { planPurge, planRetention } from "../src/Retention.ts";
import { verifySequenceIntegrity } from "../src/SequenceIntegrity.ts";
import { decisionRecord } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/** What a store client returns: the rows' parsed bytes, typed `any` by `JSON.parse`. */
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));

const good = codecRow("good");

/** A row whose `at` is not a number and which carries a key the codec refuses. */
const notDecodable = { record: { ...good.record, at: null }, sequenceNumber: undefined, extra: 1 };
/** Two rows whose numbers are consecutive but not integers. */
const fractional = [
  { record: good.record, sequenceNumber: 1.5 },
  { record: good.record, sequenceNumber: 2.5 },
];

const writerFailure = (entries: ReadonlyArray<AuditEntry>, now = 1_000) => {
  const result = Effect.runSync(Effect.result(archiveAuditTrail(entries, now)));
  return Result.isFailure(result) ? result.failure : assert.fail("the writer archived the rows");
};

const verifyFailure = (entries: ReadonlyArray<AuditEntry>) => {
  const result = Effect.runSync(Effect.result(verifySequenceIntegrity(entries)));
  return Result.isFailure(result) ? result.failure : assert.fail("the check passed the rows");
};

const planFailure = (entries: ReadonlyArray<AuditEntry>) => {
  const result = planRetention(entries, { maxAgeMs: 10 }, 100);
  return Result.isFailure(result) ? result.failure : assert.fail("the plan took the rows");
};

const archiveInvalid = (error: { readonly _tag: string }, field: string, value: number) => {
  assert.deepStrictEqual({ ...error }, { _tag: "ArchiveInputInvalid", field, value });
};

describe("archiveAuditTrail refuses a row the codec did not make", () => {
  it("a parsed row with a null at and an extra key is ArchiveInputInvalid naming entries and its index", () => {
    archiveInvalid(writerFailure(fromStore([notDecodable])), "entries", 0);
  });

  it("two plain rows numbered 1.5 and 2.5 are ArchiveInputInvalid, not a verified sequence", () => {
    archiveInvalid(writerFailure(fromStore(fractional)), "entries", 0);
  });

  it("the index is the first row refused, after rows the codec made", () => {
    archiveInvalid(writerFailure([good, ...fromStore([notDecodable, fractional[0]])]), "entries", 1);
  });

  it("a row with the codec's own bytes, parsed back, is still not one the codec made", () => {
    archiveInvalid(writerFailure(fromStore([good])), "entries", 0);
  });

  it("an object with a real row's prototype and fields is not a row the codec made", () => {
    const imitation: AuditEntry = Object.create(
      Object.getPrototypeOf(good),
      Object.getOwnPropertyDescriptors(good),
    );
    archiveInvalid(writerFailure([imitation]), "entries", 0);
  });

  it("null and a string in the list are refused by index", () => {
    archiveInvalid(writerFailure(fromStore([null])), "entries", 0);
    archiveInvalid(writerFailure([good, ...fromStore(["a row"])]), "entries", 1);
  });

  it("a non-finite now is refused before the rows are read", () => {
    archiveInvalid(writerFailure(fromStore([notDecodable]), Number.NaN), "now", Number.NaN);
  });

  it("the rows are refused before a sequence break among them is looked for", () => {
    const broken = fromStore([
      { record: good.record, sequenceNumber: 1 },
      { record: good.record, sequenceNumber: 5 },
    ]);
    archiveInvalid(writerFailure(broken), "entries", 0);
  });

  it("rows the codec made are archived and read back, with no rows too", () => {
    const decoded = Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: 1 }));
    for (const entries of [[good, codecRow("other")], [decoded.entry], []]) {
      const archive = Effect.runSync(archiveAuditTrail(entries, 1_000));
      assert.isTrue(Result.isSuccess(readAuditArchive(JSON.parse(JSON.stringify(archive)))));
    }
  });
});

describe("verifySequenceIntegrity refuses a row the codec did not make", () => {
  it("two plain rows numbered 1.5 and 2.5 are ArchiveInputInvalid naming entries and its index", () => {
    archiveInvalid(verifyFailure(fromStore(fractional)), "entries", 0);
  });

  it("rows the codec made pass, and a sequence break is still SequenceIntegrityError", () => {
    const sequenced = (n: number) =>
      Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: n })).entry;
    assert.isTrue(Result.isSuccess(Effect.runSync(Effect.result(verifySequenceIntegrity([sequenced(1), sequenced(2)])))));
    assert.strictEqual(verifyFailure([sequenced(1), sequenced(3)])._tag, "SequenceIntegrityError");
  });
});

describe("planRetention and planPurge refuse a row the codec did not make", () => {
  const retentionInvalid = (error: { readonly _tag: string }, value: number) => {
    assert.deepStrictEqual({ ...error }, { _tag: "RetentionInputInvalid", field: "entries", value });
  };

  it("planRetention names entries and the index of the first row refused", () => {
    retentionInvalid(planFailure(fromStore([notDecodable])), 0);
    retentionInvalid(planFailure([good, ...fromStore([fractional[0]])]), 1);
  });

  it("planRetention reads now and maxAgeMs before the rows", () => {
    const rows = fromStore([notDecodable]);
    const refusal = (now: number, maxAgeMs: number) => {
      const result = planRetention(rows, { maxAgeMs }, now);
      if (!Result.isFailure(result)) return assert.fail("the plan took the rows");
      const { _tag, field, value } = result.failure;
      return { _tag, field, value };
    };
    const tag = "RetentionInputInvalid";
    assert.deepStrictEqual(refusal(Number.NaN, 10), { _tag: tag, field: "now", value: Number.NaN });
    assert.deepStrictEqual(refusal(100, -1), { _tag: tag, field: "maxAgeMs", value: -1 });
  });

  it("planRetention takes rows the codec made", () => {
    const plan = Result.getOrThrow(planRetention([good], { maxAgeMs: 10 }, 100_000));
    assert.strictEqual(plan.expired.length, 1);
  });

  it("planPurge refuses through the same rule, and its archive holds none of a plain copy", () => {
    const archive = Result.getOrThrow(
      readAuditArchive(JSON.parse(JSON.stringify(Effect.runSync(archiveAuditTrail([good], 0))))),
    );
    const [plain] = fromStore([good]);
    if (plain === undefined) return assert.fail("no row");
    assert.strictEqual(archive.holds(plain), 0);
    const result = planPurge([plain], { maxAgeMs: 10 }, 100_000, archive);
    if (!Result.isFailure(result)) return assert.fail("the purge took a row the codec did not make");
    retentionInvalid(result.failure, 0);
  });
});
