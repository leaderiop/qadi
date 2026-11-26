/**
 * The facts of a list of audit entries, computed once: their archive order, how
 * many are sequenced and what that lets an archive claim, the first sequence gap
 * or duplicate, and where the list as given departs from archive order.
 *
 * `archiveAuditTrail` builds its bundle from these facts and `readAuditArchive`
 * recomputes them and compares them with the bundle's claims, so neither restates
 * a rule (ARCH-48, ADR-QD-110). Before this module the writer ordered with a
 * comparator, the reader with a separate loop, and each counted sequenced entries
 * for itself; a reader that drifted from the writer would either refuse archives
 * this package wrote, which blocks a purge, or accept ones it did not, which
 * weakens ARCH-38's evidence.
 *
 * The module is out of the barrel, so it is package-private (ADR-QD-099); the
 * two names that are public, `verifySequenceIntegrity` and `SequenceIntegrityError`,
 * reach the barrel through [SequenceIntegrity.ts](./SequenceIntegrity.ts), which
 * re-exports them. The check is gap-and-duplicate detection, not tamper-evidence
 * (see that file).
 *
 * A row's `sequenceNumber` is a safe integer here without being checked here: only
 * `decodeAuditEntry` gives a row one, its codec states the rule once (`AuditEntry.ts`,
 * ADR-QD-190), and {@link verifiedArchiveFacts} takes only rows the admission step of
 * `HostBatch.ts` admitted, which are rows the codec made (`CodecMade.ts`), so a number
 * outside the safe integers never reaches {@link firstBreakIn}, which never adds one
 * past `2 ** 53`. The pure {@link archiveFacts} is the reader's, over rows it has just
 * decoded.
 */
import * as Data from "effect/Data";
import * as Effect from "effect/Effect";
import * as Result from "effect/Result";
import type { AuditEntry } from "./AuditEntry.ts";
import type { RowsRefusalCases } from "./CodecMade.ts";
import { admitRows } from "./HostBatch.ts";
import type { AdmittedRows, NowRefusalCases } from "./HostBatch.ts";

/** The first place a sorted run of sequence numbers is not `previous + 1`. */
export interface SequenceBreak {
  readonly expectedSequence: number;
  readonly actualSequence: number;
}

/** What {@link archiveFacts} says about a list of entries. */
export interface ArchiveFacts {
  /** The entries in archive order: sequenced by number, then unsequenced in the order given. */
  readonly ordered: ReadonlyArray<AuditEntry>;
  /** How many entries carry a `sequenceNumber`. */
  readonly sequencedCount: number;
  /** What an archive of these entries may claim: true exactly when two or more are sequenced. */
  readonly sequenceIntegrityVerified: boolean;
  /** The first gap or duplicate among the sequence numbers, if any. */
  readonly sequenceBreak: SequenceBreak | undefined;
  /** The index, in the order given, of the first entry that sorts before its predecessor. */
  readonly outOfOrderAt: number | undefined;
}

/**
 * The archive order: sequenced entries by number, every unsequenced entry after
 * every sequenced one.
 *
 * Two unsequenced entries compare as `NaN`; `toSorted` reads that as `+0`, so they
 * keep their given order (ARCH-29, CCR-QD-185), and the scan in {@link archiveFacts}
 * reads it as "not out of order".
 */
const archiveOrder = (a: AuditEntry, b: AuditEntry): number =>
  (a.sequenceNumber ?? Number.POSITIVE_INFINITY) - (b.sequenceNumber ?? Number.POSITIVE_INFINITY);

/**
 * The first gap or duplicate in `sorted`, an ascending run of sequence numbers.
 *
 * Each number is compared with the one before it, held in a variable, so no index
 * lookup can come back `undefined`.
 */
const firstBreakIn = (sorted: ReadonlyArray<number>): SequenceBreak | undefined => {
  let previous: number | undefined;
  for (const actual of sorted) {
    if (previous !== undefined && actual !== previous + 1) {
      return { expectedSequence: previous + 1, actualSequence: actual };
    }
    previous = actual;
  }
  return undefined;
};

/**
 * The facts of `entries`. Pure.
 *
 * The order, the claim and the break are each stated here and nowhere else. The
 * out-of-order index is derived from the same comparator that orders `ordered`,
 * so the reader's reading of "in order" is the writer's.
 *
 * Entries with no `sequenceNumber` contribute nothing to the count or the break
 * (`flatMap` drops them, so there is no predicate to get wrong).
 */
export const archiveFacts = (entries: ReadonlyArray<AuditEntry>): ArchiveFacts => {
  const sequenceNumbers = entries
    .flatMap((entry) => (entry.sequenceNumber === undefined ? [] : [entry.sequenceNumber]))
    .toSorted((a, b) => a - b);
  let outOfOrderAt: number | undefined;
  let previous: AuditEntry | undefined;
  for (const [index, entry] of entries.entries()) {
    if (outOfOrderAt === undefined && previous !== undefined && archiveOrder(previous, entry) > 0) {
      outOfOrderAt = index;
    }
    previous = entry;
  }
  const sequencedCount = sequenceNumbers.length;
  return {
    ordered: entries.toSorted(archiveOrder),
    sequencedCount,
    sequenceIntegrityVerified: sequencedCount >= 2,
    sequenceBreak: firstBreakIn(sequenceNumbers),
    outOfOrderAt,
  };
};

