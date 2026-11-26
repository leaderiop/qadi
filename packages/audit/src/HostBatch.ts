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
import * as Predicate from "effect/Predicate";
import * as Result from "effect/Result";
import type { AuditEntry } from "./AuditEntry.ts";
import { rowsRefusal } from "./CodecMade.ts";
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

/** What a host hands over: a `now`, the caller's terms as a read that can be refused, and the rows. */
export interface DatedBatch<Terms, Refused> {
  readonly now: number;
  readonly terms: () => Result.Result<Terms, Refused>;
  readonly entries: ReadonlyArray<AuditEntry>;
}

/** What the step admitted: the `now` as given, the terms its caller read, and the rows. */
export interface AdmittedBatch<Terms> {
  readonly now: number;
  readonly terms: Terms;
  readonly rows: AdmittedRows;
}

/**
 * Copies `list` with one read of `length` and one read of each index, using nothing the host's object can override.
 *
 * `Array.from` over `{ length }` calls no method and no iterator of `list`, and a hole reads as `undefined`, which the
 * check refuses. `noUncheckedIndexedAccess` is why the element type holds `undefined`.
 */
const takeRows = (list: ReadonlyArray<AuditEntry>): Array<AuditEntry | undefined> =>
  Array.from({ length: list.length }, (_, index) => list[index]);

/**
 * Admits `entries` as rows the codec made, or says why not.
 *
 * A value that is not a list is passed on unread, so the refusal can name it; a list is copied once and the copy is
 * what is checked and what is admitted.
 */
export const admitRows = (
  entries: ReadonlyArray<AuditEntry>,
): Result.Result<AdmittedRows, RowsRefusal> => {
  const taken = Array.isArray(entries) ? takeRows(entries) : entries;
  const refusal = rowsRefusal(taken);
  if (refusal !== undefined) {
    return Result.fail(refusal);
  }
  return Result.succeed(new AdmittedRows(taken.filter(Predicate.isNotUndefined)));
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
