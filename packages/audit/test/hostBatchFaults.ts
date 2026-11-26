/**
 * The fault table every function that takes a host's batch is compared with the admission step over.
 *
 * Each entry names a fault and the terms result the step is given for it, never which refusal wins: the
 * comparison runs a function and the step over the same entry and asks that they agree, so it proves a function
 * calls the step without a second copy of the order a test would have to keep in line with the step's own.
 */
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import { ArchiveInputRefusal } from "../src/AuditArchive.ts";
import type { KeyMaterial } from "../src/AuditArchive.ts";
import { decodeAuditEntry, encodeAuditEntry } from "../src/AuditEntry.ts";
import type { AuditEntry } from "../src/AuditEntry.ts";
import { RetentionInputRefusal } from "../src/Retention.ts";
import { decisionRecord } from "./helpers.ts";

const codecRow = (evaluationId: string): AuditEntry =>
  Effect.runSync(encodeAuditEntry(decisionRecord({ evaluationId })));

/** What a JavaScript caller can hand over where the type says something else: an untyped store client's result. */
const handedOver = <T>(value: unknown): T => {
  const box: object = { value };
  return Reflect.get(box, "value");
};

const host = (value: unknown): ReadonlyArray<AuditEntry> => handedOver(value);

/** The parsed bytes of rows, typed `any` by `JSON.parse`, as a store client returns them. */
const fromStore = (rows: ReadonlyArray<unknown>): ReadonlyArray<AuditEntry> =>
  JSON.parse(JSON.stringify(rows));

const good = codecRow("good");

/** A row whose `at` is not a number and which carries a key the codec refuses. */
const notDecodable = { record: { ...good.record, at: null }, sequenceNumber: undefined, extra: 1 };

/** A list with a hole at its second place. */
const withHole = (): ReadonlyArray<AuditEntry> => {
  const sparse: Array<AuditEntry> = Array.from({ length: 3 });
  delete sparse[1];
  sparse[0] = good;
  sparse[2] = good;
  return sparse;
};

/** Rows the codec made, numbered 1 and 3: the step admits them and a sequence check refuses them. */
const withSequenceBreak = (): ReadonlyArray<AuditEntry> =>
  [1, 3].map((n) => Result.getOrThrow(decodeAuditEntry({ record: good.record, sequenceNumber: n })).entry);

/** Values a JavaScript caller can hand over where the type says a list. */
const notLists: ReadonlyArray<unknown> = [
  undefined,
  null,
  7,
  "rows",
  { length: 1, 0: good },
  new Set([good]),
  good,
];

/** The rows a batch can hold: good, not a list, a refused row, or a list with a hole. */
const rowsGiven: ReadonlyArray<{ readonly name: string; readonly entries: ReadonlyArray<AuditEntry> }> = [
  { name: "rows the codec made", entries: [good] },
  { name: "rows that are not a list", entries: host(null) },
  { name: "a row the codec did not make", entries: fromStore([notDecodable]) },
  { name: "a list with a hole", entries: withHole() },
];

/** Every list `verifySequenceIntegrity` can be given, with the step's own answer left to the comparison. */
export const rowsLists: ReadonlyArray<{
  readonly name: string;
  readonly entries: ReadonlyArray<AuditEntry>;
}> = [
  { name: "rows the codec made", entries: [good, codecRow("other")] },
  { name: "no rows", entries: [] },
  ...notLists.map((value, index) => ({ name: `entries that are not a list, number ${index + 1}`, entries: host(value) })),
  { name: "a row the codec did not make", entries: fromStore([notDecodable]) },
  { name: "a list with a hole", entries: withHole() },
  { name: "rows with a sequence break", entries: withSequenceBreak() },
];

/** What `archiveAuditTrail` is given beside the rows, and the terms result the step is given for it. */
const writerKeys: ReadonlyArray<{
  readonly name: string;
  readonly keyMaterial: ReadonlyArray<KeyMaterial> | undefined;
  readonly terms: Result.Result<ReadonlyArray<KeyMaterial> | undefined, ArchiveInputRefusal>;
}> = [
  { name: "no key material", keyMaterial: undefined, terms: Result.succeed(undefined) },
  {
    name: "key material that is not a list",
    keyMaterial: handedOver(7),
    terms: Result.fail(ArchiveInputRefusal.KeyMaterialNotAList({ value: 7 })),
  },
  {
    name: "a key material item that is refused",
    keyMaterial: handedOver([null]),
    terms: Result.fail(ArchiveInputRefusal.KeyMaterialItemRefused({ index: 0 })),
  },
];

/** What a plan is given beside the rows, and the terms result the step is given for it. */
const planAges: ReadonlyArray<{
  readonly name: string;
  readonly maxAgeMs: number;
  readonly terms: Result.Result<number, RetentionInputRefusal>;
}> = [
  { name: "a valid maxAgeMs", maxAgeMs: 10, terms: Result.succeed(10) },
  {
    name: "a maxAgeMs that is NaN",
    maxAgeMs: Number.NaN,
    terms: Result.fail(RetentionInputRefusal.MaxAgeInvalid({ value: Number.NaN })),
  },
  {
    name: "a negative maxAgeMs",
    maxAgeMs: -1,
    terms: Result.fail(RetentionInputRefusal.MaxAgeInvalid({ value: -1 })),
  },
];

const nows: ReadonlyArray<number> = [1_000, Number.NaN];

/** Every batch `archiveAuditTrail` can be given: a now, key material and rows, each good or refused. */
export const writerBatches: ReadonlyArray<{
  readonly name: string;
  readonly now: number;
  readonly keyMaterial: ReadonlyArray<KeyMaterial> | undefined;
  readonly terms: Result.Result<ReadonlyArray<KeyMaterial> | undefined, ArchiveInputRefusal>;
  readonly entries: ReadonlyArray<AuditEntry>;
}> = nows.flatMap((now) =>
  writerKeys.flatMap((keys) =>
    rowsGiven.map((rows) => ({
      name: `now ${String(now)}, ${keys.name}, ${rows.name}`,
      now,
      keyMaterial: keys.keyMaterial,
      terms: keys.terms,
      entries: rows.entries,
    })),
  ),
);

/** Every batch `planRetention` and `planPurge` can be given: a now, a policy and rows, each good or refused. */
export const planBatches: ReadonlyArray<{
  readonly name: string;
  readonly now: number;
  readonly policy: { readonly maxAgeMs: number };
  readonly terms: Result.Result<number, RetentionInputRefusal>;
  readonly entries: ReadonlyArray<AuditEntry>;
}> = nows.flatMap((now) =>
  planAges.flatMap((age) =>
    rowsGiven.map((rows) => ({
      name: `now ${String(now)}, ${age.name}, ${rows.name}`,
      now,
      policy: { maxAgeMs: age.maxAgeMs },
      terms: age.terms,
      entries: rows.entries,
    })),
  ),
);
