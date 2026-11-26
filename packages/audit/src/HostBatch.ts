/**
 * The one step that admits a host's batch of audit rows: one order, and one read of each input.
 *
 * `archiveAuditTrail`, `verifySequenceIntegrity`, `planRetention` and `planPurge` each take a `now`, rows and, for
 * some, terms of their own, from a store client or a JavaScript caller the types do not bind. They check them here, in
 * the order `now`, then the caller's terms, then the rows, so a refusal of an earlier input hides every later one, and
 * each input is read once, so what was checked is what is used. A plain function and no span: every caller keeps the
 * span of its own. Package-private and out of the barrel (ADR-QD-099). ADR-QD-202 records the step and ADR-QD-190
 * states the question it asks of the rows.
 */
import * as Data from "effect/Data";
import * as Result from "effect/Result";
import type { AuditEntry } from "./AuditEntry.ts";
import { isCodecMade } from "./CodecMade.ts";
import type { RowsRefusalCases } from "./CodecMade.ts";

/**
 * Why a `now` is refused: it is not a finite number.
 *
 * Stated once, beside the check that answers it, and shared into both public refusal unions as `RowsRefusalCases` is,
 * so a `now` is refused in one place and by one reading of "finite".
 */
export type NowRefusalCases = {
  /** `now` is not a finite number; `value` is what was given. */
  readonly NowNotFinite: { readonly value: unknown };
};

type NowRefusal = Data.TaggedEnum<NowRefusalCases>;
type RowsRefusal = Data.TaggedEnum<RowsRefusalCases>;
const { NowNotFinite } = Data.taggedEnum<NowRefusal>();
const { EntriesNotAList, EntryNotMadeByCodec } = Data.taggedEnum<RowsRefusal>();

/**
 * Rows this step admitted: a list of rows the codec made, held as a fresh array nothing the host holds can change.
 *
 * Only this module mints one, so a fact is never computed from rows it did not admit. The class is not exported and
 * the name is exported as a type only, so nothing else can construct one.
 */
class AdmittedRows {
  declare private readonly nominal: never;
  readonly entries: ReadonlyArray<AuditEntry>;
  constructor(entries: ReadonlyArray<AuditEntry>) {
    this.entries = entries;
  }
}

export type { AdmittedRows };

/**
 * What a host hands over: a `now`, the caller's terms as a read that can be refused, and the rows.
 *
 * `entries` is `unknown` because the step reads it as a host's value whatever the caller's own parameter says: a store
 * client's `any` and a JavaScript caller reach every entry point.
 */
export interface DatedBatch<Terms, Refused> {
  readonly now: number;
  readonly terms: () => Result.Result<Terms, Refused>;
  readonly entries: unknown;
}

/** What the step admitted: the `now` as given, the terms its caller read, and the rows. */
export interface AdmittedBatch<Terms> {
  readonly now: number;
  readonly terms: Terms;
  readonly rows: AdmittedRows;
}

/**
 * Whether `entry` is a row the codec made, read as the row type: the question the step asks of each entry.
 *
 * `CodecMade.ts` records only the rows the codec makes, and the codec makes only `AuditEntry`s, so membership is the
 * evidence for the narrowing. The guard is here, not beside the record, because the record cannot name the row type:
 * `AuditEntry.ts` imports it to fill it.
 */
const isCodecMadeRow = (entry: unknown): entry is AuditEntry => isCodecMade(entry);

/**
 * Admits `entries` as rows the codec made, or says why not, checking each entry as it reads it.
 *
 * A value that is not a list, or a list whose `length` is not a number (only a proxy can answer one), is refused as
 * `EntriesNotAList` with the value given, and no index is read. A list is read as its `length` once and each index
 * once, in order, calling no method and no iterator the host's object can override; the read stops at the first entry
 * that is not a row the codec made, which is refused as `EntryNotMadeByCodec` with its index, and a hole reads as
 * `undefined` and is refused there too. Each row admitted is pushed into a fresh array, and that array is what is
 * admitted, so what was checked is what is used. A list is never copied whole before it is checked, and a `length` past
 * any array's is read only as far as its first refused index, so no length is a `RangeError`.
 */
export const admitRows = (entries: unknown): Result.Result<AdmittedRows, RowsRefusal> => {
  if (!Array.isArray(entries)) {
    return Result.fail(EntriesNotAList({ value: entries }));
  }
  const length: unknown = entries.length;
  if (typeof length !== "number") {
    return Result.fail(EntriesNotAList({ value: entries }));
  }
  const taken: Array<AuditEntry> = [];
  for (let index = 0; index < length; index += 1) {
    const entry: unknown = entries[index];
    if (!isCodecMadeRow(entry)) {
      return Result.fail(EntryNotMadeByCodec({ index }));
    }
    taken.push(entry);
  }
  return Result.succeed(new AdmittedRows(taken));
};

/**
 * Admits a host's batch: the `now`, then the caller's terms, then the rows, each read once.
 *
 * The terms are read only for a finite `now` and the rows only for admitted terms, so a refusal of an earlier input
 * hides every later one and a later input is never touched.
 */
export const admitBatch = <Terms, Refused>(
  batch: DatedBatch<Terms, Refused>,
): Result.Result<AdmittedBatch<Terms>, NowRefusal | Refused | RowsRefusal> => {
  if (!Number.isFinite(batch.now)) {
    return Result.fail(NowNotFinite({ value: batch.now }));
  }
  const terms = batch.terms();
  if (Result.isFailure(terms)) {
    return Result.fail(terms.failure);
  }
  const rows = admitRows(batch.entries);
  if (Result.isFailure(rows)) {
    return Result.fail(rows.failure);
  }
  return Result.succeed({ now: batch.now, terms: terms.success, rows: rows.success });
};