/**
 * Why an archive function refused its input, one member per case, as
 * `ArchiveRefusal` is for a stored bundle.
 *
 * - `NowNotFinite`: `archiveAuditTrail`'s `now` is not a finite number, and `value` is the
 *   value given (a caller the type does not bind can give a string). A non-finite
 *   `createdAt` is a bundle `readAuditArchive` refuses as `Malformed`, so the writer
 *   refuses it first rather than hand a store an archive that blocks every purge needing
 *   it. It is the member `HostBatch.ts` states once for every function that takes a `now`.
 * - `KeyMaterialNotAList`: `archiveAuditTrail`'s `keyMaterial` is not a list, and `value` is
 *   the value given.
 * - `KeyMaterialItemRefused`: the item at `index`, the first, is not what the reader reads
 *   (an object with a string `keyId`, `algorithm` and `publicKey`), so the writer would
 *   archive a bundle the reader refuses as `Malformed`.
 * - `EntriesNotAList`: `entries` is not a list, and `value` is the value given. A store
 *   client's result and a JavaScript caller's argument can be anything.
 * - `EntryNotMadeByCodec`: the entry at `index`, the first, is not a row the codec made
 *   (`CodecMade.ts`). The compiler refuses such a row where it can, and `any` (a store
 *   client's `JSON.parse`, an untyped ORM result) and JavaScript callers pass it. A row
 *   the codec did not make may be one `readAuditArchive` refuses, so the writer and
 *   `verifySequenceIntegrity` refuse it first (ADR-QD-190).
 *
 * `unknown` appears only where a member holds a value the caller gave, and `index` is
 * always a number, so a handler narrows by `_tag` alone. The union is the rows fragment
 * (`CodecMade.ts`) and the `now` fragment (`HostBatch.ts`), each shared with
 * `RetentionInputRefusal` (`Retention.ts`), and the two key-material members, which only
 * this module has.
 */
export type ArchiveInputRefusal = Data.TaggedEnum<
  RowsRefusalCases &
    NowRefusalCases & {
      KeyMaterialNotAList: { readonly value: unknown };
      KeyMaterialItemRefused: { readonly index: number };
    }
>;

/** Constructors and guards for {@link ArchiveInputRefusal}. */
export const ArchiveInputRefusal = Data.taggedEnum<ArchiveInputRefusal>();

/**
 * `archiveAuditTrail` or `verifySequenceIntegrity` refused its input; `refusal` says which.
 *
 * A typed result, never thrown, and not a defect whatever the value given. Shaped like
 * `ArchiveNotVerified` and `RetentionInputInvalid` (`Retention.ts`): a `refusal` that is a
 * closed `Data.TaggedEnum`, read through `Match.tagsExhaustive`. A different error from
 * `RetentionInputInvalid`, because the refusals differ by which call refused.
 */
export class ArchiveInputInvalid extends Data.TaggedError("ArchiveInputInvalid")<{
  readonly refusal: ArchiveInputRefusal;
}> {}

export class SequenceIntegrityError extends Data.TaggedError("SequenceIntegrityError")<{
  readonly expectedSequence: number;
  readonly actualSequence: number;
}> {}

/**
 * The facts of rows the admission step admitted, or `SequenceIntegrityError` at their first
 * gap or duplicate: the writer's reading of them.
 *
 * It takes only `AdmittedRows`, so a fact is never computed from rows `HostBatch.ts` did not
 * admit, and its one failure is the break. The Effect wrapper `archiveAuditTrail` needs, and
 * the one place a break becomes a failure (ARCH-48, ADR-QD-110). The span keeps its name and
 * opens only for admitted rows, so a trace shows the same span under `archiveAuditTrail` and
 * under the public check.
 */
export const verifiedArchiveFacts = Effect.fn("qadi.audit.verifySequenceIntegrity")(function* (
  rows: AdmittedRows,
) {
  const facts = archiveFacts(rows.entries);
  if (facts.sequenceBreak !== undefined) {
    return yield* Effect.fail(new SequenceIntegrityError(facts.sequenceBreak));
  }
  return facts;
});

/**
 * Fails `SequenceIntegrityError` at the first gap or duplicate among the
 * entries' sequence numbers, or `ArchiveInputInvalid` when `entries` is not a list
 * (`EntriesNotAList`) or holds an entry the codec did not make (`EntryNotMadeByCodec`,
 * with the index of the first).
 *
 * Entries with no `sequenceNumber` are ignored — sequencing is opt-in, and a
 * caller who never assigns one has nothing here to verify.
 *
 * Detects both a gap (a jump past the expected next number) and a duplicate
 * (the same number twice, which sorts to *less* than expected) — one check
 * catches both, since a duplicate's `actual` is never equal to
 * `expected = previous + 1`.
 *
 * Admits `entries` first, so a refusal opens no span; it is unnamed on purpose, the span
 * is `verifiedArchiveFacts`'s, so a call on admitted rows opens exactly one.
 */
export const verifySequenceIntegrity = Effect.fn(function* (entries: ReadonlyArray<AuditEntry>) {
  const rows = admitRows(entries);
  if (Result.isFailure(rows)) {
    return yield* Effect.fail(new ArchiveInputInvalid({ refusal: rows.failure }));
  }
  yield* verifiedArchiveFacts(rows.success);
});
